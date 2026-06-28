from typing import Any


def generate_action_draft(recommendation: dict[str, Any], account: dict[str, Any]) -> str:
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
XL Ventures Platform"""

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

• SSO Integration & Setup Best Practices: https://docs.xlventures.com/sso-integration
• Team Onboarding Playbook: https://docs.xlventures.com/onboarding-playbook

If you have any questions or require additional technical assistance setting this up, please let me know. I'd be happy to jump on a quick screenshare!

Best,

{owner}
Customer Success Manager
XL Ventures Platform"""
