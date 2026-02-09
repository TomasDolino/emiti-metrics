"""
CRM Integration Service - Connects Emiti Metrics with CRM Grupo Albisu (Supabase)
Enables real ROAS calculation by comparing Meta Ad spend vs actual sales.
"""
import os
import httpx
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

# Supabase configuration for CRM Grupo Albisu
SUPABASE_URL = os.getenv("CRM_SUPABASE_URL", "https://jugaswtevxrhzuiuoxbt.supabase.co")
SUPABASE_KEY = os.getenv("CRM_SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1Z2Fzd3RldnhyaHp1aXVveGJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2OTAxNzUsImV4cCI6MjA4NTI2NjE3NX0.E2TEjIWce-iIBxUuuzoRJws_Yp46wk750JRXkcA4TIc")


@dataclass
class DailySales:
    """Daily sales summary from CRM."""
    date: str
    total_sales: float
    order_count: int
    avg_ticket: float


@dataclass
class ROASComparison:
    """ROAS comparison between Meta reported and real sales."""
    period_start: str
    period_end: str
    meta_spend: float
    meta_reported_revenue: float
    meta_roas: float
    real_sales: float
    real_roas: float
    roas_difference: float  # real - meta (positive = Meta underreports)
    order_count: int


async def fetch_crm_orders(
    start_date: datetime,
    end_date: datetime,
    brand_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Fetch orders from CRM Supabase.

    Args:
        start_date: Start of date range
        end_date: End of date range
        brand_id: Optional brand filter

    Returns:
        List of order dictionaries
    """
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }

    # Build query - get orders in date range
    # Supabase REST API format
    url = f"{SUPABASE_URL}/rest/v1/orders"
    params = {
        "select": "id,created_at,total_amount,status,brand_id,seña,saldo",
        "created_at": f"gte.{start_date.isoformat()}",
        "order": "created_at.desc"
    }

    # Add end date filter
    # Note: Supabase needs separate params for range queries

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers=headers,
                params=params,
                timeout=30.0
            )

            if response.status_code == 200:
                orders = response.json()
                # Filter by end_date and optionally brand_id
                filtered = []
                for order in orders:
                    order_date = datetime.fromisoformat(order["created_at"].replace("Z", "+00:00"))
                    if order_date <= end_date:
                        if brand_id is None or order.get("brand_id") == brand_id:
                            filtered.append(order)
                return filtered
            else:
                logger.error(f"CRM API error: {response.status_code} - {response.text}")
                return []

    except Exception as e:
        logger.error(f"Error fetching CRM orders: {e}")
        return []


async def get_daily_sales(
    start_date: datetime,
    end_date: datetime,
    brand_id: Optional[str] = None
) -> List[DailySales]:
    """
    Get daily sales totals from CRM.

    Returns:
        List of DailySales objects, one per day
    """
    orders = await fetch_crm_orders(start_date, end_date, brand_id)

    # Group by date
    daily_totals: Dict[str, Dict] = {}

    for order in orders:
        # Extract date (YYYY-MM-DD)
        order_date = order["created_at"][:10]

        if order_date not in daily_totals:
            daily_totals[order_date] = {
                "total": 0.0,
                "count": 0
            }

        # Add to totals (use total_amount)
        amount = float(order.get("total_amount") or 0)
        daily_totals[order_date]["total"] += amount
        daily_totals[order_date]["count"] += 1

    # Convert to DailySales objects
    result = []
    for date_str, data in sorted(daily_totals.items()):
        avg_ticket = data["total"] / data["count"] if data["count"] > 0 else 0
        result.append(DailySales(
            date=date_str,
            total_sales=round(data["total"], 2),
            order_count=data["count"],
            avg_ticket=round(avg_ticket, 2)
        ))

    return result


async def get_sales_summary(
    start_date: datetime,
    end_date: datetime,
    brand_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get sales summary for a period.

    Returns:
        Dictionary with total_sales, order_count, avg_ticket, period info
    """
    orders = await fetch_crm_orders(start_date, end_date, brand_id)

    total_sales = sum(float(o.get("total_amount") or 0) for o in orders)
    order_count = len(orders)
    avg_ticket = total_sales / order_count if order_count > 0 else 0

    return {
        "period_start": start_date.isoformat()[:10],
        "period_end": end_date.isoformat()[:10],
        "total_sales": round(total_sales, 2),
        "order_count": order_count,
        "avg_ticket": round(avg_ticket, 2),
        "currency": "ARS"
    }


async def calculate_real_roas(
    meta_spend: float,
    meta_conversions: int,
    meta_conversion_value: float,
    start_date: datetime,
    end_date: datetime,
    brand_id: Optional[str] = None
) -> ROASComparison:
    """
    Calculate real ROAS by comparing Meta data with actual CRM sales.

    Args:
        meta_spend: Total spend on Meta ads
        meta_conversions: Conversions reported by Meta
        meta_conversion_value: Revenue reported by Meta
        start_date: Period start
        end_date: Period end
        brand_id: Optional brand filter

    Returns:
        ROASComparison with both Meta and real ROAS
    """
    # Get real sales from CRM
    sales_data = await get_sales_summary(start_date, end_date, brand_id)

    real_sales = sales_data["total_sales"]
    order_count = sales_data["order_count"]

    # Calculate ROAS values
    meta_roas = meta_conversion_value / meta_spend if meta_spend > 0 else 0
    real_roas = real_sales / meta_spend if meta_spend > 0 else 0

    return ROASComparison(
        period_start=start_date.isoformat()[:10],
        period_end=end_date.isoformat()[:10],
        meta_spend=round(meta_spend, 2),
        meta_reported_revenue=round(meta_conversion_value, 2),
        meta_roas=round(meta_roas, 2),
        real_sales=round(real_sales, 2),
        real_roas=round(real_roas, 2),
        roas_difference=round(real_roas - meta_roas, 2),
        order_count=order_count
    )


async def get_weekly_comparison(
    weeks: int = 4,
    brand_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Get weekly sales data for the last N weeks.

    Returns:
        List of weekly summaries
    """
    result = []
    today = datetime.utcnow()

    for i in range(weeks):
        # Calculate week boundaries (Monday to Sunday)
        end_of_week = today - timedelta(days=today.weekday() + 7 * i)
        start_of_week = end_of_week - timedelta(days=6)

        # Set to end of day for end_date
        end_of_week = end_of_week.replace(hour=23, minute=59, second=59)
        start_of_week = start_of_week.replace(hour=0, minute=0, second=0)

        summary = await get_sales_summary(start_of_week, end_of_week, brand_id)
        summary["week_number"] = i + 1
        summary["week_label"] = f"Semana {start_of_week.strftime('%d/%m')} - {end_of_week.strftime('%d/%m')}"
        result.append(summary)

    return result


def is_crm_configured() -> bool:
    """Check if CRM integration is properly configured."""
    return bool(SUPABASE_URL and SUPABASE_KEY)
