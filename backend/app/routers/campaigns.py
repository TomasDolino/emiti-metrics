"""
Router para endpoints de campañas
"""
from fastapi import APIRouter, HTTPException
from typing import List, Optional

from ..models.schemas import CampaignObjective

router = APIRouter()


# In-memory storage for demo (replace with database in production)
CAMPAIGNS_STORE = {}


@router.get("/")
async def list_campaigns(client_id: Optional[str] = None):
    """Lista todas las campañas."""
    campaigns = list(CAMPAIGNS_STORE.values())
    if client_id:
        campaigns = [c for c in campaigns if c.get('client_id') == client_id]
    return {"campaigns": campaigns}


@router.get("/{campaign_id}")
async def get_campaign(campaign_id: str):
    """Obtiene una campaña por ID."""
    if campaign_id not in CAMPAIGNS_STORE:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
    return CAMPAIGNS_STORE[campaign_id]


@router.get("/{campaign_id}/metrics")
async def get_campaign_metrics(
    campaign_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Obtiene métricas de una campaña."""
    if campaign_id not in CAMPAIGNS_STORE:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")

    # Return mock metrics for now
    return {
        "campaign_id": campaign_id,
        "metrics": {
            "total_spend": 25000,
            "total_results": 142,
            "avg_cpr": 176.05,
            "avg_ctr": 1.8
        }
    }


@router.get("/{campaign_id}/ads")
async def get_campaign_ads(campaign_id: str):
    """Lista los anuncios de una campaña."""
    if campaign_id not in CAMPAIGNS_STORE:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")

    return {
        "campaign_id": campaign_id,
        "ads": []
    }
