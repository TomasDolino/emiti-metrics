"""
Router para endpoints de análisis - CON DATOS REALES
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, distinct
from typing import Optional
from datetime import datetime, timedelta

from ..auth import get_current_user
from ..database import get_db, MetricDB, ClientDB, CampaignDB, UserDB

router = APIRouter()


def classify_ad(cpr: float, ctr: float, frequency: float, results: int, days: int, spend: float = 0, threshold_cpr: float = 300):
    """
    Clasifica un anuncio y genera recomendaciones específicas.
    Retorna: (classification, recommendation, action, priority)
    """
    # TESTING - Pocos datos para decidir
    if results < 5 or days < 3:
        needed_spend = max(500 - spend, 0)
        needed_days = max(3 - days, 0)
        return {
            "classification": "TESTING",
            "recommendation": f"Esperá {needed_days} días más o ${needed_spend:,.0f} más de gasto antes de decidir. Con {results} resultados en {days} días aún no hay datos suficientes.",
            "action": "ESPERAR",
            "action_detail": f"Dejar correr hasta tener al menos 5 resultados o 3 días",
            "priority": 3,
            "reason": f"Solo {results} resultados en {days} días - datos insuficientes"
        }

    # FATIGADO - Frecuencia muy alta
    if frequency > 3.5:
        return {
            "classification": "FATIGADO",
            "recommendation": f"La frecuencia está en {frequency:.1f}x (muy alta). El público ya vio este anuncio demasiadas veces. Pausá y creá una variante con nuevo copy o imagen.",
            "action": "PAUSAR_Y_RENOVAR",
            "action_detail": "Pausar este anuncio y crear variante con nuevo creativo",
            "priority": 1,
            "reason": f"Frecuencia {frequency:.1f}x > 3.5x indica saturación"
        }

    # PAUSAR - CPR muy alto
    if cpr > threshold_cpr * 1.5:
        over_threshold = ((cpr / threshold_cpr) - 1) * 100
        return {
            "classification": "PAUSAR",
            "recommendation": f"El CPR (${cpr:,.0f}) está {over_threshold:.0f}% por encima del objetivo. Este anuncio no está siendo rentable. Pausalo y reasigná el presupuesto a los ganadores.",
            "action": "PAUSAR",
            "action_detail": "Pausar inmediatamente y redistribuir presupuesto",
            "priority": 1,
            "reason": f"CPR ${cpr:,.0f} muy superior al objetivo de ${threshold_cpr:,.0f}"
        }

    # GANADOR - Excelente performance
    if cpr < threshold_cpr * 0.7 and ctr > 1.0:
        savings = ((threshold_cpr - cpr) / threshold_cpr) * 100
        return {
            "classification": "GANADOR",
            "recommendation": f"¡Excelente! CPR ${cpr:,.0f} ({savings:.0f}% mejor que el objetivo) y CTR {ctr:.2f}%. Aumentá el presupuesto 20-30% gradualmente. Considerá duplicarlo en otros ad sets.",
            "action": "ESCALAR",
            "action_detail": "Aumentar presupuesto 20-30% y considerar duplicar",
            "priority": 1,
            "reason": f"CPR excelente (${cpr:,.0f}) + CTR alto ({ctr:.2f}%)"
        }

    # ESCALABLE - Buen performance, puede crecer
    if cpr < threshold_cpr:
        margin = ((threshold_cpr - cpr) / threshold_cpr) * 100
        if frequency > 2.5:
            return {
                "classification": "ESCALABLE",
                "recommendation": f"CPR bueno (${cpr:,.0f}, {margin:.0f}% bajo objetivo) pero frecuencia subiendo ({frequency:.1f}x). Aumentá presupuesto 15% pero monitoreá la frecuencia de cerca.",
                "action": "ESCALAR_CON_CUIDADO",
                "action_detail": "Aumentar presupuesto 15% máximo, monitorear frecuencia",
                "priority": 2,
                "reason": f"Buen CPR pero frecuencia {frequency:.1f}x acercándose al límite"
            }
        else:
            return {
                "classification": "ESCALABLE",
                "recommendation": f"Buen rendimiento con CPR ${cpr:,.0f} ({margin:.0f}% bajo objetivo). Aumentá el presupuesto 20% para obtener más resultados. La frecuencia ({frequency:.1f}x) está saludable.",
                "action": "ESCALAR",
                "action_detail": "Aumentar presupuesto 20%",
                "priority": 2,
                "reason": f"CPR ${cpr:,.0f} bajo objetivo, frecuencia saludable"
            }

    # Default TESTING - En el límite
    return {
        "classification": "TESTING",
        "recommendation": f"El CPR (${cpr:,.0f}) está cerca del objetivo (${threshold_cpr:,.0f}). Dejalo correr unos días más para ver si mejora o empeora antes de tomar acción.",
        "action": "MONITOREAR",
        "action_detail": "Observar evolución por 3-5 días más",
        "priority": 3,
        "reason": f"CPR ${cpr:,.0f} cerca del umbral, necesita más datos"
    }


def classify_ad_simple(cpr: float, ctr: float, frequency: float, results: int, days: int, threshold_cpr: float = 300):
    """Versión simple que solo retorna la clasificación (para compatibilidad)."""
    result = classify_ad(cpr, ctr, frequency, results, days, 0, threshold_cpr)
    return result["classification"]


@router.get("/dashboard")
async def get_dashboard_summary(
    client_id: Optional[str] = None,
    brand_id: Optional[str] = None,
    days: int = 30,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user)
):
    """Resumen del dashboard con datos reales."""
    # Date range - use custom dates if provided
    if start_date and end_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)  # Include end date
            days = (end_dt - start_dt).days
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        end_dt = datetime.utcnow()
        start_dt = end_dt - timedelta(days=days)

    # Base query
    query = db.query(MetricDB).filter(
        MetricDB.date >= start_dt,
        MetricDB.date < end_dt
    )

    if client_id:
        query = query.filter(MetricDB.client_id == client_id)

    # Brand filter - filter by campaign name prefix or ad account
    if brand_id:
        # Get brand info to determine how to filter
        brand = db.query(ClientDB).filter(ClientDB.id == brand_id).first()
        if brand:
            query = query.filter(MetricDB.client_id == brand_id)

    metrics = query.all()

    if not metrics:
        return {
            "total_spend": 0,
            "total_impressions": 0,
            "total_results": 0,
            "total_reach": 0,
            "avg_cpr": 0,
            "avg_ctr": 0,
            "avg_cpm": 0,
            "avg_frequency": 0,
            "classification_counts": {},
            "daily_metrics": [],
            "top_ads": [],
            "period_days": days
        }

    # Aggregate totals
    total_spend = sum(m.spend or 0 for m in metrics)
    total_impressions = sum(m.impressions or 0 for m in metrics)
    total_results = sum(m.results or 0 for m in metrics)
    total_reach = sum(m.reach or 0 for m in metrics)
    total_clicks = sum(m.clicks or 0 for m in metrics)

    avg_cpr = total_spend / total_results if total_results > 0 else 0
    avg_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
    avg_cpm = (total_spend / total_impressions * 1000) if total_impressions > 0 else 0
    avg_frequency = sum(m.frequency or 0 for m in metrics) / len(metrics) if metrics else 0

    # Daily aggregation
    daily_data = {}
    for m in metrics:
        date_key = m.date.strftime("%Y-%m-%d") if m.date else "unknown"
        if date_key not in daily_data:
            daily_data[date_key] = {"date": date_key, "spend": 0, "results": 0, "impressions": 0}
        daily_data[date_key]["spend"] += m.spend or 0
        daily_data[date_key]["results"] += m.results or 0
        daily_data[date_key]["impressions"] += m.impressions or 0

    daily_metrics = sorted(daily_data.values(), key=lambda x: x["date"])

    # Aggregate by ad
    ad_data = {}
    for m in metrics:
        key = (m.ad_name, m.campaign_name, m.ad_set_name, m.client_id)
        if key not in ad_data:
            ad_data[key] = {
                "ad_name": m.ad_name,
                "campaign_name": m.campaign_name,
                "ad_set_name": m.ad_set_name,
                "client_id": m.client_id,
                "spend": 0,
                "results": 0,
                "impressions": 0,
                "clicks": 0,
                "frequency_sum": 0,
                "days": set()
            }
        ad_data[key]["spend"] += m.spend or 0
        ad_data[key]["results"] += m.results or 0
        ad_data[key]["impressions"] += m.impressions or 0
        ad_data[key]["clicks"] += m.clicks or 0
        ad_data[key]["frequency_sum"] += m.frequency or 0
        if m.date:
            ad_data[key]["days"].add(m.date.strftime("%Y-%m-%d"))

    # Calculate per-ad metrics and classify
    classification_counts = {"GANADOR": 0, "ESCALABLE": 0, "TESTING": 0, "FATIGADO": 0, "PAUSAR": 0}
    top_ads = []

    for ad in ad_data.values():
        days_running = len(ad["days"])
        cpr = ad["spend"] / ad["results"] if ad["results"] > 0 else 0
        ctr = (ad["clicks"] / ad["impressions"] * 100) if ad["impressions"] > 0 else 0
        freq = ad["frequency_sum"] / days_running if days_running > 0 else 0

        analysis = classify_ad(cpr, ctr, freq, ad["results"], days_running, ad["spend"])
        classification_counts[analysis["classification"]] += 1

        top_ads.append({
            "ad_name": ad["ad_name"],
            "campaign_name": ad["campaign_name"],
            "ad_set_name": ad["ad_set_name"],
            "client_id": ad["client_id"],
            "spend": ad["spend"],
            "results": ad["results"],
            "impressions": ad["impressions"],
            "cpr": cpr,
            "ctr": ctr,
            "frequency": freq,
            "days_running": days_running,
            "classification": analysis["classification"],
            "recommendation": analysis["recommendation"],
            "action": analysis["action"],
            "action_detail": analysis["action_detail"],
            "priority": analysis["priority"],
            "reason": analysis["reason"]
        })

    # Sort by results descending, take top 10
    top_ads = sorted(top_ads, key=lambda x: x["results"], reverse=True)[:10]

    return {
        "total_spend": total_spend,
        "total_impressions": total_impressions,
        "total_results": total_results,
        "total_reach": total_reach,
        "avg_cpr": avg_cpr,
        "avg_ctr": avg_ctr,
        "avg_cpm": avg_cpm,
        "avg_frequency": avg_frequency,
        "classification_counts": classification_counts,
        "daily_metrics": daily_metrics,
        "top_ads": top_ads,
        "period_days": days
    }


@router.get("/comparison")
async def compare_periods(
    client_id: Optional[str] = None,
    brand_id: Optional[str] = None,
    days: int = 7,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user)
):
    """Compara período actual vs anterior."""
    # Date range
    if start_date and end_date:
        try:
            current_end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            current_start = datetime.strptime(start_date, "%Y-%m-%d")
            days = (current_end - current_start).days
            previous_start = current_start - timedelta(days=days)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        current_end = datetime.utcnow()
        current_start = current_end - timedelta(days=days)
        previous_start = current_start - timedelta(days=days)

    # Filter client/brand
    filter_client = brand_id or client_id

    def get_period_metrics(start, end):
        query = db.query(MetricDB).filter(
            MetricDB.date >= start,
            MetricDB.date < end
        )
        if filter_client:
            query = query.filter(MetricDB.client_id == filter_client)

        metrics = query.all()
        spend = sum(m.spend or 0 for m in metrics)
        results = sum(m.results or 0 for m in metrics)
        impressions = sum(m.impressions or 0 for m in metrics)
        cpr = spend / results if results > 0 else 0

        return {"spend": spend, "results": results, "impressions": impressions, "cpr": cpr}

    current = get_period_metrics(current_start, current_end)
    previous = get_period_metrics(previous_start, current_start)

    def calc_change(curr, prev):
        if prev == 0:
            return 100 if curr > 0 else 0
        return ((curr - prev) / prev) * 100

    return {
        "current_period": current,
        "previous_period": previous,
        "changes": {
            "spend": calc_change(current["spend"], previous["spend"]),
            "results": calc_change(current["results"], previous["results"]),
            "impressions": calc_change(current["impressions"], previous["impressions"]),
            "cpr": calc_change(current["cpr"], previous["cpr"])
        },
        "period_days": days
    }


@router.get("/ads")
async def get_ads_analysis(
    client_id: Optional[str] = None,
    brand_id: Optional[str] = None,
    days: int = 30,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user)
):
    """Lista todos los anuncios con su análisis."""
    # Date range
    if start_date and end_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        end_dt = datetime.utcnow()
        start_dt = end_dt - timedelta(days=days)

    query = db.query(MetricDB).filter(
        MetricDB.date >= start_dt,
        MetricDB.date < end_dt
    )

    filter_client = brand_id or client_id
    if filter_client:
        query = query.filter(MetricDB.client_id == filter_client)

    metrics = query.all()

    # Aggregate by ad
    ad_data = {}
    for m in metrics:
        key = (m.ad_name, m.campaign_name, m.ad_set_name, m.client_id)
        if key not in ad_data:
            ad_data[key] = {
                "ad_name": m.ad_name,
                "campaign_name": m.campaign_name,
                "ad_set_name": m.ad_set_name,
                "client_id": m.client_id,
                "spend": 0,
                "results": 0,
                "impressions": 0,
                "clicks": 0,
                "frequency_sum": 0,
                "days": set()
            }
        ad_data[key]["spend"] += m.spend or 0
        ad_data[key]["results"] += m.results or 0
        ad_data[key]["impressions"] += m.impressions or 0
        ad_data[key]["clicks"] += m.clicks or 0
        ad_data[key]["frequency_sum"] += m.frequency or 0
        if m.date:
            ad_data[key]["days"].add(m.date.strftime("%Y-%m-%d"))

    ads = []
    for ad in ad_data.values():
        days_running = len(ad["days"])
        cpr = ad["spend"] / ad["results"] if ad["results"] > 0 else 0
        ctr = (ad["clicks"] / ad["impressions"] * 100) if ad["impressions"] > 0 else 0
        freq = ad["frequency_sum"] / days_running if days_running > 0 else 0

        analysis = classify_ad(cpr, ctr, freq, ad["results"], days_running, ad["spend"])

        ads.append({
            "ad_name": ad["ad_name"],
            "campaign_name": ad["campaign_name"],
            "ad_set_name": ad["ad_set_name"],
            "client_id": ad["client_id"],
            "spend": ad["spend"],
            "results": ad["results"],
            "impressions": ad["impressions"],
            "cpr": cpr,
            "ctr": ctr,
            "frequency": freq,
            "days_running": days_running,
            "classification": analysis["classification"],
            "recommendation": analysis["recommendation"],
            "action": analysis["action"],
            "action_detail": analysis["action_detail"],
            "priority": analysis["priority"],
            "reason": analysis["reason"]
        })

    return sorted(ads, key=lambda x: x["results"], reverse=True)


@router.get("/campaigns")
async def get_campaigns_analysis(
    client_id: Optional[str] = None,
    brand_id: Optional[str] = None,
    days: int = 30,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user)
):
    """Análisis de campañas."""
    # Date range
    if start_date and end_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        end_dt = datetime.utcnow()
        start_dt = end_dt - timedelta(days=days)

    query = db.query(MetricDB).filter(
        MetricDB.date >= start_dt,
        MetricDB.date < end_dt
    )

    filter_client = brand_id or client_id
    if filter_client:
        query = query.filter(MetricDB.client_id == filter_client)

    metrics = query.all()

    # Aggregate by campaign
    campaign_data = {}
    for m in metrics:
        key = m.campaign_name
        if key not in campaign_data:
            campaign_data[key] = {
                "name": m.campaign_name,
                "client_id": m.client_id,
                "spend": 0,
                "results": 0,
                "impressions": 0,
                "clicks": 0,
                "ads": set()
            }
        campaign_data[key]["spend"] += m.spend or 0
        campaign_data[key]["results"] += m.results or 0
        campaign_data[key]["impressions"] += m.impressions or 0
        campaign_data[key]["clicks"] += m.clicks or 0
        campaign_data[key]["ads"].add(m.ad_name)

    campaigns = []
    for c in campaign_data.values():
        cpr = c["spend"] / c["results"] if c["results"] > 0 else 0
        ctr = (c["clicks"] / c["impressions"] * 100) if c["impressions"] > 0 else 0

        campaigns.append({
            "name": c["name"],
            "client_id": c["client_id"],
            "spend": c["spend"],
            "results": c["results"],
            "impressions": c["impressions"],
            "cpr": cpr,
            "ctr": ctr,
            "ads_count": len(c["ads"])
        })

    return sorted(campaigns, key=lambda x: x["spend"], reverse=True)
