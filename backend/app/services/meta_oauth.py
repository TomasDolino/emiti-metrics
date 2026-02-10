"""
Meta (Facebook) API OAuth Service for Emiti Metrics
Handles authentication and token management for Meta Business API
"""
import os
import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from pydantic import BaseModel
from enum import Enum


class TokenStatus(str, Enum):
    """Status of an access token."""
    VALID = "valid"
    EXPIRING_SOON = "expiring_soon"  # < 7 days left
    EXPIRED = "expired"
    INVALID = "invalid"


class MetaTokenInfo(BaseModel):
    """Information about a Meta access token."""
    access_token: str
    token_type: str = "bearer"
    expires_at: Optional[datetime] = None
    scopes: List[str] = []
    user_id: Optional[str] = None
    status: TokenStatus = TokenStatus.VALID


class MetaAdAccount(BaseModel):
    """Meta Ad Account information."""
    id: str
    name: str
    account_id: str
    account_status: int
    currency: str
    timezone_name: str
    business_name: Optional[str] = None


class MetaOAuthConfig(BaseModel):
    """Configuration for Meta OAuth."""
    app_id: str
    app_secret: str
    redirect_uri: str
    scopes: List[str] = [
        "ads_read",
        "ads_management",
        "business_management",
        "pages_read_engagement",
    ]


# ============================================================================
# META OAUTH SERVICE
# ============================================================================

class MetaOAuthService:
    """Service for handling Meta/Facebook OAuth authentication."""

    # Meta API endpoints
    GRAPH_API_BASE = "https://graph.facebook.com/v19.0"
    OAUTH_DIALOG_URL = "https://www.facebook.com/v19.0/dialog/oauth"

    def __init__(self):
        self.app_id = os.getenv("META_APP_ID", "")
        self.app_secret = os.getenv("META_APP_SECRET", "")
        self.redirect_uri = os.getenv("META_REDIRECT_URI", "http://localhost:8080/api/meta/callback")

    def get_auth_url(self, state: Optional[str] = None) -> str:
        """
        Generate the OAuth authorization URL for user consent.

        Args:
            state: Optional state parameter for CSRF protection

        Returns:
            URL to redirect user to for Meta login
        """
        scopes = ",".join([
            "ads_read",
            "ads_management",
            "business_management",
            "pages_read_engagement",
        ])

        params = {
            "client_id": self.app_id,
            "redirect_uri": self.redirect_uri,
            "scope": scopes,
            "response_type": "code",
        }

        if state:
            params["state"] = state

        query_string = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{self.OAUTH_DIALOG_URL}?{query_string}"

    async def exchange_code_for_token(self, code: str) -> Optional[MetaTokenInfo]:
        """
        Exchange authorization code for access token.

        Args:
            code: Authorization code from OAuth callback

        Returns:
            Token info if successful, None otherwise
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.GRAPH_API_BASE}/oauth/access_token",
                    params={
                        "client_id": self.app_id,
                        "client_secret": self.app_secret,
                        "redirect_uri": self.redirect_uri,
                        "code": code,
                    }
                )

                if response.status_code != 200:
                    return None

                data = response.json()
                expires_in = data.get("expires_in", 0)
                expires_at = datetime.utcnow() + timedelta(seconds=expires_in) if expires_in else None

                return MetaTokenInfo(
                    access_token=data["access_token"],
                    token_type=data.get("token_type", "bearer"),
                    expires_at=expires_at,
                    status=TokenStatus.VALID
                )

            except Exception as e:
                print(f"Error exchanging code for token: {e}")
                return None

    async def exchange_for_long_lived_token(self, short_lived_token: str) -> Optional[MetaTokenInfo]:
        """
        Exchange short-lived token (1 hour) for long-lived token (60 days).

        Args:
            short_lived_token: The short-lived access token

        Returns:
            Long-lived token info if successful
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.GRAPH_API_BASE}/oauth/access_token",
                    params={
                        "grant_type": "fb_exchange_token",
                        "client_id": self.app_id,
                        "client_secret": self.app_secret,
                        "fb_exchange_token": short_lived_token,
                    }
                )

                if response.status_code != 200:
                    return None

                data = response.json()
                expires_in = data.get("expires_in", 5184000)  # Default 60 days
                expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

                return MetaTokenInfo(
                    access_token=data["access_token"],
                    token_type=data.get("token_type", "bearer"),
                    expires_at=expires_at,
                    status=TokenStatus.VALID
                )

            except Exception as e:
                print(f"Error exchanging for long-lived token: {e}")
                return None

    async def debug_token(self, token: str) -> Dict[str, Any]:
        """
        Debug/inspect an access token to get its metadata.

        Args:
            token: The access token to inspect

        Returns:
            Token debug information
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.GRAPH_API_BASE}/debug_token",
                    params={
                        "input_token": token,
                        "access_token": f"{self.app_id}|{self.app_secret}",
                    }
                )

                if response.status_code != 200:
                    return {"error": "Failed to debug token"}

                data = response.json().get("data", {})

                # Determine token status
                expires_at = data.get("expires_at", 0)
                is_valid = data.get("is_valid", False)

                if not is_valid:
                    status = TokenStatus.INVALID
                elif expires_at == 0:
                    status = TokenStatus.VALID  # Never expires
                else:
                    expires_datetime = datetime.fromtimestamp(expires_at)
                    if expires_datetime < datetime.utcnow():
                        status = TokenStatus.EXPIRED
                    elif expires_datetime < datetime.utcnow() + timedelta(days=7):
                        status = TokenStatus.EXPIRING_SOON
                    else:
                        status = TokenStatus.VALID

                return {
                    "user_id": data.get("user_id"),
                    "app_id": data.get("app_id"),
                    "scopes": data.get("scopes", []),
                    "expires_at": expires_at,
                    "is_valid": is_valid,
                    "status": status,
                    "granular_scopes": data.get("granular_scopes", []),
                }

            except Exception as e:
                return {"error": str(e)}

    async def get_ad_accounts(self, access_token: str) -> List[MetaAdAccount]:
        """
        Get all ad accounts accessible with the given token.

        Args:
            access_token: Valid Meta access token

        Returns:
            List of ad accounts
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.GRAPH_API_BASE}/me/adaccounts",
                    params={
                        "access_token": access_token,
                        "fields": "id,name,account_id,account_status,currency,timezone_name,business_name",
                    }
                )

                if response.status_code != 200:
                    return []

                data = response.json().get("data", [])
                return [
                    MetaAdAccount(
                        id=account["id"],
                        name=account.get("name", ""),
                        account_id=account.get("account_id", ""),
                        account_status=account.get("account_status", 0),
                        currency=account.get("currency", "USD"),
                        timezone_name=account.get("timezone_name", "UTC"),
                        business_name=account.get("business_name"),
                    )
                    for account in data
                ]

            except Exception as e:
                print(f"Error fetching ad accounts: {e}")
                return []

    async def get_campaigns(
        self,
        access_token: str,
        ad_account_id: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get campaigns for an ad account.

        Args:
            access_token: Valid Meta access token
            ad_account_id: The ad account ID (format: act_XXXXXXXXX)
            limit: Maximum number of campaigns to return

        Returns:
            List of campaign data
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.GRAPH_API_BASE}/{ad_account_id}/campaigns",
                    params={
                        "access_token": access_token,
                        "fields": "id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time",
                        "limit": limit,
                    }
                )

                if response.status_code != 200:
                    return []

                return response.json().get("data", [])

            except Exception as e:
                print(f"Error fetching campaigns: {e}")
                return []

    async def get_ads_with_creatives(
        self,
        access_token: str,
        ad_account_id: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get ads with their creative content (images, videos, thumbnails).

        Args:
            access_token: Valid Meta access token
            ad_account_id: The ad account ID (format: act_XXXXXXXXX)
            limit: Maximum number of ads to return

        Returns:
            List of ads with creative URLs
        """
        fields = [
            "id",
            "name",
            "status",
            "effective_status",
            "campaign_id",
            "adset_id",
            "creative{id,name,title,body,thumbnail_url,image_url,object_story_spec,asset_feed_spec}",
        ]

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.GRAPH_API_BASE}/{ad_account_id}/ads",
                    params={
                        "access_token": access_token,
                        "fields": ",".join(fields),
                        "limit": limit,
                    }
                )

                if response.status_code != 200:
                    print(f"Error getting ads: {response.text}")
                    return []

                ads = response.json().get("data", [])

                # Process each ad to extract image URLs
                processed_ads = []
                for ad in ads:
                    creative = ad.get("creative", {})

                    # Try to get image URL from different sources
                    image_url = creative.get("image_url")
                    thumbnail_url = creative.get("thumbnail_url")

                    # Check object_story_spec for image
                    story_spec = creative.get("object_story_spec", {})
                    if not image_url and story_spec:
                        link_data = story_spec.get("link_data", {})
                        image_url = link_data.get("image_url") or link_data.get("picture")

                        # Check video_data for thumbnail
                        video_data = story_spec.get("video_data", {})
                        if not thumbnail_url and video_data:
                            thumbnail_url = video_data.get("image_url")

                    processed_ads.append({
                        "id": ad.get("id"),
                        "name": ad.get("name"),
                        "status": ad.get("status"),
                        "effective_status": ad.get("effective_status"),
                        "campaign_id": ad.get("campaign_id"),
                        "adset_id": ad.get("adset_id"),
                        "creative_id": creative.get("id"),
                        "creative_name": creative.get("name"),
                        "title": creative.get("title"),
                        "body": creative.get("body"),
                        "thumbnail_url": thumbnail_url,
                        "image_url": image_url,
                    })

                return processed_ads

            except Exception as e:
                print(f"Error fetching ads with creatives: {e}")
                return []

    async def update_ad_status(
        self,
        access_token: str,
        ad_id: str,
        status: str  # ACTIVE, PAUSED, DELETED
    ) -> Dict[str, Any]:
        """
        Update an ad's status (pause, activate, delete).

        Args:
            access_token: Valid Meta access token
            ad_id: The ad ID
            status: New status (ACTIVE, PAUSED, DELETED)

        Returns:
            Result of the update operation
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.GRAPH_API_BASE}/{ad_id}",
                    params={"access_token": access_token},
                    data={"status": status}
                )

                if response.status_code != 200:
                    error_data = response.json().get("error", {})
                    return {
                        "success": False,
                        "error": error_data.get("message", "Unknown error")
                    }

                return {
                    "success": True,
                    "ad_id": ad_id,
                    "new_status": status
                }

            except Exception as e:
                return {"success": False, "error": str(e)}

    async def update_campaign_budget(
        self,
        access_token: str,
        campaign_id: str,
        daily_budget: Optional[int] = None,  # In cents
        lifetime_budget: Optional[int] = None  # In cents
    ) -> Dict[str, Any]:
        """
        Update a campaign's budget.

        Args:
            access_token: Valid Meta access token
            campaign_id: The campaign ID
            daily_budget: New daily budget in cents (e.g., 1000 = $10.00)
            lifetime_budget: New lifetime budget in cents

        Returns:
            Result of the update operation
        """
        data = {}
        if daily_budget is not None:
            data["daily_budget"] = daily_budget
        if lifetime_budget is not None:
            data["lifetime_budget"] = lifetime_budget

        if not data:
            return {"success": False, "error": "No budget specified"}

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.GRAPH_API_BASE}/{campaign_id}",
                    params={"access_token": access_token},
                    data=data
                )

                if response.status_code != 200:
                    error_data = response.json().get("error", {})
                    return {
                        "success": False,
                        "error": error_data.get("message", "Unknown error")
                    }

                return {
                    "success": True,
                    "campaign_id": campaign_id,
                    "updated_budget": data
                }

            except Exception as e:
                return {"success": False, "error": str(e)}

    async def update_adset_budget(
        self,
        access_token: str,
        adset_id: str,
        daily_budget: Optional[int] = None,
        lifetime_budget: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Update an ad set's budget.

        Args:
            access_token: Valid Meta access token
            adset_id: The ad set ID
            daily_budget: New daily budget in cents
            lifetime_budget: New lifetime budget in cents

        Returns:
            Result of the update operation
        """
        data = {}
        if daily_budget is not None:
            data["daily_budget"] = daily_budget
        if lifetime_budget is not None:
            data["lifetime_budget"] = lifetime_budget

        if not data:
            return {"success": False, "error": "No budget specified"}

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.GRAPH_API_BASE}/{adset_id}",
                    params={"access_token": access_token},
                    data=data
                )

                if response.status_code != 200:
                    error_data = response.json().get("error", {})
                    return {
                        "success": False,
                        "error": error_data.get("message", "Unknown error")
                    }

                return {
                    "success": True,
                    "adset_id": adset_id,
                    "updated_budget": data
                }

            except Exception as e:
                return {"success": False, "error": str(e)}

    async def update_campaign_status(
        self,
        access_token: str,
        campaign_id: str,
        status: str  # ACTIVE, PAUSED, DELETED
    ) -> Dict[str, Any]:
        """
        Update a campaign's status.

        Args:
            access_token: Valid Meta access token
            campaign_id: The campaign ID
            status: New status (ACTIVE, PAUSED, DELETED)

        Returns:
            Result of the update operation
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.GRAPH_API_BASE}/{campaign_id}",
                    params={"access_token": access_token},
                    data={"status": status}
                )

                if response.status_code != 200:
                    error_data = response.json().get("error", {})
                    return {
                        "success": False,
                        "error": error_data.get("message", "Unknown error")
                    }

                return {
                    "success": True,
                    "campaign_id": campaign_id,
                    "new_status": status
                }

            except Exception as e:
                return {"success": False, "error": str(e)}

    async def get_ad_insights(
        self,
        access_token: str,
        ad_id: str,
        date_preset: str = "last_30d",
        time_increment: int = 0
    ) -> Any:
        """
        Get detailed insights for a specific ad.

        Args:
            access_token: Valid Meta access token
            ad_id: The ad ID
            date_preset: Date range preset
            time_increment: 1 for daily breakdown, 0 for aggregated

        Returns:
            Ad insights data (list if time_increment=1, dict otherwise)
        """
        fields = [
            "impressions",
            "reach",
            "clicks",
            "spend",
            "cpm",
            "cpc",
            "ctr",
            "frequency",
            "actions",
            "cost_per_action_type",
        ]

        params = {
            "access_token": access_token,
            "fields": ",".join(fields),
            "date_preset": date_preset,
        }

        if time_increment > 0:
            params["time_increment"] = time_increment

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.GRAPH_API_BASE}/{ad_id}/insights",
                    params=params
                )

                if response.status_code != 200:
                    return [] if time_increment else {}

                data = response.json().get("data", [])

                # Return list for daily breakdown, single dict for aggregated
                if time_increment > 0:
                    return data
                return data[0] if data else {}

            except Exception as e:
                print(f"Error fetching ad insights: {e}")
                return [] if time_increment else {}

    async def get_account_insights_by_ad(
        self,
        access_token: str,
        ad_account_id: str,
        days: int = 7
    ) -> List[Dict[str, Any]]:
        """
        Get insights for all ads in an account with daily breakdown.
        More efficient than calling get_ad_insights for each ad.

        Args:
            access_token: Valid Meta access token
            ad_account_id: The ad account ID (format: act_XXXXXXXXX)
            days: Number of days to fetch

        Returns:
            List of daily insights per ad
        """
        fields = [
            "ad_id",
            "ad_name",
            "campaign_name",
            "adset_name",
            "impressions",
            "reach",
            "clicks",
            "spend",
            "cpm",
            "ctr",
            "frequency",
            "actions",
        ]

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.get(
                    f"{self.GRAPH_API_BASE}/{ad_account_id}/insights",
                    params={
                        "access_token": access_token,
                        "fields": ",".join(fields),
                        "date_preset": f"last_{days}d",
                        "time_increment": 1,  # Daily breakdown
                        "level": "ad",  # Breakdown by ad
                        "limit": 1000,
                    }
                )

                if response.status_code != 200:
                    error = response.json().get("error", {})
                    print(f"Error getting account insights: {error.get('message', response.text)}")
                    return []

                return response.json().get("data", [])

            except Exception as e:
                print(f"Error fetching account insights: {e}")
                return []

    async def get_campaign_insights(
        self,
        access_token: str,
        campaign_id: str,
        date_preset: str = "last_30d"
    ) -> Dict[str, Any]:
        """
        Get performance insights for a campaign.

        Args:
            access_token: Valid Meta access token
            campaign_id: The campaign ID
            date_preset: Date range preset (e.g., 'last_7d', 'last_30d', 'this_month')

        Returns:
            Campaign insights data
        """
        fields = [
            "impressions",
            "reach",
            "clicks",
            "spend",
            "cpm",
            "cpc",
            "ctr",
            "frequency",
            "actions",
            "cost_per_action_type",
            "conversions",
            "cost_per_conversion",
        ]

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.GRAPH_API_BASE}/{campaign_id}/insights",
                    params={
                        "access_token": access_token,
                        "fields": ",".join(fields),
                        "date_preset": date_preset,
                    }
                )

                if response.status_code != 200:
                    return {}

                data = response.json().get("data", [])
                return data[0] if data else {}

            except Exception as e:
                print(f"Error fetching campaign insights: {e}")
                return {}


# Singleton instance
meta_oauth_service = MetaOAuthService()
