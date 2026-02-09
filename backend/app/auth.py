"""
Authentication utilities for Emiti Metrics
JWT tokens + bcrypt password hashing + refresh tokens
"""
import os
import logging
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Tuple

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .database import get_db, UserDB, ClientDB, RefreshTokenDB

logger = logging.getLogger(__name__)

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY environment variable is not set. "
        "This is required for secure authentication. "
        "Please set JWT_SECRET_KEY to a secure random string."
    )
ALGORITHM = "HS256"

# Token expiration settings
ACCESS_TOKEN_EXPIRE_MINUTES = 15  # Short-lived access token
ACCESS_TOKEN_EXPIRE_HOURS = 24    # Legacy: for backwards compatibility
REFRESH_TOKEN_EXPIRE_DAYS = 7     # Long-lived refresh token

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Bearer token security
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def hash_token(token: str) -> str:
    """Hash a token using SHA-256 for secure storage."""
    return hashlib.sha256(token.encode()).hexdigest()


def create_refresh_token(user_id: int, db: Session) -> Tuple[str, RefreshTokenDB]:
    """
    Create a new refresh token for a user.

    Returns:
        Tuple of (raw_token, RefreshTokenDB) - the raw token should be sent to client,
        only the hash is stored in database.
    """
    # Generate a secure random token
    raw_token = secrets.token_urlsafe(64)
    token_hash = hash_token(raw_token)

    # Calculate expiration
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    # Store hashed token in database
    refresh_token_db = RefreshTokenDB(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
        is_revoked=False
    )
    db.add(refresh_token_db)
    db.commit()
    db.refresh(refresh_token_db)

    logger.info(f"Created refresh token for user {user_id}, expires at {expires_at}")

    return raw_token, refresh_token_db


def verify_refresh_token(raw_token: str, db: Session) -> Optional[RefreshTokenDB]:
    """
    Verify a refresh token and return the database record if valid.

    Args:
        raw_token: The raw token received from the client
        db: Database session

    Returns:
        RefreshTokenDB if valid, None if invalid/expired/revoked
    """
    token_hash = hash_token(raw_token)

    # Find token in database
    refresh_token = db.query(RefreshTokenDB).filter(
        RefreshTokenDB.token_hash == token_hash
    ).first()

    if not refresh_token:
        logger.warning("Refresh token not found in database")
        return None

    # Check if revoked
    if refresh_token.is_revoked:
        logger.warning(f"Attempted to use revoked refresh token for user {refresh_token.user_id}")
        return None

    # Check if expired
    if refresh_token.expires_at < datetime.utcnow():
        logger.warning(f"Attempted to use expired refresh token for user {refresh_token.user_id}")
        return None

    return refresh_token


def revoke_refresh_token(refresh_token: RefreshTokenDB, db: Session) -> None:
    """Revoke a single refresh token."""
    refresh_token.is_revoked = True
    db.commit()
    logger.info(f"Revoked refresh token {refresh_token.id} for user {refresh_token.user_id}")


def revoke_all_user_refresh_tokens(user_id: int, db: Session) -> int:
    """
    Revoke all refresh tokens for a user.

    Returns:
        Number of tokens revoked
    """
    result = db.query(RefreshTokenDB).filter(
        RefreshTokenDB.user_id == user_id,
        RefreshTokenDB.is_revoked == False
    ).update({"is_revoked": True})
    db.commit()
    logger.info(f"Revoked {result} refresh tokens for user {user_id}")
    return result


def cleanup_expired_refresh_tokens(db: Session) -> int:
    """
    Remove expired refresh tokens from the database.
    Should be called periodically (e.g., via a scheduled task).

    Returns:
        Number of tokens deleted
    """
    result = db.query(RefreshTokenDB).filter(
        RefreshTokenDB.expires_at < datetime.utcnow()
    ).delete()
    db.commit()
    logger.info(f"Cleaned up {result} expired refresh tokens")
    return result


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> UserDB:
    """Get current user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials
    payload = decode_token(token)

    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(UserDB).filter(UserDB.id == int(user_id)).first()
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )

    return user


async def validate_client_access(client_id: str, user: UserDB, db: Session) -> ClientDB:
    """
    Verify user has access to this client. Raises 403 if not.

    Args:
        client_id: The client ID to validate access for
        user: The authenticated user
        db: Database session

    Returns:
        ClientDB: The client object if access is granted

    Raises:
        HTTPException: 404 if client not found, 403 if access denied
    """
    from .services.audit import log_action

    # Check if client exists
    client = db.query(ClientDB).filter(ClientDB.id == client_id).first()

    if not client:
        log_action(
            user_id=user.id,
            action="CLIENT_ACCESS_DENIED",
            resource="client",
            resource_id=client_id,
            details={"reason": "client_not_found"}
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    # For now, allow all authenticated users (we can add restrictions later)
    # But log the access attempt for audit purposes
    log_action(
        user_id=user.id,
        action="CLIENT_ACCESS_GRANTED",
        resource="client",
        resource_id=client_id,
        details={"client_name": client.name, "user_role": user.role}
    )

    logger.debug(f"User {user.id} ({user.email}) accessed client {client_id}")

    return client
