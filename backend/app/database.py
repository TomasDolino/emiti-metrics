"""
Database setup with SQLAlchemy
Supports SQLite (dev) and PostgreSQL (production)
"""
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
import logging

logger = logging.getLogger(__name__)

# Database configuration - supports SQLite and PostgreSQL
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./data/emiti_metrics.db"
)

# Create data directory for SQLite
if DATABASE_URL.startswith("sqlite"):
    DB_PATH = DATABASE_URL.replace("sqlite:///", "")
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    # PostgreSQL - no special connect_args needed
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=10)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# ==================== DATABASE MODELS ====================

class ClientDB(Base):
    __tablename__ = "clients"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    industry = Column(String, nullable=True)
    meta_account_id = Column(String, nullable=True)
    color = Column(String, default="#6366f1")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    campaigns = relationship("CampaignDB", back_populates="client", cascade="all, delete-orphan")
    metrics = relationship("MetricDB", back_populates="client", cascade="all, delete-orphan")
    alerts = relationship("AlertDB", back_populates="client", cascade="all, delete-orphan")
    config = relationship("ClientConfigDB", back_populates="client", uselist=False, cascade="all, delete-orphan")


class CampaignDB(Base):
    __tablename__ = "campaigns"

    id = Column(String, primary_key=True)
    client_id = Column(String, ForeignKey("clients.id"), nullable=False)
    name = Column(String, nullable=False)
    objective = Column(String, default="MESSAGES")
    status = Column(String, default="ACTIVE")
    daily_budget = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    client = relationship("ClientDB", back_populates="campaigns")
    metrics = relationship("MetricDB", back_populates="campaign", cascade="all, delete-orphan")


class MetricDB(Base):
    __tablename__ = "metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(String, ForeignKey("clients.id"), nullable=False)
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=True)
    date = Column(DateTime, nullable=False)

    # Campaign/Ad info
    campaign_name = Column(String, nullable=False)
    ad_set_name = Column(String, nullable=False)
    ad_name = Column(String, nullable=False)

    # Core metrics
    spend = Column(Float, default=0)
    impressions = Column(Integer, default=0)
    reach = Column(Integer, default=0)
    frequency = Column(Float, default=0)
    clicks = Column(Integer, default=0)
    link_clicks = Column(Integer, default=0)
    ctr = Column(Float, default=0)
    cpc = Column(Float, default=0)
    cpm = Column(Float, default=0)

    # Results
    results = Column(Integer, default=0)
    cost_per_result = Column(Float, default=0)
    result_rate = Column(Float, default=0)

    # Optional metrics
    purchases = Column(Integer, nullable=True)
    purchase_value = Column(Float, nullable=True)
    roas = Column(Float, nullable=True)
    messaging_conversations = Column(Integer, nullable=True)
    leads = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    client = relationship("ClientDB", back_populates="metrics")
    campaign = relationship("CampaignDB", back_populates="metrics")


class AlertDB(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True)
    client_id = Column(String, ForeignKey("clients.id"), nullable=False)
    type = Column(String, nullable=False)  # ROAS_DROP, CPA_INCREASE, etc.
    severity = Column(String, default="INFO")  # INFO, WARNING, CRITICAL
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)

    ad_name = Column(String, nullable=True)
    campaign_name = Column(String, nullable=True)
    metric = Column(String, nullable=True)
    previous_value = Column(Float, nullable=True)
    current_value = Column(Float, nullable=True)
    change_percent = Column(Float, nullable=True)

    acknowledged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    client = relationship("ClientDB", back_populates="alerts")


class ClientConfigDB(Base):
    __tablename__ = "client_configs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(String, ForeignKey("clients.id"), unique=True, nullable=False)
    objective = Column(String, default="MESSAGES")
    currency = Column(String, default="ARS")
    thresholds = Column(JSON, default={})
    monthly_budget = Column(Float, default=0)
    result_value = Column(Float, default=100)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    client = relationship("ClientDB", back_populates="config")


class MetaTokenDB(Base):
    """Stores Meta API tokens per client."""
    __tablename__ = "meta_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(String, ForeignKey("clients.id"), unique=True, nullable=False)
    access_token = Column(Text, nullable=False)  # Encrypted in production
    ad_account_id = Column(String, nullable=True)  # Format: act_XXXXXXXXX
    user_id = Column(String, nullable=True)
    scopes = Column(JSON, default=[])
    expires_at = Column(DateTime, nullable=True)
    status = Column(String, default="valid")  # valid, expiring_soon, expired, invalid
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    client = relationship("ClientDB")


class LearningDB(Base):
    __tablename__ = "learnings"

    id = Column(String, primary_key=True)
    client_id = Column(String, ForeignKey("clients.id"), nullable=False)
    type = Column(String, nullable=False)  # works, doesnt_work, insight
    text = Column(Text, nullable=False)
    evidence = Column(Text, nullable=True)
    category = Column(String, nullable=True)  # creative, audience, timing, budget
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ActionLogDB(Base):
    __tablename__ = "action_logs"

    id = Column(String, primary_key=True)
    client_id = Column(String, ForeignKey("clients.id"), nullable=False)
    type = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    affected_items = Column(JSON, default=[])
    estimated_impact = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class UserDB(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, default="user")  # admin, user
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Two-Factor Authentication (2FA)
    totp_secret = Column(String, nullable=True)  # Encrypted TOTP secret
    is_2fa_enabled = Column(Boolean, default=False)
    backup_codes = Column(JSON, default=[])  # List of hashed backup codes

    # Security fields for IP whitelisting and intrusion detection
    allowed_ips = Column(JSON, default=[])  # List of allowed IP addresses/CIDR ranges
    last_login_ip = Column(String, nullable=True)
    failed_login_count = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)  # Account lockout timestamp

    # Relationships
    refresh_tokens = relationship("RefreshTokenDB", back_populates="user", cascade="all, delete-orphan")
    login_history = relationship("LoginHistoryDB", back_populates="user", cascade="all, delete-orphan")
    security_alerts = relationship("SecurityAlertDB", back_populates="user", cascade="all, delete-orphan")


class RefreshTokenDB(Base):
    """Stores refresh tokens for JWT authentication."""
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String, nullable=False, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    is_revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    user = relationship("UserDB", back_populates="refresh_tokens")


class SnapshotDB(Base):
    __tablename__ = "snapshots"

    id = Column(String, primary_key=True)
    client_id = Column(String, ForeignKey("clients.id"), nullable=False)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    metrics_summary = Column(JSON, default={})
    analysis_data = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)


class LoginHistoryDB(Base):
    """Stores login history for security auditing."""
    __tablename__ = "login_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    ip_address = Column(String, nullable=False)
    user_agent = Column(String, nullable=True)
    success = Column(Boolean, nullable=False)
    failure_reason = Column(String, nullable=True)  # e.g., "invalid_password", "account_locked", "ip_blocked"
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    user = relationship("UserDB", back_populates="login_history")


class SecurityAlertDB(Base):
    """Stores security alerts for intrusion detection."""
    __tablename__ = "security_alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    alert_type = Column(String, nullable=False)  # e.g., "MULTIPLE_FAILED_LOGINS", "NEW_IP", "UNUSUAL_HOURS", "RAPID_REQUESTS"
    severity = Column(String, default="WARNING")  # INFO, WARNING, CRITICAL
    ip_address = Column(String, nullable=True)
    details = Column(JSON, default={})
    acknowledged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    user = relationship("UserDB", back_populates="security_alerts")


class SessionDB(Base):
    """Stores active sessions with fingerprinting for security tracking."""
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String, nullable=False, unique=True, index=True)
    fingerprint_hash = Column(String, nullable=True, index=True)
    fingerprint_data = Column(JSON, default={})  # Full fingerprint details
    ip_address = Column(String, nullable=False)
    user_agent = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    last_activity = Column(DateTime, default=datetime.utcnow)
    revoked_at = Column(DateTime, nullable=True)
    revoke_reason = Column(String, nullable=True)  # e.g., "user_requested", "password_changed", "max_sessions_exceeded"

    # Relationship
    user = relationship("UserDB", backref="sessions")


class WebAuthnCredentialDB(Base):
    """Stores WebAuthn/FIDO2 credentials for hardware security keys."""
    __tablename__ = "webauthn_credentials"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    credential_id = Column(String, nullable=False, unique=True, index=True)  # Base64 encoded
    public_key = Column(Text, nullable=False)  # Base64 encoded public key
    sign_count = Column(Integer, default=0)
    device_name = Column(String, nullable=True)  # User-friendly name like "YubiKey 5"
    transports = Column(JSON, default=[])  # USB, NFC, BLE, internal
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

    # Relationship
    user = relationship("UserDB", backref="webauthn_credentials")


class CSPViolationDB(Base):
    """Stores Content Security Policy violation reports."""
    __tablename__ = "csp_violations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_uri = Column(String, nullable=True)
    violated_directive = Column(String, nullable=True)
    blocked_uri = Column(String, nullable=True)
    source_file = Column(String, nullable=True)
    line_number = Column(Integer, nullable=True)
    column_number = Column(Integer, nullable=True)
    original_policy = Column(Text, nullable=True)
    disposition = Column(String, nullable=True)  # "enforce" or "report"
    user_agent = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ==================== DATABASE DEPENDENCY ====================

def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_db_connection():
    """Get raw database connection for direct SQL queries."""
    if DATABASE_URL.startswith("sqlite"):
        import sqlite3
        return sqlite3.connect(DATABASE_URL.replace("sqlite:///", ""))
    else:
        import psycopg2
        return psycopg2.connect(DATABASE_URL)


def init_db():
    """Initialize database tables."""
    logger.info(f"Initializing database: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")


def seed_demo_data():
    """Seed database with demo data if empty."""
    db = SessionLocal()
    try:
        # Check if clients exist
        existing_clients = db.query(ClientDB).count()
        if existing_clients > 0:
            logger.info(f"Database already has {existing_clients} clients, skipping seed")
            return

        # Demo clients
        demo_clients = [
            ClientDB(
                id="client-1",
                name="Restaurante La Parrilla",
                industry="Gastronomia",
                meta_account_id="act_123456789",
                color="#10b981",
                is_active=True
            ),
            ClientDB(
                id="client-2",
                name="Inmobiliaria del Sur",
                industry="Real Estate",
                meta_account_id="act_987654321",
                color="#6366f1",
                is_active=True
            ),
            ClientDB(
                id="client-3",
                name="Gimnasio PowerFit",
                industry="Fitness",
                meta_account_id="act_456789123",
                color="#f59e0b",
                is_active=True
            ),
            ClientDB(
                id="client-4",
                name="Tienda TechStore",
                industry="Retail",
                meta_account_id="act_321654987",
                color="#ef4444",
                is_active=True
            ),
            ClientDB(
                id="client-5",
                name="Clinica Dental Sonrisas",
                industry="Salud",
                meta_account_id="act_789123456",
                color="#8b5cf6",
                is_active=True
            ),
            ClientDB(
                id="client-6",
                name="Academia de Idiomas",
                industry="Educacion",
                meta_account_id="act_654321789",
                color="#06b6d4",
                is_active=False
            ),
        ]

        for client in demo_clients:
            db.add(client)

        # Demo alerts
        from uuid import uuid4
        demo_alerts = [
            AlertDB(
                id=str(uuid4()),
                client_id="client-1",
                type="FATIGUE_DETECTED",
                severity="WARNING",
                title="Fatiga detectada",
                message='El anuncio "Video Testimonial" muestra signos de fatiga creativa',
                ad_name="Video Testimonial",
                campaign_name="Mensajes - Febrero 2024",
                metric="frequency",
                current_value=4.2,
                acknowledged=False
            ),
            AlertDB(
                id=str(uuid4()),
                client_id="client-1",
                type="CPA_INCREASE",
                severity="CRITICAL",
                title="Aumento de CPR",
                message='El costo por resultado de "Imagen Generica" aumento 60%',
                ad_name="Imagen Generica",
                campaign_name="Mensajes - Febrero 2024",
                metric="cpr",
                previous_value=437.5,
                current_value=700,
                change_percent=60,
                acknowledged=False
            ),
            AlertDB(
                id=str(uuid4()),
                client_id="client-2",
                type="NEW_WINNER",
                severity="INFO",
                title="Nuevo anuncio destacado",
                message='"Video Restauracion" supera el benchmark de la cuenta',
                ad_name="Video Restauracion",
                campaign_name="Ventas - Marzo 2024",
                acknowledged=True
            ),
        ]

        for alert in demo_alerts:
            db.add(alert)

        db.commit()
        logger.info("Demo data seeded successfully!")

    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding demo data: {e}")
    finally:
        db.close()
