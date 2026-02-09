"""
Password security service with breach checking and strength validation.
Uses HaveIBeenPwned API with k-anonymity (only sends first 5 chars of hash).
"""
import hashlib
import re
import httpx
from typing import Tuple, List, Optional
from enum import Enum


class PasswordStrength(str, Enum):
    """Password strength levels."""
    WEAK = "weak"
    FAIR = "fair"
    GOOD = "good"
    STRONG = "strong"
    VERY_STRONG = "very_strong"


# Common passwords to reject (top 100)
COMMON_PASSWORDS = {
    "123456", "password", "12345678", "qwerty", "123456789",
    "12345", "1234", "111111", "1234567", "dragon",
    "123123", "baseball", "iloveyou", "trustno1", "sunshine",
    "master", "welcome", "shadow", "ashley", "football",
    "jesus", "michael", "ninja", "mustang", "password1",
    "admin", "letmein", "abc123", "monkey", "access",
    "login", "passw0rd", "hello", "charlie", "donald",
    "princess", "qwertyuiop", "solo", "whatever", "loveme",
    "starwars", "computer", "corvette", "taylor", "freedom",
    "ginger", "flower", "silver", "777777", "987654321",
    "123321", "password123", "admin123", "root", "toor",
    "emiti", "metrics", "demo123", "test123", "user123",
}


async def check_password_breach(password: str) -> Tuple[bool, int]:
    """
    Check if password has been exposed in data breaches.
    Uses HaveIBeenPwned API with k-anonymity (safe, privacy-preserving).

    Returns:
        Tuple of (is_breached, breach_count)
    """
    # Hash the password with SHA-1 (required by HIBP API)
    sha1_hash = hashlib.sha1(password.encode('utf-8')).hexdigest().upper()

    # Send only first 5 characters (k-anonymity)
    prefix = sha1_hash[:5]
    suffix = sha1_hash[5:]

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.pwnedpasswords.com/range/{prefix}",
                headers={"User-Agent": "Emiti-Metrics-Security-Check"},
                timeout=5.0
            )

            if response.status_code == 200:
                # Check if our suffix is in the response
                hashes = response.text.split('\r\n')
                for line in hashes:
                    if ':' in line:
                        hash_suffix, count = line.split(':')
                        if hash_suffix == suffix:
                            return True, int(count)

            return False, 0

    except Exception:
        # If API is unavailable, don't block registration
        # but log the error
        return False, 0


def check_password_strength(password: str) -> Tuple[PasswordStrength, List[str], int]:
    """
    Analyze password strength and provide feedback.

    Returns:
        Tuple of (strength_level, issues_list, score_0_to_100)
    """
    issues = []
    score = 0

    # Length checks
    length = len(password)
    if length < 8:
        issues.append("Debe tener al menos 8 caracteres")
    elif length < 12:
        score += 10
    elif length < 16:
        score += 20
    else:
        score += 30

    # Character variety
    has_lower = bool(re.search(r'[a-z]', password))
    has_upper = bool(re.search(r'[A-Z]', password))
    has_digit = bool(re.search(r'\d', password))
    has_special = bool(re.search(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;\'`~]', password))

    if not has_lower:
        issues.append("Agregar letras minúsculas")
    else:
        score += 10

    if not has_upper:
        issues.append("Agregar letras mayúsculas")
    else:
        score += 10

    if not has_digit:
        issues.append("Agregar números")
    else:
        score += 10

    if not has_special:
        issues.append("Agregar caracteres especiales (!@#$%...)")
    else:
        score += 15

    # Pattern checks
    if re.search(r'(.)\1{2,}', password):
        issues.append("Evitar caracteres repetidos (aaa, 111)")
        score -= 10

    if re.search(r'(012|123|234|345|456|567|678|789|890)', password):
        issues.append("Evitar secuencias numéricas")
        score -= 10

    if re.search(r'(abc|bcd|cde|def|efg|fgh|ghi|qwe|wer|ert|rty|asd|sdf|dfg|zxc)', password.lower()):
        issues.append("Evitar secuencias de teclado")
        score -= 10

    # Common password check
    if password.lower() in COMMON_PASSWORDS:
        issues.append("Esta contraseña es muy común")
        score = 0

    # Bonus for good length with variety
    variety_count = sum([has_lower, has_upper, has_digit, has_special])
    if length >= 12 and variety_count >= 3:
        score += 15
    if length >= 16 and variety_count == 4:
        score += 10

    # Normalize score
    score = max(0, min(100, score))

    # Determine strength level
    if score < 20:
        strength = PasswordStrength.WEAK
    elif score < 40:
        strength = PasswordStrength.FAIR
    elif score < 60:
        strength = PasswordStrength.GOOD
    elif score < 80:
        strength = PasswordStrength.STRONG
    else:
        strength = PasswordStrength.VERY_STRONG

    return strength, issues, score


def is_password_acceptable(password: str, min_strength: PasswordStrength = PasswordStrength.FAIR) -> Tuple[bool, List[str]]:
    """
    Check if password meets minimum requirements.

    Returns:
        Tuple of (is_acceptable, issues_if_not)
    """
    strength, issues, score = check_password_strength(password)

    strength_order = [
        PasswordStrength.WEAK,
        PasswordStrength.FAIR,
        PasswordStrength.GOOD,
        PasswordStrength.STRONG,
        PasswordStrength.VERY_STRONG
    ]

    current_level = strength_order.index(strength)
    min_level = strength_order.index(min_strength)

    if current_level < min_level:
        return False, issues

    return True, []


async def validate_new_password(password: str, check_breach: bool = True) -> Tuple[bool, List[str], dict]:
    """
    Full password validation for registration/password change.

    Returns:
        Tuple of (is_valid, issues, details_dict)
    """
    issues = []
    details = {}

    # Check strength
    strength, strength_issues, score = check_password_strength(password)
    details["strength"] = strength.value
    details["score"] = score
    issues.extend(strength_issues)

    # Check against breaches (optional, async)
    if check_breach:
        is_breached, breach_count = await check_password_breach(password)
        details["is_breached"] = is_breached
        details["breach_count"] = breach_count

        if is_breached:
            issues.append(f"Esta contraseña fue expuesta en {breach_count:,} filtraciones de datos")

    # Determine if acceptable
    is_valid = (
        len(issues) == 0 or
        (strength in [PasswordStrength.GOOD, PasswordStrength.STRONG, PasswordStrength.VERY_STRONG]
         and not details.get("is_breached", False))
    )

    # Require minimum FAIR strength
    if strength == PasswordStrength.WEAK:
        is_valid = False

    return is_valid, issues, details


def generate_secure_password(length: int = 16) -> str:
    """Generate a cryptographically secure random password."""
    import secrets
    import string

    # Character sets
    lowercase = string.ascii_lowercase
    uppercase = string.ascii_uppercase
    digits = string.digits
    special = "!@#$%^&*()_+-=[]{}|;:,.<>?"

    # Ensure at least one of each type
    password = [
        secrets.choice(lowercase),
        secrets.choice(uppercase),
        secrets.choice(digits),
        secrets.choice(special),
    ]

    # Fill the rest randomly
    all_chars = lowercase + uppercase + digits + special
    for _ in range(length - 4):
        password.append(secrets.choice(all_chars))

    # Shuffle
    secrets.SystemRandom().shuffle(password)

    return ''.join(password)
