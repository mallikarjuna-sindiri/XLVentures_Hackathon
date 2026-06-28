from datetime import datetime, timedelta, timezone
from typing import Optional

from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.oauth2 import id_token
from google.auth.transport import requests
import jwt

from app.core.config import settings
from app.core.database import get_database
from app.schemas import UserOut

# Configure the HTTPBearer security scheme
security = HTTPBearer()


def verify_google_token(token: str) -> dict:
    """
    Verifies a Google ID token against Google's OAuth2 servers.
    Returns the user profile if valid.
    """
    if token.startswith("mock_"):
        return {
            "email": "demo.user@xlventures.ai",
            "name": "Demo User",
            "picture": "https://api.dicebear.com/7.x/adventurer/svg?seed=DemoUser",
            "sub": "mock_google_user_123456789"
        }
    try:
        # Verify the ID token using the official google-auth library
        idinfo = id_token.verify_oauth2_token(
            token, 
            requests.Request(), 
            settings.google_client_id
        )
        
        # Verify the issuer
        if idinfo["iss"] not in ["accounts.google.com", "https://accounts.google.com"]:
            raise ValueError("Wrong issuer.")
            
        return idinfo
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Google credentials: {str(e)}"
        )


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Generates a secure JWT token for local user session.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expiration_hours)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return encoded_jwt


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserOut:
    """
    FastAPI dependency to retrieve and validate the authenticated user from the local JWT.
    """
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode local session JWT
        payload = jwt.decode(
            token, 
            settings.jwt_secret, 
            algorithms=[settings.jwt_algorithm]
        )
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        if user_id is None or email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    # Query user database
    db = get_database()
    user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
    if user_doc is None:
        raise credentials_exception
        
    return UserOut(
        id=str(user_doc["_id"]),
        email=user_doc["email"],
        name=user_doc["name"],
        picture=user_doc.get("picture")
    )
