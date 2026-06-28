from datetime import datetime, timezone
import logging

from app.core.database import get_database


logger = logging.getLogger(__name__)


async def seed_demo_data() -> None:
    try:
        db = get_database()
        playbooks = db.playbooks
        knowledge_sources = db.knowledge_sources

        # Reset global data for fresh demo presentation
        await playbooks.delete_many({})
        await knowledge_sources.delete_many({})

        # 1. Seed knowledge sources
        default_sources = [
            {
                "title": "SLA-Escalation-Rules.pdf",
                "type": "Compliance Policy",
                "contentSummary": "Defines SLA levels (Priority 1: 2h response, Priority 2: 24h response) and triggers for high-risk customer escalations."
            },
            {
                "title": "SaaS-Pricing-Licensing-v3.md",
                "type": "Pricing Reference",
                "contentSummary": "Enterprise volume licensing tiers. seat upgrades pricing and standard discounts for custom multi-year contracts."
            },
            {
                "title": "Negotiation-Hurdles-Handbook.txt",
                "type": "Sales SOP Playbook",
                "contentSummary": "Strategic sales guidelines for closing deals, handling pricing objections, and competitor price-matching approvals."
            }
        ]
        await knowledge_sources.insert_many(default_sources)
        logger.info("Successfully seeded knowledge sources")

        # 2. Seed playbooks for both domains
        default_playbooks = [
            # Customer Success Playbooks
            {
                "name": "High Churn Risk Mitigation Playbook",
                "triggerRisk": "high",
                "action": "Schedule executive check-in within 7 days",
                "priority": "high",
                "confidence": 0.89,
                "reason": "Critical risk indicators (usage drops, customer escalations) detected. Initiate executive review to secure renewal.",
                "evidence": ["Interaction Risk Level: High", "Active Playbook: Churn Mitigation", "SLA-Escalation-Rules.pdf"],
                "domain": "customer_success"
            },
            {
                "name": "Expansion Opportunity Discovery Playbook",
                "triggerRisk": "medium",
                "action": "Route account to expansion follow-up",
                "priority": "medium",
                "confidence": 0.78,
                "reason": "Medium risk or positive growth signals detected. Route to CS director for volume upgrade negotiation.",
                "evidence": ["Interaction Risk Level: Medium", "Active Playbook: Expansion Discovery", "SaaS-Pricing-Licensing-v3.md"],
                "domain": "customer_success"
            },
            {
                "name": "Customer Onboarding Playbook",
                "triggerRisk": "low",
                "action": "Send adoption guidance and request follow-up data",
                "priority": "low",
                "confidence": 0.66,
                "reason": "Low risk or general inquiry. Maintain onboarding checkins and provide documentation.",
                "evidence": ["Interaction Risk Level: Low", "Active Playbook: Customer Onboarding"],
                "domain": "customer_success"
            },
            # Sales Deal Coaching Playbooks
            {
                "name": "Objection & Price Discount Playbook",
                "triggerRisk": "high",
                "action": "Request VP approval for custom discount",
                "priority": "high",
                "confidence": 0.92,
                "reason": "High pricing friction or competitor matching demand identified. Escalate custom discount approval.",
                "evidence": ["Deal Obstacle: Competitor Pressure", "Active Playbook: Price Objections", "Negotiation-Hurdles-Handbook.txt"],
                "domain": "sales_coaching"
            },
            {
                "name": "Proposal Alignment Playbook",
                "triggerRisk": "medium",
                "action": "Schedule executive alignment dinner during proposal",
                "priority": "medium",
                "confidence": 0.81,
                "reason": "Executive blockers identified in late-stage deal. Align decision makers via check-in meeting.",
                "evidence": ["Deal Obstacle: Proposal Staged", "Active Playbook: Proposal Alignment"],
                "domain": "sales_coaching"
            },
            {
                "name": "Capabilities Deck Playbook",
                "triggerRisk": "low",
                "action": "Send customized technical capability deck",
                "priority": "low",
                "confidence": 0.70,
                "reason": "Early discovery inquiry. Share technical specs and capabilities slides.",
                "evidence": ["Deal Obstacle: Early Inquiry", "Active Playbook: Technical Discovery"],
                "domain": "sales_coaching"
            }
        ]
        await playbooks.insert_many(default_playbooks)
        logger.info("Successfully seeded domain playbooks")

    except Exception as exc:
        logger.warning("Skipping global demo seed because MongoDB is unavailable: %s", exc)


async def seed_user_demo_data(db, user_id: str) -> None:
    """
    Seeds a user's isolated workspace with demo accounts, signals, and recommendations.
    """
    try:
        accounts = db.accounts
        interactions = db.interactions
        recommendations = db.recommendations

        # Check if the user already has accounts to prevent double seeding
        exists = await accounts.find_one({"userId": user_id})
        if exists:
            return

        clients = [
            # Customer Success Domain Accounts
            {
                "name": "Acme Health",
                "stage": "renewal_risk",
                "healthScore": 61,
                "owner": "Maya Patel",
                "status": "needs_attention",
                "domain": "customer_success",
                "userId": user_id,
                "createdAt": datetime.now(timezone.utc),
            },
            {
                "name": "Stripe Enterprise",
                "stage": "expansion",
                "healthScore": 94,
                "owner": "Alex Chen",
                "status": "healthy",
                "domain": "customer_success",
                "userId": user_id,
                "createdAt": datetime.now(timezone.utc),
            },
            {
                "name": "Figma Team",
                "stage": "onboarding",
                "healthScore": 82,
                "owner": "Sarah Jenkins",
                "status": "active",
                "domain": "customer_success",
                "userId": user_id,
                "createdAt": datetime.now(timezone.utc),
            },
            {
                "name": "Slack Technologies",
                "stage": "at_risk",
                "healthScore": 35,
                "owner": "Maya Patel",
                "status": "critical",
                "domain": "customer_success",
                "userId": user_id,
                "createdAt": datetime.now(timezone.utc),
            },
            # Sales Coaching Domain Accounts
            {
                "name": "Tesla Fleet Deal",
                "stage": "negotiation",
                "healthScore": 85,
                "owner": "Alex Chen",
                "status": "needs_attention",
                "domain": "sales_coaching",
                "userId": user_id,
                "createdAt": datetime.now(timezone.utc),
            },
            {
                "name": "Chevron Energy Partnership",
                "stage": "discovery",
                "healthScore": 40,
                "owner": "Sarah Jenkins",
                "status": "at_risk",
                "domain": "sales_coaching",
                "userId": user_id,
                "createdAt": datetime.now(timezone.utc),
            },
            {
                "name": "Microsoft Global Account",
                "stage": "proposal",
                "healthScore": 95,
                "owner": "Maya Patel",
                "status": "healthy",
                "domain": "sales_coaching",
                "userId": user_id,
                "createdAt": datetime.now(timezone.utc),
            }
        ]
        
        # Insert accounts and seed default signal/recommendation for each
        for client in clients:
            result = await accounts.insert_one(client)
            account_id = str(result.inserted_id)

            if client["name"] == "Acme Health":
                await interactions.insert_one({
                    "accountId": account_id,
                    "source": "meeting_note",
                    "text": "Customer mentioned slower adoption after workflow changes and asked for executive support.",
                    "summary": "Adoption slowdown and executive support request",
                    "riskLevel": "high",
                    "createdAt": datetime.now(timezone.utc),
                })
                await recommendations.insert_one({
                    "accountId": account_id,
                    "action": "Schedule executive check-in within 7 days",
                    "priority": "high",
                    "confidence": 0.89,
                    "reason": "Critical risk indicators (usage drops, customer escalations) detected. Initiate executive review to secure renewal.",
                    "evidence": ["Meeting note", "Account health score", "SLA-Escalation-Rules.pdf"],
                    "status": "pending_review",
                    "createdAt": datetime.now(timezone.utc),
                })
            elif client["name"] == "Stripe Enterprise":
                await interactions.insert_one({
                    "accountId": account_id,
                    "source": "email",
                    "text": "We are planning to add 150 new seats next month. Can you send details about enterprise licensing?",
                    "summary": "Request for adding 150 additional seats",
                    "riskLevel": "medium",
                    "createdAt": datetime.now(timezone.utc),
                })
                await recommendations.insert_one({
                    "accountId": account_id,
                    "action": "Route account to expansion follow-up",
                    "priority": "medium",
                    "confidence": 0.78,
                    "reason": "Medium risk or positive growth signals detected. Route to CS director for volume upgrade negotiation.",
                    "evidence": ["Email signal", "Interaction analysis", "SaaS-Pricing-Licensing-v3.md"],
                    "status": "pending_review",
                    "createdAt": datetime.now(timezone.utc),
                })
            elif client["name"] == "Figma Team":
                await interactions.insert_one({
                    "accountId": account_id,
                    "source": "support_ticket",
                    "text": "Need help setting up SSO integration for our new hires.",
                    "summary": "SSO integration help request",
                    "riskLevel": "low",
                    "createdAt": datetime.now(timezone.utc),
                })
                await recommendations.insert_one({
                    "accountId": account_id,
                    "action": "Send adoption guidance and request follow-up data",
                    "priority": "low",
                    "confidence": 0.66,
                    "reason": "Low risk or general inquiry. Maintain onboarding checkins and provide documentation.",
                    "evidence": ["Support ticket", "Routine update"],
                    "status": "approved",
                    "createdAt": datetime.now(timezone.utc),
                })
            elif client["name"] == "Slack Technologies":
                await interactions.insert_one({
                    "accountId": account_id,
                    "source": "meeting_note",
                    "text": "Competitor is offering a 40% discount. We are seriously considering moving our workload at renewal.",
                    "summary": "Competitor pricing pressure and migration risk",
                    "riskLevel": "high",
                    "createdAt": datetime.now(timezone.utc),
                })
                await recommendations.insert_one({
                    "accountId": account_id,
                    "action": "Schedule executive check-in within 7 days",
                    "priority": "high",
                    "confidence": 0.95,
                    "reason": "Critical competitor threat identified. Renewal is at severe risk.",
                    "evidence": ["Meeting note", "Severe risk level", "SLA-Escalation-Rules.pdf"],
                    "status": "pending_review",
                    "createdAt": datetime.now(timezone.utc),
                })
            elif client["name"] == "Tesla Fleet Deal":
                await interactions.insert_one({
                    "accountId": account_id,
                    "source": "email",
                    "text": "We are evaluating a competitor who offered a 25% lower price. We want to align pricing before signing.",
                    "summary": "Price match objection on fleet deal",
                    "riskLevel": "high",
                    "createdAt": datetime.now(timezone.utc),
                })
                await recommendations.insert_one({
                    "accountId": account_id,
                    "action": "Request VP approval for custom discount",
                    "priority": "high",
                    "confidence": 0.92,
                    "reason": "High pricing friction or competitor matching demand identified. Escalate custom discount approval.",
                    "evidence": ["Email signal", "Price objection", "Negotiation-Hurdles-Handbook.txt"],
                    "status": "pending_review",
                    "createdAt": datetime.now(timezone.utc),
                })
            elif client["name"] == "Chevron Energy Partnership":
                await interactions.insert_one({
                    "accountId": account_id,
                    "source": "meeting_note",
                    "text": "Client's VP expressed doubt about our scaling limits. Need to align their tech leadership.",
                    "summary": "Scaling bottleneck alignment needs",
                    "riskLevel": "medium",
                    "createdAt": datetime.now(timezone.utc),
                })
                await recommendations.insert_one({
                    "accountId": account_id,
                    "action": "Schedule executive alignment dinner during proposal",
                    "priority": "medium",
                    "confidence": 0.81,
                    "reason": "Key stakeholder objections identified in proposal stage. Arrange executive dinner.",
                    "evidence": ["Meeting note", "Technical objection", "Strategic account"],
                    "status": "pending_review",
                    "createdAt": datetime.now(timezone.utc),
                })
            elif client["name"] == "Microsoft Global Account":
                await interactions.insert_one({
                    "accountId": account_id,
                    "source": "crm_update",
                    "text": "Client requested slides summarizing our product roadmap and developer support models.",
                    "summary": "Roadmap and support model request",
                    "riskLevel": "low",
                    "createdAt": datetime.now(timezone.utc),
                })
                await recommendations.insert_one({
                    "accountId": account_id,
                    "action": "Send customized technical capability deck",
                    "priority": "low",
                    "confidence": 0.70,
                    "reason": "Early discovery inquiry. Share technical specs and capabilities slides.",
                    "evidence": ["CRM update", "Information request"],
                    "status": "approved",
                    "createdAt": datetime.now(timezone.utc),
                })

        logger.info("Successfully seeded user isolated workspace data")

    except Exception as exc:
        logger.warning("Skipping user workspace seed because MongoDB is unavailable: %s", exc)
