# Setup Guide

## 1. Prerequisites

- Docker and Docker Compose
- Node.js 20+ if you want to run the client outside Docker
- Python 3.11+ if you want to run the server outside Docker
- MongoDB is bundled through Docker Compose for the default workflow

## 2. Environment Variables

Copy the example environment files before running locally:

- `server/.env.example` -> `server/.env`
- `client/.env.example` -> `client/.env`

Typical server values:

- `MONGODB_URI=mongodb://localhost:27017`
- `MONGODB_DB=nexora`
- `CORS_ORIGINS=http://localhost:5173`
- `GOOGLE_CLIENT_ID=...`
- `JWT_SECRET=...`

Typical client values:

- `VITE_API_BASE_URL=http://localhost:8000`
- `VITE_GOOGLE_CLIENT_ID=...`

## 3. Run with Docker

From the repository root:

```bash
docker compose up --build
```

This starts:

- MongoDB on port `27017`
- FastAPI server on port `8000`
- Client app on port `3000`

Open the application at `http://localhost:3000`.

## 4. API Documentation

Once the server is running, the auto-generated API docs are available at:

- `http://localhost:8000/docs`

## 5. Folder Overview

- `client/` contains the React + Vite frontend
- `server/` contains the FastAPI backend
- `documents/` contains supporting documentation for evaluators
- `docker-compose.yml` ties the services together

## 6. Notes for Evaluators

The workflow is intentionally simple:

1. Sign in with Google authentication
2. Select an account
3. Capture a customer signal
4. Trigger the planner
5. Review the recommendation
6. Observe the learning and analytics layers

That sequence is the same one used in the demo script and the architecture document.
