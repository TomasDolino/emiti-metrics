"""
Router para endpoints de clientes
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from uuid import uuid4

from ..database import get_db, ClientDB, ClientConfigDB, UserDB
from ..models.schemas import Client
from ..auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[Client])
async def list_clients(
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user)
):
    """Lista todos los clientes."""
    query = db.query(ClientDB)

    if is_active is not None:
        query = query.filter(ClientDB.is_active == is_active)

    clients = query.order_by(ClientDB.name).all()

    return [
        Client(
            id=c.id,
            name=c.name,
            industry=c.industry,
            meta_account_id=c.meta_account_id,
            is_active=c.is_active,
            created_at=c.created_at.isoformat()
        )
        for c in clients
    ]


@router.get("/brands")
async def get_brands(
    client_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user)
):
    """
    Obtiene la lista de marcas (clientes) disponibles para filtrar.
    Las marcas son los clientes activos de la agencia.
    """
    query = db.query(ClientDB).filter(ClientDB.is_active == True)

    if client_id:
        query = query.filter(ClientDB.id == client_id)

    clients = query.order_by(ClientDB.name).all()

    return [
        {
            "id": c.id,
            "name": c.name,
            "color": getattr(c, 'color', None) or "#6366f1"
        }
        for c in clients
    ]


@router.get("/{client_id}", response_model=Client)
async def get_client(client_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    """Obtiene un cliente por ID."""
    client = db.query(ClientDB).filter(ClientDB.id == client_id).first()

    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    return Client(
        id=client.id,
        name=client.name,
        industry=client.industry,
        meta_account_id=client.meta_account_id,
        is_active=client.is_active,
        created_at=client.created_at.isoformat()
    )


@router.post("/", response_model=Client)
async def create_client(
    name: str,
    industry: Optional[str] = None,
    meta_account_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user)
):
    """Crea un nuevo cliente."""
    client_id = f"client-{uuid4().hex[:8]}"

    new_client = ClientDB(
        id=client_id,
        name=name,
        industry=industry,
        meta_account_id=meta_account_id,
        is_active=True
    )

    db.add(new_client)

    # Create default config
    default_config = ClientConfigDB(
        client_id=client_id,
        objective="MESSAGES",
        currency="ARS",
        thresholds={
            "cpr_warning": 500,
            "cpr_critical": 800,
            "frequency_warning": 3.5,
            "ctr_minimum": 0.5
        },
        monthly_budget=0,
        result_value=100
    )
    db.add(default_config)

    db.commit()
    db.refresh(new_client)

    return Client(
        id=new_client.id,
        name=new_client.name,
        industry=new_client.industry,
        meta_account_id=new_client.meta_account_id,
        is_active=new_client.is_active,
        created_at=new_client.created_at.isoformat()
    )


@router.put("/{client_id}", response_model=Client)
async def update_client(
    client_id: str,
    name: Optional[str] = None,
    industry: Optional[str] = None,
    meta_account_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user)
):
    """Actualiza un cliente existente."""
    client = db.query(ClientDB).filter(ClientDB.id == client_id).first()

    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    if name is not None:
        client.name = name
    if industry is not None:
        client.industry = industry
    if meta_account_id is not None:
        client.meta_account_id = meta_account_id
    if is_active is not None:
        client.is_active = is_active

    client.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(client)

    return Client(
        id=client.id,
        name=client.name,
        industry=client.industry,
        meta_account_id=client.meta_account_id,
        is_active=client.is_active,
        created_at=client.created_at.isoformat()
    )


@router.delete("/{client_id}")
async def delete_client(client_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    """Elimina un cliente (soft delete - marca como inactivo)."""
    client = db.query(ClientDB).filter(ClientDB.id == client_id).first()

    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    # Soft delete
    client.is_active = False
    client.updated_at = datetime.utcnow()

    db.commit()

    return {"success": True, "message": "Cliente desactivado"}


@router.post("/{client_id}/restore")
async def restore_client(client_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    """Restaura un cliente eliminado."""
    client = db.query(ClientDB).filter(ClientDB.id == client_id).first()

    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    client.is_active = True
    client.updated_at = datetime.utcnow()

    db.commit()

    return {"success": True, "message": "Cliente restaurado"}


@router.get("/{client_id}/summary")
async def get_client_summary(client_id: str, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    """Obtiene un resumen del cliente con métricas y alertas."""
    from ..database import MetricDB, AlertDB, CampaignDB

    client = db.query(ClientDB).filter(ClientDB.id == client_id).first()

    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    # Get metrics summary
    metrics = db.query(MetricDB).filter(MetricDB.client_id == client_id).all()

    total_spend = sum(m.spend for m in metrics) if metrics else 0
    total_results = sum(m.results for m in metrics) if metrics else 0

    # Get active alerts count
    active_alerts = db.query(AlertDB).filter(
        AlertDB.client_id == client_id,
        AlertDB.acknowledged == False
    ).count()

    # Get campaigns count
    campaigns_count = db.query(CampaignDB).filter(
        CampaignDB.client_id == client_id
    ).count()

    return {
        "client": {
            "id": client.id,
            "name": client.name,
            "industry": client.industry,
            "is_active": client.is_active
        },
        "metrics": {
            "total_spend": total_spend,
            "total_results": total_results,
            "avg_cpr": total_spend / total_results if total_results > 0 else 0,
            "data_points": len(metrics)
        },
        "active_alerts": active_alerts,
        "campaigns_count": campaigns_count
    }
