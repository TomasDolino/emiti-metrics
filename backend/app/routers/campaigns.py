"""
Router para endpoints de campañas
Queries real data from the database
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from sqlalchemy import text

from ..auth import get_current_user
from ..database import UserDB, get_db_connection

router = APIRouter()


@router.get("/")
async def list_campaigns(
    client_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: UserDB = Depends(get_current_user)
):
    """Lista todas las campañas desde la base de datos."""
    conn = get_db_connection()
    if not conn:
        return []

    try:
        cursor = conn.cursor()

        # Build query
        query = """
            SELECT
                c.id,
                c.client_id,
                c.name,
                c.objective,
                c.status,
                c.daily_budget,
                COALESCE(m.total_spend, 0) as spend,
                COALESCE(m.total_results, 0) as results,
                COALESCE(m.total_impressions, 0) as impressions,
                CASE WHEN COALESCE(m.total_results, 0) > 0
                     THEN COALESCE(m.total_spend, 0) / m.total_results
                     ELSE 0 END as cpr,
                COALESCE(m.ads_count, 0) as ads_count,
                c.created_at
            FROM campaigns c
            LEFT JOIN (
                SELECT
                    campaign_name,
                    client_id,
                    SUM(spend) as total_spend,
                    SUM(results) as total_results,
                    SUM(impressions) as total_impressions,
                    COUNT(DISTINCT ad_name) as ads_count
                FROM metrics
                GROUP BY campaign_name, client_id
            ) m ON c.name = m.campaign_name AND c.client_id = m.client_id
            WHERE 1=1
        """
        params = []

        if client_id:
            query += " AND c.client_id = %s"
            params.append(client_id)

        if status:
            query += " AND c.status = %s"
            params.append(status)

        query += " ORDER BY spend DESC LIMIT 100"

        cursor.execute(query, params)
        rows = cursor.fetchall()

        campaigns = []
        for row in rows:
            campaigns.append({
                "id": row[0],
                "client_id": row[1],
                "name": row[2],
                "objective": row[3] or "MESSAGES",
                "status": row[4] or "ACTIVE",
                "daily_budget": float(row[5] or 0),
                "spend": float(row[6] or 0),
                "results": int(row[7] or 0),
                "impressions": int(row[8] or 0),
                "cpr": float(row[9] or 0),
                "ads_count": int(row[10] or 0),
                "created_at": str(row[11]) if row[11] else None
            })

        return campaigns

    except Exception as e:
        print(f"Error fetching campaigns: {e}")
        return []
    finally:
        conn.close()


@router.get("/{campaign_id}")
async def get_campaign(campaign_id: str, current_user: UserDB = Depends(get_current_user)):
    """Obtiene una campaña por ID."""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, client_id, name, objective, status, daily_budget, created_at FROM campaigns WHERE id = %s",
            (campaign_id,)
        )
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Campaña no encontrada")

        return {
            "id": row[0],
            "client_id": row[1],
            "name": row[2],
            "objective": row[3] or "MESSAGES",
            "status": row[4] or "ACTIVE",
            "daily_budget": float(row[5] or 0),
            "created_at": str(row[6]) if row[6] else None
        }
    finally:
        conn.close()


@router.get("/{campaign_id}/metrics")
async def get_campaign_metrics(
    campaign_id: str,
    days: int = 30,
    current_user: UserDB = Depends(get_current_user)
):
    """Obtiene métricas de una campaña."""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        cursor = conn.cursor()

        # Get campaign name first
        cursor.execute("SELECT name, client_id FROM campaigns WHERE id = %s", (campaign_id,))
        campaign = cursor.fetchone()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaña no encontrada")

        campaign_name, client_id = campaign

        # Get metrics
        cursor.execute("""
            SELECT
                SUM(spend) as total_spend,
                SUM(results) as total_results,
                SUM(impressions) as total_impressions,
                AVG(frequency) as avg_frequency
            FROM metrics
            WHERE campaign_name = %s AND client_id = %s
              AND date >= CURRENT_DATE - INTERVAL '%s days'
        """, (campaign_name, client_id, days))

        row = cursor.fetchone()

        total_spend = float(row[0] or 0)
        total_results = int(row[1] or 0)

        return {
            "campaign_id": campaign_id,
            "metrics": {
                "total_spend": total_spend,
                "total_results": total_results,
                "total_impressions": int(row[2] or 0),
                "avg_cpr": total_spend / total_results if total_results > 0 else 0,
                "avg_frequency": float(row[3] or 0)
            }
        }
    finally:
        conn.close()


@router.get("/{campaign_id}/ads")
async def get_campaign_ads(campaign_id: str, current_user: UserDB = Depends(get_current_user)):
    """Lista los anuncios de una campaña."""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        cursor = conn.cursor()

        # Get campaign name first
        cursor.execute("SELECT name, client_id FROM campaigns WHERE id = %s", (campaign_id,))
        campaign = cursor.fetchone()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaña no encontrada")

        campaign_name, client_id = campaign

        # Get ads for this campaign
        cursor.execute("""
            SELECT
                ad_name,
                ad_set_name,
                SUM(spend) as total_spend,
                SUM(results) as total_results,
                SUM(impressions) as total_impressions
            FROM metrics
            WHERE campaign_name = %s AND client_id = %s
            GROUP BY ad_name, ad_set_name
            ORDER BY total_spend DESC
        """, (campaign_name, client_id))

        rows = cursor.fetchall()

        ads = []
        for row in rows:
            total_spend = float(row[2] or 0)
            total_results = int(row[3] or 0)
            ads.append({
                "ad_name": row[0],
                "ad_set_name": row[1],
                "spend": total_spend,
                "results": total_results,
                "impressions": int(row[4] or 0),
                "cpr": total_spend / total_results if total_results > 0 else 0
            })

        return {
            "campaign_id": campaign_id,
            "ads": ads
        }
    finally:
        conn.close()
