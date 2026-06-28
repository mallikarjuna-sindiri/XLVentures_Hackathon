from datetime import datetime, timezone
from typing import Any, Optional


from bson import ObjectId
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.core.bootstrap import seed_demo_data
from app.core.config import settings
from app.core.database import get_database
from app.schemas import (
    AccountOut,
    HealthResponse,
    InteractionCreate,
    InteractionOut,
    RecommendationOut,
    RecommendationReview,
    PlaybookCreate,
    PlaybookOut,
    KnowledgeSourceOut,
)
from app.services.recommendations import analyze_interaction, build_recommendation
from app.services.copilot import generate_action_draft


app = FastAPI(title="XL Ventures Next Best Action API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event() -> None:
    await seed_demo_data()


@app.post("/reset-db")
async def reset_db() -> dict:
    await seed_demo_data()
    return {"status": "success", "message": "Demo database successfully reset and reseeded."}



def serialize_id(document: dict[str, Any]) -> dict[str, Any]:
    item = dict(document)
    item["id"] = str(item.pop("_id"))
    return item


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/accounts", response_model=list[AccountOut])
async def list_accounts(domain: Optional[str] = None) -> list[AccountOut]:
    db = get_database()
    query = {}
    if domain:
        query["domain"] = domain
    items = await db.accounts.find(query).sort("createdAt", -1).to_list(length=100)
    return [AccountOut(id=str(item["_id"]), **{k: v for k, v in item.items() if k != "_id"}) for item in items]



@app.get("/accounts/{account_id}", response_model=AccountOut)
async def get_account(account_id: str) -> AccountOut:
    db = get_database()
    item = await db.accounts.find_one({"_id": ObjectId(account_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Account not found")
    return AccountOut(id=str(item["_id"]), **{k: v for k, v in item.items() if k != "_id"})


@app.get("/accounts/{account_id}/interactions", response_model=list[InteractionOut])
async def get_interactions(account_id: str) -> list[InteractionOut]:
    db = get_database()
    items = await db.interactions.find({"accountId": account_id}).sort("createdAt", -1).to_list(length=100)
    return [InteractionOut(id=str(item["_id"]), **{k: v for k, v in item.items() if k != "_id"}) for item in items]


@app.get("/accounts/{account_id}/recommendations", response_model=list[RecommendationOut])
async def get_recommendations(account_id: str) -> list[RecommendationOut]:
    db = get_database()
    items = await db.recommendations.find({"accountId": account_id}).sort("createdAt", -1).to_list(length=100)
    return [RecommendationOut(id=str(item["_id"]), **{k: v for k, v in item.items() if k != "_id"}) for item in items]


@app.post("/accounts/{account_id}/interactions", response_model=InteractionOut)
async def create_interaction(account_id: str, payload: InteractionCreate) -> InteractionOut:
    db = get_database()
    account = await db.accounts.find_one({"_id": ObjectId(account_id)})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    risk_level, summary, evidence = analyze_interaction(payload.text)
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
async def analyze_account(account_id: str) -> RecommendationOut:
    db = get_database()
    account = await db.accounts.find_one({"_id": ObjectId(account_id)})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    latest_interaction = await db.interactions.find_one({"accountId": account_id}, sort=[("createdAt", -1)])
    if not latest_interaction:
        raise HTTPException(status_code=400, detail="No interaction available for analysis")

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
async def review_recommendation(recommendation_id: str, payload: RecommendationReview) -> RecommendationOut:
    db = get_database()
    recommendation = await db.recommendations.find_one({"_id": ObjectId(recommendation_id)})
    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    await db.recommendations.update_one(
        {"_id": ObjectId(recommendation_id)},
        {"$set": {"status": payload.status, "reviewComments": payload.comments, "reviewedAt": datetime.now(timezone.utc)}},
    )
    recommendation["status"] = payload.status
    recommendation["reviewComments"] = payload.comments
    recommendation["reviewedAt"] = datetime.now(timezone.utc)
    return RecommendationOut(id=str(recommendation["_id"]), **{k: v for k, v in recommendation.items() if k != "_id"})


@app.get("/playbooks", response_model=list[PlaybookOut])
async def list_playbooks(domain: Optional[str] = None) -> list[PlaybookOut]:
    db = get_database()
    query = {}
    if domain:
        query["domain"] = domain
    items = await db.playbooks.find(query).to_list(length=100)
    return [PlaybookOut(id=str(item["_id"]), **{k: v for k, v in item.items() if k != "_id"}) for item in items]


@app.post("/playbooks", response_model=PlaybookOut)
async def create_playbook(payload: PlaybookCreate) -> PlaybookOut:
    db = get_database()
    playbook_data = payload.dict()
    result = await db.playbooks.insert_one(playbook_data)
    playbook_data["_id"] = result.inserted_id
    return PlaybookOut(id=str(playbook_data["_id"]), **{k: v for k, v in playbook_data.items() if k != "_id"})


@app.put("/playbooks/{playbook_id}", response_model=PlaybookOut)
async def update_playbook(playbook_id: str, payload: PlaybookCreate) -> PlaybookOut:
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
async def get_copilot_draft(recommendation_id: str) -> dict:
    db = get_database()
    recommendation = await db.recommendations.find_one({"_id": ObjectId(recommendation_id)})
    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    account = await db.accounts.find_one({"_id": ObjectId(recommendation["accountId"])})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    draft = generate_action_draft(recommendation, account)
    return {"draft": draft}


@app.get("/knowledge-sources", response_model=list[KnowledgeSourceOut])
async def list_knowledge_sources() -> list[KnowledgeSourceOut]:
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


