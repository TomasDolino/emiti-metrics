"""
AI Service for Emiti Metrics
Powered by Claude API (Anthropic)

Features:
- Chat with your ad data
- Creative analysis with Claude Vision
- Natural language report generation
- Smart recommendations engine
"""
import os
import json
import base64
import httpx
from typing import List, Dict, Optional, AsyncGenerator, Any
from datetime import datetime
import pandas as pd

# Configuration
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = "claude-3-5-sonnet-20241022"
CLAUDE_VISION_MODEL = "claude-3-5-sonnet-20241022"
MAX_TOKENS = 4096


# ==================== SYSTEM PROMPTS ====================

AD_ANALYST_PROMPT = """Eres un experto analista de performance de Meta Ads trabajando para Emiti, una agencia de marketing digital.

Tu rol es analizar datos de campañas publicitarias y proporcionar insights accionables.

DIRECTRICES:
- Sé conciso y directo
- Usa español latinoamericano
- Enfócate en métricas clave: ROAS, CPR (costo por resultado), CTR, frecuencia
- Identifica problemas y oportunidades
- Sugiere acciones específicas con impacto estimado
- Si no tienes suficientes datos, pide más contexto
- Nunca inventes datos - basa todo en lo que te proporcionan

FORMATO DE RESPUESTAS:
- Usa bullet points para listas
- Destaca números importantes
- Incluye emojis para hacer la lectura más ágil (📈 📉 ⚠️ ✅ 💡)
- Termina siempre con 1-3 acciones recomendadas

MÉTRICAS CLAVE A MONITOREAR:
- CPR (Costo por Resultado): Objetivo < $500 ARS generalmente
- CTR: > 1% es bueno, > 2% excelente
- Frecuencia: < 3.5 es saludable, > 4 indica fatiga
- ROAS: > 2x es rentable para la mayoría de negocios"""


CREATIVE_ANALYST_PROMPT = """Eres un experto en análisis de creativos publicitarios para Meta Ads.

Analiza la imagen/video y proporciona:

1. **COMPOSICIÓN VISUAL**
   - Jerarquía visual (qué llama la atención primero)
   - Uso del espacio y balance
   - Colores dominantes y su impacto emocional

2. **ELEMENTOS DE MARCA**
   - Visibilidad del logo/marca
   - Consistencia con branding
   - Profesionalismo percibido

3. **COPY Y CTA**
   - Claridad del mensaje
   - Fuerza del hook (primeras palabras)
   - Efectividad del CTA

4. **PREDICCIÓN DE PERFORMANCE**
   - Score estimado (1-100)
   - Fortalezas principales
   - Áreas de mejora

5. **RECOMENDACIONES**
   - 3 mejoras específicas para aumentar conversiones

Responde en español, sé directo y accionable."""


REPORT_GENERATOR_PROMPT = """Eres un experto en comunicación de marketing que genera reportes para clientes.

Genera un resumen ejecutivo profesional basado en los datos proporcionados.

ESTRUCTURA:
1. **Resumen Ejecutivo** (2-3 oraciones)
2. **Métricas Destacadas** (los números más importantes)
3. **Logros del Período**
4. **Áreas de Atención**
5. **Próximos Pasos Recomendados**

TONO:
- Profesional pero accesible
- Optimista pero honesto
- Enfocado en el valor generado
- Orientado a la acción

Usa formato Markdown. Mantén el reporte conciso (máximo 500 palabras)."""


RECOMMENDATIONS_PROMPT = """Eres un estratega de paid media experto en optimización de campañas.

Basándote en los datos proporcionados, genera recomendaciones específicas y priorizadas.

CATEGORÍAS DE RECOMENDACIONES:
1. **Budget** - Reasignación de presupuesto entre campañas
2. **Creativos** - Qué pausar, escalar, o testear
3. **Audiencias** - Expansiones o restricciones
4. **Estructura** - Cambios en campañas/adsets

PARA CADA RECOMENDACIÓN INCLUYE:
- Acción específica
- Impacto estimado (alto/medio/bajo)
- Esfuerzo requerido (alto/medio/bajo)
- Prioridad (1-5, siendo 1 la más urgente)

Ordena las recomendaciones por prioridad. Máximo 5 recomendaciones."""


# ==================== CORE API FUNCTIONS ====================

async def call_claude_api_stream(
    messages: List[Dict],
    system: str = AD_ANALYST_PROMPT,
    model: str = CLAUDE_MODEL,
    max_tokens: int = MAX_TOKENS
) -> AsyncGenerator[str, None]:
    """
    Call Claude API with streaming response.
    """
    if not ANTHROPIC_API_KEY:
        yield "Error: ANTHROPIC_API_KEY no configurada. Configura la variable de entorno."
        return

    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }

    payload = {
        "model": model,
        "max_tokens": max_tokens,
        "system": system,
        "messages": messages,
        "stream": True
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json=payload
        ) as response:
            if response.status_code != 200:
                error_text = await response.aread()
                yield f"Error: {response.status_code} - {error_text.decode()}"
                return

            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    try:
                        data = json.loads(line[6:])
                        if data.get("type") == "content_block_delta":
                            delta = data.get("delta", {})
                            if "text" in delta:
                                yield delta["text"]
                    except json.JSONDecodeError:
                        continue


async def call_claude_api(
    messages: List[Dict],
    system: str = AD_ANALYST_PROMPT,
    model: str = CLAUDE_MODEL,
    max_tokens: int = MAX_TOKENS
) -> Dict:
    """
    Call Claude API (non-streaming version).
    For streaming, use call_claude_api_stream directly.
    """
    if not ANTHROPIC_API_KEY:
        return {"error": "ANTHROPIC_API_KEY not configured"}

    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }

    payload = {
        "model": model,
        "max_tokens": max_tokens,
        "system": system,
        "messages": messages
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json=payload
        )

        if response.status_code != 200:
            return {"error": f"API error: {response.status_code}", "details": response.text}

        result = response.json()
        return {
            "content": result.get("content", [{}])[0].get("text", ""),
            "usage": result.get("usage", {})
        }


# ==================== CHAT FUNCTIONS ====================

async def chat_with_data(
    user_message: str,
    data_context: Dict,
    chat_history: List[Dict] = None,
    stream: bool = True
) -> AsyncGenerator[str, None] | Dict:
    """
    Chat with ad data using Claude.

    Args:
        user_message: User's question
        data_context: Dict with metrics, campaigns, alerts, etc.
        chat_history: Previous messages in conversation
        stream: Whether to stream the response
    """
    # Build context from data
    context_parts = []

    if "metrics" in data_context:
        metrics = data_context["metrics"]
        context_parts.append(f"""
MÉTRICAS ACTUALES:
- Gasto total: ${metrics.get('total_spend', 0):,.0f}
- Resultados: {metrics.get('total_results', 0):,}
- CPR promedio: ${metrics.get('avg_cpr', 0):,.2f}
- CTR promedio: {metrics.get('avg_ctr', 0):.2f}%
- Impresiones: {metrics.get('total_impressions', 0):,}
""")

    if "top_campaigns" in data_context:
        campaigns_text = "\n".join([
            f"- {c['name']}: ${c['spend']:,.0f} gastado, {c['results']} resultados, CPR ${c['cpr']:,.2f}"
            for c in data_context["top_campaigns"][:5]
        ])
        context_parts.append(f"TOP CAMPAÑAS:\n{campaigns_text}")

    if "alerts" in data_context and data_context["alerts"]:
        alerts_text = "\n".join([f"- ⚠️ {a['message']}" for a in data_context["alerts"][:3]])
        context_parts.append(f"ALERTAS ACTIVAS:\n{alerts_text}")

    if "patterns" in data_context and data_context["patterns"]:
        patterns_text = "\n".join([f"- {p['pattern']}: {p['impact']}" for p in data_context["patterns"][:3]])
        context_parts.append(f"PATRONES DETECTADOS:\n{patterns_text}")

    context_message = "\n\n".join(context_parts) if context_parts else "Sin datos disponibles."

    # Build messages
    messages = []

    # Add chat history (compressed if too long)
    if chat_history:
        # Keep last 5 messages to manage context
        for msg in chat_history[-5:]:
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })

    # Add current message with context
    messages.append({
        "role": "user",
        "content": f"""DATOS DE LA CUENTA:
{context_message}

PREGUNTA DEL USUARIO:
{user_message}"""
    })

    if stream:
        async for chunk in call_claude_api_stream(messages, system=AD_ANALYST_PROMPT):
            yield chunk
    else:
        result = await call_claude_api(messages, system=AD_ANALYST_PROMPT)
        yield result.get("content", "")


# ==================== CREATIVE ANALYSIS ====================

async def analyze_creative(
    image_data: str | bytes,
    image_type: str = "image/jpeg",
    additional_context: str = ""
) -> Dict:
    """
    Analyze an ad creative using Claude Vision.

    Args:
        image_data: Base64 encoded image or raw bytes
        image_type: MIME type of the image
        additional_context: Additional info about the ad (campaign, audience, etc.)
    """
    # Convert bytes to base64 if needed
    if isinstance(image_data, bytes):
        image_b64 = base64.b64encode(image_data).decode("utf-8")
    else:
        image_b64 = image_data

    messages = [{
        "role": "user",
        "content": [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": image_type,
                    "data": image_b64
                }
            },
            {
                "type": "text",
                "text": f"""Analiza este creativo publicitario.

{f'CONTEXTO ADICIONAL: {additional_context}' if additional_context else ''}

Proporciona un análisis completo siguiendo las directrices del sistema."""
            }
        ]
    }]

    result = await call_claude_api(
        messages,
        system=CREATIVE_ANALYST_PROMPT,
        model=CLAUDE_VISION_MODEL,
    )

    if "error" in result:
        return result

    # Parse the response and extract score
    content = result.get("content", "")

    # Try to extract score from response
    score = 70  # Default score
    if "score" in content.lower():
        import re
        score_match = re.search(r'(\d{1,3})\s*[/de]{0,2}\s*100', content)
        if score_match:
            score = int(score_match.group(1))

    return {
        "analysis": content,
        "score": min(100, max(0, score)),
        "timestamp": datetime.now().isoformat(),
        "usage": result.get("usage", {})
    }


async def compare_creatives(
    images: List[Dict],  # List of {"data": base64, "type": mime_type, "name": str}
) -> Dict:
    """
    Compare multiple ad creatives and recommend the best one.
    """
    if len(images) < 2:
        return {"error": "Need at least 2 images to compare"}

    image_content = []
    for i, img in enumerate(images[:4]):  # Max 4 images
        image_content.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": img.get("type", "image/jpeg"),
                "data": img["data"]
            }
        })

    image_content.append({
        "type": "text",
        "text": f"""Compara estos {len(images)} creativos publicitarios.

Para cada uno:
1. Identifica fortalezas y debilidades
2. Asigna un score de 0-100
3. Predice cuál tendrá mejor CTR y por qué

Al final, indica:
- GANADOR: El mejor creativo y por qué
- RECOMENDACIÓN: Cómo mejorar cada uno"""
    })

    messages = [{"role": "user", "content": image_content}]

    result = await call_claude_api(
        messages,
        system=CREATIVE_ANALYST_PROMPT,
        model=CLAUDE_VISION_MODEL,
    )

    return {
        "comparison": result.get("content", ""),
        "timestamp": datetime.now().isoformat()
    }


# ==================== REPORT GENERATION ====================

async def generate_executive_report(
    data: Dict,
    client_name: str,
    period: str = "últimos 7 días"
) -> str:
    """
    Generate a natural language executive report.
    """
    # Build comprehensive data summary
    data_summary = f"""
CLIENTE: {client_name}
PERÍODO: {period}

MÉTRICAS PRINCIPALES:
- Inversión total: ${data.get('total_spend', 0):,.0f}
- Resultados generados: {data.get('total_results', 0):,}
- CPR (Costo por Resultado): ${data.get('avg_cpr', 0):,.2f}
- CTR promedio: {data.get('avg_ctr', 0):.2f}%
- Impresiones totales: {data.get('total_impressions', 0):,}

COMPARACIÓN VS PERÍODO ANTERIOR:
- Resultados: {data.get('results_change', 0):+.1f}%
- CPR: {data.get('cpr_change', 0):+.1f}%
- Gasto: {data.get('spend_change', 0):+.1f}%
"""

    if data.get("top_campaigns"):
        campaigns = "\n".join([
            f"- {c['name']}: {c['results']} resultados (CPR ${c['cpr']:,.0f})"
            for c in data["top_campaigns"][:3]
        ])
        data_summary += f"\nTOP CAMPAÑAS:\n{campaigns}"

    if data.get("top_ads"):
        ads = "\n".join([
            f"- {a['name']}: {a['classification']} ({a['results']} resultados)"
            for a in data["top_ads"][:3]
        ])
        data_summary += f"\nTOP ANUNCIOS:\n{ads}"

    if data.get("patterns"):
        patterns = "\n".join([f"- {p['pattern']}: {p['impact']}" for p in data["patterns"][:3]])
        data_summary += f"\nPATRONES DETECTADOS:\n{patterns}"

    if data.get("alerts"):
        alerts = "\n".join([f"- {a['message']}" for a in data["alerts"][:3]])
        data_summary += f"\nALERTAS:\n{alerts}"

    messages = [{
        "role": "user",
        "content": f"""Genera un reporte ejecutivo para el cliente basándote en estos datos:

{data_summary}

El reporte debe ser profesional, destacar los logros, y terminar con próximos pasos claros."""
    }]

    result = await call_claude_api(
        messages,
        system=REPORT_GENERATOR_PROMPT,
    )

    return result.get("content", "Error generando reporte")


# ==================== RECOMMENDATIONS ENGINE ====================

async def generate_recommendations(
    data: Dict,
    focus_area: str = "all"  # "budget", "creative", "audience", "all"
) -> List[Dict]:
    """
    Generate prioritized AI recommendations.
    """
    data_summary = json.dumps(data, indent=2, default=str, ensure_ascii=False)

    focus_instruction = ""
    if focus_area != "all":
        focus_instruction = f"\nENFOCATE PRINCIPALMENTE EN RECOMENDACIONES DE: {focus_area.upper()}"

    messages = [{
        "role": "user",
        "content": f"""Analiza estos datos de campañas y genera recomendaciones priorizadas:

{data_summary}
{focus_instruction}

Responde en formato JSON con esta estructura:
{{
  "recommendations": [
    {{
      "id": 1,
      "category": "budget|creative|audience|structure",
      "action": "Acción específica a tomar",
      "reason": "Por qué esta recomendación",
      "impact": "alto|medio|bajo",
      "effort": "alto|medio|bajo",
      "priority": 1-5,
      "estimated_improvement": "+X% en métrica"
    }}
  ],
  "summary": "Resumen de 1 oración de las prioridades"
}}"""
    }]

    result = await call_claude_api(
        messages,
        system=RECOMMENDATIONS_PROMPT,
    )

    content = result.get("content", "{}")

    # Try to parse JSON from response
    try:
        # Find JSON in response
        import re
        json_match = re.search(r'\{[\s\S]*\}', content)
        if json_match:
            parsed = json.loads(json_match.group())
            return parsed.get("recommendations", [])
    except (json.JSONDecodeError, AttributeError):
        pass

    # Fallback: return raw content as single recommendation
    return [{
        "id": 1,
        "category": "general",
        "action": content[:500] if content else "No se pudieron generar recomendaciones",
        "impact": "medio",
        "effort": "medio",
        "priority": 3
    }]


# ==================== DAILY INSIGHTS ====================

async def generate_daily_insights(data: Dict) -> Dict:
    """
    Generate daily AI insights for the dashboard.
    """
    messages = [{
        "role": "user",
        "content": f"""Basándote en estos datos de ayer, genera 3 insights breves y accionables:

{json.dumps(data, indent=2, default=str, ensure_ascii=False)}

Responde en JSON:
{{
  "greeting": "Frase corta de buenos días/tardes con el status general",
  "insights": [
    {{
      "type": "positive|warning|info",
      "title": "Título corto (máx 50 chars)",
      "detail": "Detalle con número específico",
      "action": "Qué hacer al respecto"
    }}
  ],
  "top_priority": "La acción más importante para hoy"
}}"""
    }]

    result = await call_claude_api(
        messages,
        system=AD_ANALYST_PROMPT,
        max_tokens=1024,
    )

    content = result.get("content", "{}")

    try:
        import re
        json_match = re.search(r'\{[\s\S]*\}', content)
        if json_match:
            return json.loads(json_match.group())
    except (json.JSONDecodeError, AttributeError):
        pass

    return {
        "greeting": "Buenos días! Todo funcionando normalmente.",
        "insights": [],
        "top_priority": "Revisar el dashboard para más detalles"
    }


# ==================== ANOMALY EXPLANATION ====================

async def explain_anomaly(
    anomaly: Dict,
    context: Dict
) -> str:
    """
    Get AI explanation for a detected anomaly.
    """
    messages = [{
        "role": "user",
        "content": f"""Se detectó esta anomalía:

{json.dumps(anomaly, indent=2, default=str, ensure_ascii=False)}

Contexto de la cuenta:
{json.dumps(context, indent=2, default=str, ensure_ascii=False)}

Explica en 2-3 oraciones:
1. Por qué probablemente ocurrió
2. Si requiere acción y cuál"""
    }]

    result = await call_claude_api(
        messages,
        system=AD_ANALYST_PROMPT,
        max_tokens=256,
    )

    return result.get("content", "No se pudo analizar la anomalía")


# ==================== HEALTH CHECK ====================

async def check_ai_status() -> Dict:
    """
    Check if AI service is properly configured and working.
    """
    if not ANTHROPIC_API_KEY:
        return {
            "status": "not_configured",
            "message": "ANTHROPIC_API_KEY no está configurada"
        }

    try:
        result = await call_claude_api(
            [{"role": "user", "content": "Di 'OK' si funciona"}],
            system="Responde solo 'OK'",
            max_tokens=10,
            )

        if "error" in result:
            return {
                "status": "error",
                "message": result["error"]
            }

        return {
            "status": "operational",
            "message": "AI service funcionando correctamente",
            "model": CLAUDE_MODEL
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
