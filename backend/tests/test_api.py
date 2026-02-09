"""
Basic API tests for Emiti Metrics
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


class TestHealth:
    """Health check tests"""

    def test_health_endpoint(self):
        """Test health endpoint returns healthy status"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    def test_root_endpoint(self):
        """Test root endpoint returns API info"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Emiti Metrics API"
        assert "version" in data
        assert data["status"] == "running"


class TestAuth:
    """Authentication tests"""

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = client.post("/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401

    def test_protected_route_without_token(self):
        """Test protected route without token"""
        response = client.get("/api/clients/")
        assert response.status_code == 401


class TestClients:
    """Client endpoints tests"""

    @pytest.fixture
    def auth_headers(self):
        """Get auth headers for testing"""
        # Login with test user
        response = client.post("/api/auth/login", json={
            "email": "tomas@emiti.cloud",
            "password": "Tomas2024!"
        })
        if response.status_code == 200:
            token = response.json()["access_token"]
            return {"Authorization": f"Bearer {token}"}
        return {}

    def test_get_clients_authenticated(self, auth_headers):
        """Test getting clients with auth"""
        if not auth_headers:
            pytest.skip("No auth token available")
        response = client.get("/api/clients/", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestAnalysis:
    """Analysis endpoints tests"""

    @pytest.fixture
    def auth_headers(self):
        """Get auth headers for testing"""
        response = client.post("/api/auth/login", json={
            "email": "tomas@emiti.cloud",
            "password": "Tomas2024!"
        })
        if response.status_code == 200:
            token = response.json()["access_token"]
            return {"Authorization": f"Bearer {token}"}
        return {}

    def test_get_dashboard(self, auth_headers):
        """Test getting dashboard data"""
        if not auth_headers:
            pytest.skip("No auth token available")
        response = client.get("/api/analysis/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_spend" in data
        assert "total_results" in data


class TestUpload:
    """Upload endpoint tests"""

    def test_upload_template(self):
        """Test getting upload template"""
        response = client.get("/api/upload/template")
        assert response.status_code == 200
        data = response.json()
        assert "required_columns" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
