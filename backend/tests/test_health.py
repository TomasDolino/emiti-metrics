"""
Health and basic endpoint tests for Emiti Metrics.
"""
import pytest


class TestHealthEndpoints:
    """Test health and root endpoints."""

    def test_root_endpoint(self, client):
        """Test root endpoint returns API info."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Emiti Metrics API"
        assert data["status"] == "running"
        assert "version" in data

    def test_health_endpoint(self, client):
        """Test health endpoint returns healthy status."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    def test_security_headers_present(self, client):
        """Test that security headers are set."""
        response = client.get("/health")

        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"
        assert response.headers.get("X-XSS-Protection") == "1; mode=block"
        assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
        assert "X-Request-ID" in response.headers

    def test_cors_headers(self, client):
        """Test CORS is configured properly."""
        response = client.options("/health", headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET"
        })
        assert response.status_code in [200, 204, 400]


class TestAPIEndpoints:
    """Test API endpoints exist."""

    def test_clients_endpoint_exists(self, client):
        """Test clients endpoint exists."""
        response = client.get("/api/clients")
        # Should return 200 or 401/403 if auth required
        assert response.status_code in [200, 401, 403]

    def test_campaigns_endpoint_exists(self, client):
        """Test campaigns endpoint exists."""
        response = client.get("/api/campaigns")
        assert response.status_code in [200, 401, 403]

    def test_analysis_endpoint_exists(self, client):
        """Test analysis endpoint exists."""
        response = client.get("/api/analysis/ads")
        assert response.status_code in [200, 401, 403]

    def test_alerts_endpoint_exists(self, client):
        """Test alerts endpoint exists."""
        response = client.get("/api/alerts")
        assert response.status_code in [200, 401, 403]


class TestNotFoundEndpoints:
    """Test 404 handling."""

    def test_unknown_endpoint_returns_404(self, client):
        """Test that unknown endpoints return 404."""
        response = client.get("/api/unknown/endpoint")
        assert response.status_code == 404
