"""
AI Router for Emiti Metrics
Endpoints for AI-powered features with memory and learning
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
import json

from ..services.ai_service import (
    chat_with_data,
    analyze_creative,
    compare_creatives,
    generate_executive_report,
    generate_recommendations,
    generate_daily_insights,
    explain_anomaly,
    check_ai_status
)
from ..services.ai_memory import (
    save_message,
    get_conversation_history,
    update_preference,
    get_preferences,
    add_knowledge,
    search_knowledge,
    save_feedback,
    add_training_example,
    export_training_data,
    get_training_stats,
    build_ai_context
)

router = APIRouter()


# ==================== MODELS ====================

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    client_id: Optional[str] = None
    chat_history: Optional[List[ChatMessage]] = []
    data_context: Optional[Dict] = {}


class CreativeAnalysisRequest(BaseModel):
    image_base64: str
    image_type: str = "image/jpeg"
    context: Optional[str] = ""


class CompareCreativesRequest(BaseModel):
    images: List[Dict]  # [{"data": base64, "type": mime_type, "name": str}]


class ReportRequest(BaseModel):
    client_id: str
    client_name: str
    period: str = "últimos 7 días"
    data: Dict


class RecommendationsRequest(BaseModel):
    client_id: str
    data: Dict
    focus_area: str = "all"  # "budget", "creative", "audience", "all"


class AnomalyExplanationRequest(BaseModel):
    anomaly: Dict
    context: Dict


# ==================== ENDPOINTS ====================

@router.get("/status")
async def get_ai_status():
    """
    Check AI service status and configuration.
    """
    return await check_ai_status()


@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Chat with your ad data using AI.
    Returns a streaming response.
    """
    async def stream_response():
        async for chunk in chat_with_data(
            user_message=request.message,
            data_context=request.data_context,
            chat_history=[m.model_dump() for m in request.chat_history] if request.chat_history else [],
            stream=True
        ):
            yield f"data: {json.dumps({'token': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )


@router.post("/chat/sync")
async def chat_sync_endpoint(request: ChatRequest):
    """
    Chat with your ad data using AI (non-streaming version).
    """
    result = ""
    async for chunk in chat_with_data(
        user_message=request.message,
        data_context=request.data_context,
        chat_history=[m.model_dump() for m in request.chat_history] if request.chat_history else [],
        stream=True
    ):
        result += chunk

    return {"response": result}


@router.post("/analyze-creative")
async def analyze_creative_endpoint(request: CreativeAnalysisRequest):
    """
    Analyze an ad creative image using Claude Vision.
    """
    result = await analyze_creative(
        image_data=request.image_base64,
        image_type=request.image_type,
        additional_context=request.context
    )

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    return result


@router.post("/analyze-creative/upload")
async def analyze_creative_upload(
    file: UploadFile = File(...),
    context: str = ""
):
    """
    Upload and analyze an ad creative image.
    """
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Read file
    content = await file.read()

    result = await analyze_creative(
        image_data=content,
        image_type=file.content_type,
        additional_context=context
    )

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    return result


@router.post("/compare-creatives")
async def compare_creatives_endpoint(request: CompareCreativesRequest):
    """
    Compare multiple ad creatives and get recommendations.
    """
    if len(request.images) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 images to compare")

    if len(request.images) > 4:
        raise HTTPException(status_code=400, detail="Maximum 4 images allowed")

    result = await compare_creatives(request.images)

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    return result


@router.post("/generate-report")
async def generate_report_endpoint(request: ReportRequest):
    """
    Generate a natural language executive report.
    """
    report = await generate_executive_report(
        data=request.data,
        client_name=request.client_name,
        period=request.period
    )

    return {
        "report": report,
        "client_name": request.client_name,
        "period": request.period
    }


@router.post("/recommendations")
async def get_recommendations_endpoint(request: RecommendationsRequest):
    """
    Get AI-powered recommendations for optimization.
    """
    recommendations = await generate_recommendations(
        data=request.data,
        focus_area=request.focus_area
    )

    return {
        "recommendations": recommendations,
        "focus_area": request.focus_area
    }


@router.post("/daily-insights")
async def get_daily_insights_endpoint(data: Dict):
    """
    Get daily AI insights for the dashboard.
    """
    insights = await generate_daily_insights(data)
    return insights


@router.post("/explain-anomaly")
async def explain_anomaly_endpoint(request: AnomalyExplanationRequest):
    """
    Get AI explanation for a detected anomaly.
    """
    explanation = await explain_anomaly(
        anomaly=request.anomaly,
        context=request.context
    )

    return {"explanation": explanation}


# ==================== QUICK ACTIONS ====================

@router.post("/quick-analysis")
async def quick_analysis(client_id: str, question: str = "¿Cómo está la cuenta?"):
    """
    Quick AI analysis with a predefined question.
    Common questions:
    - "¿Cómo está la cuenta?"
    - "¿Qué campañas debería pausar?"
    - "¿Dónde debería invertir más?"
    - "¿Hay alguna alerta?"
    """
    # This would normally fetch data from the database
    # For now, return a placeholder
    return {
        "question": question,
        "response": "Para análisis completo, usa el endpoint /chat con datos de la cuenta."
    }


@router.get("/suggested-questions")
async def get_suggested_questions():
    """
    Get suggested questions for the AI chat.
    """
    return {
        "categories": [
            {
                "name": "Performance General",
                "questions": [
                    "¿Cómo está la cuenta en general?",
                    "¿Cuál es el resumen de esta semana?",
                    "¿Hay algún problema que deba atender?"
                ]
            },
            {
                "name": "Optimización",
                "questions": [
                    "¿Qué campañas debería pausar?",
                    "¿Dónde debería aumentar el presupuesto?",
                    "¿Qué creativos están funcionando mejor?"
                ]
            },
            {
                "name": "Análisis",
                "questions": [
                    "¿Por qué subió el CPR esta semana?",
                    "¿Cuáles son los patrones de éxito?",
                    "¿Cómo se compara con el mes pasado?"
                ]
            },
            {
                "name": "Reportes",
                "questions": [
                    "Genera un resumen para el cliente",
                    "¿Cuáles fueron los logros del período?",
                    "¿Qué debería comunicar al cliente?"
                ]
            }
        ]
    }


# ==================== AI MEMORY & LEARNING ====================

class PreferenceUpdate(BaseModel):
    key: str
    value: str
    confidence: float = 0.5


class KnowledgeEntry(BaseModel):
    category: str
    title: str
    content: str
    tags: Optional[List[str]] = None
    source: Optional[str] = None


class FeedbackRequest(BaseModel):
    conversation_id: int
    rating: int  # 1-5
    message_id: Optional[str] = None
    comment: Optional[str] = None


class TrainingExample(BaseModel):
    prompt: str
    completion: str
    category: Optional[str] = None
    quality_score: float = 1.0


@router.get("/memory/history")
async def get_memory_history(
    user_id: str = "default",
    client_id: Optional[str] = None,
    limit: int = 20
):
    """Get conversation history from memory."""
    return get_conversation_history(user_id, client_id, limit)


@router.get("/memory/preferences/{user_id}")
async def get_user_preferences(user_id: str):
    """Get learned preferences for a user."""
    return get_preferences(user_id)


@router.post("/memory/preferences/{user_id}")
async def update_user_preference(user_id: str, pref: PreferenceUpdate):
    """Update a user preference."""
    update_preference(user_id, pref.key, pref.value, pref.confidence)
    return {"success": True}


@router.get("/memory/context")
async def get_ai_context(
    user_id: str = "default",
    client_id: Optional[str] = None,
    query: Optional[str] = None
):
    """Build complete AI context with memory, preferences, and knowledge."""
    return build_ai_context(user_id, client_id, query)


@router.post("/knowledge")
async def add_knowledge_entry(entry: KnowledgeEntry):
    """Add an entry to the knowledge base."""
    entry_id = add_knowledge(
        category=entry.category,
        title=entry.title,
        content=entry.content,
        tags=entry.tags,
        source=entry.source
    )
    return {"id": entry_id}


@router.get("/knowledge/search")
async def search_knowledge_base(
    query: str,
    category: Optional[str] = None,
    limit: int = 5
):
    """Search the knowledge base."""
    return search_knowledge(query, category, limit)


@router.post("/feedback")
async def submit_feedback(feedback: FeedbackRequest):
    """Submit feedback on an AI response."""
    save_feedback(
        conversation_id=feedback.conversation_id,
        rating=feedback.rating,
        message_id=feedback.message_id,
        comment=feedback.comment
    )
    return {"success": True}


@router.post("/training/example")
async def add_training_data(example: TrainingExample):
    """Add a training example for future fine-tuning."""
    add_training_example(
        prompt=example.prompt,
        completion=example.completion,
        category=example.category,
        quality_score=example.quality_score
    )
    return {"success": True}


@router.get("/training/export")
async def export_training(min_quality: float = 0.7):
    """Export training data for fine-tuning."""
    data = export_training_data(min_quality)
    return {
        "format": "openai_messages",
        "count": len(data),
        "data": data
    }


@router.get("/training/stats")
async def training_statistics():
    """Get training data statistics."""
    return get_training_stats()
