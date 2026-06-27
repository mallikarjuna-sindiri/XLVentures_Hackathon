from datetime import datetime, timezone
import logging

from app.core.database import get_database


logger = logging.getLogger(__name__)


async def seed_demo_data() -> None:
    try:
        db = get_database()
        accounts = db.accounts
        interactions = db.interactions
        recommendations = db.recommendations

        if await accounts.count_documents({}) > 0:
            return

        account = {
            "name": "Acme Health",
            "stage": "renewal_risk",
            "healthScore": 61,
            "owner": "Maya Patel",
            "status": "needs_attention",
            "createdAt": datetime.now(timezone.utc),
        }
        result = await accounts.insert_one(account)
        account_id = str(result.inserted_id)

        await interactions.insert_one(
            {
                "accountId": account_id,
                "source": "meeting_note",
                "text": "Customer mentioned slower adoption after workflow changes and asked for executive support.",
                "summary": "Adoption slowdown and executive support request",
                "riskLevel": "high",
                "createdAt": datetime.now(timezone.utc),
            }
        )

        await recommendations.insert_one(
            {
                "accountId": account_id,
                "action": "Schedule executive check-in within 7 days",
                "priority": "high",
                "confidence": 0.89,
                "reason": "Usage dropped and the latest note shows concern about workflow fit.",
                "evidence": ["Meeting note", "Account health score", "Renewal stage"],
                "status": "pending_review",
                "createdAt": datetime.now(timezone.utc),
            }
        )
    except Exception as exc:
        logger.warning("Skipping demo seed because MongoDB is unavailable: %s", exc)
