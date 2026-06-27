from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str


class AccountBase(BaseModel):
    name: str
    stage: str
    healthScore: int = Field(ge=0, le=100)
    owner: str
    status: str


class AccountOut(AccountBase):
    id: str


class InteractionCreate(BaseModel):
    source: str
    text: str


class InteractionOut(InteractionCreate):
    id: str
    accountId: str
    summary: str
    riskLevel: str
    createdAt: datetime


class RecommendationOut(BaseModel):
    id: str
    accountId: str
    action: str
    priority: str
    confidence: float
    reason: str
    evidence: list[str]
    status: str
    createdAt: datetime


class RecommendationReview(BaseModel):
    status: Literal["approved", "rejected", "edited"]
    comments: Optional[str] = None
