import os


class Settings:
    def __init__(self) -> None:
        self.mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        self.mongodb_db = os.getenv("MONGODB_DB", "xlventures")
        self.cors_origins = [
            origin.strip()
            for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
            if origin.strip()
        ]


settings = Settings()
