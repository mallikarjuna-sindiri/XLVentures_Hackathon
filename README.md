# NEXORA Decision Intelligence OS

NEXORA is a Docker-ready Agentic AI platform for B2B customer success. It turns customer signals into explainable next best actions, routes recommendations through human review, and learns from outcomes over time.

## Workflow At A Glance

The project is designed to be shown in this order during evaluation:

1. Authenticate with Google Sign-In.
2. Select the active customer account.
3. Capture a customer signal such as a meeting note, email, support ticket, or CRM update.
4. Trigger the planner to generate an explainable recommendation.
5. Review the recommendation with human approval, edit, or rejection.
6. Record outcomes and memory updates.
7. Inspect analytics, playbooks, the knowledge base, and AI chat.

## Documentation Index

This repository includes evaluator-friendly documentation in the `documents/` folder:

- [Architecture.md](documents/ARCHITECTURE.md) explains the agentic platform design, agent roles, governance, and data flow.
- [Setup.md](documents/SETUP.md) provides the run sequence and environment setup in a concise format.
- [Submission Scripts.md](documents/SUBMISSION_SCRIPTS.md) contains the demo and architecture narration script used for the video.

## Folder Structure

```text
.
├── client/
│   ├── Dockerfile
│   ├── .env.example
│   ├── package.json
│   └── src/
├── server/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
├── documents/
│   ├── ARCHITECTURE.md
│   ├── SETUP.md
│   └── SUBMISSION_SCRIPTS.md
├── docker-compose.yml
└── README.md
```

## Core Components

### Frontend

The frontend is a React + Vite application with Tailwind CSS. It contains the planner workflow, playbooks and knowledge base, analytics, and AI chat.

### Backend

The backend is a FastAPI service backed by MongoDB. It exposes account, interaction, recommendation, playbook, knowledge, review, and authentication endpoints.

### Deployment

The app is containerized with separate Dockerfiles for the client and server, and `docker-compose.yml` ties everything together with MongoDB for local and demo execution.

## Setup Files

The repository uses environment templates to keep local configuration explicit:

- `server/.env.example` contains the backend variables such as `MONGODB_URI`, `MONGODB_DB`, `CORS_ORIGINS`, `GOOGLE_CLIENT_ID`, and `JWT_SECRET`.
- `client/.env.example` contains the frontend variables such as `VITE_API_BASE_URL` and `VITE_GOOGLE_CLIENT_ID`.

## API Docs

When the backend is running, the interactive API documentation is available at:

- `http://localhost:8000/docs`

This is the best place to inspect the backend routes, request payloads, and response models during the demo.

## Requirements And Build Files

The backend dependencies are listed in `server/requirements.txt`.

The server container is defined in `server/Dockerfile`, and the client container is defined in `client/Dockerfile`.

## Local Run

1. Copy `server/.env.example` to `server/.env`.
2. Copy `client/.env.example` to `client/.env`.
3. Run `docker compose up --build` from the repository root.
4. Open the app at `http://localhost:3000`.
5. Open the API docs at `http://localhost:8000/docs`.

## Evaluator Notes

The clearest way to present the project is to follow the workflow sequence used in the demo script: authentication, account selection, signal capture, planner execution, human review, learning, and then analytics plus knowledge features.

That sequence matches the architecture document and the implementation in the codebase, which makes the walkthrough consistent from the README to the live demo.
