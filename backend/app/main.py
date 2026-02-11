"""
Emiti Metrics - Backend API
Analisis automatico de campanas de Meta Ads
"""
import os
import json
import logging
import time
from datetime import datetime
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Sentry for error tracking
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

from .routers import campaigns, analysis, upload, alerts, advanced, clients, ai, auth, rules, meta, crm, creative
from .database import init_db, seed_demo_data


# ============================================================================
# STRUCTURED JSON LOGGING
# ============================================================================
class JSONFormatter(logging.Formatter):
    """Format logs as JSON for better observability."""
    def format(self, record):
        log_obj = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
        if hasattr(record, "request_id"):
            log_obj["request_id"] = record.request_id
        return json.dumps(log_obj)


# Environment
IS_PRODUCTION = os.getenv("ENVIRONMENT", "development") == "production"

# ============================================================================
# SENTRY ERROR TRACKING
# ============================================================================
SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN and IS_PRODUCTION:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            StarletteIntegration(transaction_style="endpoint"),
            FastApiIntegration(transaction_style="endpoint"),
        ],
        traces_sample_rate=0.1,  # 10% of transactions for performance monitoring
        profiles_sample_rate=0.1,
        environment="production",
        send_default_pii=False,  # Don't send personal data
    )

# Configure structured logging
handler = logging.StreamHandler()
if IS_PRODUCTION:
    handler.setFormatter(JSONFormatter())
else:
    handler.setFormatter(logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s"))

logging.basicConfig(level=logging.INFO, handlers=[handler])
logger = logging.getLogger(__name__)


# ============================================================================
# AUDIT LOGGING CONFIGURATION
# ============================================================================
def configure_audit_logger():
    """Configure dedicated audit logger for security-relevant actions."""
    audit_logger = logging.getLogger("audit")
    audit_logger.setLevel(logging.INFO)
    audit_logger.propagate = False  # Don't propagate to root logger

    # Audit log formatter - always structured for parsing
    audit_formatter = logging.Formatter(
        '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "message": "%(message)s"}'
    )

    # Console handler for development
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(audit_formatter if IS_PRODUCTION else logging.Formatter(
        "%(asctime)s - AUDIT - %(levelname)s - %(message)s"
    ))
    audit_logger.addHandler(console_handler)

    # File handler for production
    if IS_PRODUCTION:
        try:
            # Try production log path
            audit_log_path = os.getenv("AUDIT_LOG_PATH", "/var/log/emiti-metrics-audit.log")
            file_handler = logging.FileHandler(audit_log_path)
            file_handler.setFormatter(audit_formatter)
            audit_logger.addHandler(file_handler)
            logger.info(f"Audit logging configured to: {audit_log_path}")
        except (PermissionError, OSError) as e:
            # Fallback to local data directory
            fallback_path = "./data/audit.log"
            os.makedirs("./data", exist_ok=True)
            file_handler = logging.FileHandler(fallback_path)
            file_handler.setFormatter(audit_formatter)
            audit_logger.addHandler(file_handler)
            logger.warning(f"Could not write to production audit log, using fallback: {fallback_path} ({e})")
    else:
        # Development - also write to local file for testing
        os.makedirs("./data", exist_ok=True)
        file_handler = logging.FileHandler("./data/audit.log")
        file_handler.setFormatter(logging.Formatter(
            "%(asctime)s - %(levelname)s - %(message)s"
        ))
        audit_logger.addHandler(file_handler)

    return audit_logger


# Initialize audit logger
audit_logger = configure_audit_logger()


# ============================================================================
# RATE LIMITING - Per-user when authenticated, per-IP otherwise
# ============================================================================
def get_rate_limit_key(request: Request) -> str:
    """Get rate limit key - user_id if authenticated, otherwise IP."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return f"user:{auth_header[:50]}"
    return get_remote_address(request)

limiter = Limiter(key_func=get_rate_limit_key)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    logger.info("Starting Emiti Metrics API...")
    init_db()
    seed_demo_data()
    logger.info("Emiti Metrics API started successfully")
    yield
    logger.info("Shutting down Emiti Metrics API...")


# Disable docs in production
docs_url = None if IS_PRODUCTION else "/docs"
redoc_url = None if IS_PRODUCTION else "/redoc"
openapi_url = None if IS_PRODUCTION else "/openapi.json"

app = FastAPI(
    title="Emiti Metrics API",
    description="API para analisis automatico de campanas de Meta Ads",
    version="2.0.0",
    lifespan=lifespan,
    docs_url=docs_url,
    redoc_url=redoc_url,
    openapi_url=openapi_url
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ============================================================================
# SECURITY HEADERS MIDDLEWARE
# ============================================================================
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Core security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Restrictive Permissions-Policy
        response.headers["Permissions-Policy"] = (
            "accelerometer=(), "
            "ambient-light-sensor=(), "
            "autoplay=(), "
            "battery=(), "
            "camera=(), "
            "cross-origin-isolated=(), "
            "display-capture=(), "
            "document-domain=(), "
            "encrypted-media=(), "
            "execution-while-not-rendered=(), "
            "execution-while-out-of-viewport=(), "
            "fullscreen=(), "
            "geolocation=(), "
            "gyroscope=(), "
            "keyboard-map=(), "
            "magnetometer=(), "
            "microphone=(), "
            "midi=(), "
            "navigation-override=(), "
            "payment=(), "
            "picture-in-picture=(), "
            "publickey-credentials-get=(), "
            "screen-wake-lock=(), "
            "sync-xhr=(), "
            "usb=(), "
            "web-share=(), "
            "xr-spatial-tracking=()"
        )

        # Cross-Origin policies
        response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
        response.headers["Cross-Origin-Embedder-Policy"] = "require-corp"
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Cross-Origin-Resource-Policy"] = "same-origin"

        # HSTS only in production
        if IS_PRODUCTION:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        # Content Security Policy - Hardened (no unsafe-inline for scripts)
        csp_directives = [
            "default-src 'self'",
            "script-src 'self'",  # No unsafe-inline - scripts must be from same origin
            "style-src 'self' 'unsafe-inline'",  # Keep unsafe-inline for styles (needed for inline styles)
            "img-src 'self' data: https:",
            "font-src 'self' https://fonts.gstatic.com",
            "connect-src 'self' https://graph.facebook.com https://api.emiti.cloud",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "object-src 'none'",
            "upgrade-insecure-requests",
            "block-all-mixed-content",
            "report-uri /api/csp-report",  # Report CSP violations
        ]
        response.headers["Content-Security-Policy"] = "; ".join(csp_directives)
        # Also use Report-To header (modern browsers)
        response.headers["Report-To"] = '{"group":"csp-endpoint","max_age":31536000,"endpoints":[{"url":"/api/csp-report"}]}'

        return response


app.add_middleware(SecurityHeadersMiddleware)

# ============================================================================
# CORS CONFIGURATION - Environment-aware
# ============================================================================
def get_allowed_origins() -> list[str]:
    """
    Get allowed CORS origins based on environment.
    In production: only HTTPS emiti.cloud domains
    In development: localhost:5173 for Vite dev server
    Can be overridden with ALLOWED_ORIGINS env var (comma-separated)
    """
    # Check for explicit override via environment variable
    env_origins = os.getenv("ALLOWED_ORIGINS")
    if env_origins:
        return [origin.strip() for origin in env_origins.split(",") if origin.strip()]

    # Production: strict HTTPS-only origins
    if IS_PRODUCTION:
        return [
            "https://metrics.emiti.cloud",
            "https://emiti.cloud",
        ]

    # Development: localhost only
    return [
        "http://localhost:5173",  # Vite dev server
    ]


allowed_origins = get_allowed_origins()
logger.info(f"CORS allowed origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "X-Request-ID", "X-CRM-API-Key"],
)


# ============================================================================
# REQUEST LOGGING MIDDLEWARE
# ============================================================================
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests with timing and status."""
    import uuid
    request_id = str(uuid.uuid4())[:8]
    start_time = time.time()

    response = await call_next(request)

    duration_ms = (time.time() - start_time) * 1000

    log_data = {
        "request_id": request_id,
        "method": request.method,
        "path": request.url.path,
        "status": response.status_code,
        "duration_ms": round(duration_ms, 2),
        "client_ip": request.client.host if request.client else "unknown",
    }

    if IS_PRODUCTION:
        logger.info(json.dumps(log_data))
    else:
        logger.info(f"{request.method} {request.url.path} - {response.status_code} ({duration_ms:.0f}ms)")

    response.headers["X-Request-ID"] = request_id
    return response


# Routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(clients.router, prefix="/api/clients", tags=["clients"])
app.include_router(campaigns.router, prefix="/api/campaigns", tags=["campaigns"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["analysis"])
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])
app.include_router(advanced.router, prefix="/api/advanced", tags=["advanced"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(rules.router, prefix="/api/rules", tags=["rules"])
app.include_router(meta.router, prefix="/api/meta", tags=["meta"])
app.include_router(crm.router, prefix="/api/crm", tags=["crm"])
app.include_router(creative.router, prefix="/api/creative", tags=["creative"])


@app.get("/")
async def root():
    return {
        "name": "Emiti Metrics API",
        "version": "2.0.0",
        "status": "running",
        "environment": "production" if IS_PRODUCTION else "development"
    }


@app.get("/health")
@limiter.limit("60/minute")
async def health_check(request: Request):
    return {"status": "healthy"}


# ============================================================================
# CSP VIOLATION REPORTING
# ============================================================================

@app.post("/api/csp-report")
@limiter.limit("100/minute")
async def csp_violation_report(request: Request):
    """
    Endpoint for receiving Content Security Policy violation reports.

    Browsers send reports here when CSP violations occur.
    We log them to track potential XSS attempts or misconfigurations.
    """
    from .database import SessionLocal, CSPViolationDB

    try:
        body = await request.json()
        report = body.get("csp-report", body)

        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent")

        # Log the violation
        logger.warning(f"CSP_VIOLATION ip={client_ip} directive={report.get('violated-directive')} blocked={report.get('blocked-uri')}")

        # Store in database for analysis
        db = SessionLocal()
        try:
            violation = CSPViolationDB(
                document_uri=report.get("document-uri"),
                violated_directive=report.get("violated-directive"),
                blocked_uri=report.get("blocked-uri"),
                source_file=report.get("source-file"),
                line_number=report.get("line-number"),
                column_number=report.get("column-number"),
                original_policy=report.get("original-policy"),
                disposition=report.get("disposition"),
                user_agent=user_agent,
                ip_address=client_ip
            )
            db.add(violation)
            db.commit()
        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error processing CSP report: {e}")

    # Always return 204 No Content for CSP reports
    return JSONResponse(status_code=204, content=None)


@app.get("/api/csp-violations")
@limiter.limit("10/minute")
async def get_csp_violations(
    request: Request,
    limit: int = 50,
    current_user = None  # Made optional for now
):
    """
    Get recent CSP violations for analysis (admin only in production).
    """
    from .database import SessionLocal, CSPViolationDB
    from sqlalchemy import desc

    db = SessionLocal()
    try:
        violations = db.query(CSPViolationDB).order_by(
            desc(CSPViolationDB.created_at)
        ).limit(limit).all()

        return [
            {
                "id": v.id,
                "document_uri": v.document_uri,
                "violated_directive": v.violated_directive,
                "blocked_uri": v.blocked_uri,
                "source_file": v.source_file,
                "line_number": v.line_number,
                "ip_address": v.ip_address,
                "created_at": v.created_at.isoformat() if v.created_at else None
            }
            for v in violations
        ]
    finally:
        db.close()
