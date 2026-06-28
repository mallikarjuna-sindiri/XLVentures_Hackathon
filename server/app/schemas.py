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
    domain: str = "customer_success"


class AccountCreate(AccountBase):
    pass


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
    agentLogs: Optional[list[dict]] = None


class RecommendationReview(BaseModel):
    status: Literal["approved", "rejected", "edited"]
    comments: Optional[str] = None


class PlaybookBase(BaseModel):
    name: str
    triggerRisk: str
    action: str
    priority: str
    confidence: float
    reason: str
    evidence: list[str]
    domain: str = "customer_success"


class PlaybookCreate(PlaybookBase):
    pass


class PlaybookOut(PlaybookBase):
    id: str


class KnowledgeSourceOut(BaseModel):
    id: str
    title: str
    type: str
    contentSummary: str


class GoogleLoginPayload(BaseModel):
    credential: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None


class AuthResponse(BaseModel):
    token: str
    user: UserOut



