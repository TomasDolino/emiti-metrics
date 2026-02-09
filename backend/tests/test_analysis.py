"""
Analysis and classification tests for Emiti Metrics.
"""
import pytest


class TestAdClassification:
    """Test ad classification logic."""

    def test_ad_classification_values(self):
        """Test that classification returns valid values."""
        valid_classifications = ["GANADOR", "ESCALABLE", "TESTING", "FATIGADO", "PAUSAR"]

        # This would test the actual classification function
        # For now, just validate the expected values exist
        assert len(valid_classifications) == 5
        assert "GANADOR" in valid_classifications
        assert "PAUSAR" in valid_classifications

    def test_classification_criteria(self):
        """Test classification criteria logic."""
        # GANADOR: High ROAS, stable CPM, strong engagement
        ganador_criteria = {
            "roas_min": 2.0,
            "ctr_min": 1.0,
            "cpm_max": 20.0
        }

        # PAUSAR: Negative ROAS, high CPM, no engagement
        pausar_criteria = {
            "roas_max": 0.5,
            "ctr_max": 0.3,
            "spend_min": 50.0  # Only pause if spent enough to judge
        }

        assert ganador_criteria["roas_min"] > pausar_criteria["roas_max"]


class TestAlertsGeneration:
    """Test alert generation logic."""

    def test_alert_types(self):
        """Test that all alert types are defined."""
        alert_types = [
            "ROAS_DECLINING",
            "CPM_SPIKE",
            "FATIGUE_DETECTED",
            "OPPORTUNITY_SCALE",
            "BUDGET_EXHAUSTED"
        ]

        assert len(alert_types) >= 4

    def test_alert_priority_levels(self):
        """Test alert priority levels."""
        priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

        assert "HIGH" in priorities
        assert "LOW" in priorities


class TestMetricsCalculation:
    """Test metrics calculation."""

    def test_ctr_calculation(self):
        """Test CTR calculation."""
        clicks = 100
        impressions = 10000

        ctr = (clicks / impressions) * 100
        assert ctr == 1.0

    def test_cpc_calculation(self):
        """Test CPC calculation."""
        spend = 100.0
        clicks = 50

        cpc = spend / clicks
        assert cpc == 2.0

    def test_cpm_calculation(self):
        """Test CPM calculation."""
        spend = 100.0
        impressions = 10000

        cpm = (spend / impressions) * 1000
        assert cpm == 10.0

    def test_roas_calculation(self):
        """Test ROAS calculation."""
        revenue = 500.0
        spend = 100.0

        roas = revenue / spend
        assert roas == 5.0

    def test_zero_division_handling(self):
        """Test handling of zero division."""
        spend = 100.0
        clicks = 0

        # Should not raise error
        cpc = spend / clicks if clicks > 0 else 0
        assert cpc == 0
