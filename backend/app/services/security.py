"""
Security service for Emiti Metrics
IP whitelisting, intrusion detection, and account lockout
"""
import ipaddress
import logging
from datetime import datetime, timedelta
from typing import Optional, List
from collections import defaultdict
import time

from sqlalchemy.orm import Session

from ..database import UserDB, LoginHistoryDB, SecurityAlertDB
from .audit import log_action

logger = logging.getLogger(__name__)

# Configuration
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 30
SUSPICIOUS_IP_WINDOW_MINUTES = 5  # Window for detecting multiple IPs
SUSPICIOUS_IP_THRESHOLD = 3  # Number of different IPs that triggers alert
UNUSUAL_HOURS_START = 2  # 2 AM
UNUSUAL_HOURS_END = 5  # 5 AM
RAPID_REQUEST_WINDOW_SECONDS = 60
RAPID_REQUEST_THRESHOLD = 20  # Requests per minute

# In-memory store for rapid request detection (user_id -> list of timestamps)
_request_tracker: dict = defaultdict(list)


def check_ip_allowed(user: UserDB, client_ip: str) -> bool:
    """
    Check if IP is allowed for this user.
    Empty list = all IPs allowed.
    Supports both single IPs and CIDR ranges (e.g., 192.168.1.0/24).

    Args:
        user: The user to check
        client_ip: The client's IP address

    Returns:
        True if IP is allowed, False otherwise
    """
    if not user.allowed_ips:
        # Empty list means all IPs are allowed
        return True

    try:
        client_ip_obj = ipaddress.ip_address(client_ip)
    except ValueError:
        logger.warning(f"Invalid IP address format: {client_ip}")
        return False

    for allowed in user.allowed_ips:
        try:
            if '/' in allowed:
                # CIDR notation
                network = ipaddress.ip_network(allowed, strict=False)
                if client_ip_obj in network:
                    return True
            else:
                # Single IP
                if client_ip_obj == ipaddress.ip_address(allowed):
                    return True
        except ValueError:
            logger.warning(f"Invalid IP/CIDR in whitelist: {allowed}")
            continue

    return False


def record_failed_login(user: UserDB, ip: str, db: Session, reason: str = "invalid_credentials") -> None:
    """
    Record a failed login attempt and lock account after MAX_FAILED_ATTEMPTS.

    Args:
        user: The user who failed to login
        ip: The IP address of the failed attempt
        db: Database session
        reason: Reason for failure
    """
    # Increment failed login count
    user.failed_login_count = (user.failed_login_count or 0) + 1

    # Record in login history
    login_record = LoginHistoryDB(
        user_id=user.id,
        ip_address=ip,
        success=False,
        failure_reason=reason
    )
    db.add(login_record)

    # Check if we need to lock the account
    if user.failed_login_count >= MAX_FAILED_ATTEMPTS:
        user.locked_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)

        # Create security alert
        send_security_alert(
            user=user,
            alert_type="ACCOUNT_LOCKED",
            details={
                "ip_address": ip,
                "failed_attempts": user.failed_login_count,
                "lockout_minutes": LOCKOUT_DURATION_MINUTES
            },
            severity="CRITICAL",
            db=db
        )

        log_action(
            user_id=user.id,
            action="ACCOUNT_LOCKED",
            resource="user",
            resource_id=str(user.id),
            details={
                "ip_address": ip,
                "failed_attempts": user.failed_login_count,
                "locked_until": user.locked_until.isoformat()
            },
            severity="WARNING"
        )

    db.commit()

    logger.warning(
        f"Failed login for user {user.id} ({user.email}) from IP {ip}. "
        f"Attempts: {user.failed_login_count}/{MAX_FAILED_ATTEMPTS}"
    )


def reset_failed_logins(user: UserDB, ip: str, db: Session, user_agent: Optional[str] = None) -> None:
    """
    Reset failed login counter on successful login and record the login.

    Args:
        user: The user who logged in successfully
        ip: The IP address of the successful login
        db: Database session
        user_agent: Optional user agent string
    """
    # Check if this is a new IP
    if user.last_login_ip and user.last_login_ip != ip:
        # New IP detected - create alert
        send_security_alert(
            user=user,
            alert_type="NEW_IP_LOGIN",
            details={
                "previous_ip": user.last_login_ip,
                "new_ip": ip
            },
            severity="INFO",
            db=db
        )

    # Reset counters
    user.failed_login_count = 0
    user.locked_until = None
    user.last_login_ip = ip

    # Record successful login
    login_record = LoginHistoryDB(
        user_id=user.id,
        ip_address=ip,
        user_agent=user_agent,
        success=True
    )
    db.add(login_record)

    db.commit()

    logger.info(f"Successful login for user {user.id} ({user.email}) from IP {ip}")


def is_account_locked(user: UserDB) -> bool:
    """
    Check if account is temporarily locked.

    Args:
        user: The user to check

    Returns:
        True if account is locked, False otherwise
    """
    if user.locked_until is None:
        return False

    if datetime.utcnow() >= user.locked_until:
        # Lock has expired
        return False

    return True


def get_lockout_remaining_minutes(user: UserDB) -> int:
    """
    Get remaining lockout time in minutes.

    Args:
        user: The user to check

    Returns:
        Minutes remaining, 0 if not locked
    """
    if not is_account_locked(user):
        return 0

    remaining = user.locked_until - datetime.utcnow()
    return max(0, int(remaining.total_seconds() / 60))


def detect_suspicious_activity(user_id: int, ip: str, action: str, db: Session) -> bool:
    """
    Detect suspicious patterns like:
    - Multiple IPs in short time
    - Unusual hours
    - Rapid fire requests

    Args:
        user_id: The user's ID
        ip: The IP address
        action: The action being performed
        db: Database session

    Returns:
        True if suspicious activity detected, False otherwise
    """
    suspicious = False
    now = datetime.utcnow()

    # Get user for alerts
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user:
        return False

    # Check 1: Multiple different IPs in short time window
    window_start = now - timedelta(minutes=SUSPICIOUS_IP_WINDOW_MINUTES)
    recent_logins = db.query(LoginHistoryDB).filter(
        LoginHistoryDB.user_id == user_id,
        LoginHistoryDB.success == True,
        LoginHistoryDB.created_at >= window_start
    ).all()

    unique_ips = set(login.ip_address for login in recent_logins)
    unique_ips.add(ip)  # Include current IP

    if len(unique_ips) >= SUSPICIOUS_IP_THRESHOLD:
        send_security_alert(
            user=user,
            alert_type="MULTIPLE_IPS",
            details={
                "ip_addresses": list(unique_ips),
                "window_minutes": SUSPICIOUS_IP_WINDOW_MINUTES,
                "action": action
            },
            severity="WARNING",
            db=db
        )
        suspicious = True

    # Check 2: Unusual hours (configurable)
    current_hour = now.hour
    if UNUSUAL_HOURS_START <= current_hour < UNUSUAL_HOURS_END:
        send_security_alert(
            user=user,
            alert_type="UNUSUAL_HOURS",
            details={
                "hour": current_hour,
                "ip_address": ip,
                "action": action
            },
            severity="INFO",
            db=db
        )
        suspicious = True

    # Check 3: Rapid fire requests
    current_time = time.time()
    # Clean old entries
    _request_tracker[user_id] = [
        t for t in _request_tracker[user_id]
        if current_time - t < RAPID_REQUEST_WINDOW_SECONDS
    ]
    _request_tracker[user_id].append(current_time)

    if len(_request_tracker[user_id]) > RAPID_REQUEST_THRESHOLD:
        send_security_alert(
            user=user,
            alert_type="RAPID_REQUESTS",
            details={
                "request_count": len(_request_tracker[user_id]),
                "window_seconds": RAPID_REQUEST_WINDOW_SECONDS,
                "ip_address": ip,
                "action": action
            },
            severity="WARNING",
            db=db
        )
        suspicious = True

    return suspicious


def send_security_alert(
    user: UserDB,
    alert_type: str,
    details: dict,
    severity: str = "WARNING",
    db: Optional[Session] = None
) -> None:
    """
    Log security alert to database and audit log.
    Can be extended to send email notifications later.

    Args:
        user: The user involved in the alert
        alert_type: Type of alert (e.g., "MULTIPLE_FAILED_LOGINS", "NEW_IP", etc.)
        details: Additional details about the alert
        severity: Alert severity (INFO, WARNING, CRITICAL)
        db: Database session (optional, if provided will persist alert)
    """
    ip_address = details.get("ip_address") or details.get("new_ip")

    # Log to audit system
    log_action(
        user_id=user.id,
        action=f"SECURITY_ALERT_{alert_type}",
        resource="security",
        resource_id=str(user.id),
        details={
            "alert_type": alert_type,
            "severity": severity,
            **details
        },
        severity=severity
    )

    # Persist to database if session provided
    if db:
        alert = SecurityAlertDB(
            user_id=user.id,
            alert_type=alert_type,
            severity=severity,
            ip_address=ip_address,
            details=details
        )
        db.add(alert)
        # Don't commit here - let caller manage transaction

    logger.warning(
        f"Security alert [{severity}] for user {user.id} ({user.email}): "
        f"{alert_type} - {details}"
    )


def get_login_history(user_id: int, db: Session, limit: int = 20) -> List[LoginHistoryDB]:
    """
    Get login history for a user.

    Args:
        user_id: The user's ID
        db: Database session
        limit: Maximum number of records to return

    Returns:
        List of login history records
    """
    return db.query(LoginHistoryDB).filter(
        LoginHistoryDB.user_id == user_id
    ).order_by(
        LoginHistoryDB.created_at.desc()
    ).limit(limit).all()


def get_security_alerts(
    user_id: Optional[int] = None,
    db: Session = None,
    limit: int = 50,
    unacknowledged_only: bool = False
) -> List[SecurityAlertDB]:
    """
    Get security alerts, optionally filtered by user.

    Args:
        user_id: Optional user ID to filter by
        db: Database session
        limit: Maximum number of records to return
        unacknowledged_only: If True, only return unacknowledged alerts

    Returns:
        List of security alert records
    """
    query = db.query(SecurityAlertDB)

    if user_id:
        query = query.filter(SecurityAlertDB.user_id == user_id)

    if unacknowledged_only:
        query = query.filter(SecurityAlertDB.acknowledged == False)

    return query.order_by(
        SecurityAlertDB.created_at.desc()
    ).limit(limit).all()


def add_ip_to_whitelist(user: UserDB, ip: str, db: Session) -> bool:
    """
    Add an IP address or CIDR range to user's whitelist.

    Args:
        user: The user to update
        ip: IP address or CIDR range to add
        db: Database session

    Returns:
        True if added successfully, False if invalid or already exists
    """
    # Validate IP/CIDR format
    try:
        if '/' in ip:
            ipaddress.ip_network(ip, strict=False)
        else:
            ipaddress.ip_address(ip)
    except ValueError:
        logger.warning(f"Invalid IP/CIDR format: {ip}")
        return False

    # Get current whitelist
    current_list = user.allowed_ips or []

    # Check if already exists
    if ip in current_list:
        return True  # Already in list

    # Add to list
    current_list.append(ip)
    user.allowed_ips = current_list

    log_action(
        user_id=user.id,
        action="IP_WHITELIST_ADD",
        resource="user",
        resource_id=str(user.id),
        details={"ip": ip}
    )

    db.commit()
    return True


def remove_ip_from_whitelist(user: UserDB, ip: str, db: Session) -> bool:
    """
    Remove an IP address or CIDR range from user's whitelist.

    Args:
        user: The user to update
        ip: IP address or CIDR range to remove
        db: Database session

    Returns:
        True if removed successfully, False if not found
    """
    current_list = user.allowed_ips or []

    if ip not in current_list:
        return False

    current_list.remove(ip)
    user.allowed_ips = current_list

    log_action(
        user_id=user.id,
        action="IP_WHITELIST_REMOVE",
        resource="user",
        resource_id=str(user.id),
        details={"ip": ip}
    )

    db.commit()
    return True


def unlock_account(user: UserDB, db: Session, admin_user_id: int) -> None:
    """
    Manually unlock a user's account (admin action).

    Args:
        user: The user to unlock
        db: Database session
        admin_user_id: ID of the admin performing the unlock
    """
    user.locked_until = None
    user.failed_login_count = 0

    log_action(
        user_id=admin_user_id,
        action="ADMIN_UNLOCK_ACCOUNT",
        resource="user",
        resource_id=str(user.id),
        details={"unlocked_user_email": user.email}
    )

    db.commit()

    logger.info(f"Admin {admin_user_id} unlocked account for user {user.id} ({user.email})")
