"""
CRM Integration Router - Endpoints for CRM Grupo Albisu integration.
Provides real ROAS calculation by comparing Meta spend vs actual sales.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel

from ..auth import get_current_user
from ..services.crm_integration import (
    get_daily_sales,
    get_sales_summary,
    calculate_real_roas,
    get_weekly_comparison,
    is_crm_configured,
    DailySales
)

router = APIRouter()


# ==================== SCHEMAS ====================

class SalesSummaryResponse(BaseModel):
    """Sales summary for a period."""
    period_start: str
    period_end: str
    total_sales: float
    order_count: int
    avg_ticket: float
    currency: str = "ARS"


class DailySalesResponse(BaseModel):
    """Daily sales data."""
    date: str
    total_sales: float
    order_count: int
    avg_ticket: float


class ROASComparisonRequest(BaseModel):
    """Request for ROAS comparison."""
    meta_spend: float
    meta_conversions: int = 0
    meta_conversion_value: float
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD
    brand_id: Optional[str] = None


class ROASComparisonResponse(BaseModel):
    """Response with ROAS comparison data."""
    period_start: str
    period_end: str
    meta_spend: float
    meta_reported_revenue: float
    meta_roas: float
    real_sales: float
    real_roas: float
    roas_difference: float
    order_count: int
    interpretation: str


class WeeklySalesResponse(BaseModel):
    """Weekly sales data."""
    week_number: int
    week_label: str
    period_start: str
    period_end: str
    total_sales: float
    order_count: int
    avg_ticket: float


# ==================== ENDPOINTS ====================

@router.get("/status")
async def get_crm_status(current_user = Depends(get_current_user)):
    """
    Check CRM integration status.
    """
    return {
        "configured": is_crm_configured(),
        "crm_name": "CRM Grupo Albisu",
        "database": "Supabase"
    }


@router.get("/sales/daily", response_model=List[DailySalesResponse])
async def get_daily_sales_data(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    brand_id: Optional[str] = Query(None, description="Filter by brand ID"),
    current_user = Depends(get_current_user)
):
    """
    Get daily sales data from CRM.

    Returns sales totals grouped by day for the specified date range.
    """
    if not is_crm_configured():
        raise HTTPException(status_code=503, detail="CRM integration not configured")

    try:
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    daily_data = await get_daily_sales(start, end, brand_id)

    return [
        DailySalesResponse(
            date=d.date,
            total_sales=d.total_sales,
            order_count=d.order_count,
            avg_ticket=d.avg_ticket
        )
        for d in daily_data
    ]


@router.get("/sales/summary", response_model=SalesSummaryResponse)
async def get_sales_summary_data(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    brand_id: Optional[str] = Query(None, description="Filter by brand ID"),
    current_user = Depends(get_current_user)
):
    """
    Get sales summary for a period from CRM.

    Returns total sales, order count, and average ticket.
    """
    if not is_crm_configured():
        raise HTTPException(status_code=503, detail="CRM integration not configured")

    try:
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    summary = await get_sales_summary(start, end, brand_id)

    return SalesSummaryResponse(**summary)


@router.get("/sales/weekly", response_model=List[WeeklySalesResponse])
async def get_weekly_sales_data(
    weeks: int = Query(4, description="Number of weeks to fetch", ge=1, le=12),
    brand_id: Optional[str] = Query(None, description="Filter by brand ID"),
    current_user = Depends(get_current_user)
):
    """
    Get weekly sales data for the last N weeks.

    Useful for trend analysis and week-over-week comparison.
    """
    if not is_crm_configured():
        raise HTTPException(status_code=503, detail="CRM integration not configured")

    weekly_data = await get_weekly_comparison(weeks, brand_id)

    return [
        WeeklySalesResponse(
            week_number=w["week_number"],
            week_label=w["week_label"],
            period_start=w["period_start"],
            period_end=w["period_end"],
            total_sales=w["total_sales"],
            order_count=w["order_count"],
            avg_ticket=w["avg_ticket"]
        )
        for w in weekly_data
    ]


@router.post("/roas/compare", response_model=ROASComparisonResponse)
async def compare_roas(
    request: ROASComparisonRequest,
    current_user = Depends(get_current_user)
):
    """
    Compare Meta reported ROAS vs real ROAS from CRM sales.

    This is the core endpoint for understanding the real performance
    of Meta campaigns by comparing reported conversions with actual sales.

    **Interpretation:**
    - Positive roas_difference: Meta underreports (real sales > reported)
    - Negative roas_difference: Meta overreports (real sales < reported)
    """
    if not is_crm_configured():
        raise HTTPException(status_code=503, detail="CRM integration not configured")

    try:
        start = datetime.fromisoformat(request.start_date)
        end = datetime.fromisoformat(request.end_date).replace(hour=23, minute=59, second=59)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    comparison = await calculate_real_roas(
        meta_spend=request.meta_spend,
        meta_conversions=request.meta_conversions,
        meta_conversion_value=request.meta_conversion_value,
        start_date=start,
        end_date=end,
        brand_id=request.brand_id
    )

    # Generate interpretation
    if comparison.roas_difference > 0.5:
        interpretation = f"Meta subreporta. ROAS real ({comparison.real_roas:.1f}x) es {comparison.roas_difference:.1f}x mayor que el reportado."
    elif comparison.roas_difference < -0.5:
        interpretation = f"Meta sobrereporta. ROAS real ({comparison.real_roas:.1f}x) es {abs(comparison.roas_difference):.1f}x menor que el reportado."
    else:
        interpretation = f"Meta reporta con precisión. ROAS real ({comparison.real_roas:.1f}x) similar al reportado ({comparison.meta_roas:.1f}x)."

    return ROASComparisonResponse(
        period_start=comparison.period_start,
        period_end=comparison.period_end,
        meta_spend=comparison.meta_spend,
        meta_reported_revenue=comparison.meta_reported_revenue,
        meta_roas=comparison.meta_roas,
        real_sales=comparison.real_sales,
        real_roas=comparison.real_roas,
        roas_difference=comparison.roas_difference,
        order_count=comparison.order_count,
        interpretation=interpretation
    )


@router.get("/roas/auto/{client_id}", response_model=ROASComparisonResponse)
async def auto_compare_roas(
    client_id: str,
    days: int = Query(30, description="Number of days to analyze", ge=7, le=90),
    current_user = Depends(get_current_user)
):
    """
    Automatically compare ROAS for a client by fetching Meta spend and CRM sales.

    This endpoint:
    1. Fetches Meta ad spend for the client
    2. Fetches CRM sales for the same period
    3. Calculates and compares ROAS

    Note: Requires the client to have linked Meta tokens.
    """
    if not is_crm_configured():
        raise HTTPException(status_code=503, detail="CRM integration not configured")

    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    # Get Meta spend (simplified - in real implementation, fetch from Meta API)
    # For now, we'll need to pass this data from the frontend
    # TODO: Integrate with Meta API to auto-fetch spend

    raise HTTPException(
        status_code=501,
        detail="Auto ROAS comparison coming soon. Use POST /roas/compare with Meta spend data for now."
    )
