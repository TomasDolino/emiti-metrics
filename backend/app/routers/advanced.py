"""
Router para funcionalidades avanzadas
Pattern Mining, Simulador, Diagnósticos, Persistencia, etc.
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List, Optional
import pandas as pd

from ..models.schemas import (
    PatternMatch, ScenarioSimulation, StructureDiagnostic,
    AccountQualityScore, AudienceSaturation, CompetitionProxy,
    AgencyROI, ClientPlaybook, SnapshotSummary, SnapshotComparison,
    HistoricalTrend, ClientLearning, ActionLog, ClientConfig,
    SimulateBudgetRequest, SimulatePauseRequest, SaveSnapshotRequest,
    CompareSnapshotsRequest, SaveLearningRequest, LogActionRequest,
    UpdateClientConfigRequest
)

from ..services.advanced_analysis import (
    mine_patterns, simulate_budget_change, simulate_pause_ad,
    diagnose_account_structure, calculate_account_quality_score,
    predict_audience_saturation, analyze_competition_proxy,
    calculate_agency_roi, generate_playbook
)

from ..services.persistence import (
    save_snapshot, get_snapshots, get_snapshot, compare_snapshots,
    get_historical_trend, save_learning, get_learnings,
    log_action, get_actions, get_actions_summary,
    save_client_config, get_client_config
)

from ..services.csv_processor import process_csv

router = APIRouter()

# In-memory storage for demo (replace with DB in production)
_client_data = {}


def _get_client_df(client_id: str) -> pd.DataFrame:
    """Helper to get client data."""
    if client_id not in _client_data:
        raise HTTPException(status_code=404, detail="Cliente no encontrado. Suba datos primero.")
    return _client_data[client_id]


# ==================== DATA UPLOAD ====================

@router.post("/upload/{client_id}")
async def upload_client_data(client_id: str, file: UploadFile = File(...)):
    """
    Sube datos CSV de Meta Ads para un cliente.
    """
    try:
        content = await file.read()
        df = process_csv(content)
        _client_data[client_id] = df

        return {
            "success": True,
            "message": f"Datos cargados para {client_id}",
            "rows": len(df),
            "date_range": {
                "start": df['date'].min().isoformat(),
                "end": df['date'].max().isoformat()
            },
            "campaigns": df['campaign_name'].nunique(),
            "ads": df['ad_name'].nunique()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==================== PATTERN MINING ====================

@router.get("/patterns/{client_id}", response_model=List[PatternMatch])
async def get_patterns(client_id: str):
    """
    Detecta patrones de performance en los datos del cliente.
    """
    df = _get_client_df(client_id)
    patterns = mine_patterns(df)
    return [PatternMatch(**p) for p in patterns]


# ==================== SIMULATIONS ====================

@router.post("/simulate/budget", response_model=ScenarioSimulation)
async def simulate_budget(request: SimulateBudgetRequest):
    """
    Simula el impacto de cambiar el presupuesto.
    """
    df = _get_client_df(request.client_id)
    result = simulate_budget_change(df, request.change_percent, request.target_ads)
    return ScenarioSimulation(**result)


@router.post("/simulate/pause")
async def simulate_pause(request: SimulatePauseRequest):
    """
    Simula el impacto de pausar un anuncio específico.
    """
    df = _get_client_df(request.client_id)
    return simulate_pause_ad(df, request.ad_name)


# ==================== DIAGNOSTICS ====================

@router.get("/diagnostics/structure/{client_id}", response_model=List[StructureDiagnostic])
async def get_structure_diagnostics(client_id: str):
    """
    Diagnostica problemas de estructura de la cuenta.
    """
    df = _get_client_df(client_id)
    diagnostics = diagnose_account_structure(df)
    return [StructureDiagnostic(**d) for d in diagnostics]


@router.get("/diagnostics/quality/{client_id}", response_model=AccountQualityScore)
async def get_quality_score(client_id: str):
    """
    Calcula el score de calidad de la cuenta.
    """
    df = _get_client_df(client_id)
    result = calculate_account_quality_score(df)
    return AccountQualityScore(**result)


@router.get("/diagnostics/saturation/{client_id}", response_model=AudienceSaturation)
async def get_saturation(client_id: str):
    """
    Predice saturación de audiencia.
    """
    df = _get_client_df(client_id)
    result = predict_audience_saturation(df)
    return AudienceSaturation(**result)


@router.get("/diagnostics/competition/{client_id}", response_model=CompetitionProxy)
async def get_competition(client_id: str):
    """
    Analiza presión competitiva proxy.
    """
    df = _get_client_df(client_id)
    result = analyze_competition_proxy(df)
    return CompetitionProxy(**result)


# ==================== AGENCY ROI ====================

@router.get("/roi/{client_id}")
async def get_agency_roi(client_id: str):
    """
    Calcula el ROI que la agencia genera para el cliente.
    """
    df = _get_client_df(client_id)
    actions = get_actions(client_id)
    result = calculate_agency_roi(df, actions)
    return result


# ==================== PLAYBOOK ====================

@router.get("/playbook/{client_id}", response_model=ClientPlaybook)
async def get_playbook(client_id: str, client_name: str = "Cliente"):
    """
    Genera un playbook de mejores prácticas para el cliente.
    """
    df = _get_client_df(client_id)
    result = generate_playbook(df, client_name)
    return ClientPlaybook(**result)


# ==================== SNAPSHOTS ====================

@router.post("/snapshots")
async def create_snapshot(request: SaveSnapshotRequest):
    """
    Guarda un snapshot del análisis actual.
    """
    df = _get_client_df(request.client_id)

    # Calculate metrics summary
    total_spend = df['spend'].sum()
    total_results = df['results'].sum()

    metrics_summary = {
        'total_spend': total_spend,
        'total_results': total_results,
        'avg_cpr': total_spend / total_results if total_results > 0 else 0,
        'avg_ctr': df['ctr'].mean(),
        'total_impressions': df['impressions'].sum(),
        'unique_ads': df['ad_name'].nunique()
    }

    # For now, pass empty analysis (could be expanded)
    analysis_data = {
        'patterns': mine_patterns(df),
        'quality_score': calculate_account_quality_score(df)
    }

    result = save_snapshot(
        request.client_id,
        analysis_data,
        metrics_summary,
        request.period_start,
        request.period_end
    )

    return result


@router.get("/snapshots/{client_id}", response_model=List[SnapshotSummary])
async def list_snapshots(client_id: str, limit: int = 10):
    """
    Lista los snapshots históricos de un cliente.
    """
    snapshots = get_snapshots(client_id, limit)
    return [SnapshotSummary(**s) for s in snapshots]


@router.get("/snapshots/{client_id}/{snapshot_id}")
async def get_snapshot_detail(client_id: str, snapshot_id: str):
    """
    Obtiene un snapshot específico.
    """
    snapshot = get_snapshot(client_id, snapshot_id)
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot no encontrado")
    return snapshot


@router.post("/snapshots/compare", response_model=SnapshotComparison)
async def compare_snapshots_endpoint(request: CompareSnapshotsRequest):
    """
    Compara dos snapshots.
    """
    result = compare_snapshots(
        request.client_id,
        request.snapshot_id_1,
        request.snapshot_id_2
    )
    if 'error' in result:
        raise HTTPException(status_code=404, detail=result['error'])
    return SnapshotComparison(**result)


@router.get("/trends/{client_id}/{metric}", response_model=HistoricalTrend)
async def get_trend(client_id: str, metric: str, periods: int = 8):
    """
    Obtiene la tendencia histórica de una métrica.
    """
    result = get_historical_trend(client_id, metric, periods)
    if 'error' in result:
        raise HTTPException(status_code=400, detail=result['error'])
    return HistoricalTrend(**result)


# ==================== LEARNINGS ====================

@router.post("/learnings", response_model=ClientLearning)
async def create_learning(request: SaveLearningRequest):
    """
    Guarda un aprendizaje para el Knowledge Base.
    """
    result = save_learning(
        request.client_id,
        request.learning_type,
        request.text,
        request.evidence,
        request.category
    )
    return ClientLearning(**result)


@router.get("/learnings/{client_id}", response_model=List[ClientLearning])
async def list_learnings(client_id: str):
    """
    Lista los aprendizajes de un cliente.
    """
    learnings = get_learnings(client_id)
    return [ClientLearning(**l) for l in learnings]


# ==================== ACTIONS LOG ====================

@router.post("/actions", response_model=ActionLog)
async def create_action(request: LogActionRequest):
    """
    Registra una acción tomada.
    """
    result = log_action(
        request.client_id,
        request.action_type,
        request.description,
        request.affected_items,
        request.estimated_impact
    )
    return ActionLog(**result)


@router.get("/actions/{client_id}")
async def list_actions(client_id: str, days: int = 30):
    """
    Lista las acciones recientes de un cliente.
    """
    return get_actions_summary(client_id, days)


# ==================== CLIENT CONFIG ====================

@router.put("/config/{client_id}", response_model=ClientConfig)
async def update_config(client_id: str, request: UpdateClientConfigRequest):
    """
    Actualiza la configuración de un cliente.
    """
    config = {}
    if request.objective:
        config['objective'] = request.objective.value
    if request.currency:
        config['currency'] = request.currency
    if request.thresholds:
        config['thresholds'] = request.thresholds
    if request.monthly_budget is not None:
        config['monthly_budget'] = request.monthly_budget
    if request.result_value is not None:
        config['result_value'] = request.result_value

    result = save_client_config(client_id, config)
    return ClientConfig(**result)


@router.get("/config/{client_id}", response_model=ClientConfig)
async def get_config(client_id: str):
    """
    Obtiene la configuración de un cliente.
    """
    config = get_client_config(client_id)
    return ClientConfig(**config)


# ==================== FULL ANALYSIS ====================

@router.get("/full-analysis/{client_id}")
async def get_full_analysis(client_id: str):
    """
    Ejecuta el análisis completo y retorna todos los insights.
    """
    df = _get_client_df(client_id)

    return {
        "quality_score": calculate_account_quality_score(df),
        "patterns": mine_patterns(df),
        "structure_diagnostics": diagnose_account_structure(df),
        "saturation": predict_audience_saturation(df),
        "competition": analyze_competition_proxy(df),
        "config": get_client_config(client_id),
        "learnings": get_learnings(client_id),
        "recent_actions": get_actions_summary(client_id, 30)
    }
