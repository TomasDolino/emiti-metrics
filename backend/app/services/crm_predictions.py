"""
CRM Predictive Analytics for Willy AI Chat
Statistical analysis + simple linear regression for sales predictions.
No heavy ML dependencies - uses numpy only.
"""
import numpy as np
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)


def _group_orders_by_month(orders: List[Dict], months: int = 6) -> List[Dict]:
    """Group orders into monthly buckets for the last N months."""
    now = datetime.now()
    monthly: Dict[str, Dict] = {}

    for i in range(months - 1, -1, -1):
        d = datetime(now.year, now.month, 1) - timedelta(days=i * 30)
        key = f"{d.year}-{d.month:02d}"
        monthly[key] = {"month": key, "sales": 0.0, "orders": 0, "collected": 0.0}

    for o in orders:
        created = o.get("created_at", "")
        if not created:
            continue
        try:
            dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            continue
        key = f"{dt.year}-{dt.month:02d}"
        if key in monthly:
            monthly[key]["sales"] += float(o.get("total_amount", 0) or 0)
            monthly[key]["collected"] += float(o.get("seña", 0) or 0)
            monthly[key]["orders"] += 1

    return list(monthly.values())


def predict_monthly_sales(orders: List[Dict]) -> Dict[str, Any]:
    """Linear regression on monthly sales to predict trend.
    Returns prediction, trend direction, and confidence (R^2)."""
    monthly = _group_orders_by_month(orders, months=6)
    sales = [m["sales"] for m in monthly]

    if len(sales) < 3 or all(s == 0 for s in sales):
        return {"trend": "sin_datos", "confidence": 0, "prediction": 0, "monthly_data": monthly}

    x = np.arange(len(sales), dtype=float)
    y = np.array(sales, dtype=float)

    # Linear regression
    n = len(x)
    sx, sy = x.sum(), y.sum()
    sxy = (x * y).sum()
    sxx = (x * x).sum()

    slope = (n * sxy - sx * sy) / (n * sxx - sx * sx) if (n * sxx - sx * sx) != 0 else 0
    intercept = (sy - slope * sx) / n

    # R-squared
    y_pred = slope * x + intercept
    ss_res = ((y - y_pred) ** 2).sum()
    ss_tot = ((y - y.mean()) ** 2).sum()
    r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0

    # Prediction for next month
    next_month_pred = max(0, slope * n + intercept)

    # Trend classification
    avg = y.mean()
    pct_change = (slope / avg * 100) if avg > 0 else 0
    if pct_change > 5:
        trend = "subiendo"
    elif pct_change < -5:
        trend = "bajando"
    else:
        trend = "estable"

    return {
        "trend": trend,
        "trend_pct": round(pct_change, 1),
        "prediction_next_month": round(next_month_pred),
        "confidence": round(max(0, r_squared), 2),
        "current_month_so_far": round(sales[-1]) if sales else 0,
        "monthly_data": monthly
    }


def analyze_collection_efficiency(orders: List[Dict]) -> Dict[str, Any]:
    """Analyze collection ratio (collected/sold) trend."""
    monthly = _group_orders_by_month(orders, months=6)

    efficiencies = []
    for m in monthly:
        if m["sales"] > 0:
            eff = (m["collected"] / m["sales"]) * 100
            efficiencies.append({"month": m["month"], "efficiency": round(eff, 1)})
        elif m["orders"] > 0:
            efficiencies.append({"month": m["month"], "efficiency": 0})

    if len(efficiencies) < 2:
        return {"trend": "sin_datos", "current": 0, "data": efficiencies}

    current = efficiencies[-1]["efficiency"]
    avg = sum(e["efficiency"] for e in efficiencies) / len(efficiencies)

    if current < avg - 10:
        trend = "empeorando"
    elif current > avg + 10:
        trend = "mejorando"
    else:
        trend = "estable"

    total_pending = sum(
        float(o.get("saldo", 0) or 0)
        for o in orders
        if float(o.get("saldo", 0) or 0) > 0
    )

    return {
        "trend": trend,
        "current_efficiency": round(current, 1),
        "average_efficiency": round(avg, 1),
        "total_pending_collection": round(total_pending),
        "data": efficiencies
    }


def seller_momentum(orders: List[Dict]) -> List[Dict[str, Any]]:
    """Compare each seller's last month vs 3-month average."""
    now = datetime.now()
    one_month_ago = now - timedelta(days=30)
    three_months_ago = now - timedelta(days=90)

    recent: Dict[str, float] = defaultdict(float)
    recent_count: Dict[str, int] = defaultdict(int)
    historical: Dict[str, float] = defaultdict(float)
    historical_count: Dict[str, int] = defaultdict(int)

    for o in orders:
        seller = o.get("seller_name")
        if not seller:
            continue
        try:
            dt = datetime.fromisoformat(o["created_at"].replace("Z", "+00:00"))
        except (ValueError, TypeError, KeyError):
            continue

        amount = float(o.get("total_amount", 0) or 0)

        if dt.replace(tzinfo=None) >= one_month_ago:
            recent[seller] += amount
            recent_count[seller] += 1

        if dt.replace(tzinfo=None) >= three_months_ago:
            historical[seller] += amount
            historical_count[seller] += 1

    results = []
    all_sellers = set(list(recent.keys()) + list(historical.keys()))
    for seller in all_sellers:
        monthly_avg = (historical[seller] / 3) if historical[seller] > 0 else 0
        last_month = recent[seller]

        if monthly_avg > 0:
            change_pct = ((last_month - monthly_avg) / monthly_avg) * 100
        else:
            change_pct = 100 if last_month > 0 else 0

        if change_pct > 15:
            momentum = "subiendo"
        elif change_pct < -15:
            momentum = "bajando"
        else:
            momentum = "estable"

        results.append({
            "seller": seller,
            "last_month_sales": round(last_month),
            "monthly_average": round(monthly_avg),
            "change_pct": round(change_pct, 1),
            "momentum": momentum,
            "last_month_orders": recent_count[seller]
        })

    return sorted(results, key=lambda x: x["last_month_sales"], reverse=True)


def brand_growth_rates(orders: List[Dict], brands: List[Dict]) -> List[Dict[str, Any]]:
    """Calculate month-over-month growth rate per brand."""
    now = datetime.now()
    current_start = datetime(now.year, now.month, 1)
    prev_start = datetime(now.year, now.month - 1 if now.month > 1 else 12,
                          1, 0, 0, 0)

    brand_map = {b["id"]: b["name"] for b in brands}

    current: Dict[str, float] = defaultdict(float)
    previous: Dict[str, float] = defaultdict(float)

    for o in orders:
        brand_id = o.get("brand_id")
        if not brand_id or brand_id not in brand_map:
            continue
        try:
            dt = datetime.fromisoformat(o["created_at"].replace("Z", "+00:00")).replace(tzinfo=None)
        except (ValueError, TypeError, KeyError):
            continue

        amount = float(o.get("total_amount", 0) or 0)
        name = brand_map[brand_id]

        if dt >= current_start:
            current[name] += amount
        elif dt >= prev_start and dt < current_start:
            previous[name] += amount

    results = []
    for name in set(list(current.keys()) + list(previous.keys())):
        curr = current.get(name, 0)
        prev = previous.get(name, 0)

        if prev > 0:
            growth = ((curr - prev) / prev) * 100
        else:
            growth = 100 if curr > 0 else 0

        results.append({
            "brand": name,
            "current_month": round(curr),
            "previous_month": round(prev),
            "growth_pct": round(growth, 1)
        })

    return sorted(results, key=lambda x: x["current_month"], reverse=True)


def delivery_bottleneck_analysis(orders: List[Dict]) -> Dict[str, Any]:
    """Analyze average time spent in each order status to find bottlenecks."""
    # Group active (non-delivered) orders by status with their age
    now = datetime.now()
    status_ages: Dict[str, List[float]] = defaultdict(list)

    for o in orders:
        status = o.get("status", "")
        if status == "entregado":
            continue

        try:
            updated = o.get("updated_at") or o.get("created_at", "")
            dt = datetime.fromisoformat(updated.replace("Z", "+00:00")).replace(tzinfo=None)
            days_in_status = (now - dt).days
            if days_in_status >= 0:
                status_ages[status].append(days_in_status)
        except (ValueError, TypeError):
            continue

    analysis = {}
    bottleneck = {"status": "", "avg_days": 0}

    for status in ["vendido", "en_produccion", "laqueado", "tapiceria", "listo", "con_demora"]:
        ages = status_ages.get(status, [])
        if ages:
            avg = sum(ages) / len(ages)
            analysis[status] = {
                "count": len(ages),
                "avg_days": round(avg, 1),
                "max_days": max(ages),
            }
            if avg > bottleneck["avg_days"]:
                bottleneck = {"status": status, "avg_days": round(avg, 1)}
        else:
            analysis[status] = {"count": 0, "avg_days": 0, "max_days": 0}

    return {
        "by_status": analysis,
        "bottleneck": bottleneck,
    }


def seasonal_patterns(orders: List[Dict]) -> Dict[str, Any]:
    """Detect best/worst days of week and weeks of month."""
    day_sales: Dict[int, List[float]] = defaultdict(list)
    day_names = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

    for o in orders:
        try:
            dt = datetime.fromisoformat(o["created_at"].replace("Z", "+00:00"))
            amount = float(o.get("total_amount", 0) or 0)
            day_sales[dt.weekday()].append(amount)
        except (ValueError, TypeError, KeyError):
            continue

    day_stats = []
    for i in range(7):
        sales = day_sales.get(i, [])
        day_stats.append({
            "day": day_names[i],
            "avg_sales": round(sum(sales) / max(len(sales), 1)),
            "order_count": len(sales)
        })

    best = max(day_stats, key=lambda x: x["avg_sales"]) if day_stats else None
    worst = min(day_stats, key=lambda x: x["avg_sales"]) if day_stats else None

    return {
        "best_day": best,
        "worst_day": worst,
        "by_day": day_stats
    }


def generate_all_predictions(orders: List[Dict], brands: List[Dict] = None) -> Dict[str, Any]:
    """Run all prediction functions and return combined results."""
    try:
        sales_pred = predict_monthly_sales(orders)
    except Exception as e:
        logger.error(f"Sales prediction error: {e}")
        sales_pred = {"trend": "error", "confidence": 0}

    try:
        collection = analyze_collection_efficiency(orders)
    except Exception as e:
        logger.error(f"Collection analysis error: {e}")
        collection = {"trend": "error"}

    try:
        sellers = seller_momentum(orders)
    except Exception as e:
        logger.error(f"Seller momentum error: {e}")
        sellers = []

    try:
        brand_growth = brand_growth_rates(orders, brands or [])
    except Exception as e:
        logger.error(f"Brand growth error: {e}")
        brand_growth = []

    try:
        bottlenecks = delivery_bottleneck_analysis(orders)
    except Exception as e:
        logger.error(f"Bottleneck analysis error: {e}")
        bottlenecks = {"bottleneck": {"status": "error", "avg_days": 0}}

    try:
        patterns = seasonal_patterns(orders)
    except Exception as e:
        logger.error(f"Seasonal patterns error: {e}")
        patterns = {}

    return {
        "sales_forecast": sales_pred,
        "collection_efficiency": collection,
        "seller_momentum": sellers[:5],
        "brand_growth": brand_growth,
        "delivery_bottlenecks": bottlenecks,
        "seasonal_patterns": patterns
    }
