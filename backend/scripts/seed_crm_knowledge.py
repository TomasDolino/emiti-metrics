"""
Seed CRM Knowledge Base - Pre-load business knowledge for AI
Run this once to populate the knowledge base with Grupo Albisu specific info.

Usage: cd /var/www/metrics-backend && source venv/bin/activate && python scripts/seed_crm_knowledge.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.ai_memory import add_knowledge, init_ai_memory_db

init_ai_memory_db()

KNOWLEDGE_ENTRIES = [
    {
        "category": "negocio",
        "title": "Estructura del Grupo Albisu",
        "content": "Grupo Albisu es una familia con 13 marcas de muebles y decoración. Dueños: Justo (Amueblarte PH), Valentín (VA Home Design, Home Stock, House Deco, Mora Interiores, Wood Store, Akila Design), Juan Cruz (Caoba Muebles), Federica (De la Carpintería, FA Home Design), Teo Benoit (Todo Muebles), Agustín Mansilla (Don Merced). Casa A es del grupo. Admins: Marcos y Tomas.",
        "tags": ["marcas", "familia", "estructura"],
    },
    {
        "category": "negocio",
        "title": "Cálculo de comisiones",
        "content": "La comisión es 3% del subtotal (sin recargos de tarjeta). Se calcula como subtotalProductos * 0.03. Se muestra en el ranking de vendedores y estadísticas individuales. La comisión se liquida cuando el pedido está cobrado.",
        "tags": ["comision", "vendedores", "calculo"],
    },
    {
        "category": "negocio",
        "title": "Recargos de tarjeta de crédito",
        "content": "Recargos por tarjeta: 1 cuota=21%, 3 cuotas=23%, 6 cuotas=33%. Se aplica sobre el subtotal. La comisión del vendedor NO incluye el recargo. El total con recargo = subtotal + (subtotal * porcentaje_recargo).",
        "tags": ["tarjeta", "recargo", "pagos"],
    },
    {
        "category": "operaciones",
        "title": "Estados de pedido y flujo",
        "content": "Flujo: vendido (nuevo) → en_produccion (fabricándose) → laqueado (pintura) → tapiceria (tapizado) → listo (para entregar) → entregado. El estado 'con_demora' es especial y se aplica cuando hay retrasos. No todos los pedidos pasan por laqueado/tapiceria.",
        "tags": ["estados", "produccion", "flujo"],
    },
    {
        "category": "operaciones",
        "title": "Umbrales de alerta",
        "content": "Alertas: 1) 'vendido' hace +7 días = Sin gestionar. 2) 'en_produccion' hace +14 días = Producción demorada. 3) 'listo' hace +5 días = Listo sin entregar (plata parada). 4) 'entregado' con saldo>0 hace +30 días = Saldo pendiente. Priorizar siempre por monto económico.",
        "tags": ["alertas", "umbrales", "tiempos"],
    },
    {
        "category": "metricas",
        "title": "Definiciones de métricas",
        "content": "Total Ventas = sum(total_amount). Total Cobrado = sum(seña). Saldo Pendiente = sum(saldo). Ticket Promedio = Ventas/Pedidos. Eficiencia Cobranza = (Cobrado/Ventas)*100. Pipeline = pedidos activos por estado (excluye entregados). El pipeline NO filtra por fecha.",
        "tags": ["metricas", "definiciones", "dashboard"],
    },
    {
        "category": "metricas",
        "title": "Pipeline vs métricas de período",
        "content": "IMPORTANTE: El pipeline muestra TODOS los pedidos activos sin importar fecha. Un pedido 'listo' de hace 3 meses sigue en pipeline. Las métricas de ventas SÍ filtran por período (mes actual). Nunca mezclar datos de pipeline con métricas mensuales.",
        "tags": ["pipeline", "periodo", "datos"],
    },
    {
        "category": "roles",
        "title": "Permisos por rol",
        "content": "Admin (Marcos, Tomas): todo. Owner (Valentín, Juan Cruz, Federica, etc.): datos de sus marcas, facturación, márgenes. Seller (Abril, Romi, Fabi, Nicole, etc.): solo sus ventas y comisiones. Los sellers NO ven márgenes ni datos de otras marcas.",
        "tags": ["roles", "permisos", "seguridad"],
    },
    {
        "category": "faq",
        "title": "Orders vs Invoices",
        "content": "El CRM tiene dos sistemas independientes: 'orders' (pedidos de venta - Dashboard/Gestión) y 'invoices' (facturas - Facturación). Son tablas separadas. Un pedido puede o no tener factura asociada. El Dashboard lee de orders, NO de invoices.",
        "tags": ["orders", "invoices", "facturacion"],
    },
    {
        "category": "faq",
        "title": "Products vs Catalog Products",
        "content": "Dos sistemas de productos: 'products' (Stock - inventario físico con cantidades) y 'catalog_products' (Catálogo - productos con precios de venta y costo por proveedor). Stock para inventario, Catálogo para márgenes y catálogo de venta.",
        "tags": ["productos", "stock", "catalogo"],
    },
]


def seed_knowledge():
    print("Seeding CRM knowledge base...")
    for entry in KNOWLEDGE_ENTRIES:
        try:
            entry_id = add_knowledge(
                category=entry["category"],
                title=entry["title"],
                content=entry["content"],
                tags=entry.get("tags"),
                source="seed_script_v2"
            )
            print(f"  Added: {entry['title']} (ID: {entry_id})")
        except Exception as e:
            print(f"  Error adding {entry['title']}: {e}")
    print(f"\nDone! Added {len(KNOWLEDGE_ENTRIES)} knowledge entries.")


if __name__ == "__main__":
    seed_knowledge()
