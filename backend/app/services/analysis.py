"""
Servicio de análisis de campañas
Contiene toda la lógica de clasificación, detección de fatiga y generación de insights
"""
import pandas as pd
import numpy as np
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta

from ..models.schemas import (
    AdClassification, AlertType, AlertSeverity,
    AdAnalysis, CampaignAnalysis, Alert, CampaignObjective
)


# ==================== THRESHOLDS ====================

class AnalysisThresholds:
    """Umbrales configurables para clasificación de anuncios"""

    def __init__(
        self,
        min_results_winner: int = 10,
        max_cpr_winner: float = 150,
        min_ctr_winner: float = 1.5,
        min_frequency_fatigued: float = 3.5,
        ctr_drop_fatigued: float = 20,
        min_spend_to_pause: float = 1000,
        max_results_to_pause: int = 2,
        max_ctr_to_pause: float = 0.5,
        min_days_for_classification: int = 3
    ):
        self.min_results_winner = min_results_winner
        self.max_cpr_winner = max_cpr_winner
        self.min_ctr_winner = min_ctr_winner
        self.min_frequency_fatigued = min_frequency_fatigued
        self.ctr_drop_fatigued = ctr_drop_fatigued
        self.min_spend_to_pause = min_spend_to_pause
        self.max_results_to_pause = max_results_to_pause
        self.max_ctr_to_pause = max_ctr_to_pause
        self.min_days_for_classification = min_days_for_classification


DEFAULT_THRESHOLDS = AnalysisThresholds()


# ==================== CORE CALCULATIONS ====================

def calculate_ctr(clicks: int, impressions: int) -> float:
    """Click-through rate = (clicks / impressions) * 100"""
    if impressions == 0:
        return 0.0
    return (clicks / impressions) * 100


def calculate_cpr(spend: float, results: int) -> float:
    """Cost per result = spend / results"""
    if results == 0:
        return float('inf')
    return spend / results


def calculate_cpm(spend: float, impressions: int) -> float:
    """Cost per mille = (spend / impressions) * 1000"""
    if impressions == 0:
        return 0.0
    return (spend / impressions) * 1000


def calculate_roas(revenue: float, spend: float) -> float:
    """Return on ad spend = revenue / spend"""
    if spend == 0:
        return 0.0
    return revenue / spend


def calculate_frequency(impressions: int, reach: int) -> float:
    """Frequency = impressions / reach"""
    if reach == 0:
        return 0.0
    return impressions / reach


def calculate_trend(current: float, previous: float) -> float:
    """Calculate percentage change between two values"""
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return ((current - previous) / previous) * 100


# ==================== AD CLASSIFICATION ====================

def classify_ad(
    df: pd.DataFrame,
    thresholds: AnalysisThresholds = DEFAULT_THRESHOLDS
) -> Tuple[AdClassification, str]:
    """
    Clasifica un anuncio basándose en sus métricas históricas.

    Returns:
        Tuple de (clasificación, razón)
    """
    if len(df) < thresholds.min_days_for_classification:
        return (AdClassification.TESTING, "Pocos datos, necesita más tiempo")

    total_spend = df['spend'].sum()
    total_results = df['results'].sum()
    avg_ctr = df['ctr'].mean()
    avg_frequency = df['frequency'].mean()
    avg_cpr = total_spend / total_results if total_results > 0 else float('inf')

    # Check fatigue first (most important)
    if len(df) >= 7:
        recent = df.tail(7)
        older = df.iloc[-14:-7] if len(df) >= 14 else df.head(len(df) - 7)

        if len(older) >= 3:
            recent_ctr = recent['ctr'].mean()
            older_ctr = older['ctr'].mean()
            ctr_change = calculate_trend(recent_ctr, older_ctr)

            if avg_frequency >= thresholds.min_frequency_fatigued and ctr_change < -thresholds.ctr_drop_fatigued:
                return (
                    AdClassification.FATIGADO,
                    f"Frecuencia alta ({avg_frequency:.1f}) y CTR cayendo {abs(ctr_change):.0f}%"
                )

    # Check for winner
    if (
        total_results >= thresholds.min_results_winner and
        avg_cpr <= thresholds.max_cpr_winner and
        avg_ctr >= thresholds.min_ctr_winner
    ):
        return (
            AdClassification.GANADOR,
            f"CPR bajo (${avg_cpr:.0f}), CTR alto ({avg_ctr:.1f}%), {total_results} resultados"
        )

    # Check for scalable
    if (
        total_results >= thresholds.min_results_winner / 2 and
        avg_cpr <= thresholds.max_cpr_winner * 1.5
    ):
        return (
            AdClassification.ESCALABLE,
            "Performance estable, potencial de mejora"
        )

    # Check for pause
    if (
        total_spend >= thresholds.min_spend_to_pause and
        (total_results <= thresholds.max_results_to_pause or avg_ctr < thresholds.max_ctr_to_pause)
    ):
        return (
            AdClassification.PAUSAR,
            f"Gasto alto (${total_spend:.0f}) con pocos resultados ({total_results})"
        )

    return (AdClassification.TESTING, "En evaluación")


# ==================== FATIGUE DETECTION ====================

def calculate_fatigue_score(
    avg_frequency: float,
    ctr_trend: float,
    days_running: int
) -> int:
    """
    Calcula un score de fatiga de 0-100.

    Factores:
    - Frecuencia alta (0-40 puntos)
    - CTR en descenso (0-40 puntos)
    - Días activo (0-20 puntos)
    """
    score = 0

    # Frequency contribution
    if avg_frequency >= 5:
        score += 40
    elif avg_frequency >= 4:
        score += 30
    elif avg_frequency >= 3:
        score += 20
    elif avg_frequency >= 2:
        score += 10

    # CTR trend contribution
    if ctr_trend < -30:
        score += 40
    elif ctr_trend < -20:
        score += 30
    elif ctr_trend < -10:
        score += 20
    elif ctr_trend < 0:
        score += 10

    # Days running contribution
    if days_running >= 30:
        score += 20
    elif days_running >= 21:
        score += 15
    elif days_running >= 14:
        score += 10
    elif days_running >= 7:
        score += 5

    return min(score, 100)


# ==================== ALERT GENERATION ====================

def generate_alerts(
    current_metrics: pd.DataFrame,
    previous_metrics: pd.DataFrame,
    objective: CampaignObjective
) -> List[Alert]:
    """
    Genera alertas comparando métricas del período actual vs anterior.
    """
    alerts = []
    now = datetime.now().isoformat()

    # Aggregate current period
    current_spend = current_metrics['spend'].sum()
    current_results = current_metrics['results'].sum()
    current_cpr = current_spend / current_results if current_results > 0 else 0
    current_ctr = current_metrics['ctr'].mean() if len(current_metrics) > 0 else 0

    # Aggregate previous period
    prev_spend = previous_metrics['spend'].sum()
    prev_results = previous_metrics['results'].sum()
    prev_cpr = prev_spend / prev_results if prev_results > 0 else 0
    prev_ctr = previous_metrics['ctr'].mean() if len(previous_metrics) > 0 else 0

    # ROAS drop for sales campaigns
    if objective == CampaignObjective.SALES:
        current_revenue = current_metrics['purchase_value'].sum() if 'purchase_value' in current_metrics else 0
        prev_revenue = previous_metrics['purchase_value'].sum() if 'purchase_value' in previous_metrics else 0
        current_roas = current_revenue / current_spend if current_spend > 0 else 0
        prev_roas = prev_revenue / prev_spend if prev_spend > 0 else 0
        roas_change = calculate_trend(current_roas, prev_roas)

        if roas_change < -30:
            alerts.append(Alert(
                id=f"alert-roas-{now}",
                type=AlertType.ROAS_DROP,
                severity=AlertSeverity.CRITICAL if roas_change < -50 else AlertSeverity.WARNING,
                title="Caída de ROAS",
                message=f"ROAS cayó {abs(roas_change):.0f}% respecto al período anterior",
                metric="roas",
                previous_value=prev_roas,
                current_value=current_roas,
                change_percent=roas_change,
                created_at=now
            ))

    # CPA/CPR increase
    if prev_cpr > 0 and current_cpr > 0:
        cpr_change = calculate_trend(current_cpr, prev_cpr)
        if cpr_change > 50:
            alerts.append(Alert(
                id=f"alert-cpa-{now}",
                type=AlertType.CPA_INCREASE,
                severity=AlertSeverity.CRITICAL if cpr_change > 100 else AlertSeverity.WARNING,
                title="Aumento de costo por resultado",
                message=f"El CPR aumentó {cpr_change:.0f}% (${prev_cpr:.0f} → ${current_cpr:.0f})",
                metric="cpr",
                previous_value=prev_cpr,
                current_value=current_cpr,
                change_percent=cpr_change,
                created_at=now
            ))

    # CTR drop
    if prev_ctr > 0 and current_ctr > 0:
        ctr_change = calculate_trend(current_ctr, prev_ctr)
        if ctr_change < -25:
            alerts.append(Alert(
                id=f"alert-ctr-{now}",
                type=AlertType.CTR_DROP,
                severity=AlertSeverity.WARNING,
                title="CTR en descenso",
                message=f"El CTR cayó {abs(ctr_change):.0f}% ({prev_ctr:.2f}% → {current_ctr:.2f}%)",
                metric="ctr",
                previous_value=prev_ctr,
                current_value=current_ctr,
                change_percent=ctr_change,
                created_at=now
            ))

    return alerts


# ==================== RECOMMENDATIONS ====================

def generate_recommendations(classification: AdClassification, metrics: dict) -> List[str]:
    """Genera recomendaciones basadas en la clasificación y métricas."""
    recommendations = []

    if classification == AdClassification.GANADOR:
        recommendations.extend([
            "Aumentar presupuesto gradualmente (20-30%)",
            "Crear variaciones del creativo para testear",
            "Expandir audiencia similar"
        ])
    elif classification == AdClassification.ESCALABLE:
        recommendations.extend([
            "Mantener presupuesto actual",
            "Optimizar segmentación",
            "Probar diferentes horarios de publicación"
        ])
    elif classification == AdClassification.TESTING:
        recommendations.extend([
            "Esperar más datos (mínimo 7 días)",
            "Monitorear métricas diariamente"
        ])
    elif classification == AdClassification.FATIGADO:
        recommendations.extend([
            "Pausar temporalmente",
            "Refrescar creativo",
            "Cambiar copy o imágenes"
        ])
        if metrics.get('frequency', 0) > 4:
            recommendations.append("Reducir frecuencia ampliando audiencia")
    elif classification == AdClassification.PAUSAR:
        recommendations.extend([
            "Pausar inmediatamente",
            "Analizar por qué no funcionó",
            "Reasignar presupuesto a ganadores"
        ])

    # Additional context-based recommendations
    if metrics.get('ctr', 0) < 1:
        recommendations.append("CTR bajo: revisar relevancia del mensaje")

    if metrics.get('frequency', 0) > 3 and classification != AdClassification.FATIGADO:
        recommendations.append("Frecuencia elevada: monitorear fatiga")

    return recommendations


# ==================== FULL ANALYSIS ====================

def analyze_campaign(
    df: pd.DataFrame,
    campaign_name: str,
    objective: CampaignObjective,
    thresholds: AnalysisThresholds = DEFAULT_THRESHOLDS
) -> CampaignAnalysis:
    """
    Realiza el análisis completo de una campaña.
    """
    # Filter by campaign
    campaign_df = df[df['campaign_name'] == campaign_name].copy()

    # Group by ad
    ads_analysis = []
    for ad_name in campaign_df['ad_name'].unique():
        ad_df = campaign_df[campaign_df['ad_name'] == ad_name].sort_values('date')

        total_spend = ad_df['spend'].sum()
        total_results = ad_df['results'].sum()
        avg_ctr = ad_df['ctr'].mean()
        avg_frequency = ad_df['frequency'].mean()
        avg_cpr = total_spend / total_results if total_results > 0 else 0
        days_running = len(ad_df)

        # Calculate trends
        if len(ad_df) >= 14:
            recent = ad_df.tail(7)
            older = ad_df.iloc[-14:-7]
            ctr_trend = calculate_trend(recent['ctr'].mean(), older['ctr'].mean())
            cpr_recent = recent['spend'].sum() / recent['results'].sum() if recent['results'].sum() > 0 else 0
            cpr_older = older['spend'].sum() / older['results'].sum() if older['results'].sum() > 0 else 0
            cpr_trend = calculate_trend(cpr_recent, cpr_older)
            frequency_trend = calculate_trend(recent['frequency'].mean(), older['frequency'].mean())
        else:
            ctr_trend = cpr_trend = frequency_trend = 0

        # Classify
        classification, reason = classify_ad(ad_df, thresholds)

        # Fatigue score
        fatigue_score = calculate_fatigue_score(avg_frequency, ctr_trend, days_running)

        # Recommendations
        recommendations = generate_recommendations(classification, {
            'ctr': avg_ctr,
            'frequency': avg_frequency,
            'cpr': avg_cpr
        })

        ads_analysis.append(AdAnalysis(
            ad_name=ad_name,
            ad_set_name=ad_df['ad_set_name'].iloc[0],
            campaign_name=campaign_name,
            total_spend=total_spend,
            total_results=total_results,
            avg_cost_per_result=avg_cpr,
            avg_ctr=avg_ctr,
            avg_frequency=avg_frequency,
            ctr_trend=ctr_trend,
            cpr_trend=cpr_trend,
            frequency_trend=frequency_trend,
            classification=classification,
            classification_reason=reason,
            recommendations=recommendations,
            fatigue_score=fatigue_score,
            days_running=days_running
        ))

    # Campaign-level insights
    top_performers = [a.ad_name for a in ads_analysis if a.classification == AdClassification.GANADOR]
    underperformers = [a.ad_name for a in ads_analysis if a.classification == AdClassification.PAUSAR]

    total_spend = sum(a.total_spend for a in ads_analysis)
    total_results = sum(a.total_results for a in ads_analysis)
    avg_cpr = total_spend / total_results if total_results > 0 else 0

    insights = []
    if len(top_performers) > 0:
        insights.append(f"{len(top_performers)} anuncio(s) con performance destacada")
    if len(underperformers) > 0:
        insights.append(f"{len(underperformers)} anuncio(s) recomendados para pausar")

    fatigued = [a for a in ads_analysis if a.classification == AdClassification.FATIGADO]
    if fatigued:
        insights.append(f"{len(fatigued)} anuncio(s) muestran signos de fatiga creativa")

    campaign_recommendations = []
    if underperformers:
        campaign_recommendations.append(f"Reasignar presupuesto de anuncios de bajo rendimiento a ganadores")
    if fatigued:
        campaign_recommendations.append("Refrescar creativos de anuncios fatigados")
    if top_performers:
        campaign_recommendations.append("Considerar escalar anuncios ganadores en 20-30%")

    return CampaignAnalysis(
        campaign_name=campaign_name,
        objective=objective,
        total_spend=total_spend,
        total_results=total_results,
        avg_cost_per_result=avg_cpr,
        ads_analysis=ads_analysis,
        top_performers=top_performers,
        underperformers=underperformers,
        insights=insights,
        recommendations=campaign_recommendations
    )
