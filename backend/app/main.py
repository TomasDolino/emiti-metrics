"""
Emiti Metrics - Backend API
Análisis automático de campañas de Meta Ads
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .routers import campaigns, analysis, upload, alerts, advanced, clients
from .database import init_db, seed_demo_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    init_db()
    seed_demo_data()
    yield


app = FastAPI(
    title="Emiti Metrics API",
    description="API para análisis automático de campañas de Meta Ads",
    version="2.0.0",
    lifespan=lifespan
)

# CORS para desarrollo local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(clients.router, prefix="/api/clients", tags=["clients"])
app.include_router(campaigns.router, prefix="/api/campaigns", tags=["campaigns"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["analysis"])
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])
app.include_router(advanced.router, prefix="/api/advanced", tags=["advanced"])


@app.get("/")
async def root():
    return {
        "name": "Emiti Metrics API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
