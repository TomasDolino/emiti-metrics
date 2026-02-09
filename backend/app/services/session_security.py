"""
Session security service with fingerprinting and device tracking.
Detects suspicious session activity and manages concurrent sessions.
"""
import hashlib
import json
import re
from typing import Optional, List, Dict, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import ipaddress

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_


class SessionRisk(str, Enum):
    """Session risk levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class DeviceFingerprint:
    """Device fingerprint data."""
    user_agent: str
    ip_address: str
    accept_language: Optional[str] = None
    accept_encoding: Optional[str] = None
    screen_resolution: Optional[str] = None
    timezone: Optional[str] = None
    platform: Optional[str] = None

    def to_hash(self) -> str:
        """Generate a hash of the fingerprint for comparison."""
        data = f"{self.user_agent}:{self.platform}:{self.timezone}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "user_agent": self.user_agent,
            "ip_address": self.ip_address,
            "accept_language": self.accept_language,
            "screen_resolution": self.screen_resolution,
            "timezone": self.timezone,
            "platform": self.platform,
            "fingerprint_hash": self.to_hash(),
        }


def parse_user_agent(user_agent: str) -> dict:
    """Parse user agent string into components."""
    result = {
        "browser": "Unknown",
        "browser_version": None,
        "os": "Unknown",
        "os_version": None,
        "device_type": "desktop",
        "is_bot": False,
    }

    ua_lower = user_agent.lower()

    # Detect bots
    bot_patterns = ['bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python', 'java', 'php']
    if any(pattern in ua_lower for pattern in bot_patterns):
        result["is_bot"] = True
        result["device_type"] = "bot"
        return result

    # Detect mobile
    mobile_patterns = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone']
    if any(pattern in ua_lower for pattern in mobile_patterns):
        result["device_type"] = "mobile"
        if 'tablet' in ua_lower or 'ipad' in ua_lower:
            result["device_type"] = "tablet"

    # Detect browser
    if 'firefox' in ua_lower:
        result["browser"] = "Firefox"
        match = re.search(r'firefox/(\d+\.?\d*)', ua_lower)
        if match:
            result["browser_version"] = match.group(1)
    elif 'edg' in ua_lower:
        result["browser"] = "Edge"
        match = re.search(r'edg/(\d+\.?\d*)', ua_lower)
        if match:
            result["browser_version"] = match.group(1)
    elif 'chrome' in ua_lower:
        result["browser"] = "Chrome"
        match = re.search(r'chrome/(\d+\.?\d*)', ua_lower)
        if match:
            result["browser_version"] = match.group(1)
    elif 'safari' in ua_lower:
        result["browser"] = "Safari"
        match = re.search(r'version/(\d+\.?\d*)', ua_lower)
        if match:
            result["browser_version"] = match.group(1)

    # Detect OS
    if 'windows' in ua_lower:
        result["os"] = "Windows"
        if 'windows nt 10' in ua_lower:
            result["os_version"] = "10/11"
        elif 'windows nt 6.3' in ua_lower:
            result["os_version"] = "8.1"
        elif 'windows nt 6.1' in ua_lower:
            result["os_version"] = "7"
    elif 'mac os' in ua_lower or 'macintosh' in ua_lower:
        result["os"] = "macOS"
        match = re.search(r'mac os x (\d+[._]\d+)', ua_lower)
        if match:
            result["os_version"] = match.group(1).replace('_', '.')
    elif 'linux' in ua_lower:
        result["os"] = "Linux"
        if 'android' in ua_lower:
            result["os"] = "Android"
            match = re.search(r'android (\d+\.?\d*)', ua_lower)
            if match:
                result["os_version"] = match.group(1)
    elif 'iphone' in ua_lower or 'ipad' in ua_lower:
        result["os"] = "iOS"
        match = re.search(r'os (\d+[._]\d+)', ua_lower)
        if match:
            result["os_version"] = match.group(1).replace('_', '.')

    return result


def get_ip_info(ip_address: str) -> dict:
    """Get basic info about an IP address."""
    result = {
        "ip": ip_address,
        "is_private": False,
        "is_loopback": False,
        "ip_version": 4,
    }

    try:
        ip = ipaddress.ip_address(ip_address)
        result["is_private"] = ip.is_private
        result["is_loopback"] = ip.is_loopback
        result["ip_version"] = ip.version
    except ValueError:
        pass

    return result


def assess_session_risk(
    current_fingerprint: DeviceFingerprint,
    previous_fingerprints: List[dict],
    login_history: List[dict] = None
) -> Tuple[SessionRisk, List[str]]:
    """
    Assess risk level of a session based on fingerprint comparison.

    Returns:
        Tuple of (risk_level, reasons)
    """
    reasons = []
    risk_score = 0

    current_hash = current_fingerprint.to_hash()
    current_ua = parse_user_agent(current_fingerprint.user_agent)
    current_ip_info = get_ip_info(current_fingerprint.ip_address)

    # Check if this is a bot
    if current_ua["is_bot"]:
        reasons.append("Bot detected")
        risk_score += 50

    # If no previous fingerprints, lower risk (new user/device)
    if not previous_fingerprints:
        return SessionRisk.LOW, ["New device - no previous history"]

    # Check fingerprint similarity
    known_hashes = [fp.get("fingerprint_hash") for fp in previous_fingerprints]
    if current_hash not in known_hashes:
        reasons.append("New device fingerprint")
        risk_score += 20

    # Check for IP changes
    previous_ips = set(fp.get("ip_address") for fp in previous_fingerprints)
    if current_fingerprint.ip_address not in previous_ips:
        reasons.append("Login from new IP address")
        risk_score += 15

        # Check if IP is from different country (simplified - check first octet)
        # In production, use a GeoIP database
        current_first_octet = current_fingerprint.ip_address.split('.')[0] if '.' in current_fingerprint.ip_address else ''
        previous_first_octets = set(ip.split('.')[0] for ip in previous_ips if '.' in ip)
        if current_first_octet and previous_first_octets and current_first_octet not in previous_first_octets:
            reasons.append("IP from potentially different region")
            risk_score += 15

    # Check for OS changes
    previous_oses = set()
    for fp in previous_fingerprints:
        ua_info = parse_user_agent(fp.get("user_agent", ""))
        previous_oses.add(ua_info["os"])

    if previous_oses and current_ua["os"] not in previous_oses:
        reasons.append(f"New operating system: {current_ua['os']}")
        risk_score += 10

    # Check for browser changes
    previous_browsers = set()
    for fp in previous_fingerprints:
        ua_info = parse_user_agent(fp.get("user_agent", ""))
        previous_browsers.add(ua_info["browser"])

    if previous_browsers and current_ua["browser"] not in previous_browsers:
        reasons.append(f"New browser: {current_ua['browser']}")
        risk_score += 5

    # Check login velocity (if history provided)
    if login_history:
        recent_logins = [
            l for l in login_history
            if datetime.fromisoformat(l["created_at"]) > datetime.utcnow() - timedelta(hours=1)
        ]
        if len(recent_logins) > 5:
            reasons.append("High login frequency")
            risk_score += 20

    # Determine risk level
    if risk_score >= 50:
        return SessionRisk.CRITICAL, reasons
    elif risk_score >= 30:
        return SessionRisk.HIGH, reasons
    elif risk_score >= 15:
        return SessionRisk.MEDIUM, reasons
    else:
        return SessionRisk.LOW, reasons


class SessionManager:
    """Manage user sessions with security controls."""

    MAX_CONCURRENT_SESSIONS = 5
    SESSION_TIMEOUT_HOURS = 24

    def __init__(self, db: Session):
        self.db = db

    async def create_session(
        self,
        user_id: int,
        fingerprint: DeviceFingerprint,
        token_hash: str
    ) -> dict:
        """
        Create a new session with fingerprint tracking.
        Enforces concurrent session limit.
        """
        from ..database import SessionDB

        # Check concurrent sessions
        active_sessions = self.db.query(SessionDB).filter(
            and_(
                SessionDB.user_id == user_id,
                SessionDB.is_active == True,
                SessionDB.expires_at > datetime.utcnow()
            )
        ).count()

        if active_sessions >= self.MAX_CONCURRENT_SESSIONS:
            # Revoke oldest session
            oldest = self.db.query(SessionDB).filter(
                and_(
                    SessionDB.user_id == user_id,
                    SessionDB.is_active == True
                )
            ).order_by(SessionDB.created_at.asc()).first()

            if oldest:
                oldest.is_active = False
                oldest.revoked_at = datetime.utcnow()
                oldest.revoke_reason = "max_sessions_exceeded"

        # Create new session
        session = SessionDB(
            user_id=user_id,
            token_hash=token_hash,
            fingerprint_hash=fingerprint.to_hash(),
            fingerprint_data=json.dumps(fingerprint.to_dict()),
            ip_address=fingerprint.ip_address,
            user_agent=fingerprint.user_agent,
            is_active=True,
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(hours=self.SESSION_TIMEOUT_HOURS),
        )

        self.db.add(session)
        self.db.commit()

        return {
            "session_id": session.id,
            "fingerprint_hash": fingerprint.to_hash(),
            "expires_at": session.expires_at.isoformat(),
        }

    def get_user_sessions(self, user_id: int) -> List[dict]:
        """Get all active sessions for a user."""
        from ..database import SessionDB

        sessions = self.db.query(SessionDB).filter(
            and_(
                SessionDB.user_id == user_id,
                SessionDB.is_active == True,
                SessionDB.expires_at > datetime.utcnow()
            )
        ).all()

        result = []
        for session in sessions:
            ua_info = parse_user_agent(session.user_agent)
            result.append({
                "session_id": session.id,
                "ip_address": session.ip_address,
                "device": f"{ua_info['browser']} on {ua_info['os']}",
                "device_type": ua_info["device_type"],
                "created_at": session.created_at.isoformat(),
                "last_activity": session.last_activity.isoformat() if session.last_activity else None,
                "is_current": False,  # Set by caller
            })

        return result

    def revoke_session(self, user_id: int, session_id: int) -> bool:
        """Revoke a specific session."""
        from ..database import SessionDB

        session = self.db.query(SessionDB).filter(
            and_(
                SessionDB.id == session_id,
                SessionDB.user_id == user_id,
                SessionDB.is_active == True
            )
        ).first()

        if session:
            session.is_active = False
            session.revoked_at = datetime.utcnow()
            session.revoke_reason = "user_requested"
            self.db.commit()
            return True

        return False

    def revoke_all_sessions(self, user_id: int, except_current: str = None) -> int:
        """Revoke all sessions for a user, optionally keeping current."""
        from ..database import SessionDB

        query = self.db.query(SessionDB).filter(
            and_(
                SessionDB.user_id == user_id,
                SessionDB.is_active == True
            )
        )

        if except_current:
            query = query.filter(SessionDB.token_hash != except_current)

        count = 0
        for session in query.all():
            session.is_active = False
            session.revoked_at = datetime.utcnow()
            session.revoke_reason = "revoke_all"
            count += 1

        self.db.commit()
        return count

    def update_activity(self, token_hash: str):
        """Update last activity timestamp for a session."""
        from ..database import SessionDB

        session = self.db.query(SessionDB).filter(
            SessionDB.token_hash == token_hash
        ).first()

        if session:
            session.last_activity = datetime.utcnow()
            self.db.commit()
