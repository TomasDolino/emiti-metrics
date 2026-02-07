"""
Router para endpoints de análisis
"""
from fastapi import APIRouter, HTTPException
from typing import Optional

from ..models.schemas import (
    AnalysisResponse, DashboardSummary, CampaignObjective,
    AdClassification, DailyAggregation
)

router = APIRouter()


@router.get("/dashboard", response_model=DashboardSummary)
async def get_dashboard_summary(
    client_id: Optional[str] = None,
    days: int = 7
):
    """
    Obtiene el resumen del dashboard.
    Incluye métricas agregadas, tendencias y clasificación de anuncios.
    """
    # Return mock data for demo
    return DashboardSummary(
        total_spend=36300,
        total_results=179,
        avg_cpr=202.8,
        avg_ctr=1.48,
        spend_change=12.0,
        results_change=18.0,
        cpr_change=-8.0,
        ctr_change=5.0,
        active_alerts=2,
        classification_counts={
            "GANADOR": 1,
            "ESCALABLE": 1,
            "TESTING": 1,
            "FATIGADO": 1,
            "PAUSAR": 1
        },
        daily_metrics=[
            DailyAggregation(
                date="2024-02-01",
                spend=5200,
                results=26,
                cpr=200,
                ctr=1.5,
                impressions=45000
            ),
            DailyAggregation(
                date="2024-02-02",
                spend=5100,
                results=28,
                cpr=182,
                ctr=1.6,
                impressions=47000
            ),
            # ... more days
        ]
    )


@router.get("/campaign/{campaign_id}")
async def analyze_campaign(
    campaign_id: str,
    objective: CampaignObjective = CampaignObjective.MESSAGES
):
    """
    Realiza análisis completo de una campaña.
    Clasifica anuncios, detecta fatiga y genera recomendaciones.
    """
    # This would normally load data from DB and run analysis
    return AnalysisResponse(
        success=True,
        message="Análisis completado",
        alerts=[]
    )


@router.get("/ads/{ad_name}")
async def analyze_ad(ad_name: str):
    """
    Análisis detallado de un anuncio específico.
    """
    return {
        "ad_name": ad_name,
        "classification": AdClassification.TESTING,
        "classification_reason": "En evaluación",
        "metrics": {
            "total_spend": 1200,
            "total_results": 6,
            "avg_cpr": 200,
            "avg_ctr": 1.6,
            "avg_frequency": 1.2,
            "days_running": 3
        },
        "trends": {
            "ctr_trend": 0,
            "cpr_trend": 0,
            "frequency_trend": 0
        },
        "fatigue_score": 5,
        "recommendations": [
            "Esperar más datos (mínimo 7 días)",
            "Monitorear métricas diariamente"
        ]
    }


@router.get("/comparison")
async def compare_periods(
    start_date_1: str,
    end_date_1: str,
    start_date_2: str,
    end_date_2: str,
    campaign_id: Optional[str] = None
):
    """
    Compara métricas entre dos períodos.
    """
    return {
        "period_1": {
            "start": start_date_1,
            "end": end_date_1,
            "spend": 15000,
            "results": 85,
            "cpr": 176.5
        },
        "period_2": {
            "start": start_date_2,
            "end": end_date_2,
            "spend": 18000,
            "results": 95,
            "cpr": 189.5
        },
        "changes": {
            "spend": 20.0,
            "results": 11.8,
            "cpr": 7.4
        }
    }
