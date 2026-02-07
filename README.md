# Emiti Metrics

Herramienta profesional para análisis automático de campañas de Meta Ads.

## Características

- **Clasificación automática de anuncios**: Ganador, Escalable, Testing, Fatigado, Pausar
- **Detección de fatiga creativa**: Basada en frecuencia y tendencias de CTR
- **Alertas inteligentes**: Caídas de ROAS, aumentos de CPA, CTR en descenso
- **Dashboard visual**: Métricas clave, gráficos de evolución, distribución por clasificación
- **Reportes**: Semanales, mensuales y personalizados
- **Multi-cliente**: Gestión de múltiples cuentas publicitarias

## Stack Técnico

### Frontend
- React + TypeScript + Vite
- Tailwind CSS
- Recharts para gráficos
- React Router

### Backend
- Python + FastAPI
- Pandas para procesamiento de datos
- Análisis automático con algoritmos propios

## Paleta de Colores (Emiti)

- **Sage**: #A8B5A0
- **Olive**: #7D8471
- **Terracotta**: #C4A484

## Instalación

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
pip install -r requirements.txt
python run.py
```

## Estructura del Proyecto

```
emiti-metrics/
├── frontend/                 # React + Vite
│   ├── src/
│   │   ├── components/       # Componentes reutilizables
│   │   ├── pages/            # Páginas de la app
│   │   ├── lib/              # Utilidades y análisis
│   │   ├── types/            # TypeScript types
│   │   └── hooks/            # Custom hooks
│   └── ...
├── backend/                  # Python FastAPI
│   ├── app/
│   │   ├── routers/          # Endpoints de la API
│   │   ├── services/         # Lógica de negocio
│   │   └── models/           # Schemas Pydantic
│   └── ...
└── README.md
```

## URLs

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Conectar Frontend con Backend

Por defecto el frontend usa datos mock. Para usar la API real:

1. Crear archivo `frontend/.env`:
```bash
VITE_USE_API=true
VITE_API_URL=http://localhost:8000/api
```

2. Reiniciar el frontend con `npm run dev`

## Base de Datos

El backend usa SQLite. La base de datos se crea automaticamente en `backend/data/emiti_metrics.db` al iniciar el servidor.

## Uso

1. Sube un archivo CSV exportado de Meta Ads
2. Selecciona el objetivo de campaña (Mensajes, Ventas, Leads, etc.)
3. El sistema analiza automáticamente y clasifica los anuncios
4. Revisa las recomendaciones y alertas
5. Genera reportes para tus clientes

## Métricas Analizadas

| Métrica | Descripción |
|---------|-------------|
| CPR | Costo por resultado |
| CTR | Tasa de clics |
| CPC | Costo por clic |
| CPM | Costo por mil impresiones |
| ROAS | Retorno sobre inversión publicitaria |
| Frecuencia | Veces que un usuario ve el anuncio |

## Clasificación de Anuncios

| Estado | Criterio |
|--------|----------|
| **GANADOR** | Alto rendimiento, escalar |
| **ESCALABLE** | Buen rendimiento, potencial |
| **TESTING** | Datos insuficientes, monitorear |
| **FATIGADO** | Alta frecuencia, CTR cayendo |
| **PAUSAR** | Bajo rendimiento, pausar |

---

Desarrollado por Emiti 🌿
