from __future__ import annotations

from app.schemas import InteractionCreate


def analyze_interaction(text: str) -> tuple[str, str, list[str]]:
    lowered = text.lower()
    if any(keyword in lowered for keyword in ["renewal", "churn", "risk", "concern", "drop"]):
        return (
            "high",
            "Usage or renewal risk detected",
            ["Renewal risk language", "Customer concern", "Need immediate review"],
        )
    if any(keyword in lowered for keyword in ["expand", "more seats", "upgrade", "buy"]):
        return (
            "medium",
            "Expansion opportunity detected",
            ["Expansion intent", "Commercial opportunity"],
        )
    return (
        "low",
        "General customer update",
        ["Routine interaction"],
    )


def build_recommendation(source: InteractionCreate, risk_level: str) -> dict:
    if risk_level == "high":
        return {
            "action": "Schedule executive check-in within 7 days",
            "priority": "high",
            "confidence": 0.89,
            "reason": "High-risk language suggests the account needs immediate attention.",
            "evidence": [source.source, "Interaction analysis", "Account stage"],
            "status": "pending_review",
        }
    if risk_level == "medium":
        return {
            "action": "Route account to expansion follow-up",
            "priority": "medium",
            "confidence": 0.78,
            "reason": "The interaction contains expansion intent and potential commercial upside.",
            "evidence": [source.source, "Interaction analysis"],
            "status": "pending_review",
        }
    return {
        "action": "Send adoption guidance and request follow-up data",
        "priority": "low",
        "confidence": 0.66,
        "reason": "The account needs more signal before a stronger recommendation is made.",
        "evidence": [source.source, "Routine update"],
        "status": "pending_review",
    }
