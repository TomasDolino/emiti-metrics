"""
WebAuthn/FIDO2 service for hardware security key authentication.
Supports YubiKey, Google Titan, Windows Hello, Touch ID, etc.
"""
import os
import json
import secrets
from typing import Optional, List, Tuple
from datetime import datetime
import hashlib
import base64

# WebAuthn library
try:
    from webauthn import (
        generate_registration_options,
        verify_registration_response,
        generate_authentication_options,
        verify_authentication_response,
        options_to_json,
    )
    from webauthn.helpers import (
        bytes_to_base64url,
        base64url_to_bytes,
    )
    from webauthn.helpers.structs import (
        AuthenticatorSelectionCriteria,
        UserVerificationRequirement,
        ResidentKeyRequirement,
        AuthenticatorAttachment,
        PublicKeyCredentialDescriptor,
        AuthenticatorTransport,
    )
    WEBAUTHN_AVAILABLE = True
except ImportError:
    WEBAUTHN_AVAILABLE = False

from sqlalchemy.orm import Session

# Configuration
RP_ID = os.getenv("WEBAUTHN_RP_ID", "metrics.emiti.cloud")
RP_NAME = os.getenv("WEBAUTHN_RP_NAME", "Emiti Metrics")
ORIGIN = os.getenv("WEBAUTHN_ORIGIN", "https://metrics.emiti.cloud")

# Challenge storage (in production, use Redis with TTL)
_challenge_store: dict = {}


def is_webauthn_available() -> bool:
    """Check if WebAuthn library is available."""
    return WEBAUTHN_AVAILABLE


def generate_registration_challenge(
    user_id: str,
    user_email: str,
    user_name: str,
    existing_credentials: List[bytes] = None
) -> Tuple[dict, str]:
    """
    Generate WebAuthn registration options for a new security key.

    Returns:
        Tuple of (options_dict, challenge_id)
    """
    if not WEBAUTHN_AVAILABLE:
        raise RuntimeError("WebAuthn library not installed")

    # Convert user_id to bytes
    user_id_bytes = user_id.encode('utf-8')

    # Build exclude credentials list (prevent re-registering same key)
    exclude_credentials = []
    if existing_credentials:
        for cred_id in existing_credentials:
            exclude_credentials.append(
                PublicKeyCredentialDescriptor(
                    id=cred_id,
                    transports=[
                        AuthenticatorTransport.USB,
                        AuthenticatorTransport.NFC,
                        AuthenticatorTransport.BLE,
                        AuthenticatorTransport.INTERNAL,
                    ]
                )
            )

    # Generate registration options
    options = generate_registration_options(
        rp_id=RP_ID,
        rp_name=RP_NAME,
        user_id=user_id_bytes,
        user_name=user_email,
        user_display_name=user_name,
        exclude_credentials=exclude_credentials,
        authenticator_selection=AuthenticatorSelectionCriteria(
            authenticator_attachment=AuthenticatorAttachment.CROSS_PLATFORM,  # External keys
            resident_key=ResidentKeyRequirement.PREFERRED,
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
        timeout=60000,  # 60 seconds
    )

    # Store challenge for verification
    challenge_id = secrets.token_urlsafe(32)
    _challenge_store[challenge_id] = {
        "challenge": bytes_to_base64url(options.challenge),
        "user_id": user_id,
        "created_at": datetime.utcnow().isoformat(),
    }

    # Convert to JSON-serializable dict
    options_json = json.loads(options_to_json(options))

    return options_json, challenge_id


def verify_registration(
    challenge_id: str,
    credential: dict,
    expected_user_id: str
) -> Tuple[bytes, bytes, int]:
    """
    Verify WebAuthn registration response.

    Returns:
        Tuple of (credential_id, public_key, sign_count)
    """
    if not WEBAUTHN_AVAILABLE:
        raise RuntimeError("WebAuthn library not installed")

    # Get stored challenge
    challenge_data = _challenge_store.pop(challenge_id, None)
    if not challenge_data:
        raise ValueError("Invalid or expired challenge")

    if challenge_data["user_id"] != expected_user_id:
        raise ValueError("User ID mismatch")

    # Verify the registration response
    verification = verify_registration_response(
        credential=credential,
        expected_challenge=base64url_to_bytes(challenge_data["challenge"]),
        expected_rp_id=RP_ID,
        expected_origin=ORIGIN,
        require_user_verification=False,  # Don't require PIN/biometric
    )

    return (
        verification.credential_id,
        verification.credential_public_key,
        verification.sign_count,
    )


def generate_authentication_challenge(
    user_id: str,
    credential_ids: List[bytes]
) -> Tuple[dict, str]:
    """
    Generate WebAuthn authentication options.

    Returns:
        Tuple of (options_dict, challenge_id)
    """
    if not WEBAUTHN_AVAILABLE:
        raise RuntimeError("WebAuthn library not installed")

    if not credential_ids:
        raise ValueError("No credentials registered for user")

    # Build allowed credentials list
    allow_credentials = []
    for cred_id in credential_ids:
        allow_credentials.append(
            PublicKeyCredentialDescriptor(
                id=cred_id,
                transports=[
                    AuthenticatorTransport.USB,
                    AuthenticatorTransport.NFC,
                    AuthenticatorTransport.BLE,
                    AuthenticatorTransport.INTERNAL,
                ]
            )
        )

    # Generate authentication options
    options = generate_authentication_options(
        rp_id=RP_ID,
        allow_credentials=allow_credentials,
        user_verification=UserVerificationRequirement.PREFERRED,
        timeout=60000,
    )

    # Store challenge
    challenge_id = secrets.token_urlsafe(32)
    _challenge_store[challenge_id] = {
        "challenge": bytes_to_base64url(options.challenge),
        "user_id": user_id,
        "created_at": datetime.utcnow().isoformat(),
    }

    options_json = json.loads(options_to_json(options))

    return options_json, challenge_id


def verify_authentication(
    challenge_id: str,
    credential: dict,
    expected_user_id: str,
    stored_public_key: bytes,
    stored_sign_count: int
) -> int:
    """
    Verify WebAuthn authentication response.

    Returns:
        New sign count
    """
    if not WEBAUTHN_AVAILABLE:
        raise RuntimeError("WebAuthn library not installed")

    # Get stored challenge
    challenge_data = _challenge_store.pop(challenge_id, None)
    if not challenge_data:
        raise ValueError("Invalid or expired challenge")

    if challenge_data["user_id"] != expected_user_id:
        raise ValueError("User ID mismatch")

    # Get credential ID from response
    credential_id = base64url_to_bytes(credential.get("id", ""))

    # Verify the authentication response
    verification = verify_authentication_response(
        credential=credential,
        expected_challenge=base64url_to_bytes(challenge_data["challenge"]),
        expected_rp_id=RP_ID,
        expected_origin=ORIGIN,
        credential_public_key=stored_public_key,
        credential_current_sign_count=stored_sign_count,
        require_user_verification=False,
    )

    return verification.new_sign_count


def cleanup_expired_challenges(max_age_seconds: int = 300):
    """Remove challenges older than max_age_seconds."""
    now = datetime.utcnow()
    expired = []

    for challenge_id, data in _challenge_store.items():
        created = datetime.fromisoformat(data["created_at"])
        age = (now - created).total_seconds()
        if age > max_age_seconds:
            expired.append(challenge_id)

    for challenge_id in expired:
        _challenge_store.pop(challenge_id, None)

    return len(expired)
