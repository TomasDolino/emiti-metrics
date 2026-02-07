# Emiti Metrics
## Plataforma de Analisis de Meta Ads para Agencias

---

### Que Es

Emiti Metrics es una herramienta que analiza automaticamente las campanas de Meta Ads de tus clientes. En lugar de revisar manualmente cada anuncio, la plataforma:

1. **Clasifica anuncios** en 5 categorias: Ganador, Escalable, Testing, Fatigado, Pausar
2. **Detecta patrones** de que funciona (ej: "videos rinden 40% mejor que carrusel")
3. **Simula escenarios** antes de hacer cambios ("si subo 20% el budget, cuantos resultados extra obtengo?")
4. **Genera alertas** automaticas cuando algo cambia (fatiga, CPR sube, nuevo ganador)
5. **Crea playbooks** por cliente con mejores practicas

---

### Por Que Sirve

**Para la agencia:**
- Ahorra tiempo de analisis manual
- Detecta problemas antes de que escalen
- Demuestra valor al cliente con metricas concretas
- Genera reportes profesionales automaticos

**Para el cliente:**
- Ve su inversion optimizada
- Entiende que funciona y que no
- Tiene visibilidad del trabajo de la agencia

---

### Como Funciona

```
1. Exportas CSV desde Meta Ads Manager
2. Lo subis a Emiti Metrics (seleccionando el cliente)
3. La plataforma analiza automaticamente
4. Ves dashboard, alertas, recomendaciones
```

**Flujo de datos:**
```
Meta Ads → CSV → Upload → Base de Datos → Analisis → Dashboard
```

---

### Arquitectura Tecnica

**Frontend (React + TypeScript + Vite)**
- 16 paginas completas
- Sistema de temas personalizable
- Selector de cliente global
- Responsive (desktop y mobile)

**Backend (Python + FastAPI)**
- API REST con 40+ endpoints
- Base de datos SQLite
- Procesamiento de CSV
- Analisis con Pandas/NumPy

**Integracion:**
- Cliente API en frontend (`/src/lib/api.ts`)
- Provider que permite usar mock o API real
- CORS configurado para desarrollo local

---

### Features Implementadas

| Feature | Estado | Descripcion |
|---------|--------|-------------|
| Dashboard | Listo | Metricas, alertas, evolucion |
| Clientes | Listo | CRUD completo con BD |
| Alertas | Listo | Sistema de notificaciones |
| Analisis | Listo | Clasificacion de anuncios |
| Patrones | Listo | Mining de correlaciones |
| Simulador | Listo | Budget y pausar ads |
| Diagnosticos | Listo | Quality score, saturacion |
| Playbook | Listo | Guia DO/DONT/MONITOR |
| Upload CSV | Listo | Importacion de datos |
| API Client | Listo | Conexion front-back |
| Base de Datos | Listo | SQLite con SQLAlchemy |

---

### Clasificacion de Anuncios

El sistema clasifica cada anuncio automaticamente:

| Clase | Criterio | Accion |
|-------|----------|--------|
| **GANADOR** | CPR bajo + CTR alto + estable | Mantener, escalar si hay budget |
| **ESCALABLE** | Buen rendimiento, puede crecer | Aumentar budget progresivamente |
| **TESTING** | Pocos datos, en prueba | Esperar 3-5 dias mas |
| **FATIGADO** | Frecuencia alta, CPR subiendo | Renovar creativo |
| **PAUSAR** | Rendimiento muy bajo | Pausar y redistribuir budget |

---

### Analisis que Hace

**Pattern Mining:**
- Detecta que tipo de contenido funciona mejor (video vs imagen vs carrusel)
- Identifica mejores horarios y dias
- Encuentra correlaciones en copies y CTAs

**Simulaciones:**
- Proyecta impacto de cambiar budget (+/- X%)
- Calcula que pasa si pausas un anuncio especifico
- Considera rendimientos decrecientes

**Diagnosticos:**
- Quality Score (0-100) de la cuenta
- Prediccion de saturacion de audiencia
- Deteccion de problemas de estructura

---

### API Endpoints Principales

```
GET  /api/clients                    # Lista clientes
GET  /api/clients/{id}/summary       # Resumen con metricas
POST /api/advanced/upload/{id}       # Subir CSV
GET  /api/advanced/patterns/{id}     # Patrones detectados
POST /api/advanced/simulate/budget   # Simular cambio
GET  /api/advanced/playbook/{id}     # Generar playbook
GET  /api/alerts                     # Lista alertas
POST /api/alerts/{id}/acknowledge    # Marcar como leida
```

---

### Como Correr el Proyecto

**Backend:**
```bash
cd emiti-metrics/backend
pip install -r requirements.txt
python run.py
# Corre en http://localhost:8000
```

**Frontend:**
```bash
cd emiti-metrics/frontend
npm install
npm run dev
# Corre en http://localhost:5173
```

**Para usar API real** (en vez de datos mock):
```bash
# Crear archivo frontend/.env
VITE_USE_API=true
VITE_API_URL=http://localhost:8000/api
```

---

### Estructura de Archivos

```
emiti-metrics/
├── frontend/
│   ├── src/
│   │   ├── pages/          # 16 paginas
│   │   ├── components/     # Layout, Settings
│   │   └── lib/
│   │       ├── api.ts          # Cliente HTTP
│   │       ├── dataProvider.ts # Switch mock/API
│   │       ├── mockData.ts     # Datos demo
│   │       └── theme.tsx       # Sistema de temas
│   └── package.json
│
└── backend/
    ├── app/
    │   ├── main.py           # FastAPI app
    │   ├── database.py       # SQLite + modelos
    │   ├── routers/          # Endpoints
    │   └── services/         # Logica de negocio
    ├── data/                 # BD SQLite
    └── requirements.txt
```

---

### Proximos Pasos (Opcionales)

1. **Deploy en servidor** - Similar al CRM, en Hostinger o similar
2. **OAuth con Meta** - Conectar directo a la API (sin exportar CSV)
3. **Reportes PDF** - Generar informes descargables
4. **Multi-usuario** - Login y permisos por agencia

---

### Metricas de Desarrollo

- **Frontend**: 16 paginas, ~70KB de logica de datos
- **Backend**: 40+ endpoints, 5 routers
- **Base de Datos**: 8 tablas (clients, campaigns, metrics, alerts, etc.)
- **Build**: ~7 segundos, 800KB bundle

---

### Conclusiones

Emiti Metrics esta listo para usar con datos demo. El siguiente paso logico es:

1. Probar el flujo completo (subir CSV, ver analisis)
2. Si funciona bien, hacer deploy
3. Empezar a usar con clientes reales

La plataforma esta disenada para crecer - la arquitectura permite agregar mas analisis, integraciones y features sin reescribir codigo.

---

*Documento generado: Febrero 2026*
*Stack: React + FastAPI + SQLite*
