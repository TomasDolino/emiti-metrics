"""
Pydantic schemas for API request/response validation
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from enum import Enum


# ==================== ENUMS ====================

class CampaignObjective(str, Enum):
    MESSAGES = "MESSAGES"
    SALES = "SALES"
    LEADS = "LEADS"
    TRAFFIC = "TRAFFIC"
    AWARENESS = "AWARENESS"


class AdClassification(str, Enum):
    GANADOR = "GANADOR"
    ESCALABLE = "ESCALABLE"
    TESTING = "TESTING"
    FATIGADO = "FATIGADO"
    PAUSAR = "PAUSAR"


class AlertSeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class AlertType(str, Enum):
    ROAS_DROP = "ROAS_DROP"
    CPA_INCREASE = "CPA_INCREASE"
    CTR_DROP = "CTR_DROP"
    FATIGUE_DETECTED = "FATIGUE_DETECTED"
    BUDGET_DEPLETED = "BUDGET_DEPLETED"
    PERFORMANCE_SPIKE = "PERFORMANCE_SPIKE"
    NEW_WINNER = "NEW_WINNER"


# ==================== METRICS ====================

class MetricsData(BaseModel):
    date: date
    campaign_name: str
    ad_set_name: str
    ad_name: str

    spend: float
    impressions: int
    reach: int
    frequency: float
    clicks: int
    link_clicks: int
    ctr: float
    cpc: float
    cpm: float

    results: int
    cost_per_result: float
    result_rate: float

    # Optional based on objective
    purchases: Optional[int] = None
    purchase_value: Optional[float] = None
    roas: Optional[float] = None
    messaging_conversations: Optional[int] = None
    leads: Optional[int] = None


class DailyAggregation(BaseModel):
    date: date
    spend: float
    results: int
    cpr: float
    ctr: float
    impressions: int


# ==================== ANALYSIS ====================

class AdAnalysis(BaseModel):
    ad_name: str
    ad_set_name: str
    campaign_name: str

    total_spend: float
    total_results: int
    avg_cost_per_result: float
    avg_ctr: float
    avg_frequency: float

    ctr_trend: float
    cpr_trend: float
    frequency_trend: float

    classification: AdClassification
    classification_reason: str
    recommendations: List[str]

    fatigue_score: int
    days_running: int


class CampaignAnalysis(BaseModel):
    campaign_name: str
    objective: CampaignObjective

    total_spend: float
    total_results: int
    avg_cost_per_result: float

    ads_analysis: List[AdAnalysis]
    top_performers: List[str]
    underperformers: List[str]

    insights: List[str]
    recommendations: List[str]


# ==================== ALERTS ====================

class Alert(BaseModel):
    id: str
    type: AlertType
    severity: AlertSeverity
    title: str
    message: str

    ad_name: Optional[str] = None
    campaign_name: Optional[str] = None
    metric: Optional[str] = None
    previous_value: Optional[float] = None
    current_value: Optional[float] = None
    change_percent: Optional[float] = None

    created_at: str
    acknowledged: bool = False


# ==================== CLIENTS ====================

class Client(BaseModel):
    id: str
    name: str
    industry: Optional[str] = None
    meta_account_id: Optional[str] = None
    created_at: str
    is_active: bool = True


# ==================== REQUESTS ====================

class UploadCSVRequest(BaseModel):
    client_id: str
    objective: CampaignObjective


class DateRangeRequest(BaseModel):
    start_date: date
    end_date: date
    campaign_ids: Optional[List[str]] = None


# ==================== RESPONSES ====================

class AnalysisResponse(BaseModel):
    success: bool
    campaign_analysis: Optional[CampaignAnalysis] = None
    alerts: List[Alert] = []
    message: Optional[str] = None


class DashboardSummary(BaseModel):
    total_spend: float
    total_results: int
    avg_cpr: float
    avg_ctr: float

    spend_change: float
    results_change: float
    cpr_change: float
    ctr_change: float

    active_alerts: int

    classification_counts: dict
    daily_metrics: List[DailyAggregation]


# ==================== ADVANCED ANALYSIS ====================

class PatternMatch(BaseModel):
    pattern: str
    impact: str
    confidence: str  # high, medium, low
    category: str  # format, creative, timing, messaging
    recommendation: str


class ScenarioSimulation(BaseModel):
    scenario: str
    current: dict
    projected: dict
    delta: dict
    confidence: str
    note: str


class StructureDiagnostic(BaseModel):
    type: str  # structure, duplication
    severity: str  # warning, info, critical
    title: str
    message: str
    campaign: Optional[str] = None
    ad_set: Optional[str] = None
    recommendation: str


class AccountQualityScore(BaseModel):
    score: int
    status: str  # ready, limited, insufficient
    message: str
    issues: List[dict]
    summary: dict


class AudienceSaturation(BaseModel):
    saturation_score: int
    status: str  # healthy, warning, critical
    trends: dict
    recommendation: str
    estimated_days_left: int


class CompetitionProxy(BaseModel):
    cpm_trend: dict
    competition_pressure: str  # increasing, stable
    recommendation: str
    best_days: List[str]
    worst_days: List[str]
    insight: str


class AgencyROI(BaseModel):
    total_spend_managed: float
    total_results: int
    optimized_cpr: float
    estimated_unoptimized_cpr: float
    extra_results_generated: float
    estimated_value_generated: float
    optimization_impact: str
    actions_summary: int


class ClientPlaybook(BaseModel):
    client_name: str
    generated_at: str
    quality_score: int
    learnings: List[dict]
    recommended_structure: dict
    do: List[str]
    dont: List[str]
    monitor: List[str]


# ==================== PERSISTENCE ====================

class SnapshotSummary(BaseModel):
    id: str
    period: dict
    created_at: str
    metrics_summary: dict


class SnapshotComparison(BaseModel):
    period_1: dict
    period_2: dict
    comparison: dict
    classification_changes: dict


class HistoricalTrend(BaseModel):
    metric: str
    data_points: List[dict]
    overall_change_percent: float
    trend_direction: str  # improving, declining, stable


class ClientLearning(BaseModel):
    id: str
    type: str  # works, doesnt_work, insight
    text: str
    evidence: str
    category: str  # creative, audience, timing, budget
    created_at: str
    is_active: bool = True


class ActionLog(BaseModel):
    id: str
    type: str
    description: str
    affected_items: List[str]
    estimated_impact: Optional[str] = None
    created_at: str


class ClientConfig(BaseModel):
    objective: CampaignObjective
    currency: str = "ARS"
    thresholds: dict
    monthly_budget: float = 0
    result_value: float = 100
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ==================== EXTENDED REQUESTS ====================

class SimulateBudgetRequest(BaseModel):
    client_id: str
    change_percent: float
    target_ads: Optional[List[str]] = None


class SimulatePauseRequest(BaseModel):
    client_id: str
    ad_name: str


class SaveSnapshotRequest(BaseModel):
    client_id: str
    period_start: str
    period_end: str


class CompareSnapshotsRequest(BaseModel):
    client_id: str
    snapshot_id_1: str
    snapshot_id_2: str


class SaveLearningRequest(BaseModel):
    client_id: str
    learning_type: str
    text: str
    evidence: str
    category: str


class LogActionRequest(BaseModel):
    client_id: str
    action_type: str
    description: str
    affected_items: List[str]
    estimated_impact: Optional[str] = None


class UpdateClientConfigRequest(BaseModel):
    client_id: str
    objective: Optional[CampaignObjective] = None
    currency: Optional[str] = None
    thresholds: Optional[dict] = None
    monthly_budget: Optional[float] = None
    result_value: Optional[float] = None
