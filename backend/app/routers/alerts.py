"""
Router para endpoints de alertas
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db, AlertDB
from ..models.schemas import Alert, AlertSeverity, AlertType

router = APIRouter()


def alert_to_schema(alert: AlertDB) -> Alert:
    """Convert DB model to Pydantic schema."""
    return Alert(
        id=alert.id,
        type=AlertType(alert.type),
        severity=AlertSeverity(alert.severity),
        title=alert.title,
        message=alert.message,
        ad_name=alert.ad_name,
        campaign_name=alert.campaign_name,
        metric=alert.metric,
        previous_value=alert.previous_value,
        current_value=alert.current_value,
        change_percent=alert.change_percent,
        created_at=alert.created_at.isoformat(),
        acknowledged=alert.acknowledged
    )


@router.get("/", response_model=List[Alert])
async def list_alerts(
    client_id: Optional[str] = None,
    acknowledged: Optional[bool] = None,
    severity: Optional[AlertSeverity] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Lista todas las alertas."""
    query = db.query(AlertDB)

    if client_id:
        query = query.filter(AlertDB.client_id == client_id)

    if acknowledged is not None:
        query = query.filter(AlertDB.acknowledged == acknowledged)

    if severity is not None:
        query = query.filter(AlertDB.severity == severity.value)

    alerts = query.order_by(AlertDB.created_at.desc()).limit(limit).all()

    return [alert_to_schema(a) for a in alerts]


@router.get("/active")
async def get_active_alerts(
    client_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Obtiene solo alertas no reconocidas."""
    query = db.query(AlertDB).filter(AlertDB.acknowledged == False)

    if client_id:
        query = query.filter(AlertDB.client_id == client_id)

    alerts = query.order_by(AlertDB.created_at.desc()).all()

    return [alert_to_schema(a) for a in alerts]


@router.get("/count")
async def get_alerts_count(
    client_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Cuenta alertas por estado y severidad."""
    base_query = db.query(AlertDB)

    if client_id:
        base_query = base_query.filter(AlertDB.client_id == client_id)

    total = base_query.count()
    active_query = base_query.filter(AlertDB.acknowledged == False)

    return {
        "total": total,
        "active": active_query.count(),
        "by_severity": {
            "critical": active_query.filter(AlertDB.severity == "CRITICAL").count(),
            "warning": active_query.filter(AlertDB.severity == "WARNING").count(),
            "info": active_query.filter(AlertDB.severity == "INFO").count()
        }
    }


@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str, db: Session = Depends(get_db)):
    """Marca una alerta como reconocida."""
    alert = db.query(AlertDB).filter(AlertDB.id == alert_id).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")

    alert.acknowledged = True
    db.commit()

    return {"success": True, "message": "Alerta marcada como leída"}


@router.post("/acknowledge-all")
async def acknowledge_all_alerts(
    client_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Marca todas las alertas como reconocidas."""
    query = db.query(AlertDB).filter(AlertDB.acknowledged == False)

    if client_id:
        query = query.filter(AlertDB.client_id == client_id)

    count = query.update({"acknowledged": True})
    db.commit()

    return {"success": True, "acknowledged_count": count}


@router.get("/{alert_id}")
async def get_alert(alert_id: str, db: Session = Depends(get_db)):
    """Obtiene una alerta por ID."""
    alert = db.query(AlertDB).filter(AlertDB.id == alert_id).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")

    return alert_to_schema(alert)


@router.delete("/{alert_id}")
async def delete_alert(alert_id: str, db: Session = Depends(get_db)):
    """Elimina una alerta."""
    alert = db.query(AlertDB).filter(AlertDB.id == alert_id).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")

    db.delete(alert)
    db.commit()

    return {"success": True, "message": "Alerta eliminada"}
