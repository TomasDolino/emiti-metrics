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

from .routers import campaigns, analysis, upload, alerts, advanced, clients, ai, auth, rules, meta
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

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"

        # HSTS only in production
        if IS_PRODUCTION:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Content Security Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' https://fonts.gstatic.com; "
            "connect-src 'self' https://graph.facebook.com"
        )

        return response


app.add_middleware(SecurityHeadersMiddleware)

# CORS
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://76.13.166.17",
    "http://76.13.166.17:8080",
    "https://76.13.166.17",
    "https://metrics.emiti.cloud",
    "https://emiti.cloud",  # CRM Grupo Albisu
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
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
