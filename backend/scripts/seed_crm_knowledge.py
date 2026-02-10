"""
Seed CRM Knowledge Base - Pre-load business knowledge for AI
Run this once to populate the knowledge base with Grupo Albisu specific info.

Usage: cd /var/www/metrics-backend && python scripts/seed_crm_knowledge.py
"""
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.ai_memory import add_knowledge, init_ai_memory_db

# Initialize database
init_ai_memory_db()

# ==================== BUSINESS KNOWLEDGE ====================

KNOWLEDGE_ENTRIES = [
    # Marcas
    {
        "category": "marcas",
        "title": "Sillas Paris",
        "content": "Marca especializada en sillas de alta calidad. Productos principales: sillas de comedor, banquetas, sillas de escritorio. Rango de precios: $50,000 - $200,000 ARS. Público objetivo: hogares de clase media-alta que buscan diseño y durabilidad.",
        "tags": ["marca", "sillas", "productos"]
    },
    {
        "category": "marcas",
        "title": "Mesas y Sillas",
        "content": "Marca de comedores completos. Productos: mesas de comedor (4, 6, 8 personas), juegos de comedor, mesas extensibles. Rango de precios: $150,000 - $800,000 ARS. El ticket promedio más alto del grupo.",
        "tags": ["marca", "mesas", "comedores"]
    },
    {
        "category": "marcas",
        "title": "Mora Interiores",
        "content": "Marca premium de decoración y muebles de diseño. Productos: sillones, sofás, muebles de living, decoración. Rango de precios: $200,000 - $1,500,000 ARS. Público: arquitectos, decoradores, hogares premium.",
        "tags": ["marca", "decoracion", "premium"]
    },

    # Estados de pedido
    {
        "category": "operaciones",
        "title": "Estados de pedido",
        "content": """Estados del pipeline de pedidos:
- vendido: Pedido nuevo, requiere gestión inicial
- confirmado: Cliente confirmó, se debe pasar a producción
- en_produccion: En fabricación con proveedores
- laqueado: En proceso de laqueado/pintura
- tapiceria: En proceso de tapizado
- listo: Terminado, listo para coordinar entrega
- entregado: Entregado al cliente
- con_demora: Tiene algún problema o retraso
Un pedido normal debería tardar 15-30 días desde vendido hasta entregado.""",
        "tags": ["estados", "pipeline", "operaciones"]
    },

    # Métricas clave
    {
        "category": "metricas",
        "title": "KPIs importantes",
        "content": """Métricas clave del negocio:
- Ticket promedio: Objetivo >$150,000 ARS
- Tasa de conversión: De consulta a venta, objetivo >15%
- Tiempo de entrega: Objetivo <25 días
- Eficiencia de cobranza: Seña inicial >40% del total
- Pedidos con demora: Objetivo <10% del total activo
- Comisión vendedores: 3-5% según marca y volumen""",
        "tags": ["metricas", "kpis", "objetivos"]
    },

    # Proveedores
    {
        "category": "operaciones",
        "title": "Proveedores de producción",
        "content": """Principales proveedores:
- Carpintería: Fabricación de estructuras de madera (10-15 días)
- Laqueado: Pintura y terminación (5-7 días)
- Tapicería: Tapizado de sillas y sillones (5-10 días)
- Herrería: Bases metálicas para mesas (7-10 días)
Cada pedido puede pasar por 1-3 proveedores según el producto.""",
        "tags": ["proveedores", "produccion", "tiempos"]
    },

    # Estacionalidad
    {
        "category": "ventas",
        "title": "Estacionalidad",
        "content": """Patrones de ventas:
- Marzo-Mayo: Temporada alta (mudanzas, renovación)
- Junio-Agosto: Temporada baja (invierno)
- Septiembre-Noviembre: Temporada media-alta
- Diciembre: Pico por fiestas y regalos
- Enero-Febrero: Temporada baja (vacaciones)
Hot Sale y CyberMonday generan picos de consultas.""",
        "tags": ["estacionalidad", "ventas", "patrones"]
    },

    # Alertas
    {
        "category": "alertas",
        "title": "Cuándo alertar",
        "content": """Situaciones que requieren atención:
- Pedido >7 días en estado 'vendido' sin gestionar
- Pedido >20 días en producción
- Stock de producto popular <3 unidades
- Saldo pendiente >60 días después de entrega
- Más de 5 pedidos 'con_demora' simultáneos
- Caída de ventas >30% vs semana anterior""",
        "tags": ["alertas", "umbrales", "atencion"]
    },

    # Comisiones
    {
        "category": "ventas",
        "title": "Sistema de comisiones",
        "content": """Comisiones de vendedores:
- Sillas Paris: 3% sobre venta
- Mesas y Sillas: 4% sobre venta
- Mora Interiores: 5% sobre venta (premium)
- Bonus: +1% si supera objetivo mensual
Las comisiones se liquidan cuando el pedido está 100% cobrado.""",
        "tags": ["comisiones", "vendedores", "incentivos"]
    },

    # Clientes
    {
        "category": "clientes",
        "title": "Tipos de clientes",
        "content": """Segmentos de clientes:
- Particulares: 70% de ventas, compra única o esporádica
- Arquitectos/Decoradores: 20%, compras recurrentes, descuentos especiales
- Empresas: 10%, proyectos grandes, plazos de pago extendidos
Los clientes recurrentes (>2 compras) tienen 40% más de ticket promedio.""",
        "tags": ["clientes", "segmentos", "tipos"]
    },

    # Mejores prácticas
    {
        "category": "best_practices",
        "title": "Mejores prácticas de venta",
        "content": """Recomendaciones:
1. Pedir seña mínima 40% para iniciar producción
2. Confirmar disponibilidad de tela/material antes de prometer fecha
3. Enviar fotos del avance en producción al cliente
4. Coordinar entrega con 48hs de anticipación
5. Hacer seguimiento post-entrega a los 7 días
6. Ofrecer productos complementarios (ej: sillas con mesa)""",
        "tags": ["ventas", "consejos", "practicas"]
    }
]


def seed_knowledge():
    """Insert all knowledge entries."""
    print("Seeding CRM knowledge base...")

    for entry in KNOWLEDGE_ENTRIES:
        try:
            entry_id = add_knowledge(
                category=entry["category"],
                title=entry["title"],
                content=entry["content"],
                tags=entry.get("tags"),
                source="seed_script"
            )
            print(f"  Added: {entry['title']} (ID: {entry_id})")
        except Exception as e:
            print(f"  Error adding {entry['title']}: {e}")

    print(f"\nDone! Added {len(KNOWLEDGE_ENTRIES)} knowledge entries.")


if __name__ == "__main__":
    seed_knowledge()
