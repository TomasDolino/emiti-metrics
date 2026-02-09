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


class SnapshotDB(Base):
    __tablename__ = "snapshots"

    id = Column(String, primary_key=True)
    client_id = Column(String, ForeignKey("clients.id"), nullable=False)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    metrics_summary = Column(JSON, default={})
    analysis_data = Column(JSON, default={})
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
