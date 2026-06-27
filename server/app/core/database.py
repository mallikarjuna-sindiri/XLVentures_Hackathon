from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings

client: Optional[AsyncIOMotorClient] = None


def get_client() -> AsyncIOMotorClient:
    global client
    if client is None:
        client = AsyncIOMotorClient(settings.mongodb_uri)
    return client


def get_database():
    return get_client()[settings.mongodb_db]
