"""
Audit logging service for Emiti Metrics
Logs security-relevant actions for compliance and debugging
"""
import logging
import json
from datetime import datetime
from typing import Optional

# Dedicated audit logger - configured in main.py
audit_logger = logging.getLogger("audit")


def log_action(
    user_id: int,
    action: str,
    resource: str,
    resource_id: str,
    details: Optional[dict] = None,
    severity: str = "INFO"
) -> None:
    """
    Log security-relevant actions for audit trail.

    Args:
        user_id: The ID of the user performing the action
        action: The action being performed (e.g., CLIENT_ACCESS_GRANTED, DATA_EXPORT)
        resource: The type of resource being accessed (e.g., client, campaign, report)
        resource_id: The ID of the specific resource
        details: Optional additional details about the action
        severity: Log level (INFO, WARNING, ERROR)
    """
    timestamp = datetime.utcnow().isoformat() + "Z"

    log_entry = {
        "timestamp": timestamp,
        "user_id": user_id,
        "action": action,
        "resource": resource,
        "resource_id": resource_id,
        "details": details or {}
    }

    # Format for structured logging
    log_message = f"USER:{user_id} ACTION:{action} RESOURCE:{resource}:{resource_id} DETAILS:{json.dumps(details or {})}"

    # Log at appropriate level
    if severity == "ERROR":
        audit_logger.error(log_message, extra=log_entry)
    elif severity == "WARNING":
        audit_logger.warning(log_message, extra=log_entry)
    else:
        audit_logger.info(log_message, extra=log_entry)


def log_login_attempt(
    email: str,
    success: bool,
    user_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    reason: Optional[str] = None
) -> None:
    """
    Log authentication attempts.

    Args:
        email: The email used for login
        success: Whether the login was successful
        user_id: The user ID if login was successful
        ip_address: The IP address of the request
        reason: Reason for failure if unsuccessful
    """
    action = "LOGIN_SUCCESS" if success else "LOGIN_FAILURE"
    details = {
        "email": email,
        "ip_address": ip_address or "unknown",
    }

    if not success and reason:
        details["reason"] = reason

    log_action(
        user_id=user_id or 0,
        action=action,
        resource="auth",
        resource_id=email,
        details=details,
        severity="INFO" if success else "WARNING"
    )


def log_data_access(
    user_id: int,
    resource_type: str,
    resource_id: str,
    access_type: str = "READ",
    details: Optional[dict] = None
) -> None:
    """
    Log data access events.

    Args:
        user_id: The ID of the user accessing data
        resource_type: Type of resource (e.g., client, campaign, metrics)
        resource_id: ID of the specific resource
        access_type: Type of access (READ, WRITE, DELETE, EXPORT)
        details: Additional context
    """
    log_action(
        user_id=user_id,
        action=f"DATA_{access_type}",
        resource=resource_type,
        resource_id=resource_id,
        details=details
    )


def log_permission_denied(
    user_id: int,
    resource: str,
    resource_id: str,
    required_permission: str,
    details: Optional[dict] = None
) -> None:
    """
    Log when a user is denied access to a resource.

    Args:
        user_id: The ID of the user who was denied
        resource: The resource type they tried to access
        resource_id: The specific resource ID
        required_permission: What permission they needed
        details: Additional context
    """
    log_action(
        user_id=user_id,
        action="PERMISSION_DENIED",
        resource=resource,
        resource_id=resource_id,
        details={
            **(details or {}),
            "required_permission": required_permission
        },
        severity="WARNING"
    )
