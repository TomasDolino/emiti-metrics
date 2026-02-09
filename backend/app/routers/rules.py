"""
Rules Engine for Emiti Metrics
Automate ad management with IF/THEN rules
"""
from typing import List, Optional
from datetime import datetime
from enum import Enum
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db

router = APIRouter()


# ============================================================================
# ENUMS & MODELS
# ============================================================================

class MetricType(str, Enum):
    """Available metrics for rule conditions."""
    ROAS = "roas"
    CTR = "ctr"
    CPC = "cpc"
    CPM = "cpm"
    SPEND = "spend"
    IMPRESSIONS = "impressions"
    CLICKS = "clicks"
    CONVERSIONS = "conversions"
    FREQUENCY = "frequency"
    REACH = "reach"


class Operator(str, Enum):
    """Comparison operators."""
    GREATER_THAN = ">"
    LESS_THAN = "<"
    GREATER_EQUAL = ">="
    LESS_EQUAL = "<="
    EQUALS = "=="
    NOT_EQUALS = "!="


class ActionType(str, Enum):
    """Available actions when rule triggers."""
    PAUSE_AD = "pause_ad"
    PAUSE_ADSET = "pause_adset"
    INCREASE_BUDGET = "increase_budget"
    DECREASE_BUDGET = "decrease_budget"
    SEND_ALERT = "send_alert"
    SEND_SLACK = "send_slack"
    SEND_EMAIL = "send_email"
    TAG_AD = "tag_ad"


class LogicalOperator(str, Enum):
    """Logical operators for combining conditions."""
    AND = "AND"
    OR = "OR"


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class RuleCondition(BaseModel):
    """A single condition in a rule."""
    metric: MetricType
    operator: Operator
    value: float
    timeframe_days: int = Field(default=7, ge=1, le=90)


class RuleAction(BaseModel):
    """Action to take when rule triggers."""
    action_type: ActionType
    value: Optional[float] = None  # For budget changes (percentage)
    message: Optional[str] = None  # For alerts/notifications
    tag: Optional[str] = None  # For tagging


class RuleCreate(BaseModel):
    """Create a new rule."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    client_id: Optional[str] = None  # None = applies to all clients
    conditions: List[RuleCondition]
    logical_operator: LogicalOperator = LogicalOperator.AND
    actions: List[RuleAction]
    is_active: bool = True
    run_frequency_minutes: int = Field(default=15, ge=5, le=1440)


class RuleResponse(BaseModel):
    """Rule response."""
    id: str
    name: str
    description: Optional[str]
    client_id: Optional[str]
    conditions: List[RuleCondition]
    logical_operator: LogicalOperator
    actions: List[RuleAction]
    is_active: bool
    run_frequency_minutes: int
    last_run: Optional[datetime]
    times_triggered: int
    created_at: datetime


class RuleExecutionLog(BaseModel):
    """Log of rule execution."""
    rule_id: str
    rule_name: str
    triggered: bool
    ads_affected: List[str]
    actions_taken: List[str]
    executed_at: datetime


# ============================================================================
# RULE TEMPLATES
# ============================================================================

RULE_TEMPLATES = {
    "pause_low_roas": {
        "name": "Pausar ads con ROAS bajo",
        "description": "Pausa ads cuando ROAS < 1.0 y spend > $50",
        "conditions": [
            {"metric": "roas", "operator": "<", "value": 1.0, "timeframe_days": 7},
            {"metric": "spend", "operator": ">", "value": 50.0, "timeframe_days": 7}
        ],
        "logical_operator": "AND",
        "actions": [
            {"action_type": "pause_ad"},
            {"action_type": "send_alert", "message": "Ad pausado por ROAS bajo"}
        ]
    },
    "scale_winners": {
        "name": "Escalar ganadores",
        "description": "Aumenta presupuesto 20% cuando ROAS > 2.5",
        "conditions": [
            {"metric": "roas", "operator": ">", "value": 2.5, "timeframe_days": 7},
            {"metric": "spend", "operator": ">", "value": 100.0, "timeframe_days": 7}
        ],
        "logical_operator": "AND",
        "actions": [
            {"action_type": "increase_budget", "value": 20.0},
            {"action_type": "send_alert", "message": "Budget aumentado por buen ROAS"}
        ]
    },
    "fatigue_detection": {
        "name": "Detectar fatiga",
        "description": "Alerta cuando frecuencia > 3",
        "conditions": [
            {"metric": "frequency", "operator": ">", "value": 3.0, "timeframe_days": 7}
        ],
        "logical_operator": "AND",
        "actions": [
            {"action_type": "tag_ad", "tag": "FATIGADO"},
            {"action_type": "send_alert", "message": "Audiencia posiblemente fatigada"}
        ]
    },
    "cpm_spike": {
        "name": "Alerta CPM alto",
        "description": "Alerta cuando CPM sube por encima de umbral",
        "conditions": [
            {"metric": "cpm", "operator": ">", "value": 30.0, "timeframe_days": 3}
        ],
        "logical_operator": "AND",
        "actions": [
            {"action_type": "send_alert", "message": "CPM por encima de $30"}
        ]
    },
    "budget_protection": {
        "name": "Proteccion de presupuesto",
        "description": "Pausa si gasta mas del budget diario",
        "conditions": [
            {"metric": "spend", "operator": ">", "value": 500.0, "timeframe_days": 1}
        ],
        "logical_operator": "AND",
        "actions": [
            {"action_type": "pause_adset"},
            {"action_type": "send_alert", "message": "Budget diario excedido - adset pausado"}
        ]
    }
}


# ============================================================================
# IN-MEMORY STORAGE (Replace with DB in production)
# ============================================================================

rules_db: dict = {}
execution_logs: List[dict] = []


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/templates")
async def get_rule_templates():
    """Get predefined rule templates."""
    return {
        "templates": RULE_TEMPLATES,
        "available_metrics": [m.value for m in MetricType],
        "available_operators": [o.value for o in Operator],
        "available_actions": [a.value for a in ActionType]
    }


@router.post("/", response_model=RuleResponse)
async def create_rule(rule: RuleCreate):
    """Create a new automation rule."""
    import uuid

    rule_id = str(uuid.uuid4())[:8]

    new_rule = {
        "id": rule_id,
        "name": rule.name,
        "description": rule.description,
        "client_id": rule.client_id,
        "conditions": [c.dict() for c in rule.conditions],
        "logical_operator": rule.logical_operator.value,
        "actions": [a.dict() for a in rule.actions],
        "is_active": rule.is_active,
        "run_frequency_minutes": rule.run_frequency_minutes,
        "last_run": None,
        "times_triggered": 0,
        "created_at": datetime.utcnow()
    }

    rules_db[rule_id] = new_rule

    return RuleResponse(**new_rule)


@router.get("/")
async def list_rules(
    client_id: Optional[str] = None,
    is_active: Optional[bool] = None
):
    """List all rules, optionally filtered."""
    rules = list(rules_db.values())

    if client_id:
        rules = [r for r in rules if r["client_id"] == client_id or r["client_id"] is None]

    if is_active is not None:
        rules = [r for r in rules if r["is_active"] == is_active]

    return {"rules": rules, "total": len(rules)}


@router.get("/{rule_id}")
async def get_rule(rule_id: str):
    """Get a specific rule."""
    if rule_id not in rules_db:
        raise HTTPException(status_code=404, detail="Rule not found")

    return rules_db[rule_id]


@router.patch("/{rule_id}")
async def update_rule(rule_id: str, updates: dict):
    """Update a rule."""
    if rule_id not in rules_db:
        raise HTTPException(status_code=404, detail="Rule not found")

    rule = rules_db[rule_id]

    for key, value in updates.items():
        if key in rule and key not in ["id", "created_at"]:
            rule[key] = value

    return rule


@router.delete("/{rule_id}")
async def delete_rule(rule_id: str):
    """Delete a rule."""
    if rule_id not in rules_db:
        raise HTTPException(status_code=404, detail="Rule not found")

    del rules_db[rule_id]
    return {"message": "Rule deleted", "id": rule_id}


@router.post("/{rule_id}/toggle")
async def toggle_rule(rule_id: str):
    """Toggle rule active status."""
    if rule_id not in rules_db:
        raise HTTPException(status_code=404, detail="Rule not found")

    rule = rules_db[rule_id]
    rule["is_active"] = not rule["is_active"]

    return {"id": rule_id, "is_active": rule["is_active"]}


@router.post("/{rule_id}/test")
async def test_rule(rule_id: str, sample_data: Optional[dict] = None):
    """Test a rule with sample or real data without executing actions."""
    if rule_id not in rules_db:
        raise HTTPException(status_code=404, detail="Rule not found")

    rule = rules_db[rule_id]

    # Sample data for testing
    test_data = sample_data or {
        "roas": 0.8,
        "ctr": 0.5,
        "cpm": 25.0,
        "cpc": 2.5,
        "spend": 150.0,
        "impressions": 6000,
        "clicks": 30,
        "conversions": 2,
        "frequency": 2.1,
        "reach": 3000
    }

    # Evaluate conditions
    results = []
    for condition in rule["conditions"]:
        metric = condition["metric"]
        operator = condition["operator"]
        threshold = condition["value"]
        actual = test_data.get(metric, 0)

        passed = evaluate_condition(actual, operator, threshold)
        results.append({
            "condition": f"{metric} {operator} {threshold}",
            "actual_value": actual,
            "passed": passed
        })

    # Determine overall result
    logical_op = rule["logical_operator"]
    if logical_op == "AND":
        would_trigger = all(r["passed"] for r in results)
    else:  # OR
        would_trigger = any(r["passed"] for r in results)

    return {
        "rule_id": rule_id,
        "rule_name": rule["name"],
        "test_data": test_data,
        "condition_results": results,
        "logical_operator": logical_op,
        "would_trigger": would_trigger,
        "actions_if_triggered": rule["actions"]
    }


@router.get("/{rule_id}/logs")
async def get_rule_logs(rule_id: str, limit: int = 50):
    """Get execution logs for a rule."""
    logs = [log for log in execution_logs if log["rule_id"] == rule_id]
    return {"logs": logs[-limit:], "total": len(logs)}


@router.post("/from-template/{template_name}")
async def create_from_template(template_name: str, client_id: Optional[str] = None):
    """Create a rule from a predefined template."""
    if template_name not in RULE_TEMPLATES:
        raise HTTPException(status_code=404, detail="Template not found")

    template = RULE_TEMPLATES[template_name]
    import uuid

    rule_id = str(uuid.uuid4())[:8]

    new_rule = {
        "id": rule_id,
        "name": template["name"],
        "description": template["description"],
        "client_id": client_id,
        "conditions": template["conditions"],
        "logical_operator": template["logical_operator"],
        "actions": template["actions"],
        "is_active": True,
        "run_frequency_minutes": 15,
        "last_run": None,
        "times_triggered": 0,
        "created_at": datetime.utcnow()
    }

    rules_db[rule_id] = new_rule

    return new_rule


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def evaluate_condition(actual: float, operator: str, threshold: float) -> bool:
    """Evaluate a single condition."""
    if operator == ">":
        return actual > threshold
    elif operator == "<":
        return actual < threshold
    elif operator == ">=":
        return actual >= threshold
    elif operator == "<=":
        return actual <= threshold
    elif operator == "==":
        return actual == threshold
    elif operator == "!=":
        return actual != threshold
    return False
