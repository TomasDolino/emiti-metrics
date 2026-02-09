"""
Authentication router for Emiti Metrics

Includes:
- Login/logout with JWT tokens
- Refresh token rotation
- Optional Two-Factor Authentication (2FA/TOTP)
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Optional, List
import time
import re
import logging
import secrets

import hashlib

from slowapi import Limiter
from slowapi.util import get_remote_address

# Rate limiter - uses IP for unauthenticated endpoints
limiter = Limiter(key_func=get_remote_address)

# Audit logger for security events
audit_logger = logging.getLogger("auth_audit")
audit_logger.setLevel(logging.INFO)
if not audit_logger.handlers:
    handler = logging.FileHandler("/var/log/emiti-metrics-auth.log")
    handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
    audit_logger.addHandler(handler)

from ..database import get_db, UserDB, RefreshTokenDB, LoginHistoryDB, SecurityAlertDB
from ..auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    create_refresh_token,
    verify_refresh_token,
    revoke_refresh_token,
    revoke_all_user_refresh_tokens,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from ..services.security import (
    check_ip_allowed,
    record_failed_login,
    reset_failed_logins,
    is_account_locked,
    get_lockout_remaining_minutes,
    detect_suspicious_activity,
    send_security_alert,
    get_login_history,
    get_security_alerts,
    add_ip_to_whitelist,
    remove_ip_from_whitelist,
    unlock_account
)
from ..services.two_factor import (
    generate_totp_secret,
    get_totp_provisioning_uri,
    verify_totp_code,
    generate_backup_codes,
    verify_backup_code,
    remove_used_backup_code,
    get_remaining_backup_codes_count
)

router = APIRouter()

# Simple rate limiter for auth endpoints
_rate_limit_store: dict = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_REQUESTS = 5  # max attempts per window


def check_rate_limit(ip: str) -> bool:
    """Check if IP has exceeded rate limit. Returns True if allowed."""
    now = time.time()
    # Clean old entries
    _rate_limit_store[ip] = [t for t in _rate_limit_store[ip] if now - t < RATE_LIMIT_WINDOW]
    # Check limit
    if len(_rate_limit_store[ip]) >= RATE_LIMIT_MAX_REQUESTS:
        return False
    # Add new request
    _rate_limit_store[ip].append(now)
    return True


# ==================== SCHEMAS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('La contraseña debe tener al menos 8 caracteres')
        if not re.search(r'[A-Z]', v):
            raise ValueError('La contraseña debe contener al menos una mayúscula')
        if not re.search(r'[a-z]', v):
            raise ValueError('La contraseña debe contener al menos una minúscula')
        if not re.search(r'\d', v):
            raise ValueError('La contraseña debe contener al menos un número')
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    is_2fa_enabled: bool = False

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
    refresh_token: str | None = None  # Optional for backwards compatibility
    expires_in: int | None = None  # Access token expiration in seconds


class LoginResponse(BaseModel):
    """Response for login - either full token or 2FA required."""
    requires_2fa: bool = False
    temp_token: str | None = None  # Temporary token for 2FA verification
    access_token: str | None = None
    token_type: str | None = None
    user: UserResponse | None = None
    refresh_token: str | None = None
    expires_in: int | None = None


# ==================== 2FA SCHEMAS ====================

class TwoFactorSetupResponse(BaseModel):
    """Response when setting up 2FA."""
    secret: str  # Only shown once, user should store this
    qr_code_url: str  # otpauth:// URI for QR code
    message: str


class TwoFactorVerifyRequest(BaseModel):
    """Request to verify a 2FA code."""
    code: str  # 6-digit TOTP code or backup code

    @field_validator('code')
    @classmethod
    def validate_code(cls, v: str) -> str:
        # Allow both 6-digit TOTP codes and backup codes (XXXX-XXXX format)
        normalized = v.replace("-", "").replace(" ", "")
        if not normalized.isalnum():
            raise ValueError('Invalid code format')
        if len(normalized) not in [6, 8]:  # 6 for TOTP, 8 for backup
            raise ValueError('Code must be 6 digits (TOTP) or 8 characters (backup)')
        return v


class TwoFactorSetupVerifyRequest(BaseModel):
    """Request to verify 2FA setup and enable it."""
    code: str

    @field_validator('code')
    @classmethod
    def validate_code(cls, v: str) -> str:
        if not v.isdigit() or len(v) != 6:
            raise ValueError('Code must be 6 digits')
        return v


class TwoFactorLoginRequest(BaseModel):
    """Request to complete login with 2FA."""
    temp_token: str  # Temporary token from initial login
    code: str  # 6-digit TOTP code or backup code

    @field_validator('code')
    @classmethod
    def validate_code(cls, v: str) -> str:
        normalized = v.replace("-", "").replace(" ", "")
        if not normalized.isalnum():
            raise ValueError('Invalid code format')
        if len(normalized) not in [6, 8]:
            raise ValueError('Code must be 6 digits (TOTP) or 8 characters (backup)')
        return v


class TwoFactorDisableRequest(BaseModel):
    """Request to disable 2FA."""
    code: str  # Current TOTP code or backup code
    password: str  # Also require password for extra security

    @field_validator('code')
    @classmethod
    def validate_code(cls, v: str) -> str:
        normalized = v.replace("-", "").replace(" ", "")
        if not normalized.isalnum():
            raise ValueError('Invalid code format')
        if len(normalized) not in [6, 8]:
            raise ValueError('Code must be 6 digits (TOTP) or 8 characters (backup)')
        return v


class BackupCodesResponse(BaseModel):
    """Response with new backup codes."""
    backup_codes: List[str]  # Plain text codes - show once!
    message: str


class TwoFactorStatusResponse(BaseModel):
    """Response with 2FA status."""
    is_2fa_enabled: bool
    backup_codes_remaining: int


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class RefreshTokenResponse(BaseModel):
    access_token: str
    token_type: str
    refresh_token: str  # New refresh token (rotation)
    expires_in: int  # Access token expiration in seconds


class LogoutResponse(BaseModel):
    message: str
    tokens_revoked: int = 1


# ==================== ENDPOINTS ====================

@router.post("/register")
@limiter.limit("3/minute")
async def register(request: Request):
    """Registration disabled."""
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Registration is disabled. Contact admin for access."
    )


# Store for temporary 2FA tokens (in production, use Redis)
# Format: {temp_token: {"user_id": int, "expires": datetime}}
_pending_2fa_logins: dict = {}
TEMP_TOKEN_EXPIRE_MINUTES = 5  # Temporary token expires in 5 minutes


def create_temp_2fa_token(user_id: int) -> str:
    """Create a temporary token for 2FA verification."""
    token = secrets.token_urlsafe(32)
    _pending_2fa_logins[token] = {
        "user_id": user_id,
        "expires": datetime.utcnow() + timedelta(minutes=TEMP_TOKEN_EXPIRE_MINUTES)
    }
    return token


def verify_temp_2fa_token(token: str) -> Optional[int]:
    """Verify a temporary 2FA token and return user_id if valid."""
    if token not in _pending_2fa_logins:
        return None

    data = _pending_2fa_logins[token]
    if datetime.utcnow() > data["expires"]:
        # Token expired, remove it
        del _pending_2fa_logins[token]
        return None

    return data["user_id"]


def consume_temp_2fa_token(token: str) -> Optional[int]:
    """Consume (verify and remove) a temporary 2FA token."""
    user_id = verify_temp_2fa_token(token)
    if user_id is not None:
        del _pending_2fa_logins[token]
    return user_id


@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
async def login(credentials: UserLogin, request: Request, db: Session = Depends(get_db)):
    """
    Login and get access token + refresh token.

    Security checks:
        - Account lockout after multiple failed attempts
        - IP whitelist enforcement (if configured)
        - Suspicious activity detection

    If user has 2FA enabled:
        - Returns requires_2fa=True and a temp_token
        - Use POST /auth/2fa/verify with the temp_token and TOTP code to complete login

    If user does not have 2FA:
        - Returns access_token, refresh_token, and user info directly
    """
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")

    # Rate limit check
    if not check_rate_limit(client_ip):
        audit_logger.warning(f"RATE_LIMIT_EXCEEDED ip={client_ip} email={credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later."
        )

    # Find user first
    user = db.query(UserDB).filter(UserDB.email == credentials.email).first()

    # Check if account is locked (before validating password)
    if user and is_account_locked(user):
        remaining_minutes = get_lockout_remaining_minutes(user)
        audit_logger.warning(f"LOGIN_ACCOUNT_LOCKED ip={client_ip} user_id={user.id} remaining_minutes={remaining_minutes}")
        record_failed_login(user, client_ip, db, reason="account_locked")
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"Account is temporarily locked. Try again in {remaining_minutes} minutes."
        )

    # Check IP whitelist (if user exists and has whitelist configured)
    if user and user.allowed_ips and not check_ip_allowed(user, client_ip):
        audit_logger.warning(f"LOGIN_IP_BLOCKED ip={client_ip} user_id={user.id} email={user.email}")
        record_failed_login(user, client_ip, db, reason="ip_blocked")
        # Return generic error to avoid revealing user exists
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Validate credentials
    if not user or not verify_password(credentials.password, user.hashed_password):
        audit_logger.warning(f"LOGIN_FAILED ip={client_ip} email={credentials.email}")
        if user:
            record_failed_login(user, client_ip, db, reason="invalid_password")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Check if user is active
    if not user.is_active:
        audit_logger.warning(f"LOGIN_INACTIVE_USER ip={client_ip} user_id={user.id}")
        record_failed_login(user, client_ip, db, reason="account_disabled")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )

    # Detect suspicious activity (non-blocking, just logs alerts)
    detect_suspicious_activity(user.id, client_ip, "login", db)

    # Reset failed login counter and record successful login
    reset_failed_logins(user, client_ip, db, user_agent)

    # Check if user has 2FA enabled
    if user.is_2fa_enabled:
        audit_logger.info(f"LOGIN_2FA_REQUIRED ip={client_ip} user_id={user.id} email={user.email}")
        temp_token = create_temp_2fa_token(user.id)
        return LoginResponse(
            requires_2fa=True,
            temp_token=temp_token
        )

    # No 2FA - proceed with normal login
    audit_logger.info(f"LOGIN_SUCCESS ip={client_ip} user_id={user.id} email={user.email}")

    # Create short-lived access token (15 minutes)
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    # Create refresh token (7 days)
    raw_refresh_token, _ = create_refresh_token(user.id, db)

    return LoginResponse(
        requires_2fa=False,
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
        refresh_token=raw_refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60  # Convert to seconds
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserDB = Depends(get_current_user)):
    """Get current user info."""
    return current_user


@router.post("/refresh", response_model=RefreshTokenResponse)
@limiter.limit("10/minute")
async def refresh_access_token(
    token_request: RefreshTokenRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Get a new access token using a refresh token.

    The refresh token is rotated (old one is revoked, new one is issued)
    for security. This is a one-time use token.

    Returns:
        - access_token: New short-lived JWT (15 minutes)
        - refresh_token: New refresh token (old one is revoked)
        - expires_in: Access token expiration in seconds
    """
    client_ip = request.client.host if request.client else "unknown"

    # Verify the refresh token
    refresh_token_db = verify_refresh_token(token_request.refresh_token, db)

    if not refresh_token_db:
        audit_logger.warning(f"REFRESH_TOKEN_INVALID ip={client_ip}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    # Get the user
    user = db.query(UserDB).filter(UserDB.id == refresh_token_db.user_id).first()

    if not user or not user.is_active:
        # Revoke the token if user is not found or inactive
        revoke_refresh_token(refresh_token_db, db)
        audit_logger.warning(f"REFRESH_TOKEN_USER_INVALID ip={client_ip} user_id={refresh_token_db.user_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or disabled"
        )

    # Revoke the old refresh token (one-time use / rotation)
    revoke_refresh_token(refresh_token_db, db)

    # Create new access token
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    # Create new refresh token (rotation)
    raw_refresh_token, _ = create_refresh_token(user.id, db)

    audit_logger.info(f"TOKEN_REFRESHED ip={client_ip} user_id={user.id}")

    return RefreshTokenResponse(
        access_token=access_token,
        token_type="bearer",
        refresh_token=raw_refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    token_request: RefreshTokenRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Logout by revoking the provided refresh token.

    This invalidates the refresh token so it cannot be used to get new access tokens.
    The access token will still be valid until it expires (15 minutes max).
    """
    client_ip = request.client.host if request.client else "unknown"

    # Find and revoke the refresh token
    refresh_token_db = verify_refresh_token(token_request.refresh_token, db)

    if refresh_token_db:
        revoke_refresh_token(refresh_token_db, db)
        audit_logger.info(f"LOGOUT ip={client_ip} user_id={refresh_token_db.user_id}")
        return LogoutResponse(message="Successfully logged out", tokens_revoked=1)
    else:
        # Token was already invalid/revoked, but we still return success
        # This prevents information leakage about token validity
        audit_logger.info(f"LOGOUT_INVALID_TOKEN ip={client_ip}")
        return LogoutResponse(message="Successfully logged out", tokens_revoked=0)


@router.post("/logout-all", response_model=LogoutResponse)
async def logout_all(
    request: Request,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Logout from all devices by revoking all refresh tokens for the current user.

    Requires a valid access token to authenticate the request.
    """
    client_ip = request.client.host if request.client else "unknown"

    tokens_revoked = revoke_all_user_refresh_tokens(current_user.id, db)

    audit_logger.info(f"LOGOUT_ALL ip={client_ip} user_id={current_user.id} tokens_revoked={tokens_revoked}")

    return LogoutResponse(
        message=f"Successfully logged out from all devices",
        tokens_revoked=tokens_revoked
    )


# ==================== SECURITY ENDPOINTS (Admin) ====================

class LoginHistoryResponse(BaseModel):
    """Response for login history."""
    id: int
    ip_address: str
    user_agent: str | None
    success: bool
    failure_reason: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class SecurityAlertResponse(BaseModel):
    """Response for security alerts."""
    id: int
    user_id: int
    alert_type: str
    severity: str
    ip_address: str | None
    details: dict
    acknowledged: bool
    created_at: datetime

    class Config:
        from_attributes = True


class IPWhitelistRequest(BaseModel):
    """Request to add/remove IP from whitelist."""
    ip: str  # IP address or CIDR range (e.g., "192.168.1.0/24")
    user_id: int | None = None  # If not provided, uses current user


class IPWhitelistResponse(BaseModel):
    """Response for IP whitelist operations."""
    success: bool
    message: str
    allowed_ips: List[str]


class UserSecurityStatusResponse(BaseModel):
    """Response for user security status."""
    user_id: int
    email: str
    is_locked: bool
    lockout_remaining_minutes: int
    failed_login_count: int
    last_login_ip: str | None
    allowed_ips: List[str]
    is_2fa_enabled: bool


class UnlockAccountRequest(BaseModel):
    """Request to unlock a user account."""
    user_id: int


@router.get("/security/login-history", response_model=List[LoginHistoryResponse])
async def get_user_login_history(
    user_id: int | None = None,
    limit: int = 20,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get login history for a user.

    - Non-admin users can only see their own history
    - Admin users can see any user's history by providing user_id

    Returns last 20 login attempts by default.
    """
    # Determine which user's history to fetch
    target_user_id = user_id if user_id and current_user.role == "admin" else current_user.id

    history = get_login_history(target_user_id, db, limit)

    return [LoginHistoryResponse.model_validate(h) for h in history]


@router.post("/security/whitelist-ip", response_model=IPWhitelistResponse)
async def add_ip_whitelist(
    ip_request: IPWhitelistRequest,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add an IP address or CIDR range to whitelist.

    - Non-admin users can only modify their own whitelist
    - Admin users can modify any user's whitelist
    - Empty whitelist = all IPs allowed

    Examples:
        - Single IP: "192.168.1.100"
        - CIDR range: "192.168.1.0/24"
        - IPv6: "2001:db8::1"
    """
    # Determine target user
    if ip_request.user_id and ip_request.user_id != current_user.id:
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can modify other users' whitelist"
            )
        target_user = db.query(UserDB).filter(UserDB.id == ip_request.user_id).first()
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
    else:
        target_user = current_user

    success = add_ip_to_whitelist(target_user, ip_request.ip, db)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid IP address or CIDR format"
        )

    return IPWhitelistResponse(
        success=True,
        message=f"IP {ip_request.ip} added to whitelist",
        allowed_ips=target_user.allowed_ips or []
    )


@router.delete("/security/whitelist-ip", response_model=IPWhitelistResponse)
async def remove_ip_whitelist(
    ip_request: IPWhitelistRequest,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove an IP address or CIDR range from whitelist.

    - Non-admin users can only modify their own whitelist
    - Admin users can modify any user's whitelist
    """
    # Determine target user
    if ip_request.user_id and ip_request.user_id != current_user.id:
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can modify other users' whitelist"
            )
        target_user = db.query(UserDB).filter(UserDB.id == ip_request.user_id).first()
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
    else:
        target_user = current_user

    success = remove_ip_from_whitelist(target_user, ip_request.ip, db)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="IP not found in whitelist"
        )

    return IPWhitelistResponse(
        success=True,
        message=f"IP {ip_request.ip} removed from whitelist",
        allowed_ips=target_user.allowed_ips or []
    )


@router.get("/security/alerts", response_model=List[SecurityAlertResponse])
async def get_user_security_alerts(
    user_id: int | None = None,
    unacknowledged_only: bool = False,
    limit: int = 50,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get security alerts.

    - Non-admin users can only see their own alerts
    - Admin users can see all alerts or filter by user_id

    Returns up to 50 alerts by default, sorted by most recent.
    """
    # Admin can see all alerts or filter by user
    if current_user.role == "admin":
        target_user_id = user_id  # Can be None to see all
    else:
        target_user_id = current_user.id

    alerts = get_security_alerts(target_user_id, db, limit, unacknowledged_only)

    return [SecurityAlertResponse.model_validate(a) for a in alerts]


@router.post("/security/alerts/{alert_id}/acknowledge")
async def acknowledge_security_alert(
    alert_id: int,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Acknowledge a security alert.

    - Non-admin users can only acknowledge their own alerts
    - Admin users can acknowledge any alert
    """
    alert = db.query(SecurityAlertDB).filter(SecurityAlertDB.id == alert_id).first()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )

    # Check permissions
    if alert.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot acknowledge other users' alerts"
        )

    alert.acknowledged = True
    db.commit()

    audit_logger.info(f"SECURITY_ALERT_ACKNOWLEDGED alert_id={alert_id} by user_id={current_user.id}")

    return {"success": True, "message": "Alert acknowledged"}


@router.get("/security/status", response_model=UserSecurityStatusResponse)
async def get_security_status(
    user_id: int | None = None,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get security status for a user.

    - Non-admin users can only see their own status
    - Admin users can see any user's status
    """
    # Determine target user
    if user_id and user_id != current_user.id:
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can view other users' security status"
            )
        target_user = db.query(UserDB).filter(UserDB.id == user_id).first()
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
    else:
        target_user = current_user

    return UserSecurityStatusResponse(
        user_id=target_user.id,
        email=target_user.email,
        is_locked=is_account_locked(target_user),
        lockout_remaining_minutes=get_lockout_remaining_minutes(target_user),
        failed_login_count=target_user.failed_login_count or 0,
        last_login_ip=target_user.last_login_ip,
        allowed_ips=target_user.allowed_ips or [],
        is_2fa_enabled=target_user.is_2fa_enabled
    )


@router.post("/security/unlock-account")
async def admin_unlock_account(
    unlock_request: UnlockAccountRequest,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually unlock a locked user account (admin only).
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can unlock accounts"
        )

    target_user = db.query(UserDB).filter(UserDB.id == unlock_request.user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if not is_account_locked(target_user):
        return {"success": True, "message": "Account is not locked"}

    unlock_account(target_user, db, current_user.id)

    return {"success": True, "message": f"Account for {target_user.email} has been unlocked"}


# ==================== TWO-FACTOR AUTHENTICATION ====================

@router.post("/2fa/setup", response_model=TwoFactorSetupResponse)
async def setup_2fa(
    request: Request,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start 2FA setup by generating a TOTP secret.

    Returns the secret and a QR code URL (otpauth://) that can be scanned
    by authenticator apps like Google Authenticator, Authy, etc.

    The user must then verify a code using POST /auth/2fa/verify-setup to enable 2FA.

    Note: If 2FA is already enabled, this will generate a new secret but
    the old one remains active until verify-setup is called.
    """
    client_ip = request.client.host if request.client else "unknown"

    if current_user.is_2fa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is already enabled. Disable it first to set up a new secret."
        )

    try:
        # Generate new TOTP secret
        raw_secret, encrypted_secret = generate_totp_secret()

        # Store the encrypted secret temporarily (not enabled yet)
        current_user.totp_secret = encrypted_secret
        db.commit()

        # Generate QR code URL
        qr_code_url = get_totp_provisioning_uri(raw_secret, current_user.email)

        audit_logger.info(f"2FA_SETUP_STARTED ip={client_ip} user_id={current_user.id}")

        return TwoFactorSetupResponse(
            secret=raw_secret,  # Show once - user should save this
            qr_code_url=qr_code_url,
            message="Scan the QR code with your authenticator app, then verify with a code to enable 2FA."
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/2fa/verify-setup")
async def verify_2fa_setup(
    verify_request: TwoFactorSetupVerifyRequest,
    request: Request,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Complete 2FA setup by verifying a TOTP code.

    After calling /auth/2fa/setup, use this endpoint with a code from your
    authenticator app to enable 2FA for your account.

    Returns backup codes that should be saved securely.
    """
    client_ip = request.client.host if request.client else "unknown"

    if current_user.is_2fa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is already enabled"
        )

    if not current_user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA setup not started. Call POST /auth/2fa/setup first."
        )

    # Verify the code
    if not verify_totp_code(current_user.totp_secret, verify_request.code):
        audit_logger.warning(f"2FA_SETUP_VERIFY_FAILED ip={client_ip} user_id={current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid code. Please try again."
        )

    # Generate backup codes
    plain_codes, hashed_codes = generate_backup_codes()

    # Enable 2FA
    current_user.is_2fa_enabled = True
    current_user.backup_codes = hashed_codes
    db.commit()

    audit_logger.info(f"2FA_ENABLED ip={client_ip} user_id={current_user.id}")

    return {
        "message": "2FA has been enabled successfully!",
        "backup_codes": plain_codes,
        "warning": "Save these backup codes in a secure place. They will not be shown again!"
    }


@router.post("/2fa/verify", response_model=LoginResponse)
@limiter.limit("5/minute")
async def verify_2fa_login(
    verify_request: TwoFactorLoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Complete login with 2FA verification.

    After initial login returns requires_2fa=True, use this endpoint with:
    - temp_token: The temporary token from the login response
    - code: Either a 6-digit TOTP code or a backup code (XXXX-XXXX format)

    Backup codes can only be used once.
    """
    client_ip = request.client.host if request.client else "unknown"

    # Verify the temporary token
    user_id = consume_temp_2fa_token(verify_request.temp_token)
    if user_id is None:
        audit_logger.warning(f"2FA_VERIFY_INVALID_TOKEN ip={client_ip}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired temporary token. Please login again."
        )

    # Get the user
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or disabled"
        )

    # Normalize the code
    code = verify_request.code.replace("-", "").replace(" ", "")
    code_verified = False
    used_backup_code = False

    # Try TOTP verification first (6-digit codes)
    if len(code) == 6 and code.isdigit():
        if verify_totp_code(user.totp_secret, code):
            code_verified = True
    # Try backup code (8-character codes)
    elif len(code) == 8:
        is_valid, code_index = verify_backup_code(user.backup_codes or [], verify_request.code)
        if is_valid and code_index is not None:
            code_verified = True
            used_backup_code = True
            # Remove the used backup code
            user.backup_codes = remove_used_backup_code(user.backup_codes or [], code_index)
            db.commit()

    if not code_verified:
        audit_logger.warning(f"2FA_VERIFY_FAILED ip={client_ip} user_id={user.id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid 2FA code"
        )

    if used_backup_code:
        audit_logger.info(f"2FA_BACKUP_CODE_USED ip={client_ip} user_id={user.id}")
    else:
        audit_logger.info(f"2FA_LOGIN_SUCCESS ip={client_ip} user_id={user.id}")

    # Create tokens
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    raw_refresh_token, _ = create_refresh_token(user.id, db)

    response = LoginResponse(
        requires_2fa=False,
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
        refresh_token=raw_refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

    # Add warning if backup codes are running low
    remaining_codes = get_remaining_backup_codes_count(user.backup_codes or [])
    if used_backup_code and remaining_codes <= 3:
        # Note: In a real app, you'd want to include this in the response model
        pass  # Consider sending a notification to regenerate backup codes

    return response


@router.post("/2fa/disable")
async def disable_2fa(
    disable_request: TwoFactorDisableRequest,
    request: Request,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disable 2FA for the current user.

    Requires both:
    - A valid TOTP code or backup code
    - The user's password

    This is an extra security measure to prevent unauthorized disabling of 2FA.
    """
    client_ip = request.client.host if request.client else "unknown"

    if not current_user.is_2fa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled"
        )

    # Verify password first
    if not verify_password(disable_request.password, current_user.hashed_password):
        audit_logger.warning(f"2FA_DISABLE_WRONG_PASSWORD ip={client_ip} user_id={current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )

    # Normalize the code
    code = disable_request.code.replace("-", "").replace(" ", "")
    code_verified = False

    # Try TOTP verification
    if len(code) == 6 and code.isdigit():
        if verify_totp_code(current_user.totp_secret, code):
            code_verified = True
    # Try backup code
    elif len(code) == 8:
        is_valid, _ = verify_backup_code(current_user.backup_codes or [], disable_request.code)
        if is_valid:
            code_verified = True

    if not code_verified:
        audit_logger.warning(f"2FA_DISABLE_WRONG_CODE ip={client_ip} user_id={current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid 2FA code"
        )

    # Disable 2FA
    current_user.is_2fa_enabled = False
    current_user.totp_secret = None
    current_user.backup_codes = []
    db.commit()

    audit_logger.info(f"2FA_DISABLED ip={client_ip} user_id={current_user.id}")

    return {
        "message": "2FA has been disabled successfully"
    }


@router.get("/2fa/backup-codes", response_model=BackupCodesResponse)
async def regenerate_backup_codes(
    request: Request,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate new backup codes.

    This invalidates all previous backup codes.
    Requires 2FA to be enabled.
    """
    client_ip = request.client.host if request.client else "unknown"

    if not current_user.is_2fa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled. Enable 2FA first to get backup codes."
        )

    # Generate new backup codes
    plain_codes, hashed_codes = generate_backup_codes()

    # Store the new hashed codes (replaces old ones)
    current_user.backup_codes = hashed_codes
    db.commit()

    audit_logger.info(f"2FA_BACKUP_CODES_REGENERATED ip={client_ip} user_id={current_user.id}")

    return BackupCodesResponse(
        backup_codes=plain_codes,
        message="New backup codes generated. All previous backup codes are now invalid."
    )


@router.get("/2fa/status", response_model=TwoFactorStatusResponse)
async def get_2fa_status(
    current_user: UserDB = Depends(get_current_user)
):
    """
    Get the current 2FA status for the authenticated user.

    Returns:
    - is_2fa_enabled: Whether 2FA is enabled
    - backup_codes_remaining: Number of backup codes remaining
    """
    return TwoFactorStatusResponse(
        is_2fa_enabled=current_user.is_2fa_enabled,
        backup_codes_remaining=get_remaining_backup_codes_count(current_user.backup_codes or [])
    )


# ==================== PASSWORD SECURITY ====================

class PasswordValidationRequest(BaseModel):
    """Request to validate a password."""
    password: str


class PasswordValidationResponse(BaseModel):
    """Response for password validation."""
    is_valid: bool
    strength: str
    score: int
    is_breached: bool
    breach_count: int
    issues: List[str]


class PasswordChangeRequest(BaseModel):
    """Request to change password."""
    current_password: str
    new_password: str


@router.post("/password/validate", response_model=PasswordValidationResponse)
@limiter.limit("10/minute")
async def validate_password(
    password_request: PasswordValidationRequest,
    request: Request
):
    """
    Validate a password without saving it.

    Checks:
    - Password strength (weak/fair/good/strong/very_strong)
    - Whether the password has been exposed in data breaches (HaveIBeenPwned)
    - Common password patterns to avoid

    This endpoint is rate-limited to prevent abuse.
    """
    from ..services.password_security import validate_new_password

    is_valid, issues, details = await validate_new_password(
        password_request.password,
        check_breach=True
    )

    return PasswordValidationResponse(
        is_valid=is_valid,
        strength=details.get("strength", "unknown"),
        score=details.get("score", 0),
        is_breached=details.get("is_breached", False),
        breach_count=details.get("breach_count", 0),
        issues=issues
    )


@router.post("/password/change")
async def change_password(
    password_request: PasswordChangeRequest,
    request: Request,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change the current user's password.

    Requires:
    - Current password for verification
    - New password meeting strength requirements

    Side effects:
    - All existing sessions are revoked (except current)
    - All refresh tokens are revoked
    """
    client_ip = request.client.host if request.client else "unknown"

    # Verify current password
    if not verify_password(password_request.current_password, current_user.hashed_password):
        audit_logger.warning(f"PASSWORD_CHANGE_WRONG_CURRENT ip={client_ip} user_id={current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )

    # Validate new password
    from ..services.password_security import validate_new_password
    is_valid, issues, details = await validate_new_password(
        password_request.new_password,
        check_breach=True
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"New password is not strong enough: {', '.join(issues)}"
        )

    if details.get("is_breached"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This password has been exposed in {details['breach_count']:,} data breaches. Please choose a different password."
        )

    # Update password
    current_user.hashed_password = get_password_hash(password_request.new_password)
    db.commit()

    # Revoke all refresh tokens
    tokens_revoked = revoke_all_user_refresh_tokens(current_user.id, db)

    audit_logger.info(f"PASSWORD_CHANGED ip={client_ip} user_id={current_user.id} tokens_revoked={tokens_revoked}")

    return {
        "message": "Password changed successfully. You have been logged out from all other devices.",
        "tokens_revoked": tokens_revoked
    }


# ==================== SESSION MANAGEMENT ====================

class SessionInfo(BaseModel):
    """Information about an active session."""
    session_id: int
    ip_address: str
    device: str
    device_type: str
    created_at: datetime
    last_activity: datetime | None
    is_current: bool


class SessionListResponse(BaseModel):
    """Response for session list."""
    sessions: List[SessionInfo]
    total: int


@router.get("/sessions", response_model=SessionListResponse)
async def list_sessions(
    request: Request,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all active sessions for the current user.

    Returns information about each device/browser where the user is logged in.
    """
    from ..database import SessionDB
    from ..services.session_security import parse_user_agent

    # Get current token hash to identify current session
    auth_header = request.headers.get("Authorization", "")
    current_token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else None
    current_token_hash = hashlib.sha256(current_token.encode()).hexdigest() if current_token else None

    sessions = db.query(SessionDB).filter(
        SessionDB.user_id == current_user.id,
        SessionDB.is_active == True,
        SessionDB.expires_at > datetime.utcnow()
    ).order_by(SessionDB.last_activity.desc()).all()

    result = []
    for session in sessions:
        ua_info = parse_user_agent(session.user_agent or "")
        result.append(SessionInfo(
            session_id=session.id,
            ip_address=session.ip_address,
            device=f"{ua_info['browser']} on {ua_info['os']}",
            device_type=ua_info["device_type"],
            created_at=session.created_at,
            last_activity=session.last_activity,
            is_current=session.token_hash == current_token_hash if current_token_hash else False
        ))

    return SessionListResponse(sessions=result, total=len(result))


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: int,
    request: Request,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Revoke a specific session.

    Cannot revoke your current session - use /logout instead.
    """
    from ..database import SessionDB
    from ..services.session_security import SessionManager

    client_ip = request.client.host if request.client else "unknown"

    manager = SessionManager(db)
    success = manager.revoke_session(current_user.id, session_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or already revoked"
        )

    audit_logger.info(f"SESSION_REVOKED ip={client_ip} user_id={current_user.id} session_id={session_id}")

    return {"message": "Session revoked successfully"}


@router.delete("/sessions")
async def revoke_all_sessions(
    request: Request,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Revoke all sessions except the current one.

    This effectively logs out from all other devices.
    """
    from ..services.session_security import SessionManager

    client_ip = request.client.host if request.client else "unknown"

    # Get current token hash
    auth_header = request.headers.get("Authorization", "")
    current_token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else None
    current_token_hash = hashlib.sha256(current_token.encode()).hexdigest() if current_token else None

    manager = SessionManager(db)
    count = manager.revoke_all_sessions(current_user.id, except_current=current_token_hash)

    # Also revoke refresh tokens
    tokens_revoked = revoke_all_user_refresh_tokens(current_user.id, db)

    audit_logger.info(f"ALL_SESSIONS_REVOKED ip={client_ip} user_id={current_user.id} sessions={count} tokens={tokens_revoked}")

    return {
        "message": f"Logged out from {count} other sessions",
        "sessions_revoked": count,
        "tokens_revoked": tokens_revoked
    }


# ==================== WEBAUTHN / HARDWARE SECURITY KEYS ====================

class WebAuthnRegisterStartResponse(BaseModel):
    """Response when starting WebAuthn registration."""
    options: dict
    challenge_id: str


class WebAuthnRegisterCompleteRequest(BaseModel):
    """Request to complete WebAuthn registration."""
    challenge_id: str
    credential: dict
    device_name: str | None = None  # User-friendly name like "YubiKey Work"


class WebAuthnCredentialResponse(BaseModel):
    """Information about a registered WebAuthn credential."""
    id: int
    device_name: str | None
    created_at: datetime
    last_used: datetime | None


@router.post("/webauthn/register/start", response_model=WebAuthnRegisterStartResponse)
async def webauthn_register_start(
    request: Request,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start WebAuthn registration for a new security key.

    Returns registration options that should be passed to navigator.credentials.create()
    in the browser.
    """
    from ..services.webauthn import (
        is_webauthn_available,
        generate_registration_challenge
    )
    from ..database import WebAuthnCredentialDB
    import base64

    if not is_webauthn_available():
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="WebAuthn is not available. Install py_webauthn package."
        )

    # Get existing credentials to exclude
    existing_creds = db.query(WebAuthnCredentialDB).filter(
        WebAuthnCredentialDB.user_id == current_user.id,
        WebAuthnCredentialDB.is_active == True
    ).all()

    existing_ids = [
        base64.urlsafe_b64decode(cred.credential_id + "==")
        for cred in existing_creds
    ]

    try:
        options, challenge_id = generate_registration_challenge(
            user_id=str(current_user.id),
            user_email=current_user.email,
            user_name=current_user.name,
            existing_credentials=existing_ids
        )

        return WebAuthnRegisterStartResponse(
            options=options,
            challenge_id=challenge_id
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/webauthn/register/complete")
async def webauthn_register_complete(
    register_request: WebAuthnRegisterCompleteRequest,
    request: Request,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Complete WebAuthn registration by verifying the credential.

    Pass the credential object from navigator.credentials.create() response.
    """
    from ..services.webauthn import is_webauthn_available, verify_registration
    from ..database import WebAuthnCredentialDB
    import base64

    client_ip = request.client.host if request.client else "unknown"

    if not is_webauthn_available():
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="WebAuthn is not available"
        )

    try:
        credential_id, public_key, sign_count = verify_registration(
            challenge_id=register_request.challenge_id,
            credential=register_request.credential,
            expected_user_id=str(current_user.id)
        )

        # Store the credential
        new_credential = WebAuthnCredentialDB(
            user_id=current_user.id,
            credential_id=base64.urlsafe_b64encode(credential_id).decode().rstrip("="),
            public_key=base64.urlsafe_b64encode(public_key).decode(),
            sign_count=sign_count,
            device_name=register_request.device_name or "Security Key",
            is_active=True
        )

        db.add(new_credential)
        db.commit()

        audit_logger.info(f"WEBAUTHN_REGISTERED ip={client_ip} user_id={current_user.id} device={register_request.device_name}")

        return {
            "message": "Security key registered successfully",
            "device_name": new_credential.device_name
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/webauthn/credentials", response_model=List[WebAuthnCredentialResponse])
async def list_webauthn_credentials(
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all registered WebAuthn credentials (security keys) for the current user.
    """
    from ..database import WebAuthnCredentialDB

    credentials = db.query(WebAuthnCredentialDB).filter(
        WebAuthnCredentialDB.user_id == current_user.id,
        WebAuthnCredentialDB.is_active == True
    ).all()

    return [
        WebAuthnCredentialResponse(
            id=cred.id,
            device_name=cred.device_name,
            created_at=cred.created_at,
            last_used=cred.last_used
        )
        for cred in credentials
    ]


@router.delete("/webauthn/credentials/{credential_id}")
async def delete_webauthn_credential(
    credential_id: int,
    request: Request,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a WebAuthn credential (security key).
    """
    from ..database import WebAuthnCredentialDB

    client_ip = request.client.host if request.client else "unknown"

    credential = db.query(WebAuthnCredentialDB).filter(
        WebAuthnCredentialDB.id == credential_id,
        WebAuthnCredentialDB.user_id == current_user.id
    ).first()

    if not credential:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credential not found"
        )

    credential.is_active = False
    db.commit()

    audit_logger.info(f"WEBAUTHN_DELETED ip={client_ip} user_id={current_user.id} credential_id={credential_id}")

    return {"message": "Security key removed successfully"}
