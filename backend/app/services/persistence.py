"""
Servicio de persistencia - Snapshots históricos
Guarda análisis para comparación temporal
"""
import json
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from pathlib import Path
import hashlib


# Directorio para snapshots (en producción usar DB)
SNAPSHOTS_DIR = Path(__file__).parent.parent.parent / "data" / "snapshots"
SNAPSHOTS_DIR.mkdir(parents=True, exist_ok=True)


def _get_client_dir(client_id: str) -> Path:
    """Obtiene el directorio de snapshots para un cliente."""
    client_dir = SNAPSHOTS_DIR / client_id
    client_dir.mkdir(parents=True, exist_ok=True)
    return client_dir


def _generate_snapshot_id(client_id: str, date: str) -> str:
    """Genera un ID único para el snapshot."""
    return hashlib.md5(f"{client_id}-{date}".encode()).hexdigest()[:12]


def save_snapshot(
    client_id: str,
    analysis_data: Dict,
    metrics_summary: Dict,
    period_start: str,
    period_end: str
) -> Dict:
    """
    Guarda un snapshot del análisis para comparación futura.
    """
    snapshot_id = _generate_snapshot_id(client_id, period_end)
    client_dir = _get_client_dir(client_id)

    snapshot = {
        'id': snapshot_id,
        'client_id': client_id,
        'created_at': datetime.now().isoformat(),
        'period': {
            'start': period_start,
            'end': period_end
        },
        'metrics': metrics_summary,
        'analysis': analysis_data,
        'version': '1.0'
    }

    # Guardar archivo
    filename = f"snapshot_{period_end.replace('-', '')}_{snapshot_id}.json"
    filepath = client_dir / filename

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(snapshot, f, ensure_ascii=False, indent=2)

    return {
        'snapshot_id': snapshot_id,
        'filepath': str(filepath),
        'created_at': snapshot['created_at']
    }


def get_snapshots(client_id: str, limit: int = 10) -> List[Dict]:
    """
    Obtiene los snapshots históricos de un cliente.
    """
    client_dir = _get_client_dir(client_id)
    snapshots = []

    for filepath in sorted(client_dir.glob("snapshot_*.json"), reverse=True):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                snapshot = json.load(f)
                snapshots.append({
                    'id': snapshot['id'],
                    'period': snapshot['period'],
                    'created_at': snapshot['created_at'],
                    'metrics_summary': {
                        'spend': snapshot['metrics'].get('total_spend', 0),
                        'results': snapshot['metrics'].get('total_results', 0),
                        'cpr': snapshot['metrics'].get('avg_cpr', 0),
                        'ctr': snapshot['metrics'].get('avg_ctr', 0)
                    }
                })
        except Exception as e:
            continue

        if len(snapshots) >= limit:
            break

    return snapshots


def get_snapshot(client_id: str, snapshot_id: str) -> Optional[Dict]:
    """
    Obtiene un snapshot específico.
    """
    client_dir = _get_client_dir(client_id)

    for filepath in client_dir.glob(f"*_{snapshot_id}.json"):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass

    return None


def compare_snapshots(
    client_id: str,
    snapshot_id_1: str,
    snapshot_id_2: str
) -> Dict:
    """
    Compara dos snapshots y retorna las diferencias.
    """
    snapshot1 = get_snapshot(client_id, snapshot_id_1)
    snapshot2 = get_snapshot(client_id, snapshot_id_2)

    if not snapshot1 or not snapshot2:
        return {'error': 'Uno o ambos snapshots no encontrados'}

    m1 = snapshot1['metrics']
    m2 = snapshot2['metrics']

    def calc_change(current, previous):
        if previous == 0:
            return 100 if current > 0 else 0
        return ((current - previous) / previous) * 100

    return {
        'period_1': snapshot1['period'],
        'period_2': snapshot2['period'],
        'comparison': {
            'spend': {
                'period_1': m1.get('total_spend', 0),
                'period_2': m2.get('total_spend', 0),
                'change_percent': calc_change(m2.get('total_spend', 0), m1.get('total_spend', 0))
            },
            'results': {
                'period_1': m1.get('total_results', 0),
                'period_2': m2.get('total_results', 0),
                'change_percent': calc_change(m2.get('total_results', 0), m1.get('total_results', 0))
            },
            'cpr': {
                'period_1': m1.get('avg_cpr', 0),
                'period_2': m2.get('avg_cpr', 0),
                'change_percent': calc_change(m2.get('avg_cpr', 0), m1.get('avg_cpr', 0)),
                'is_improvement': m2.get('avg_cpr', 0) < m1.get('avg_cpr', 0)
            },
            'ctr': {
                'period_1': m1.get('avg_ctr', 0),
                'period_2': m2.get('avg_ctr', 0),
                'change_percent': calc_change(m2.get('avg_ctr', 0), m1.get('avg_ctr', 0)),
                'is_improvement': m2.get('avg_ctr', 0) > m1.get('avg_ctr', 0)
            }
        },
        'classification_changes': {
            'new_winners': [],  # Se podría implementar comparando ads
            'new_fatigued': [],
            'recovered': []
        }
    }


def get_historical_trend(client_id: str, metric: str = 'cpr', periods: int = 8) -> Dict:
    """
    Obtiene la tendencia histórica de una métrica.
    """
    snapshots = get_snapshots(client_id, limit=periods)

    if len(snapshots) < 2:
        return {'error': 'Insuficientes snapshots para calcular tendencia'}

    data_points = []
    for s in reversed(snapshots):  # Ordenar cronológicamente
        value = s['metrics_summary'].get(metric, 0)
        data_points.append({
            'period_end': s['period']['end'],
            'value': value
        })

    # Calcular tendencia
    if len(data_points) >= 2:
        first_value = data_points[0]['value']
        last_value = data_points[-1]['value']
        overall_change = ((last_value - first_value) / first_value * 100) if first_value > 0 else 0
    else:
        overall_change = 0

    return {
        'metric': metric,
        'data_points': data_points,
        'overall_change_percent': overall_change,
        'trend_direction': 'improving' if (
            (metric == 'cpr' and overall_change < 0) or
            (metric in ['ctr', 'results'] and overall_change > 0)
        ) else 'declining' if overall_change != 0 else 'stable'
    }


# ==================== LEARNINGS PERSISTENCE ====================

def save_learning(
    client_id: str,
    learning_type: str,
    text: str,
    evidence: str,
    category: str
) -> Dict:
    """
    Guarda un aprendizaje para el Knowledge Base.
    """
    client_dir = _get_client_dir(client_id)
    learnings_file = client_dir / "learnings.json"

    # Cargar existentes
    if learnings_file.exists():
        with open(learnings_file, 'r', encoding='utf-8') as f:
            learnings = json.load(f)
    else:
        learnings = []

    # Agregar nuevo
    learning_id = hashlib.md5(f"{text}-{datetime.now().isoformat()}".encode()).hexdigest()[:8]
    learning = {
        'id': learning_id,
        'type': learning_type,
        'text': text,
        'evidence': evidence,
        'category': category,
        'created_at': datetime.now().isoformat(),
        'is_active': True
    }
    learnings.append(learning)

    # Guardar
    with open(learnings_file, 'w', encoding='utf-8') as f:
        json.dump(learnings, f, ensure_ascii=False, indent=2)

    return learning


def get_learnings(client_id: str) -> List[Dict]:
    """
    Obtiene los aprendizajes de un cliente.
    """
    client_dir = _get_client_dir(client_id)
    learnings_file = client_dir / "learnings.json"

    if not learnings_file.exists():
        return []

    with open(learnings_file, 'r', encoding='utf-8') as f:
        learnings = json.load(f)

    return [l for l in learnings if l.get('is_active', True)]


# ==================== ACTIONS LOG ====================

def log_action(
    client_id: str,
    action_type: str,
    description: str,
    affected_items: List[str],
    estimated_impact: Optional[str] = None
) -> Dict:
    """
    Registra una acción tomada para calcular ROI de la agencia.
    """
    client_dir = _get_client_dir(client_id)
    actions_file = client_dir / "actions.json"

    # Cargar existentes
    if actions_file.exists():
        with open(actions_file, 'r', encoding='utf-8') as f:
            actions = json.load(f)
    else:
        actions = []

    # Agregar nueva
    action_id = hashlib.md5(f"{description}-{datetime.now().isoformat()}".encode()).hexdigest()[:8]
    action = {
        'id': action_id,
        'type': action_type,
        'description': description,
        'affected_items': affected_items,
        'estimated_impact': estimated_impact,
        'created_at': datetime.now().isoformat()
    }
    actions.append(action)

    # Guardar
    with open(actions_file, 'w', encoding='utf-8') as f:
        json.dump(actions, f, ensure_ascii=False, indent=2)

    return action


def get_actions(client_id: str, since_days: int = 30) -> List[Dict]:
    """
    Obtiene las acciones registradas para un cliente.
    """
    client_dir = _get_client_dir(client_id)
    actions_file = client_dir / "actions.json"

    if not actions_file.exists():
        return []

    with open(actions_file, 'r', encoding='utf-8') as f:
        actions = json.load(f)

    cutoff = datetime.now() - timedelta(days=since_days)

    return [
        a for a in actions
        if datetime.fromisoformat(a['created_at']) >= cutoff
    ]


def get_actions_summary(client_id: str, since_days: int = 30) -> Dict:
    """
    Resumen de acciones para mostrar valor de la agencia.
    """
    actions = get_actions(client_id, since_days)

    by_type = {}
    for action in actions:
        t = action['type']
        if t not in by_type:
            by_type[t] = 0
        by_type[t] += 1

    return {
        'total_actions': len(actions),
        'by_type': by_type,
        'period_days': since_days,
        'actions': actions[-10:]  # Últimas 10
    }


# ==================== CLIENT CONFIG ====================

def save_client_config(
    client_id: str,
    config: Dict
) -> Dict:
    """
    Guarda configuración específica del cliente (KPIs, thresholds, etc.)
    """
    client_dir = _get_client_dir(client_id)
    config_file = client_dir / "config.json"

    # Merge con defaults
    defaults = {
        'objective': 'MESSAGES',
        'currency': 'ARS',
        'thresholds': {
            'min_results_winner': 10,
            'max_cpr_winner': 150,
            'min_ctr_winner': 1.5,
            'min_frequency_fatigued': 3.5,
            'ctr_drop_fatigued': 20
        },
        'monthly_budget': 0,
        'result_value': 100,  # Valor estimado por resultado
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    }

    # Cargar existente si hay
    if config_file.exists():
        with open(config_file, 'r', encoding='utf-8') as f:
            existing = json.load(f)
        defaults.update(existing)

    # Update con nuevos valores
    defaults.update(config)
    defaults['updated_at'] = datetime.now().isoformat()

    # Guardar
    with open(config_file, 'w', encoding='utf-8') as f:
        json.dump(defaults, f, ensure_ascii=False, indent=2)

    return defaults


def get_client_config(client_id: str) -> Dict:
    """
    Obtiene la configuración de un cliente.
    """
    client_dir = _get_client_dir(client_id)
    config_file = client_dir / "config.json"

    defaults = {
        'objective': 'MESSAGES',
        'currency': 'ARS',
        'thresholds': {
            'min_results_winner': 10,
            'max_cpr_winner': 150,
            'min_ctr_winner': 1.5,
            'min_frequency_fatigued': 3.5,
            'ctr_drop_fatigued': 20
        },
        'monthly_budget': 0,
        'result_value': 100
    }

    if not config_file.exists():
        return defaults

    with open(config_file, 'r', encoding='utf-8') as f:
        config = json.load(f)

    defaults.update(config)
    return defaults
