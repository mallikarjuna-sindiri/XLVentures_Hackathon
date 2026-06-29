from datetime import datetime, timezone
from typing import Any, Optional


from bson import ObjectId
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.core.bootstrap import seed_demo_data, seed_user_demo_data
from app.core.config import settings
from app.core.database import get_database
from app.core.auth import verify_google_token, create_access_token, get_current_user
from app.schemas import (
    AccountCreate,
    AccountOut,
    HealthResponse,
    InteractionCreate,
    InteractionOut,
    RecommendationOut,
    RecommendationReview,
    PlaybookCreate,
    PlaybookOut,
    KnowledgeSourceCreate,
    KnowledgeSourceOut,
    GoogleLoginPayload,
    UserOut,
    AuthResponse,
)
from app.services.recommendations import analyze_interaction, build_recommendation
from app.services.copilot import generate_action_draft


app = FastAPI(title="NEXORA Next Best Action API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/auth/google", response_model=AuthResponse)
async def auth_google(payload: GoogleLoginPayload) -> AuthResponse:
    # Verify Google Token
    google_user = verify_google_token(payload.credential)
    email = google_user["email"]
    name = google_user.get("name", email.split("@")[0])
    picture = google_user.get("picture")
    google_id = google_user["sub"]

    db = get_database()
    # Find or create user in users collection
    user_doc = await db.users.find_one({"email": email})
    if not user_doc:
        user_doc = {
            "email": email,
            "name": name,
            "picture": picture,
            "googleId": google_id,
            "createdAt": datetime.now(timezone.utc),
        }
        result = await db.users.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
    else:
        # Update picture or name if changed
        update_fields = {}
        if picture and user_doc.get("picture") != picture:
            update_fields["picture"] = picture
        if name and user_doc.get("name") != name:
            update_fields["name"] = name
        if update_fields:
            await db.users.update_one({"_id": user_doc["_id"]}, {"$set": update_fields})

    # Seed user isolated demo data if they are new
    await seed_user_demo_data(db, str(user_doc["_id"]))

    # Create local JWT access token
    token_data = {"sub": str(user_doc["_id"]), "email": email}
    token = create_access_token(data=token_data)

    return AuthResponse(
        token=token,
        user=UserOut(
            id=str(user_doc["_id"]),
            email=user_doc["email"],
            name=user_doc["name"],
            picture=user_doc.get("picture")
        )
    )


@app.on_event("startup")
async def startup_event() -> None:
    await seed_demo_data()


@app.post("/reset-db")
async def reset_db(current_user: UserOut = Depends(get_current_user)) -> dict:
    db = get_database()
    user_id_str = str(current_user.id)
    
    # Find all accounts owned by this user
    user_accounts = await db.accounts.find({"userId": user_id_str}).to_list(length=1000)
    user_account_ids = [str(acc["_id"]) for acc in user_accounts]
    
    # Delete interactions and recommendations related to these accounts
    if user_account_ids:
        await db.interactions.delete_many({"accountId": {"$in": user_account_ids}})
        await db.recommendations.delete_many({"accountId": {"$in": user_account_ids}})
    
    # Delete the accounts themselves
    await db.accounts.delete_many({"userId": user_id_str})
    
    # Re-seed this user's demo data
    await seed_user_demo_data(db, user_id_str)
    
    return {"status": "success", "message": "Demo database successfully reset and reseeded."}



def serialize_id(document: dict[str, Any]) -> dict[str, Any]:
    item = dict(document)
    item["id"] = str(item.pop("_id"))
    return item


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/accounts", response_model=list[AccountOut])
async def list_accounts(domain: Optional[str] = None, current_user: UserOut = Depends(get_current_user)) -> list[AccountOut]:
    db = get_database()
    query = {"userId": str(current_user.id)}
    if domain:
        query["domain"] = domain
    items = await db.accounts.find(query).sort("createdAt", -1).to_list(length=100)
    return [AccountOut(id=str(item["_id"]), **{k: v for k, v in item.items() if k != "_id"}) for item in items]


@app.post("/accounts", response_model=AccountOut)
async def create_account(payload: AccountCreate, current_user: UserOut = Depends(get_current_user)) -> AccountOut:
    db = get_database()
    account_data = payload.dict()
    account_data["userId"] = str(current_user.id)
    account_data["createdAt"] = datetime.now(timezone.utc)
    result = await db.accounts.insert_one(account_data)
    account_data["_id"] = result.inserted_id
    return AccountOut(id=str(account_data["_id"]), **{k: v for k, v in account_data.items() if k != "_id"})



@app.get("/accounts/{account_id}", response_model=AccountOut)
async def get_account(account_id: str, current_user: UserOut = Depends(get_current_user)) -> AccountOut:
    db = get_database()
    item = await db.accounts.find_one({"_id": ObjectId(account_id), "userId": str(current_user.id)})
    if not item:
        raise HTTPException(status_code=404, detail="Account not found")
    return AccountOut(id=str(item["_id"]), **{k: v for k, v in item.items() if k != "_id"})


@app.delete("/accounts/{account_id}")
async def delete_account(account_id: str, current_user: UserOut = Depends(get_current_user)) -> dict:
    db = get_database()
    # Verify ownership
    account = await db.accounts.find_one({"_id": ObjectId(account_id), "userId": str(current_user.id)})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Cascade delete interactions and recommendations
    await db.interactions.delete_many({"accountId": account_id})
    await db.recommendations.delete_many({"accountId": account_id})
    
    # Delete the account
    await db.accounts.delete_one({"_id": ObjectId(account_id)})
    return {"status": "success", "message": "Account and all associated signals/recommendations deleted successfully."}


@app.post("/accounts/{account_id}/chat")
async def chat_with_account(
    account_id: str, 
    payload: dict,  # {"message": str, "history": list[dict]}
    current_user: UserOut = Depends(get_current_user)
) -> dict:
    from app.services.recommendations import get_gemini_model
    import logging
    logger = logging.getLogger(__name__)
    
    db = get_database()
    # Verify account ownership
    account = await db.accounts.find_one({"_id": ObjectId(account_id), "userId": str(current_user.id)})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Retrieve recent history for context
    interactions = await db.interactions.find({"accountId": account_id}).sort("createdAt", -1).to_list(length=10)
    recommendations = await db.recommendations.find({"accountId": account_id}).sort("createdAt", -1).to_list(length=10)
    
    interactions_str = "\n".join([
        f"- [{i['createdAt'].strftime('%Y-%m-%d %H:%M')}] Summary: {i['summary']}\n  Details: {i['text']}\n  Risk Level: {i['riskLevel']}" 
        for i in interactions
    ])
    recommendations_str = "\n".join([
        f"- Action: {r['action']}\n  Priority: {r['priority']}\n  Reason: {r['reason']}\n  Status: {r['status']}" 
        for r in recommendations
    ])
    
    system_prompt = f"""
    You are a helpful customer success and sales peer assistant working with the user on client account "{account['name']}" (Owner: {account['owner']}, Domain: {account['domain']}, Stage: {account['stage']}, Status: {account['status']}, Health Score: {account['healthScore']}/100).
    
    Here is the recent customer signal history for {account['name']}:
    {interactions_str if interactions_str else 'No signals logged yet.'}
    
    Here is the active action recommendations history:
    {recommendations_str if recommendations_str else 'No recommendations generated yet.'}
    
    Instructions for Tone & Format:
    - Respond like a smart, friendly, and supportive human colleague.
    - Write in natural conversational language.
    - CRITICAL: Do NOT use any Markdown formatting, bold markers (no asterisks "**" or "***"), bullet lists (use natural sentences or normal numbers if listing items), or code block backticks in your output.
    - Keep output clean and easy to read using normal paragraphs.
    - Answer user's questions about this account directly and naturally.
    """
    
    model = get_gemini_model()
    if not model:
        return {"response": "AI API key is not configured. Please add GEMINI_API_KEY in your .env file to enable chat."}
    
    history = payload.get("history", [])
    chat_prompt = f"{system_prompt}\n\nChat History:\n"
    for msg in history:
        chat_prompt += f"{msg['sender'].upper()}: {msg['text']}\n"
    chat_prompt += f"USER: {payload['message']}\nASSISTANT:"
    
    try:
        response = await model.generate_content_async(chat_prompt)
        return {"response": response.text.strip()}
    except Exception as e:
        logger.error(f"Error chatting with account: {e}")
        return {"response": f"An error occurred while calling the AI Engine: {str(e)}"}


@app.get("/accounts/{account_id}/interactions", response_model=list[InteractionOut])
async def get_interactions(account_id: str, current_user: UserOut = Depends(get_current_user)) -> list[InteractionOut]:
    db = get_database()
    account = await db.accounts.find_one({"_id": ObjectId(account_id), "userId": str(current_user.id)})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    items = await db.interactions.find({"accountId": account_id}).sort("createdAt", -1).to_list(length=100)
    return [InteractionOut(id=str(item["_id"]), **{k: v for k, v in item.items() if k != "_id"}) for item in items]


@app.get("/accounts/{account_id}/recommendations", response_model=list[RecommendationOut])
async def get_recommendations(account_id: str, current_user: UserOut = Depends(get_current_user)) -> list[RecommendationOut]:
    db = get_database()
    account = await db.accounts.find_one({"_id": ObjectId(account_id), "userId": str(current_user.id)})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    items = await db.recommendations.find({"accountId": account_id}).sort("createdAt", -1).to_list(length=100)
    return [RecommendationOut(id=str(item["_id"]), **{k: v for k, v in item.items() if k != "_id"}) for item in items]


@app.get("/recommendations", response_model=list[RecommendationOut])
async def list_all_recommendations(current_user: UserOut = Depends(get_current_user)) -> list[RecommendationOut]:
    db = get_database()
    accounts = await db.accounts.find({"userId": str(current_user.id)}).to_list(length=1000)
    account_ids = [str(a["_id"]) for a in accounts]
    items = await db.recommendations.find({"accountId": {"$in": account_ids}}).sort("createdAt", -1).to_list(length=1000)
    return [RecommendationOut(id=str(item["_id"]), **{k: v for k, v in item.items() if k != "_id"}) for item in items]


@app.post("/accounts/{account_id}/interactions", response_model=InteractionOut)
async def create_interaction(account_id: str, payload: InteractionCreate, current_user: UserOut = Depends(get_current_user)) -> InteractionOut:
    db = get_database()
    account = await db.accounts.find_one({"_id": ObjectId(account_id), "userId": str(current_user.id)})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    risk_level, summary, evidence = await analyze_interaction(payload.text)
    interaction = {
        "accountId": account_id,
        "source": payload.source,
        "text": payload.text,
        "summary": summary,
        "riskLevel": risk_level,
        "evidence": evidence,
        "createdAt": datetime.now(timezone.utc),
    }
    result = await db.interactions.insert_one(interaction)
    interaction["_id"] = result.inserted_id
    return InteractionOut(id=str(interaction["_id"]), **{k: v for k, v in interaction.items() if k != "_id"})


@app.post("/accounts/{account_id}/analyze", response_model=RecommendationOut)
async def analyze_account(account_id: str, current_user: UserOut = Depends(get_current_user)) -> RecommendationOut:
    db = get_database()
    account = await db.accounts.find_one({"_id": ObjectId(account_id), "userId": str(current_user.id)})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    latest_interaction = await db.interactions.find_one({"accountId": account_id}, sort=[("createdAt", -1)])
    if not latest_interaction:
        # Fallback to system generated interaction to allow analyzing the account at any time
        health = account.get("healthScore", 100)
        risk = "high" if health < 70 else "medium" if health < 85 else "low"
        latest_interaction = {
            "source": "System Monitor",
            "text": f"Account '{account.get('name')}' is in stage '{account.get('stage')}' with a health score of {health}/100.",
            "riskLevel": risk
        }

    recommendation_data = await build_recommendation(
        InteractionCreate(source=latest_interaction["source"], text=latest_interaction["text"]),
        latest_interaction.get("riskLevel", "low"),
        account_id=account_id,
        domain=account.get("domain", "customer_success"),
        db=db,
    )

    recommendation = {
        "accountId": account_id,
        **recommendation_data,
        "createdAt": datetime.now(timezone.utc),
    }
    result = await db.recommendations.insert_one(recommendation)
    recommendation["_id"] = result.inserted_id
    return RecommendationOut(id=str(recommendation["_id"]), **{k: v for k, v in recommendation.items() if k != "_id"})


@app.post("/recommendations/{recommendation_id}/review", response_model=RecommendationOut)
async def review_recommendation(recommendation_id: str, payload: RecommendationReview, current_user: UserOut = Depends(get_current_user)) -> RecommendationOut:
    db = get_database()
    recommendation = await db.recommendations.find_one({"_id": ObjectId(recommendation_id)})
    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    account = await db.accounts.find_one({"_id": ObjectId(recommendation["accountId"]), "userId": str(current_user.id)})
    if not account:
        raise HTTPException(status_code=403, detail="Access denied")

    await db.recommendations.update_one(
        {"_id": ObjectId(recommendation_id)},
        {"$set": {"status": payload.status, "reviewComments": payload.comments, "reviewedAt": datetime.now(timezone.utc)}},
    )
    recommendation["status"] = payload.status
    recommendation["reviewComments"] = payload.comments
    recommendation["reviewedAt"] = datetime.now(timezone.utc)
    return RecommendationOut(id=str(recommendation["_id"]), **{k: v for k, v in recommendation.items() if k != "_id"})


@app.get("/playbooks", response_model=list[PlaybookOut])
async def list_playbooks(domain: Optional[str] = None, current_user: UserOut = Depends(get_current_user)) -> list[PlaybookOut]:
    db = get_database()
    query = {}
    if domain:
        query["domain"] = domain
    items = await db.playbooks.find(query).to_list(length=100)
    return [PlaybookOut(id=str(item["_id"]), **{k: v for k, v in item.items() if k != "_id"}) for item in items]


@app.post("/playbooks", response_model=PlaybookOut)
async def create_playbook(payload: PlaybookCreate, current_user: UserOut = Depends(get_current_user)) -> PlaybookOut:
    db = get_database()
    playbook_data = payload.dict()
    result = await db.playbooks.insert_one(playbook_data)
    playbook_data["_id"] = result.inserted_id
    return PlaybookOut(id=str(playbook_data["_id"]), **{k: v for k, v in playbook_data.items() if k != "_id"})


@app.put("/playbooks/{playbook_id}", response_model=PlaybookOut)
async def update_playbook(playbook_id: str, payload: PlaybookCreate, current_user: UserOut = Depends(get_current_user)) -> PlaybookOut:
    db = get_database()
    playbook = await db.playbooks.find_one({"_id": ObjectId(playbook_id)})
    if not playbook:
        raise HTTPException(status_code=404, detail="Playbook not found")
    
    playbook_data = payload.dict()
    await db.playbooks.update_one(
        {"_id": ObjectId(playbook_id)},
        {"$set": playbook_data}
    )
    playbook_data["_id"] = ObjectId(playbook_id)
    return PlaybookOut(id=str(playbook_data["_id"]), **{k: v for k, v in playbook_data.items() if k != "_id"})


@app.post("/recommendations/{recommendation_id}/copilot-draft")
async def get_copilot_draft(recommendation_id: str, current_user: UserOut = Depends(get_current_user)) -> dict:
    db = get_database()
    recommendation = await db.recommendations.find_one({"_id": ObjectId(recommendation_id)})
    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    account = await db.accounts.find_one({"_id": ObjectId(recommendation["accountId"]), "userId": str(current_user.id)})
    if not account:
        raise HTTPException(status_code=403, detail="Access denied")

    draft = await generate_action_draft(recommendation, account)
    return {"draft": draft}


@app.get("/knowledge-sources", response_model=list[KnowledgeSourceOut])
async def list_knowledge_sources(current_user: UserOut = Depends(get_current_user)) -> list[KnowledgeSourceOut]:
    db = get_database()
    items = await db.knowledge_sources.find().to_list(length=100)
    return [
        KnowledgeSourceOut(
            id=str(item["_id"]),
            title=item["title"],
            type=item["type"],
            contentSummary=item["contentSummary"]
        ) for item in items
    ]


@app.post("/knowledge-sources", response_model=KnowledgeSourceOut)
async def create_knowledge_source(payload: KnowledgeSourceCreate, current_user: UserOut = Depends(get_current_user)) -> KnowledgeSourceOut:
    db = get_database()
    source_data = payload.dict()
    result = await db.knowledge_sources.insert_one(source_data)
    source_data["_id"] = result.inserted_id
    return KnowledgeSourceOut(
        id=str(source_data["_id"]),
        title=source_data["title"],
        type=source_data["type"],
        contentSummary=source_data["contentSummary"]
    )


