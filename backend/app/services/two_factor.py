"""
Two-Factor Authentication (2FA) Service for Emiti Metrics

Implements TOTP (Time-based One-Time Password) authentication using pyotp.
Provides:
- TOTP secret generation and QR code URLs
- TOTP code verification
- Backup codes generation and verification

Security considerations:
- TOTP secrets are encrypted before storage
- Backup codes are hashed (one-time use)
- QR codes use otpauth:// URI format
"""

import secrets
import hashlib
import logging
from typing import Tuple, List, Optional

import pyotp

from .encryption import encrypt_token, decrypt_token

logger = logging.getLogger(__name__)

# Application name for TOTP (shown in authenticator apps)
TOTP_ISSUER = "Emiti Metrics"

# Number of backup codes to generate
BACKUP_CODES_COUNT = 10

# Backup code format: 8 characters, alphanumeric
BACKUP_CODE_LENGTH = 8


def generate_totp_secret() -> Tuple[str, str]:
    """
    Generate a new TOTP secret and provisioning URI.

    Returns:
        Tuple of (secret, encrypted_secret):
        - secret: The raw base32-encoded secret (needed for QR code)
        - encrypted_secret: The encrypted secret for database storage
    """
    # Generate a random base32-encoded secret
    secret = pyotp.random_base32()

    # Encrypt the secret for database storage
    encrypted_secret = encrypt_token(secret)

    if not encrypted_secret:
        logger.error("Failed to encrypt TOTP secret")
        raise ValueError("Encryption not configured. Cannot generate 2FA secret.")

    logger.info("Generated new TOTP secret")
    return secret, encrypted_secret


def get_totp_provisioning_uri(secret: str, user_email: str) -> str:
    """
    Generate the provisioning URI for setting up TOTP in an authenticator app.

    This URI can be encoded as a QR code for easy scanning.

    Args:
        secret: The raw TOTP secret (base32-encoded)
        user_email: The user's email address (used as account name)

    Returns:
        otpauth:// URI string
    """
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=user_email, issuer_name=TOTP_ISSUER)


def verify_totp_code(encrypted_secret: str, code: str) -> bool:
    """
    Verify a TOTP code against the user's secret.

    Allows a window of 1 interval (30 seconds) before and after current time
    to account for clock skew.

    Args:
        encrypted_secret: The encrypted TOTP secret from database
        code: The 6-digit code to verify

    Returns:
        True if the code is valid, False otherwise
    """
    if not encrypted_secret or not code:
        return False

    # Decrypt the secret
    secret = decrypt_token(encrypted_secret)
    if not secret:
        logger.error("Failed to decrypt TOTP secret")
        return False

    try:
        totp = pyotp.TOTP(secret)
        # valid_window=1 allows codes from 30s before to 30s after current time
        is_valid = totp.verify(code, valid_window=1)

        if is_valid:
            logger.info("TOTP code verified successfully")
        else:
            logger.warning("TOTP code verification failed")

        return is_valid
    except Exception as e:
        logger.error(f"Error verifying TOTP code: {e}")
        return False


def generate_backup_codes() -> Tuple[List[str], List[str]]:
    """
    Generate a set of backup codes for account recovery.

    Backup codes are one-time use codes that can be used if the user
    loses access to their authenticator app.

    Returns:
        Tuple of (plain_codes, hashed_codes):
        - plain_codes: List of human-readable backup codes (show to user once)
        - hashed_codes: List of hashed codes for database storage
    """
    plain_codes = []
    hashed_codes = []

    for _ in range(BACKUP_CODES_COUNT):
        # Generate a random alphanumeric code
        code = secrets.token_hex(BACKUP_CODE_LENGTH // 2).upper()

        # Format as XXXX-XXXX for readability
        formatted_code = f"{code[:4]}-{code[4:]}"
        plain_codes.append(formatted_code)

        # Hash the code for storage (without the dash)
        hashed = hash_backup_code(code)
        hashed_codes.append(hashed)

    logger.info(f"Generated {BACKUP_CODES_COUNT} backup codes")
    return plain_codes, hashed_codes


def hash_backup_code(code: str) -> str:
    """
    Hash a backup code for secure storage.

    Args:
        code: The backup code (with or without dash)

    Returns:
        SHA-256 hash of the normalized code
    """
    # Remove dash and convert to uppercase for consistency
    normalized = code.replace("-", "").upper()
    return hashlib.sha256(normalized.encode()).hexdigest()


def verify_backup_code(hashed_codes: List[str], code: str) -> Tuple[bool, Optional[int]]:
    """
    Verify a backup code against the user's stored hashed codes.

    Args:
        hashed_codes: List of hashed backup codes from database
        code: The backup code to verify (with or without dash)

    Returns:
        Tuple of (is_valid, code_index):
        - is_valid: True if the code matches
        - code_index: Index of the matched code (for removal), or None if not found
    """
    if not hashed_codes or not code:
        return False, None

    # Hash the provided code
    code_hash = hash_backup_code(code)

    # Check against stored hashes
    for index, stored_hash in enumerate(hashed_codes):
        if secrets.compare_digest(code_hash, stored_hash):
            logger.info(f"Backup code verified (index {index})")
            return True, index

    logger.warning("Backup code verification failed")
    return False, None


def remove_used_backup_code(hashed_codes: List[str], index: int) -> List[str]:
    """
    Remove a used backup code from the list.

    Args:
        hashed_codes: List of hashed backup codes
        index: Index of the code to remove

    Returns:
        New list with the code removed
    """
    if 0 <= index < len(hashed_codes):
        new_codes = hashed_codes.copy()
        new_codes.pop(index)
        logger.info(f"Removed used backup code. {len(new_codes)} codes remaining")
        return new_codes
    return hashed_codes


def get_remaining_backup_codes_count(hashed_codes: List[str]) -> int:
    """
    Get the number of remaining backup codes.

    Args:
        hashed_codes: List of hashed backup codes

    Returns:
        Number of remaining codes
    """
    return len(hashed_codes) if hashed_codes else 0
