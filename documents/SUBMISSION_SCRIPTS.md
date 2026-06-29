# Submission Scripts

## 1. 5-Minute Demo Video Script

Hello everyone, my name is [Your Name], and this is NEXORA Decision Intelligence OS.

In this demo, I will walk you through the platform in the same order a real user would experience it: sign in, select an account, capture a customer signal, trigger the planner, review the recommendation, and then move into learning, analytics, playbooks, knowledge, and chat. I am keeping the sequence deliberate so the workflow stays easy to follow from start to finish.

Before I begin the main flow, I want to highlight the authentication layer. The platform uses Google Sign-In with a backend token exchange, so access is tied to a verified user session rather than an open demo state. Once authenticated, the app stores the active user session and all account actions remain linked to that identity. That gives the platform a more realistic enterprise feel from the very first step.

Now I will start with the Planner Loop, which is the operational core of the system. This is where the user works through the full decision cycle: selecting an account, capturing a signal, generating a recommendation, reviewing it, and learning from the result.

On the left, you can see the workspace context and the active accounts. This sidebar is important because it keeps the user grounded in one customer context at a time. For this demo, I am using Acme Health, which is a renewal-risk scenario, so the system has a clear business problem to solve.

Step 1 is account selection. Once Acme Health is selected, the platform loads the relevant interactions, recommendations, and state for that account. This is the starting point for the rest of the workflow.

Step 2 is Capture Customer Signal. Here the user can enter a meeting note, call transcript, email, support ticket, or CRM update. The goal at this stage is simple: convert unstructured customer input into structured decision-making input.

For example, I can paste a customer note into the text area, choose the signal type, and save it to memory. Once saved, the platform treats that signal as real context for analysis rather than as a standalone note.

Step 3 is Trigger Agentic Planner. This is where the system moves from input to reasoning. The planner reviews the selected account, the latest signal, account history, and the knowledge base, then produces a recommendation with an action, priority, confidence, reasoning, and evidence.

What makes this useful is that the recommendation is not vague. It is structured. The user can see what action is being suggested, why it matters, and which signals supported that decision. That is what makes the output explainable and business-ready.

Step 4 is Human-in-the-Loop Review. This is the governance layer of the platform. Every recommendation is shown to the user for approval before it becomes the final action. You can see the pending status, confidence score, priority label, reasoning, and evidence tags right on the card.

This is also where the user can approve or reject the recommendation. If needed, they can open the review controls, adjust the decision, and save the override. The result is a workflow that remains auditable, controlled, and suitable for real business environments.

The sequence is very important here: signal first, planner second, human review third. That ordering is intentional because it keeps the system safe, understandable, and operationally realistic.

After review, the workflow moves to Step 5, which is the outcome and memory layer. This is where the platform records what happened after the decision. Approved actions, rejected actions, and follow-up outcomes are all preserved so the system can learn over time.

That learning loop is one of the strongest parts of the project. The platform does not just generate a recommendation once and forget it. It remembers what happened, which makes future recommendations smarter and more aligned with actual outcomes.

Next is the Analytics tab. This section gives a higher-level view of performance, including acceptance rate, average AI confidence, mitigated risk value, and a trend chart. It shows that the system is not only functional, but measurable.

Then we have Playbooks and Knowledge Base. This section stores reusable business guidance, policies, and reference material. It helps the platform stay aligned with the company’s operating logic instead of relying only on model output.

Finally, the AI Chat section acts as a contextual assistant. It lets the user ask questions about the account, recent signals, and recommendations, which makes the platform more useful for quick follow-up analysis and day-to-day decision support.

So in one sentence, the workflow is: select the account, capture the signal, generate an explainable recommendation, review it with a human, and then learn from the outcome.

That is NEXORA Decision Intelligence OS. Thank you.

## 2. 5-Minute Architecture Walkthrough Script

Hello everyone, my name is [Your Name], and I will now walk you through the architecture of NEXORA Decision Intelligence OS.

The platform is designed as an agentic decision intelligence system for B2B customer success. Its job is to convert unstructured customer signals into explainable next best actions, while keeping human review and continuous learning at the center of the workflow.

I will explain the architecture in five layers: the experience layer, API layer, orchestration layer, intelligence layer, and governance plus memory layer.

The experience layer is the React web application. This is what the user sees and interacts with. It includes the Planner Loop, Playbooks and Knowledge Base, Analytics, and AI Chat. In practice, this is where the customer success manager works with accounts, submits signals, reviews recommendations, and monitors outcomes.

The API layer is powered by FastAPI. It handles authentication, account data, interactions, recommendations, playbooks, knowledge sources, and review actions. This layer acts as the bridge between the user interface and the decision workflow behind it.

Next is the orchestration layer. This is where the planner decides what needs to happen when a new signal arrives or when the user runs an analysis. Instead of forcing everything into one model call, the platform routes work through specialized steps so the process stays controlled, explainable, and modular.

The intelligence layer is where the recommendation is formed. The system ingests the signal, retrieves context, evaluates the account state, checks policy and business rules, ranks the possible next actions, and produces an explanation with evidence and confidence.

This is an important design choice because the output is not just a prediction. It is a decision package. The action, priority, reason, confidence, and evidence are all visible, so a business user can understand exactly why the recommendation was generated.

The governance layer keeps the process safe. Every recommendation goes through human-in-the-loop review before it is finalized. The user can approve or reject the recommendation, and the system records that decision for traceability.

The memory layer makes the system adaptive. Interactions, recommendations, outcomes, and review actions are stored so the platform can learn from prior decisions. That turns the workflow from a one-time response into a learning loop.

The data architecture is built around account records, customer interactions, recommendations, playbooks, and knowledge sources. The backend persists these objects and exposes them through API endpoints. The Step 4 review panel on the home page is populated from the recommendations API, so the UI always reflects the current backend state for the selected account.

The end-to-end workflow is straightforward. First, customer input is collected from a meeting note, email, support ticket, or CRM update. Second, the signal is normalized into structured data. Third, the planner assembles account context and retrieves relevant knowledge. Fourth, the system generates a ranked recommendation with evidence. Fifth, a human reviews the recommendation. Sixth, the final outcome is stored and used for learning.

The business use case is B2B SaaS customer success. That is why the recommendations focus on renewal risk, expansion follow-up, adoption support, and executive check-ins. The same architecture could be reused for sales, operations, staffing, or other decision workflows because the platform is intentionally modular.

This is where the business value becomes clear: the platform supports renewal prevention, customer expansion, and more structured decision-making in a real SaaS environment.

What makes the architecture strong is the combination of business understanding and agentic AI design. It is not just generating text. It is orchestrating a repeatable workflow, preserving context, enforcing governance, and creating measurable outcomes.

It is also deployment friendly. The application is containerized, the backend, frontend, and database are wired through Docker Compose, and the environment variables are separated cleanly for local and deployment setups. That makes the project easy to run consistently across laptops, demo environments, and cloud deployments.

So the architecture is doing three things at once: it is secure because of authentication, intelligent because of the planner and recommendation flow, and operationally ready because it is deployment-friendly from day one.

To conclude, NEXORA Decision Intelligence OS is a reusable agentic platform that turns customer signals into explainable decisions, routes them through human review, and learns from every outcome.

## 3. Novelty Highlights to Emphasize During the Demo

Use this section to make the innovation feel clear and memorable without sounding exaggerated.

If I had to summarize the novelty in one line, I would say this: the platform turns messy customer signals into governed, explainable, and memory-aware decisions in a way that is actually deployable.

The first novelty is that this is not a static dashboard. It is an agentic decision workflow. The system does not simply display customer data; it transforms signals into decisions, routes them through review, and updates memory from the outcome.

The second novelty is the human-in-the-loop governance design. Many prototypes either automate too much or stay too passive. This platform is intentionally balanced. The AI recommends, but the human still approves, edits, or rejects before action is finalized.

The third novelty is explainability by design. Every recommendation shows the action, priority, confidence, reason, and evidence. That means the evaluator can see why the system suggested a next step instead of getting a black-box answer.

The fourth novelty is memory-aware learning. Approved and rejected recommendations are not wasted; they become part of the ongoing memory loop, which helps future recommendations improve from prior outcomes.

The fifth novelty is modular agent orchestration. The platform is organized around a planner plus specialist agents, rather than one giant prompt. That makes the architecture easier to extend, debug, and reuse for other domains.

The sixth novelty is business-domain portability. Although this demo is focused on customer success, the same architecture can be adapted for sales coaching, account management, renewals, support triage, or any workflow that needs structured decisions.

The seventh novelty is deployment readiness. The app is designed with a practical stack, clean service boundaries, and container-based execution. It is not just a concept; it is a system that can be run, demoed, and handed off cleanly.

If I want to end this section strongly, I would say that the platform is not a proof of concept for a single prompt; it is a foundation for a reusable enterprise decision intelligence system.
