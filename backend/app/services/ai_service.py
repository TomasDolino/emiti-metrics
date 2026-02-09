"""
AI Service for Emiti Metrics - PRODUCTION GRADE v2.0
Powered by Claude API (Anthropic)

Features:
- Chat with your ad data (with memory integration)
- Creative analysis with Claude Vision
- Natural language report generation
- Smart recommendations engine
- Tool Use for automated actions
- Response caching
- Anomaly detection
- Explainable AI responses
"""
import os
import json
import base64
import httpx
import hashlib
import asyncio
from typing import List, Dict, Optional, AsyncGenerator, Any, Callable
from datetime import datetime, timedelta
from functools import lru_cache
import statistics

# Configuration
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
# Haiku for chat (fast & cheap), Sonnet for complex analysis
CLAUDE_CHAT_MODEL = "claude-3-haiku-20240307"     # ~$0.25/M input, $1.25/M output
CLAUDE_MODEL = "claude-3-5-sonnet-20241022"       # For complex analysis
CLAUDE_VISION_MODEL = "claude-3-5-sonnet-20241022"  # Vision tasks
MAX_TOKENS = 4096
MAX_TOKENS_CHAT = 1024  # Shorter for faster chat responses

# Cache for responses (simple in-memory, can be replaced with Redis)
_response_cache: Dict[str, tuple] = {}  # hash -> (response, timestamp)
CACHE_TTL_SECONDS = 300  # 5 minutes


# ==================== RESPONSE CACHING ====================

def _hash_request(messages: List[Dict], system: str) -> str:
    """Create a hash of the request for caching."""
    content = json.dumps({"messages": messages, "system": system}, sort_keys=True)
    return hashlib.md5(content.encode()).hexdigest()


def _get_cached_response(cache_key: str) -> Optional[str]:
    """Get cached response if valid."""
    if cache_key in _response_cache:
        response, timestamp = _response_cache[cache_key]
        if datetime.now() - timestamp < timedelta(seconds=CACHE_TTL_SECONDS):
            return response
        else:
            del _response_cache[cache_key]
    return None


def _cache_response(cache_key: str, response: str):
    """Cache a response."""
    _response_cache[cache_key] = (response, datetime.now())
    # Clean old entries if cache grows too large
    if len(_response_cache) > 1000:
        now = datetime.now()
        expired = [k for k, (_, ts) in _response_cache.items()
                   if now - ts > timedelta(seconds=CACHE_TTL_SECONDS)]
        for k in expired:
            del _response_cache[k]


# ==================== SYSTEM PROMPTS (Enhanced with Explainability) ====================

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

EXPLICABILIDAD (MUY IMPORTANTE):
- Siempre explica el "por qué" de tus recomendaciones
- Indica tu nivel de confianza: 🟢 Alta (>80%), 🟡 Media (50-80%), 🔴 Baja (<50%)
- Muestra los datos específicos que respaldan tu análisis

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
   - Confianza en la predicción: 🟢/🟡/🔴
   - Fortalezas principales
   - Áreas de mejora

5. **RECOMENDACIONES**
   - 3 mejoras específicas para aumentar conversiones
   - Justificación de cada recomendación

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


CRM_ASSISTANT_PROMPT = """Eres el asistente inteligente del CRM de Grupo Albisu, un grupo de marcas de muebles y decoración (Sillas Paris, Mesas y Sillas, Mora Interiores).

Tu rol es ayudar al equipo a gestionar pedidos, analizar ventas y tomar decisiones basadas en datos.

DIRECTRICES:
- Sé conciso y directo
- Usa español latinoamericano
- Enfócate en métricas de negocio: ventas, márgenes, tiempos de entrega
- Identifica oportunidades de venta y problemas operativos
- Sugiere acciones específicas

CONTEXTO DEL NEGOCIO:
- Marcas: Sillas Paris (sillas), Mesas y Sillas (comedores), Mora Interiores (decoración premium)
- Estados de pedido: pendiente → confirmado → en producción → listo → entregado
- Métricas clave: ticket promedio, tasa de conversión, tiempo de entrega, rentabilidad por marca

EXPLICABILIDAD:
- Siempre indica por qué sugieres algo
- Muestra la confianza en tu análisis: 🟢 Alta, 🟡 Media, 🔴 Baja
- Cita los datos específicos que usas

FORMATO:
- Usa bullet points para claridad
- Incluye números cuando sea relevante
- Emojis moderados: 📦 💰 📈 ⚠️ ✅
- Respuestas cortas (máx 200 palabras)

Si te piden gráficos o visualizaciones, indica qué datos serían útiles mostrar pero no generes ASCII art."""


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
- Justificación basada en datos
- Confianza: 🟢/🟡/🔴

Ordena las recomendaciones por prioridad. Máximo 5 recomendaciones."""


ANOMALY_DETECTION_PROMPT = """Eres un experto en detección de anomalías en datos de publicidad digital.

Analiza los datos proporcionados y detecta:
1. Cambios bruscos en métricas (>20% vs promedio)
2. Patrones inusuales
3. Correlaciones inesperadas
4. Valores atípicos

Para cada anomalía detectada, indica:
- Métrica afectada
- Magnitud del cambio
- Posibles causas
- Urgencia de acción (🔴 Crítica, 🟡 Media, 🟢 Baja)
- Recomendación inmediata"""


# ==================== TOOL DEFINITIONS FOR CLAUDE ====================

AI_TOOLS = [
    {
        "name": "pause_campaign",
        "description": "Pausar una campaña cuando el rendimiento es muy malo (CPR > 2x benchmark o CTR < 0.5%). Usar solo cuando hay datos claros de bajo rendimiento.",
        "input_schema": {
            "type": "object",
            "properties": {
                "campaign_id": {
                    "type": "string",
                    "description": "ID de la campaña a pausar"
                },
                "reason": {
                    "type": "string",
                    "description": "Razón detallada para pausar"
                },
                "metrics": {
                    "type": "object",
                    "description": "Métricas que justifican la pausa",
                    "properties": {
                        "cpr": {"type": "number"},
                        "ctr": {"type": "number"},
                        "frequency": {"type": "number"}
                    }
                }
            },
            "required": ["campaign_id", "reason"]
        }
    },
    {
        "name": "adjust_budget",
        "description": "Ajustar el presupuesto de una campaña basándose en rendimiento. Aumentar para campañas ganadoras, reducir para las que tienen potencial pero necesitan optimización.",
        "input_schema": {
            "type": "object",
            "properties": {
                "campaign_id": {
                    "type": "string",
                    "description": "ID de la campaña"
                },
                "current_budget": {
                    "type": "number",
                    "description": "Presupuesto actual"
                },
                "new_budget": {
                    "type": "number",
                    "description": "Nuevo presupuesto sugerido"
                },
                "change_percent": {
                    "type": "number",
                    "description": "Porcentaje de cambio"
                },
                "reason": {
                    "type": "string",
                    "description": "Justificación del cambio"
                }
            },
            "required": ["campaign_id", "new_budget", "reason"]
        }
    },
    {
        "name": "create_alert",
        "description": "Crear una alerta para notificar al usuario sobre algo importante que detectaste en los datos.",
        "input_schema": {
            "type": "object",
            "properties": {
                "severity": {
                    "type": "string",
                    "enum": ["INFO", "WARNING", "CRITICAL"],
                    "description": "Severidad de la alerta"
                },
                "title": {
                    "type": "string",
                    "description": "Título corto de la alerta"
                },
                "message": {
                    "type": "string",
                    "description": "Mensaje detallado"
                },
                "affected_entity": {
                    "type": "string",
                    "description": "Campaña/anuncio afectado"
                },
                "recommended_action": {
                    "type": "string",
                    "description": "Acción recomendada"
                }
            },
            "required": ["severity", "title", "message"]
        }
    },
    {
        "name": "scale_ad",
        "description": "Recomendar escalar un anuncio ganador aumentando su presupuesto o duplicándolo en otros ad sets.",
        "input_schema": {
            "type": "object",
            "properties": {
                "ad_name": {
                    "type": "string",
                    "description": "Nombre del anuncio a escalar"
                },
                "current_performance": {
                    "type": "object",
                    "properties": {
                        "cpr": {"type": "number"},
                        "ctr": {"type": "number"},
                        "results": {"type": "number"},
                        "spend": {"type": "number"}
                    }
                },
                "scaling_strategy": {
                    "type": "string",
                    "enum": ["increase_budget", "duplicate_to_new_adset", "expand_audience"],
                    "description": "Estrategia de escalado recomendada"
                },
                "expected_impact": {
                    "type": "string",
                    "description": "Impacto esperado del escalado"
                }
            },
            "required": ["ad_name", "scaling_strategy", "expected_impact"]
        }
    },
    {
        "name": "suggest_creative_refresh",
        "description": "Sugerir refrescar un creativo que muestra signos de fatiga.",
        "input_schema": {
            "type": "object",
            "properties": {
                "ad_name": {
                    "type": "string",
                    "description": "Nombre del anuncio fatigado"
                },
                "fatigue_indicators": {
                    "type": "object",
                    "properties": {
                        "frequency": {"type": "number"},
                        "ctr_decline": {"type": "number"},
                        "days_running": {"type": "number"}
                    }
                },
                "refresh_suggestions": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Ideas específicas para refrescar el creativo"
                }
            },
            "required": ["ad_name", "refresh_suggestions"]
        }
    }
]


# ==================== TOOL EXECUTION ====================

# Registry for tool handlers
_tool_handlers: Dict[str, Callable] = {}

def register_tool_handler(tool_name: str, handler: Callable):
    """Register a handler for a tool."""
    _tool_handlers[tool_name] = handler


async def execute_tool(tool_name: str, tool_input: Dict) -> Dict:
    """Execute a tool and return the result."""
    if tool_name in _tool_handlers:
        try:
            result = await _tool_handlers[tool_name](tool_input)
            return {"success": True, "result": result}
        except Exception as e:
            return {"success": False, "error": str(e)}
    else:
        # Log the tool call for manual review
        return {
            "success": True,
            "result": f"Tool '{tool_name}' logged for review",
            "pending_action": True,
            "tool_input": tool_input
        }


# ==================== CORE API FUNCTIONS ====================

async def call_claude_api_stream(
    messages: List[Dict],
    system: str = AD_ANALYST_PROMPT,
    model: str = CLAUDE_MODEL,
    max_tokens: int = MAX_TOKENS,
    tools: List[Dict] = None
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

    if tools:
        payload["tools"] = tools

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
    max_tokens: int = MAX_TOKENS,
    tools: List[Dict] = None,
    use_cache: bool = True
) -> Dict:
    """
    Call Claude API (non-streaming version) with optional caching.
    """
    if not ANTHROPIC_API_KEY:
        return {"error": "ANTHROPIC_API_KEY not configured"}

    # Check cache first
    if use_cache:
        cache_key = _hash_request(messages, system)
        cached = _get_cached_response(cache_key)
        if cached:
            return {"content": cached, "cached": True, "usage": {}}

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

    if tools:
        payload["tools"] = tools

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json=payload
        )

        if response.status_code != 200:
            return {"error": f"API error: {response.status_code}", "details": response.text}

        result = response.json()

        # Handle tool use responses
        tool_uses = []
        text_content = ""

        for block in result.get("content", []):
            if block.get("type") == "text":
                text_content += block.get("text", "")
            elif block.get("type") == "tool_use":
                tool_uses.append({
                    "id": block.get("id"),
                    "name": block.get("name"),
                    "input": block.get("input")
                })

        # Cache the response
        if use_cache and text_content:
            _cache_response(cache_key, text_content)

        return {
            "content": text_content,
            "tool_uses": tool_uses,
            "usage": result.get("usage", {}),
            "stop_reason": result.get("stop_reason")
        }


async def call_claude_with_tools(
    messages: List[Dict],
    system: str = AD_ANALYST_PROMPT,
    model: str = CLAUDE_MODEL,
    max_tokens: int = MAX_TOKENS,
    auto_execute: bool = False
) -> Dict:
    """
    Call Claude API with tool use support.
    Optionally auto-execute tools and continue conversation.
    """
    result = await call_claude_api(
        messages=messages,
        system=system,
        model=model,
        max_tokens=max_tokens,
        tools=AI_TOOLS,
        use_cache=False  # Don't cache tool interactions
    )

    if result.get("error"):
        return result

    # If there are tool uses and auto_execute is on
    if result.get("tool_uses") and auto_execute:
        tool_results = []
        for tool_use in result["tool_uses"]:
            tool_result = await execute_tool(tool_use["name"], tool_use["input"])
            tool_results.append({
                "tool_use_id": tool_use["id"],
                "result": tool_result
            })

        result["tool_results"] = tool_results

    return result


# ==================== CHAT FUNCTIONS ====================

async def chat_with_data(
    user_message: str,
    data_context: Dict,
    chat_history: List[Dict] = None,
    user_id: str = "default",
    client_id: str = None,
    stream: bool = True,
    enable_tools: bool = False
) -> AsyncGenerator[str, None] | Dict:
    """
    Chat with ad data using Claude.
    Now with memory integration and optional tool use.
    """
    # Import memory functions (avoid circular import)
    try:
        from .ai_memory import (
            save_message, get_conversation_history,
            get_preferences, search_knowledge, build_ai_context
        )
        memory_available = True
    except ImportError:
        memory_available = False

    # Build context from data
    context_parts = []

    # Get memory context if available
    if memory_available:
        memory_context = build_ai_context(user_id, client_id, user_message)

        # Add relevant knowledge
        if memory_context.get("relevant_knowledge"):
            knowledge_text = "\n".join([
                f"- {k['title']}: {k['content'][:200]}"
                for k in memory_context["relevant_knowledge"][:3]
            ])
            context_parts.append(f"CONOCIMIENTO RELEVANTE:\n{knowledge_text}")

        # Add user preferences to system instructions
        prefs = memory_context.get("user_preferences", {})
        if prefs:
            pref_text = ", ".join([f"{k}: {v['value']}" for k, v in prefs.items()])
            context_parts.append(f"PREFERENCIAS DEL USUARIO: {pref_text}")

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

    # Add anomalies if detected
    if "anomalies" in data_context and data_context["anomalies"]:
        anomalies_text = "\n".join([f"- 🔴 {a}" for a in data_context["anomalies"][:3]])
        context_parts.append(f"ANOMALÍAS DETECTADAS:\n{anomalies_text}")

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

    # Save user message to memory
    if memory_available:
        save_message("user", user_message, client_id, user_id)

    if stream:
        full_response = ""
        async for chunk in call_claude_api_stream(
            messages,
            system=AD_ANALYST_PROMPT,
            model=CLAUDE_CHAT_MODEL,
            max_tokens=MAX_TOKENS_CHAT
        ):
            full_response += chunk
            yield chunk

        # Save assistant response to memory
        if memory_available and full_response:
            save_message("assistant", full_response, client_id, user_id)
    else:
        if enable_tools:
            result = await call_claude_with_tools(
                messages,
                system=AD_ANALYST_PROMPT,
                model=CLAUDE_CHAT_MODEL,
                max_tokens=MAX_TOKENS_CHAT
            )
        else:
            result = await call_claude_api(
                messages,
                system=AD_ANALYST_PROMPT,
                model=CLAUDE_CHAT_MODEL,
                max_tokens=MAX_TOKENS_CHAT
            )

        content = result.get("content", "")

        # Save to memory
        if memory_available and content:
            save_message("assistant", content, client_id, user_id)

        yield content


async def chat_crm(
    user_message: str,
    data_context: Dict,
    chat_history: List[Dict] = None,
    user_id: str = "default"
) -> str:
    """
    Chat for CRM Grupo Albisu.
    Non-streaming version for simpler frontend integration.
    """
    # Import memory functions
    try:
        from .ai_memory import save_message, build_ai_context
        memory_available = True
    except ImportError:
        memory_available = False

    # Build context from CRM data
    context_parts = []

    # Get memory context if available
    if memory_available:
        memory_context = build_ai_context(user_id, None, user_message)
        if memory_context.get("relevant_knowledge"):
            knowledge_text = "\n".join([
                f"- {k['title']}: {k['content'][:150]}"
                for k in memory_context["relevant_knowledge"][:2]
            ])
            context_parts.append(f"CONOCIMIENTO PREVIO:\n{knowledge_text}")

    if "metrics" in data_context:
        m = data_context["metrics"]
        context_parts.append(f"""
MÉTRICAS ACTUALES:
- Ventas totales: ${m.get('totalSales', 0):,.0f}
- Pedidos: {m.get('totalOrders', 0)}
- Ticket promedio: ${m.get('avgTicket', 0):,.0f}
- Tasa de conversión: {m.get('conversionRate', 0):.1f}%
""")

    if "brands" in data_context:
        brands_text = "\n".join([
            f"- {b['name']}: ${b.get('sales', 0):,.0f} ({b.get('orders', 0)} pedidos)"
            for b in data_context["brands"]
        ])
        context_parts.append(f"VENTAS POR MARCA:\n{brands_text}")

    if "recent_orders" in data_context:
        orders_text = "\n".join([
            f"- #{o.get('id', '?')}: ${o.get('total', 0):,.0f} - {o.get('status', 'pendiente')}"
            for o in data_context["recent_orders"][:5]
        ])
        context_parts.append(f"PEDIDOS RECIENTES:\n{orders_text}")

    if "alerts" in data_context and data_context["alerts"]:
        alerts_text = "\n".join([f"- ⚠️ {a}" for a in data_context["alerts"][:3]])
        context_parts.append(f"ALERTAS:\n{alerts_text}")

    context_message = "\n\n".join(context_parts) if context_parts else "Sin datos disponibles."

    # Build messages
    messages = []

    if chat_history:
        for msg in chat_history[-5:]:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })

    messages.append({
        "role": "user",
        "content": f"""DATOS DEL CRM:
{context_message}

CONSULTA:
{user_message}"""
    })

    # Save user message
    if memory_available:
        save_message("user", user_message, None, user_id)

    result = await call_claude_api(
        messages,
        system=CRM_ASSISTANT_PROMPT,
        model=CLAUDE_CHAT_MODEL,
        max_tokens=MAX_TOKENS_CHAT
    )

    response = result.get("content", "Lo siento, no pude procesar tu consulta.")

    # Save assistant response
    if memory_available:
        save_message("assistant", response, None, user_id)

    return response


# ==================== ANOMALY DETECTION ====================

def detect_anomalies(metrics_history: List[Dict], threshold: float = 2.0) -> List[Dict]:
    """
    Detect anomalies in metrics using statistical methods.
    Uses Z-score for detection.
    """
    if len(metrics_history) < 7:
        return []  # Need at least 7 data points

    anomalies = []

    # Metrics to check
    metric_keys = ['spend', 'results', 'cpr', 'ctr', 'impressions', 'frequency']

    for key in metric_keys:
        values = [m.get(key, 0) for m in metrics_history if key in m]
        if len(values) < 5:
            continue

        mean = statistics.mean(values)
        stdev = statistics.stdev(values) if len(values) > 1 else 0

        if stdev == 0:
            continue

        # Check latest value
        latest = values[-1]
        z_score = abs((latest - mean) / stdev)

        if z_score > threshold:
            change_percent = ((latest - mean) / mean) * 100 if mean != 0 else 0
            direction = "subió" if latest > mean else "bajó"

            anomalies.append({
                "metric": key,
                "current_value": latest,
                "average_value": mean,
                "z_score": round(z_score, 2),
                "change_percent": round(change_percent, 1),
                "direction": direction,
                "severity": "CRITICAL" if z_score > 3 else "WARNING",
                "message": f"{key.upper()} {direction} {abs(change_percent):.0f}% vs promedio"
            })

    return sorted(anomalies, key=lambda x: x["z_score"], reverse=True)


async def analyze_anomalies_with_ai(anomalies: List[Dict], context: Dict) -> str:
    """
    Get AI explanation for detected anomalies.
    """
    if not anomalies:
        return "No se detectaron anomalías significativas."

    anomalies_text = "\n".join([
        f"- {a['metric']}: {a['direction']} {abs(a['change_percent']):.0f}% (z-score: {a['z_score']})"
        for a in anomalies[:5]
    ])

    messages = [{
        "role": "user",
        "content": f"""Se detectaron estas anomalías en los datos:

{anomalies_text}

Contexto de la cuenta:
{json.dumps(context, indent=2, default=str, ensure_ascii=False)[:1000]}

Explica brevemente:
1. Por qué pueden haber ocurrido estas anomalías
2. Si requieren acción inmediata
3. Qué acción específica recomiendas"""
    }]

    result = await call_claude_api(
        messages,
        system=ANOMALY_DETECTION_PROMPT,
        model=CLAUDE_CHAT_MODEL,
        max_tokens=512
    )

    return result.get("content", "No se pudo analizar las anomalías")


# ==================== CREATIVE ANALYSIS ====================

async def analyze_creative(
    image_data: str | bytes,
    image_type: str = "image/jpeg",
    additional_context: str = ""
) -> Dict:
    """
    Analyze an ad creative using Claude Vision.
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
        use_cache=False  # Don't cache image analysis
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
        use_cache=False
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
      "reason": "Por qué esta recomendación (con datos específicos)",
      "impact": "alto|medio|bajo",
      "effort": "alto|medio|bajo",
      "priority": 1-5,
      "estimated_improvement": "+X% en métrica",
      "confidence": "high|medium|low"
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
        "priority": 3,
        "confidence": "low"
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
      "action": "Qué hacer al respecto",
      "confidence": "high|medium|low"
    }}
  ],
  "top_priority": "La acción más importante para hoy",
  "anomalies_detected": 0
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
        "top_priority": "Revisar el dashboard para más detalles",
        "anomalies_detected": 0
    }


# ==================== WEEKLY DIGEST ====================

async def generate_weekly_digest(
    client_id: str,
    client_name: str,
    weekly_data: Dict,
    previous_week_data: Dict = None
) -> Dict:
    """
    Generate a comprehensive weekly digest with insights.
    """
    comparison_text = ""
    if previous_week_data:
        comparison_text = f"""
COMPARACIÓN VS SEMANA ANTERIOR:
- Gasto: ${previous_week_data.get('total_spend', 0):,.0f} → ${weekly_data.get('total_spend', 0):,.0f}
- Resultados: {previous_week_data.get('total_results', 0)} → {weekly_data.get('total_results', 0)}
- CPR: ${previous_week_data.get('avg_cpr', 0):,.2f} → ${weekly_data.get('avg_cpr', 0):,.2f}
"""

    messages = [{
        "role": "user",
        "content": f"""Genera un resumen semanal completo para {client_name}:

DATOS DE ESTA SEMANA:
{json.dumps(weekly_data, indent=2, default=str, ensure_ascii=False)}

{comparison_text}

Genera un JSON con esta estructura:
{{
  "subject_line": "Línea de asunto del email (máx 60 chars)",
  "headline": "Titular principal del digest",
  "summary": "Párrafo resumen de 2-3 oraciones",
  "highlights": [
    {{"metric": "nombre", "value": "valor", "trend": "up|down|stable", "interpretation": "qué significa"}}
  ],
  "wins": ["Logro 1", "Logro 2"],
  "concerns": ["Problema 1 (si hay)"],
  "recommendations": [
    {{"priority": 1, "action": "Qué hacer", "expected_impact": "Resultado esperado"}}
  ],
  "next_week_focus": "En qué enfocarse la próxima semana",
  "confidence_score": 85
}}"""
    }]

    result = await call_claude_api(
        messages,
        system=REPORT_GENERATOR_PROMPT,
        max_tokens=2048
    )

    content = result.get("content", "{}")

    try:
        import re
        json_match = re.search(r'\{[\s\S]*\}', content)
        if json_match:
            digest = json.loads(json_match.group())
            digest["client_id"] = client_id
            digest["client_name"] = client_name
            digest["generated_at"] = datetime.now().isoformat()
            return digest
    except (json.JSONDecodeError, AttributeError):
        pass

    return {
        "client_id": client_id,
        "client_name": client_name,
        "subject_line": f"Resumen semanal - {client_name}",
        "headline": "Tu resumen de la semana",
        "summary": "No se pudo generar el resumen automáticamente.",
        "generated_at": datetime.now().isoformat(),
        "error": True
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
            use_cache=False
        )

        if "error" in result:
            return {
                "status": "error",
                "message": result["error"]
            }

        return {
            "status": "operational",
            "message": "AI service funcionando correctamente",
            "model": CLAUDE_MODEL,
            "chat_model": CLAUDE_CHAT_MODEL,
            "features": {
                "chat": True,
                "vision": True,
                "tool_use": True,
                "memory": True,
                "caching": True,
                "anomaly_detection": True
            }
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


# ==================== SMART SUGGESTIONS ====================

def get_contextual_suggestions(page: str, data: Dict = None) -> List[Dict]:
    """
    Get smart suggestions based on current page and data.
    """
    suggestions = {
        "dashboard": [
            {"query": "¿Cómo está la cuenta esta semana?", "icon": "chart"},
            {"query": "¿Cuáles son las campañas con mejor rendimiento?", "icon": "trophy"},
            {"query": "¿Hay alguna alerta que deba atender?", "icon": "alert"},
            {"query": "Dame un resumen ejecutivo", "icon": "file"},
        ],
        "campaigns": [
            {"query": "¿Qué campañas debería pausar?", "icon": "pause"},
            {"query": "¿Dónde debería aumentar el presupuesto?", "icon": "dollar"},
            {"query": "Compara el rendimiento de mis campañas", "icon": "compare"},
            {"query": "¿Cuál es la campaña más eficiente?", "icon": "star"},
        ],
        "ads": [
            {"query": "¿Qué anuncios tienen fatiga creativa?", "icon": "alert"},
            {"query": "¿Cuáles son mis anuncios ganadores?", "icon": "trophy"},
            {"query": "¿Qué creativos debería renovar?", "icon": "refresh"},
            {"query": "Analiza la tendencia de mis anuncios", "icon": "trend"},
        ],
        "alerts": [
            {"query": "Explica estas alertas", "icon": "info"},
            {"query": "¿Cuál es la más urgente?", "icon": "priority"},
            {"query": "¿Qué acciones recomendás?", "icon": "action"},
        ],
        "analysis": [
            {"query": "¿Qué patrones ves en mis datos?", "icon": "pattern"},
            {"query": "¿Hay correlaciones interesantes?", "icon": "link"},
            {"query": "Predice el rendimiento de la próxima semana", "icon": "future"},
        ]
    }

    base_suggestions = suggestions.get(page, suggestions["dashboard"])

    # Add data-specific suggestions if anomalies detected
    if data and data.get("anomalies"):
        base_suggestions.insert(0, {
            "query": "Explica las anomalías detectadas",
            "icon": "warning",
            "priority": True
        })

    return base_suggestions
