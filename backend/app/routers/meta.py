"""
Meta (Facebook) API OAuth endpoints for Emiti Metrics.
Handles OAuth flow and token management for Meta Business API integration.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
import os

from slowapi import Limiter
from slowapi.util import get_remote_address

from ..services.meta_oauth import meta_oauth_service, MetaTokenInfo, TokenStatus
from ..database import get_db, MetaTokenDB, ClientDB
from ..auth import get_current_user

# Rate limiter - uses remote address as key
def get_rate_limit_key(request: Request) -> str:
    """Get rate limit key - user_id if authenticated, otherwise IP."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return f"user:{auth_header[:50]}"
    return get_remote_address(request)

limiter = Limiter(key_func=get_rate_limit_key)

router = APIRouter()


# ============================================================================
# SCHEMAS
# ============================================================================

class TokenExchangeRequest(BaseModel):
    """Request to exchange authorization code for token."""
    code: str


class TokenRefreshRequest(BaseModel):
    """Request to refresh/extend a token."""
    access_token: str


class TokenDebugRequest(BaseModel):
    """Request to debug/inspect a token."""
    access_token: str


class AdAccountRequest(BaseModel):
    """Request requiring an access token."""
    access_token: str
    ad_account_id: Optional[str] = None


class CampaignInsightsRequest(BaseModel):
    """Request for campaign insights."""
    access_token: str
    campaign_id: str
    date_preset: str = "last_30d"


class AdStatusRequest(BaseModel):
    """Request to update ad status."""
    ad_id: str
    status: str  # ACTIVE, PAUSED


class CampaignBudgetRequest(BaseModel):
    """Request to update campaign budget."""
    campaign_id: str
    daily_budget: Optional[int] = None  # In cents
    lifetime_budget: Optional[int] = None


class SaveTokenRequest(BaseModel):
    """Request to save a Meta token for a client."""
    client_id: str
    access_token: str
    ad_account_id: Optional[str] = None


# ============================================================================
# OAUTH FLOW ENDPOINTS
# ============================================================================

@router.get("/auth/url")
@limiter.limit("10/minute")
async def get_auth_url(request: Request, state: Optional[str] = None, current_user = Depends(get_current_user)):
    """
    Get the Meta OAuth authorization URL.

    The user should be redirected to this URL to grant permissions.
    After granting, they'll be redirected back with an authorization code.
    """
    if not os.getenv("META_APP_ID"):
        raise HTTPException(
            status_code=503,
            detail="Meta API not configured. Set META_APP_ID, META_APP_SECRET, and META_REDIRECT_URI."
        )

    auth_url = meta_oauth_service.get_auth_url(state)
    return {
        "auth_url": auth_url,
        "instructions": "Redirect the user to this URL. After authorization, they will be redirected to your callback URL with a 'code' parameter."
    }


@router.get("/callback")
@limiter.limit("10/minute")
async def oauth_callback(
    request: Request,
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
    current_user = Depends(get_current_user)
):
    """
    OAuth callback endpoint.

    Meta will redirect here after user grants/denies permission.
    In production, this should redirect to your frontend with the token.
    """
    if error:
        raise HTTPException(
            status_code=400,
            detail=f"OAuth error: {error} - {error_description}"
        )

    if not code:
        raise HTTPException(status_code=400, detail="No authorization code provided")

    # Exchange code for token
    token_info = await meta_oauth_service.exchange_code_for_token(code)
    if not token_info:
        raise HTTPException(status_code=400, detail="Failed to exchange code for token")

    # Immediately exchange for long-lived token
    long_lived = await meta_oauth_service.exchange_for_long_lived_token(token_info.access_token)
    if long_lived:
        token_info = long_lived

    # In production, redirect to frontend with token in URL fragment or store in session
    # For now, return the token info (DEV ONLY - never expose tokens in production!)
    return {
        "success": True,
        "message": "Authorization successful",
        "token_info": {
            "token_type": token_info.token_type,
            "expires_at": token_info.expires_at.isoformat() if token_info.expires_at else None,
            "status": token_info.status,
            # In production, don't return the actual token here
            # Instead store it securely and return a session ID
            "access_token": token_info.access_token[:20] + "..." if token_info.access_token else None,
        },
        "state": state
    }


@router.post("/token/exchange")
@limiter.limit("10/minute")
async def exchange_token(request: Request, token_request: TokenExchangeRequest, current_user = Depends(get_current_user)):
    """
    Exchange an authorization code for an access token.

    Use this if you handle the OAuth callback yourself.
    """
    token_info = await meta_oauth_service.exchange_code_for_token(token_request.code)
    if not token_info:
        raise HTTPException(status_code=400, detail="Failed to exchange code for token")

    return {
        "success": True,
        "access_token": token_info.access_token,
        "expires_at": token_info.expires_at.isoformat() if token_info.expires_at else None,
    }


@router.post("/token/extend")
@limiter.limit("10/minute")
async def extend_token(request: Request, refresh_request: TokenRefreshRequest, current_user = Depends(get_current_user)):
    """
    Exchange a short-lived token for a long-lived token (60 days).

    Call this immediately after getting a short-lived token.
    """
    long_lived = await meta_oauth_service.exchange_for_long_lived_token(refresh_request.access_token)
    if not long_lived:
        raise HTTPException(status_code=400, detail="Failed to extend token")

    return {
        "success": True,
        "access_token": long_lived.access_token,
        "expires_at": long_lived.expires_at.isoformat() if long_lived.expires_at else None,
        "message": "Token extended to 60 days"
    }


@router.post("/token/debug")
@limiter.limit("10/minute")
async def debug_token(request: Request, debug_request: TokenDebugRequest, current_user = Depends(get_current_user)):
    """
    Debug/inspect an access token.

    Returns information about the token's validity, scopes, and expiration.
    """
    info = await meta_oauth_service.debug_token(debug_request.access_token)

    if "error" in info:
        raise HTTPException(status_code=400, detail=info["error"])

    return {
        "user_id": info.get("user_id"),
        "app_id": info.get("app_id"),
        "scopes": info.get("scopes", []),
        "is_valid": info.get("is_valid", False),
        "status": info.get("status"),
        "expires_at": info.get("expires_at"),
        "needs_renewal": info.get("status") in [TokenStatus.EXPIRING_SOON, TokenStatus.EXPIRED]
    }


# ============================================================================
# AD ACCOUNT ENDPOINTS
# ============================================================================

@router.post("/accounts")
async def get_ad_accounts(request: AdAccountRequest, current_user = Depends(get_current_user)):
    """
    Get all ad accounts accessible with the given token.
    """
    accounts = await meta_oauth_service.get_ad_accounts(request.access_token)

    return {
        "count": len(accounts),
        "accounts": [
            {
                "id": acc.id,
                "name": acc.name,
                "account_id": acc.account_id,
                "currency": acc.currency,
                "timezone": acc.timezone_name,
                "business_name": acc.business_name,
                "status": "Active" if acc.account_status == 1 else "Inactive"
            }
            for acc in accounts
        ]
    }


@router.post("/campaigns")
async def get_campaigns(request: AdAccountRequest, current_user = Depends(get_current_user)):
    """
    Get campaigns for an ad account.
    """
    if not request.ad_account_id:
        raise HTTPException(status_code=400, detail="ad_account_id is required")

    campaigns = await meta_oauth_service.get_campaigns(
        request.access_token,
        request.ad_account_id
    )

    return {
        "count": len(campaigns),
        "campaigns": campaigns
    }


@router.post("/insights")
async def get_campaign_insights(request: CampaignInsightsRequest, current_user = Depends(get_current_user)):
    """
    Get performance insights for a campaign.
    """
    insights = await meta_oauth_service.get_campaign_insights(
        request.access_token,
        request.campaign_id,
        request.date_preset
    )

    if not insights:
        return {"message": "No insights data available for this campaign"}

    return {
        "campaign_id": request.campaign_id,
        "date_preset": request.date_preset,
        "metrics": insights
    }


# ============================================================================
# STATUS ENDPOINT
# ============================================================================

@router.get("/status")
async def get_meta_integration_status(current_user = Depends(get_current_user)):
    """
    Check if Meta API integration is properly configured.
    """
    app_id = os.getenv("META_APP_ID", "")
    app_secret = os.getenv("META_APP_SECRET", "")
    redirect_uri = os.getenv("META_REDIRECT_URI", "")

    configured = bool(app_id and app_secret and redirect_uri)

    return {
        "configured": configured,
        "app_id_set": bool(app_id),
        "app_secret_set": bool(app_secret),
        "redirect_uri_set": bool(redirect_uri),
        "redirect_uri": redirect_uri if redirect_uri else None,
        "setup_instructions": None if configured else {
            "step1": "Create a Meta App at https://developers.facebook.com/apps/",
            "step2": "Add 'Marketing API' product to your app",
            "step3": "Set environment variables: META_APP_ID, META_APP_SECRET, META_REDIRECT_URI",
            "step4": "Add your redirect URI to the app's OAuth settings",
        }
    }


# ============================================================================
# TOKEN MANAGEMENT PER CLIENT
# ============================================================================

@router.post("/token/save")
@limiter.limit("10/minute")
async def save_client_token(
    request: Request,
    save_request: SaveTokenRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Save a Meta access token for a client.
    This links the client to their Meta ad account.
    """
    # Verify client exists
    client = db.query(ClientDB).filter(ClientDB.id == save_request.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Debug the token to get info
    token_info = await meta_oauth_service.debug_token(save_request.access_token)
    if "error" in token_info:
        raise HTTPException(status_code=400, detail=f"Invalid token: {token_info['error']}")

    # Check if token already exists for this client
    existing = db.query(MetaTokenDB).filter(MetaTokenDB.client_id == save_request.client_id).first()

    expires_at = datetime.fromtimestamp(token_info.get("expires_at", 0)) if token_info.get("expires_at") else None

    if existing:
        existing.access_token = save_request.access_token
        existing.ad_account_id = save_request.ad_account_id
        existing.user_id = token_info.get("user_id")
        existing.scopes = token_info.get("scopes", [])
        existing.expires_at = expires_at
        existing.status = str(token_info.get("status", "valid"))
        existing.updated_at = datetime.utcnow()
    else:
        new_token = MetaTokenDB(
            client_id=save_request.client_id,
            access_token=save_request.access_token,
            ad_account_id=save_request.ad_account_id,
            user_id=token_info.get("user_id"),
            scopes=token_info.get("scopes", []),
            expires_at=expires_at,
            status=str(token_info.get("status", "valid"))
        )
        db.add(new_token)

    # Also update client's meta_account_id
    if save_request.ad_account_id:
        client.meta_account_id = save_request.ad_account_id

    db.commit()

    return {
        "success": True,
        "client_id": save_request.client_id,
        "ad_account_id": save_request.ad_account_id,
        "expires_at": expires_at.isoformat() if expires_at else None,
        "status": str(token_info.get("status", "valid"))
    }


@router.get("/token/{client_id}")
async def get_client_token_status(
    client_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get the Meta token status for a client.
    """
    token = db.query(MetaTokenDB).filter(MetaTokenDB.client_id == client_id).first()

    if not token:
        return {
            "connected": False,
            "message": "No Meta account connected for this client"
        }

    # Check if token is still valid
    if token.access_token:
        debug_info = await meta_oauth_service.debug_token(token.access_token)
        current_status = debug_info.get("status", token.status)

        # Update status in DB if changed
        if str(current_status) != token.status:
            token.status = str(current_status)
            db.commit()

        return {
            "connected": True,
            "ad_account_id": token.ad_account_id,
            "expires_at": token.expires_at.isoformat() if token.expires_at else None,
            "status": str(current_status),
            "needs_renewal": str(current_status) in ["expiring_soon", "expired", "invalid"],
            "scopes": token.scopes
        }

    return {
        "connected": False,
        "message": "Token is missing"
    }


@router.delete("/token/{client_id}")
async def disconnect_client_meta(
    client_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Disconnect a client's Meta account.
    """
    token = db.query(MetaTokenDB).filter(MetaTokenDB.client_id == client_id).first()

    if token:
        db.delete(token)

        # Also clear client's meta_account_id
        client = db.query(ClientDB).filter(ClientDB.id == client_id).first()
        if client:
            client.meta_account_id = None

        db.commit()

    return {"success": True, "message": "Meta account disconnected"}


# ============================================================================
# ADS WITH CREATIVES (IMAGES)
# ============================================================================

@router.get("/ads/{client_id}")
async def get_client_ads_with_images(
    client_id: str,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get ads with their creative images for a client.
    """
    token = db.query(MetaTokenDB).filter(MetaTokenDB.client_id == client_id).first()

    if not token or not token.access_token:
        raise HTTPException(status_code=404, detail="No Meta account connected for this client")

    if not token.ad_account_id:
        raise HTTPException(status_code=400, detail="No ad account ID configured for this client")

    ads = await meta_oauth_service.get_ads_with_creatives(
        token.access_token,
        token.ad_account_id,
        limit
    )

    return {
        "client_id": client_id,
        "ad_account_id": token.ad_account_id,
        "count": len(ads),
        "ads": ads
    }


# ============================================================================
# AD & CAMPAIGN MANAGEMENT
# ============================================================================

@router.post("/ads/{client_id}/status")
@limiter.limit("20/minute")
async def update_client_ad_status(
    request: Request,
    client_id: str,
    status_request: AdStatusRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update an ad's status (pause or activate) for a client.
    """
    token = db.query(MetaTokenDB).filter(MetaTokenDB.client_id == client_id).first()

    if not token or not token.access_token:
        raise HTTPException(status_code=404, detail="No Meta account connected")

    if status_request.status not in ["ACTIVE", "PAUSED"]:
        raise HTTPException(status_code=400, detail="Status must be ACTIVE or PAUSED")

    result = await meta_oauth_service.update_ad_status(
        token.access_token,
        status_request.ad_id,
        status_request.status
    )

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to update ad"))

    return result


@router.post("/campaigns/{client_id}/budget")
@limiter.limit("20/minute")
async def update_client_campaign_budget(
    request: Request,
    client_id: str,
    budget_request: CampaignBudgetRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update a campaign's budget for a client.
    Budget values are in cents (e.g., 1000 = $10.00).
    """
    token = db.query(MetaTokenDB).filter(MetaTokenDB.client_id == client_id).first()

    if not token or not token.access_token:
        raise HTTPException(status_code=404, detail="No Meta account connected")

    result = await meta_oauth_service.update_campaign_budget(
        token.access_token,
        budget_request.campaign_id,
        budget_request.daily_budget,
        budget_request.lifetime_budget
    )

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to update budget"))

    return result


@router.post("/campaigns/{client_id}/status")
@limiter.limit("20/minute")
async def update_client_campaign_status(
    request: Request,
    client_id: str,
    campaign_id: str,
    status: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update a campaign's status for a client.
    """
    token = db.query(MetaTokenDB).filter(MetaTokenDB.client_id == client_id).first()

    if not token or not token.access_token:
        raise HTTPException(status_code=404, detail="No Meta account connected")

    if status not in ["ACTIVE", "PAUSED"]:
        raise HTTPException(status_code=400, detail="Status must be ACTIVE or PAUSED")

    result = await meta_oauth_service.update_campaign_status(
        token.access_token,
        campaign_id,
        status
    )

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to update campaign"))

    return result


# ============================================================================
# QUICK ACTIONS (from recommendations)
# ============================================================================

@router.post("/action/{client_id}/pause-ad")
@limiter.limit("20/minute")
async def quick_pause_ad(
    request: Request,
    client_id: str,
    ad_name: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Quick action to pause an ad by name.
    Looks up the ad ID from Meta and pauses it.
    """
    token = db.query(MetaTokenDB).filter(MetaTokenDB.client_id == client_id).first()

    if not token or not token.access_token:
        raise HTTPException(status_code=404, detail="No Meta account connected")

    # Get ads to find the one by name
    ads = await meta_oauth_service.get_ads_with_creatives(
        token.access_token,
        token.ad_account_id,
        100
    )

    # Find ad by name
    ad = next((a for a in ads if a.get("name") == ad_name), None)
    if not ad:
        raise HTTPException(status_code=404, detail=f"Ad '{ad_name}' not found")

    # Pause it
    result = await meta_oauth_service.update_ad_status(
        token.access_token,
        ad["id"],
        "PAUSED"
    )

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))

    return {
        "success": True,
        "message": f"Ad '{ad_name}' has been paused",
        "ad_id": ad["id"]
    }


@router.post("/action/{client_id}/scale-campaign")
@limiter.limit("20/minute")
async def quick_scale_campaign(
    request: Request,
    client_id: str,
    campaign_id: str,
    increase_percent: int = 20,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Quick action to increase a campaign's budget by a percentage.
    """
    token = db.query(MetaTokenDB).filter(MetaTokenDB.client_id == client_id).first()

    if not token or not token.access_token:
        raise HTTPException(status_code=404, detail="No Meta account connected")

    # Get current campaign info
    campaigns = await meta_oauth_service.get_campaigns(
        token.access_token,
        token.ad_account_id
    )

    campaign = next((c for c in campaigns if c.get("id") == campaign_id), None)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    current_budget = int(campaign.get("daily_budget") or 0)
    if current_budget == 0:
        raise HTTPException(status_code=400, detail="Campaign has no daily budget set")

    new_budget = int(current_budget * (1 + increase_percent / 100))

    result = await meta_oauth_service.update_campaign_budget(
        token.access_token,
        campaign_id,
        daily_budget=new_budget
    )

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))

    return {
        "success": True,
        "message": f"Budget increased by {increase_percent}%",
        "campaign_id": campaign_id,
        "previous_budget": current_budget / 100,  # Convert to currency
        "new_budget": new_budget / 100
    }
