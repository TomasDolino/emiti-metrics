"""
Router para upload y procesamiento de CSVs
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends, Request
from typing import Optional

from slowapi import Limiter
from slowapi.util import get_remote_address

from ..services.csv_processor import process_csv, get_campaign_summary
from ..services.analysis import analyze_campaign
from ..models.schemas import CampaignObjective, AnalysisResponse
from ..auth import get_current_user
from ..database import UserDB

# Rate limiter - uses remote address as key
def get_rate_limit_key(request: Request) -> str:
    """Get rate limit key - user_id if authenticated, otherwise IP."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return f"user:{auth_header[:50]}"
    return get_remote_address(request)

limiter = Limiter(key_func=get_rate_limit_key)

router = APIRouter()


@router.post("/csv")
@limiter.limit("5/minute")
async def upload_csv(
    request: Request,
    file: UploadFile = File(...),
    client_id: str = Form(...),
    objective: CampaignObjective = Form(CampaignObjective.MESSAGES),
    current_user: UserDB = Depends(get_current_user)
):
    """
    Sube y procesa un archivo CSV de Meta Ads.

    El archivo debe contener las columnas estándar de Meta Ads:
    - Nombre de la campaña
    - Nombre del conjunto de anuncios
    - Nombre del anuncio
    - Día/Fecha
    - Importe gastado
    - Impresiones
    - Resultados (o métrica según objetivo)
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un CSV")

    try:
        content = await file.read()
        df = process_csv(content)
        summary = get_campaign_summary(df)

        return {
            "success": True,
            "message": f"Archivo procesado correctamente",
            "summary": summary
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando archivo: {str(e)}")


@router.post("/csv/analyze")
@limiter.limit("5/minute")
async def upload_and_analyze(
    request: Request,
    file: UploadFile = File(...),
    client_id: str = Form(...),
    objective: CampaignObjective = Form(CampaignObjective.MESSAGES),
    campaign_name: Optional[str] = Form(None),
    current_user: UserDB = Depends(get_current_user)
):
    """
    Sube un CSV y ejecuta análisis completo.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un CSV")

    try:
        content = await file.read()
        df = process_csv(content)

        # If no campaign specified, analyze the first one
        if campaign_name is None:
            campaign_name = df['campaign_name'].iloc[0]

        analysis = analyze_campaign(df, campaign_name, objective)

        return AnalysisResponse(
            success=True,
            campaign_analysis=analysis,
            alerts=[],
            message="Análisis completado exitosamente"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en análisis: {str(e)}")


@router.get("/template")
async def get_csv_template(current_user: UserDB = Depends(get_current_user)):
    """
    Retorna información sobre el formato esperado del CSV.
    """
    return {
        "required_columns": [
            "Nombre de la campaña",
            "Nombre del conjunto de anuncios",
            "Nombre del anuncio",
            "Día (o Fecha)",
            "Importe gastado (ARS)",
            "Impresiones"
        ],
        "optional_columns": [
            "Alcance",
            "Frecuencia",
            "Clics en el enlace",
            "CTR (tasa de clics en el enlace)",
            "CPC (costo por clic)",
            "Resultados",
            "Costo por resultado",
            "Conversaciones de mensajes iniciadas",
            "Compras",
            "Valor de conversión de compras",
            "ROAS de las compras",
            "Leads"
        ],
        "notes": [
            "El archivo debe estar en formato CSV",
            "La columna de resultados se detecta automáticamente según el objetivo",
            "Las fechas se parsean automáticamente (formatos: DD/MM/YYYY, YYYY-MM-DD)",
            "Los montos en ARS se limpian automáticamente"
        ]
    }
