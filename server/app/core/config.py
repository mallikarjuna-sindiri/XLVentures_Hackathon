import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env relative to this file
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


class Settings:
    def __init__(self) -> None:
        self.mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        self.mongodb_db = os.getenv("MONGODB_DB", "xlventures")
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", "")
        self.cors_origins = [
            origin.strip()
            for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
            if origin.strip()
        ]
        
        # Google OAuth Configurations
        self.google_client_id = os.getenv(
            "GOOGLE_CLIENT_ID", 
            "240930111466-gvn2vnn0r91bkfo8tlpns2b9a7a998ai.apps.googleusercontent.com"
        )
        self.jwt_secret = os.getenv(
            "JWT_SECRET", 
            "super-secret-xl-ventures-key-change-me-at-deployment-time"
        )
        self.jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")
        self.jwt_expiration_hours = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))


settings = Settings()
