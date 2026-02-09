"""
Encryption service for sensitive data like Meta API tokens.

Uses Fernet symmetric encryption from the cryptography library.
Encryption key is read from the ENCRYPTION_KEY environment variable.

Usage:
    from app.services.encryption import encrypt_token, decrypt_token

    # Encrypt before saving to DB
    encrypted = encrypt_token("EAAxxxxxxx...")

    # Decrypt when reading from DB
    plain = decrypt_token(encrypted)
"""

import os
import logging
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger(__name__)

# Cache the Fernet instance for reuse
_fernet_instance: Optional[Fernet] = None


def _get_fernet() -> Optional[Fernet]:
    """
    Get or create a Fernet instance using the ENCRYPTION_KEY from environment.
    Returns None if the key is not configured.
    """
    global _fernet_instance

    if _fernet_instance is not None:
        return _fernet_instance

    encryption_key = os.getenv("ENCRYPTION_KEY")

    if not encryption_key:
        logger.warning("ENCRYPTION_KEY not set in environment variables")
        return None

    try:
        _fernet_instance = Fernet(encryption_key.encode())
        return _fernet_instance
    except Exception as e:
        logger.error(f"Failed to initialize Fernet with ENCRYPTION_KEY: {e}")
        return None


def generate_key() -> str:
    """
    Generate a new Fernet encryption key.

    Use this to create a key for your .env file:
        python -c "from app.services.encryption import generate_key; print(generate_key())"

    Returns:
        A URL-safe base64-encoded 32-byte key as a string.
    """
    return Fernet.generate_key().decode()


def encrypt_token(plain_text: str) -> Optional[str]:
    """
    Encrypt a plain text string (e.g., API token).

    Args:
        plain_text: The string to encrypt.

    Returns:
        The encrypted string (base64 encoded), or None if encryption fails.
    """
    if not plain_text:
        return None

    fernet = _get_fernet()
    if fernet is None:
        logger.error("Cannot encrypt: Fernet not initialized")
        return None

    try:
        encrypted = fernet.encrypt(plain_text.encode())
        return encrypted.decode()
    except Exception as e:
        logger.error(f"Encryption failed: {e}")
        return None


def decrypt_token(encrypted_text: str) -> Optional[str]:
    """
    Decrypt an encrypted string back to plain text.

    Args:
        encrypted_text: The encrypted string (base64 encoded).

    Returns:
        The decrypted plain text string, or None if decryption fails.
    """
    if not encrypted_text:
        return None

    fernet = _get_fernet()
    if fernet is None:
        logger.error("Cannot decrypt: Fernet not initialized")
        return None

    try:
        decrypted = fernet.decrypt(encrypted_text.encode())
        return decrypted.decode()
    except InvalidToken:
        logger.error("Decryption failed: Invalid token or wrong key")
        return None
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        return None


def is_encryption_configured() -> bool:
    """
    Check if encryption is properly configured.

    Returns:
        True if ENCRYPTION_KEY is set and valid, False otherwise.
    """
    return _get_fernet() is not None
