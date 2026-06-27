from datetime import datetime, timezone
from typing import Any

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
)
from app.services.recommendations import analyze_interaction, build_recommendation

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


def serialize_id(document: dict[str, Any]) -> dict[str, Any]:
    item = dict(document)
    item["id"] = str(item.pop("_id"))
    return item


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/accounts", response_model=list[AccountOut])
async def list_accounts() -> list[AccountOut]:
    db = get_database()
    items = await db.accounts.find().sort("createdAt", -1).to_list(length=100)
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

    recommendation_data = build_recommendation(
        InteractionCreate(source=latest_interaction["source"], text=latest_interaction["text"]),
        latest_interaction.get("riskLevel", "low"),
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
