from typing import Any
import logging
from app.services.recommendations import get_gemini_model

logger = logging.getLogger(__name__)


def generate_action_draft_fallback(recommendation: dict[str, Any], account: dict[str, Any]) -> str:
    action = recommendation.get("action", "").lower()
    account_name = account.get("name", "Customer")
    owner = account.get("owner", "Customer Success Team")

    if "executive" in action or "check-in" in action:
        return f"""Subject: Strategic Partnership Review & Executive Check-in — {account_name}

Hi Team,

I hope you're having a productive week.

Given some of the recent workflow changes and adjustments you've implemented, I would like to schedule a brief 20-30 minute check-in call with our Executive Sponsor and Core Product team next week. 

Our goal is to ensure your teams have everything they need to operate seamlessly and address any adoption blockers or optimization opportunities directly.

Could you let me know if any of the following times work for a sync?
• Tuesday, June 30th at 10:00 AM EST
• Thursday, July 2nd at 2:00 PM EST

Looking forward to speaking,

Best regards,

{owner}
Customer Success Sponsor
NEXORA Platform"""

    elif "expansion" in action or "route" in action:
        return f"""INTERNAL SALES ROUTING RECORD
----------------------------------------------
To: Sales & Expansion Team
From: Customer Success (Owner: {owner})
Target Account: {account_name} (Current Health Score: {account.get("healthScore", 90)})
Opportunity Type: Licensing Expansion & Upsell

SUMMARY OF RECENT SIGNALS:
Client has shown direct commercial intent to increase user count or upgrade current plans. 

PROPOSED ACTION PLAN:
1. Review standard enterprise volume licensing models.
2. Route account details to the designated Expansion Specialist.
3. Coordinate a discovery meeting to discuss bulk pricing and contract amendments.
4. Aim to deliver proposal within 48 hours.

STATUS: Ready for Assignment"""

    else:
        return f"""Subject: Quick Resource Guide & Adoption Check-in — {account_name}

Hi Team,

Following up on our recent support thread, I wanted to share a few curated guides to make sure you're getting the absolute most out of your current features:

• SSO Integration & Setup Best Practices: https://docs.nexora.com/sso-integration
• Team Onboarding Playbook: https://docs.nexora.com/onboarding-playbook

If you have any questions or require additional technical assistance setting this up, please let me know. I'd be happy to jump on a quick screenshare!

Best,

{owner}
Customer Success Manager
NEXORA Platform"""


async def generate_action_draft(recommendation: dict[str, Any], account: dict[str, Any]) -> str:
    model = get_gemini_model()
    if not model:
        logger.info("Gemini API Key not set. Using local fallback templates for action draft.")
        return generate_action_draft_fallback(recommendation, account)

    action = recommendation.get("action", "")
    reason = recommendation.get("reason", "")
    evidence = ", ".join(recommendation.get("evidence", []))
    account_name = account.get("name", "Customer")
    owner = account.get("owner", "Customer Success Team")
    domain = account.get("domain", "customer_success")

    prompt = f"""
    You are an AI Copilot for a Business Platform. Generate a professional communication draft.
    
    Account Name: {account_name}
    Account Owner: {owner}
    Domain: {domain}
    Recommended Action to Draft: {action}
    Reason: {reason}
    Evidence: {evidence}
    
    Instructions:
    - If the domain is 'customer_success': Draft a highly professional, polite email to the customer from the owner ({owner}). It should address the reason/objection, propose the next best action, and ask for a quick meeting or check-in. Keep the tone warm, consultative, and supportive.
    - If the domain is 'sales_coaching' (or is internal routing): Draft an INTERNAL SALES ROUTING RECORD. It should contain a header, target account info, a summary of recent signals, a proposed action plan with clear checkboxes or numbered steps, and a status indicator.
    
    Do not add extra markdown code blocks (like ```email or similar) or annotations. Return ONLY the plain text of the draft.
    """
    try:
        response = await model.generate_content_async(prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Error calling Gemini in generate_action_draft: {e}")
        return generate_action_draft_fallback(recommendation, account)
