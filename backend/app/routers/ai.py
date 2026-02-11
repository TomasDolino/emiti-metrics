"""
AI Router for Emiti Metrics
Endpoints for AI-powered features with memory and learning
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Request, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
import json
import os

from slowapi import Limiter
from slowapi.util import get_remote_address

from ..auth import get_current_user
from ..database import UserDB

# CRM API Key for cross-service auth
CRM_API_KEY = os.getenv("CRM_API_KEY", "")


async def verify_crm_api_key(x_crm_api_key: str = Header(alias="X-CRM-API-Key")):
    """Validate CRM API key for cross-service endpoints."""
    if not CRM_API_KEY:
        raise HTTPException(status_code=500, detail="CRM_API_KEY not configured on server")
    if x_crm_api_key != CRM_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid CRM API key")
    return x_crm_api_key

# Rate limiter - uses remote address as key
def get_rate_limit_key(request: Request) -> str:
    """Get rate limit key - user_id if authenticated, otherwise IP."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return f"user:{auth_header[:50]}"
    return get_remote_address(request)

limiter = Limiter(key_func=get_rate_limit_key)

from ..services.ai_service import (
    chat_with_data,
    chat_crm,
    analyze_creative,
    compare_creatives,
    generate_executive_report,
    generate_recommendations,
    generate_daily_insights,
    explain_anomaly,
    check_ai_status,
    detect_anomalies,
    analyze_anomalies_with_ai,
    generate_weekly_digest,
    get_contextual_suggestions,
    get_model_usage_stats,
    select_model,
    select_model_smart,
    CLAUDE_OPUS,
    CLAUDE_SONNET,
    CLAUDE_HAIKU
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
    analysis_type: str = "full"  # 'visual', 'copy', or 'full'


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
async def get_ai_status(current_user: UserDB = Depends(get_current_user)):
    """
    Check AI service status and configuration.
    """
    return await check_ai_status()


@router.get("/model-routing/stats")
async def get_routing_stats(current_user: UserDB = Depends(get_current_user)):
    """
    Get smart model routing usage statistics.
    Shows how often each model (Opus vs Sonnet) is being used.
    """
    return get_model_usage_stats()


@router.get("/model-routing/preview")
async def preview_model_selection(task_type: str, query: str = "", use_haiku: bool = False):
    """
    Preview which model would be selected for a given task/query.
    Useful for debugging the routing logic.

    Args:
        task_type: Type of task (chat, executive_report, etc.)
        query: Sample query text
        use_haiku: If true, uses Haiku to classify ambiguous queries (adds ~200ms)
    """
    if use_haiku and query:
        model, max_tokens = await select_model_smart(task_type, query, use_haiku=True)
        routing_method = "smart (with Haiku classification)"
    else:
        model, max_tokens = select_model(task_type, query)
        routing_method = "rule-based"

    # Determine the reason
    opus_tasks = ["executive_report", "weekly_digest", "strategic_recommendations", "anomaly_explanation", "compare_creatives"]
    if task_type in opus_tasks:
        reason = "OPUS_TASKS list (always Opus)"
    elif "opus" in model:
        reason = "Query complexity analysis → Complex"
    else:
        reason = "Default fast routing → Sonnet"

    return {
        "task_type": task_type,
        "query_preview": query[:100] + "..." if len(query) > 100 else query,
        "selected_model": model,
        "model_name": "Opus 4.5" if "opus" in model else "Sonnet 4" if "sonnet" in model else "Haiku 4.5",
        "max_tokens": max_tokens,
        "is_opus": "opus" in model,
        "routing_method": routing_method,
        "reason": reason
    }


@router.post("/model-routing/test")
async def test_smart_routing(queries: List[str]):
    """
    Test smart routing with multiple queries to see classification results.
    Returns which model each query would use.
    """
    results = []
    for query in queries[:10]:  # Max 10 queries
        model, _ = await select_model_smart("chat", query, use_haiku=True)
        results.append({
            "query": query[:80] + "..." if len(query) > 80 else query,
            "model": "Opus" if "opus" in model else "Sonnet",
            "is_opus": "opus" in model
        })

    opus_count = sum(1 for r in results if r["is_opus"])
    return {
        "results": results,
        "summary": {
            "total": len(results),
            "opus": opus_count,
            "sonnet": len(results) - opus_count,
            "opus_percentage": round(opus_count / len(results) * 100, 1) if results else 0
        }
    }


@router.post("/chat")
@limiter.limit("20/minute")
async def chat_endpoint(request: Request, chat_request: ChatRequest, current_user: UserDB = Depends(get_current_user)):
    """
    Chat with your ad data using AI.
    Returns a streaming response.
    """
    async def stream_response():
        async for chunk in chat_with_data(
            user_message=chat_request.message,
            data_context=chat_request.data_context,
            chat_history=[m.model_dump() for m in chat_request.chat_history] if chat_request.chat_history else [],
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
@limiter.limit("20/minute")
async def chat_sync_endpoint(request: Request, chat_request: ChatRequest, current_user: UserDB = Depends(get_current_user)):
    """
    Chat with your ad data using AI (non-streaming version).
    """
    result = ""
    async for chunk in chat_with_data(
        user_message=chat_request.message,
        data_context=chat_request.data_context,
        chat_history=[m.model_dump() for m in chat_request.chat_history] if chat_request.chat_history else [],
        stream=True
    ):
        result += chunk

    return {"response": result}


class CRMChatRequest(BaseModel):
    message: str
    data_context: Optional[Dict] = {}
    chat_history: Optional[List[ChatMessage]] = []
    user_id: Optional[str] = "crm_default"
    session_id: Optional[str] = None


class CRMFeedbackRequest(BaseModel):
    message_id: str
    rating: int  # 1-5
    user_id: Optional[str] = "crm_default"
    original_query: Optional[str] = None
    response: Optional[str] = None


@router.post("/chat/crm")
async def chat_crm_endpoint(request: CRMChatRequest, _api_key: str = Depends(verify_crm_api_key)):
    """
    Chat for CRM Grupo Albisu with persistent memory.
    Requires CRM API key via X-CRM-API-Key header.

    Features:
    - Persistent conversation history per user
    - Knowledge base search for relevant context
    - Learning from feedback over time
    """
    response, conversation_id = await chat_crm(
        user_message=request.message,
        data_context=request.data_context or {},
        chat_history=[m.model_dump() for m in request.chat_history] if request.chat_history else [],
        user_id=request.user_id or "crm_default"
    )

    return {
        "response": response,
        "conversation_id": conversation_id,
        "memory_enabled": True
    }


@router.post("/chat/crm/feedback")
async def crm_chat_feedback(request: CRMFeedbackRequest, _api_key: str = Depends(verify_crm_api_key)):
    """
    Submit feedback on CRM AI response.
    Requires CRM API key via X-CRM-API-Key header.
    """
    # Save feedback
    save_feedback(
        conversation_id=int(request.message_id) if request.message_id.isdigit() else 0,
        rating=request.rating,
        message_id=request.message_id,
        comment=f"Query: {request.original_query}" if request.original_query else None
    )

    # If rating is 4-5 (good), save as training example
    if request.rating >= 4 and request.original_query and request.response:
        add_training_example(
            prompt=request.original_query,
            completion=request.response,
            category="crm_chat",
            quality_score=request.rating / 5.0
        )

    return {"success": True, "message": "Feedback recorded"}


@router.post("/analyze-creative")
@limiter.limit("10/minute")
async def analyze_creative_endpoint(request: Request, creative_request: CreativeAnalysisRequest, current_user: UserDB = Depends(get_current_user)):
    """
    Analyze an ad creative image using Claude Vision.
    Supports: 'visual' (design only), 'copy' (text/SEO), or 'full' (both).
    """
    result = await analyze_creative(
        image_data=creative_request.image_base64,
        image_type=creative_request.image_type,
        additional_context=creative_request.context,
        analysis_type=creative_request.analysis_type
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
@limiter.limit("10/minute")
async def compare_creatives_endpoint(request: Request, compare_request: CompareCreativesRequest, current_user: UserDB = Depends(get_current_user)):
    """
    Compare multiple ad creatives and get recommendations.
    """
    if len(compare_request.images) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 images to compare")

    if len(compare_request.images) > 4:
        raise HTTPException(status_code=400, detail="Maximum 4 images allowed")

    result = await compare_creatives(compare_request.images)

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    return result


@router.post("/generate-report")
@limiter.limit("10/minute")
async def generate_report_endpoint(request: Request, report_request: ReportRequest, current_user: UserDB = Depends(get_current_user)):
    """
    Generate a natural language executive report.
    """
    report = await generate_executive_report(
        data=report_request.data,
        client_name=report_request.client_name,
        period=report_request.period
    )

    return {
        "report": report,
        "client_name": report_request.client_name,
        "period": report_request.period
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
async def get_user_preferences(user_id: str, current_user: UserDB = Depends(get_current_user)):
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
async def training_statistics(current_user: UserDB = Depends(get_current_user)):
    """Get training data statistics."""
    return get_training_stats()


# ==================== ADVANCED AI FEATURES ====================

class AnomalyDetectionRequest(BaseModel):
    metrics_history: List[Dict]
    threshold: float = 2.0


class WeeklyDigestRequest(BaseModel):
    client_id: str
    client_name: str
    weekly_data: Dict
    previous_week_data: Optional[Dict] = None


class ContextualSuggestionsRequest(BaseModel):
    page: str
    data: Optional[Dict] = None


@router.post("/detect-anomalies")
@limiter.limit("10/minute")
async def detect_anomalies_endpoint(
    request: Request,
    anomaly_request: AnomalyDetectionRequest,
    current_user: UserDB = Depends(get_current_user)
):
    """
    Detect statistical anomalies in metrics data.
    Uses Z-score method to identify unusual values.
    """
    anomalies = detect_anomalies(
        metrics_history=anomaly_request.metrics_history,
        threshold=anomaly_request.threshold
    )

    return {
        "anomalies": anomalies,
        "count": len(anomalies),
        "threshold_used": anomaly_request.threshold
    }


@router.post("/detect-anomalies/explain")
@limiter.limit("10/minute")
async def explain_anomalies_endpoint(
    request: Request,
    anomaly_request: AnomalyDetectionRequest,
    current_user: UserDB = Depends(get_current_user)
):
    """
    Detect anomalies and get AI explanation for them.
    """
    anomalies = detect_anomalies(
        metrics_history=anomaly_request.metrics_history,
        threshold=anomaly_request.threshold
    )

    if not anomalies:
        return {
            "anomalies": [],
            "explanation": "No se detectaron anomalías significativas en los datos.",
            "count": 0
        }

    # Get context from the latest metrics
    context = anomaly_request.metrics_history[-1] if anomaly_request.metrics_history else {}

    explanation = await analyze_anomalies_with_ai(anomalies, context)

    return {
        "anomalies": anomalies,
        "explanation": explanation,
        "count": len(anomalies)
    }


@router.post("/weekly-digest")
@limiter.limit("10/minute")
async def weekly_digest_endpoint(
    request: Request,
    digest_request: WeeklyDigestRequest,
    current_user: UserDB = Depends(get_current_user)
):
    """
    Generate a comprehensive weekly digest with AI insights.
    Perfect for client reports and emails.
    """
    digest = await generate_weekly_digest(
        client_id=digest_request.client_id,
        client_name=digest_request.client_name,
        weekly_data=digest_request.weekly_data,
        previous_week_data=digest_request.previous_week_data
    )

    return digest


@router.post("/suggestions")
async def get_suggestions_endpoint(request: ContextualSuggestionsRequest):
    """
    Get smart contextual suggestions based on current page and data.
    Returns relevant questions/prompts for the AI chat.
    """
    suggestions = get_contextual_suggestions(
        page=request.page,
        data=request.data
    )

    return {
        "suggestions": suggestions,
        "page": request.page
    }


@router.get("/suggestions/{page}")
async def get_page_suggestions(page: str):
    """
    Quick endpoint to get suggestions for a specific page.
    """
    suggestions = get_contextual_suggestions(page=page)
    return {"suggestions": suggestions, "page": page}
