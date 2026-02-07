# Manual de Emiti Metrics v2.0

## La Plataforma de Analítica de Meta Ads para Agencias Profesionales

---

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Navegación Principal](#navegación-principal)
3. [Dashboard](#dashboard)
4. [Vista de Agencia](#vista-de-agencia)
5. [Campañas](#campañas)
6. [Análisis](#análisis)
7. [Anuncios](#anuncios)
8. [Alertas](#alertas)
9. [Pattern Mining](#pattern-mining)
10. [Simulador de Escenarios](#simulador-de-escenarios)
11. [Diagnósticos Avanzados](#diagnósticos-avanzados)
12. [ROI de Agencia](#roi-de-agencia)
13. [Playbook](#playbook)
14. [Snapshots Históricos](#snapshots-históricos)
15. [Reportes](#reportes)
16. [Métricas](#métricas)
17. [Clientes](#clientes)
18. [Comparar](#comparar)
19. [Personalización](#personalización)
20. [API Avanzada](#api-avanzada)

---

## Introducción

**Emiti Metrics** es una plataforma de analítica avanzada diseñada específicamente para agencias de marketing que gestionan campañas de Meta Ads (Facebook e Instagram).

### ¿Qué Hace Única a Emiti Metrics?

A diferencia de otras herramientas que solo muestran datos, Emiti Metrics **interpreta, predice y recomienda**:

- No solo dice "CPR subió" → dice **por qué** y **qué hacer**
- No solo muestra fatiga → **predice cuándo** va a fatigarse
- No solo lista anuncios → los **clasifica automáticamente** en 5 categorías
- No solo reporta → genera **acciones concretas** diarias

### Características Principales v2.0

#### Core Features
- **Morning Brief**: Resumen diario de prioridades y logros
- **Clasificación Automática de Anuncios**: GANADOR, ESCALABLE, TESTING, FATIGADO, PAUSAR
- **Predicción de Fatiga**: Días de vida útil restantes por anuncio
- **Budget Pacing**: Control del gasto vs tiempo del mes
- **Asset Dependency**: Detectar riesgo de concentración en pocos creativos
- **Budget Optimizer**: Sugerencias de redistribución de presupuesto
- **Knowledge Base**: Aprendizajes automáticos por cliente
- **Creative Intelligence**: Patrones de lo que funciona
- **Health Score**: Puntuación de salud por cliente

#### Nuevas Features v2.0
- **Pattern Mining**: Detecta correlaciones ocultas en datos históricos
- **Simulador de Escenarios**: Proyecta impacto de cambios de budget
- **Account Quality Score**: Evalúa si hay datos suficientes para análisis
- **Predicción de Saturación de Audiencia**: Detecta agotamiento de públicos
- **Competition Proxy**: Analiza presión competitiva via CPM
- **ROI de Agencia**: Demuestra el valor que genera la agencia
- **Playbook Generator**: Genera guía de mejores prácticas por cliente
- **Structure Diagnostics**: Detecta problemas de organización de cuenta
- **Snapshots Históricos**: Guarda análisis para comparar evolución
- **Knowledge Base Persistente**: Aprende y recuerda qué funciona

---

## Navegación Principal

La barra lateral izquierda contiene todas las secciones:

| Sección | Descripción |
|---------|-------------|
| Dashboard | Vista general con métricas y widgets |
| Agencia | Vista de todos los clientes con health scores |
| Campañas | Gestión de campañas por cliente |
| Análisis | Diagnósticos y tendencias |
| Anuncios | Clasificación y análisis de creativos |
| Alertas | Notificaciones críticas y warnings |
| Patrones | Pattern Mining automático |
| Simulador | Proyectar impacto de decisiones |
| Diagnósticos | Quality Score, Saturación, Competencia |
| Playbook | Mejores prácticas por cliente |
| Reportes | Generación de reportes |
| Métricas | Datos detallados de rendimiento |
| Clientes | Gestión de clientes |
| Comparar | Comparativa entre clientes |

### Selector de Cliente

En la parte inferior de la barra lateral hay un **selector de cliente**:
- **"Todos los clientes"**: Ver datos agregados de toda la agencia
- **Cliente específico**: Filtrar todos los datos para ese cliente

---

## Dashboard

El Dashboard es la pantalla principal y se adapta según si hay un cliente seleccionado o no.

### Sin Cliente Seleccionado: Morning Brief

Cuando no hay cliente seleccionado, aparece el **Morning Brief**:

#### Componentes del Morning Brief:
- **Saludo**: Buenos días/tardes/noches según la hora
- **Resultados de ayer**: Total y comparación vs promedio
- **Prioridades del día**:
  - 🔴 **Urgente**: Alertas críticas, anuncios para pausar
  - 🟠 **Advertencia**: Budget agotándose, fatiga detectada
  - 🔵 **Acción**: Oportunidades de escalar ganadores
- **Logros recientes**: Victorias de los últimos días

### Con Cliente Seleccionado

Al seleccionar un cliente aparecen widgets adicionales:

#### Diagnóstico
- Cambios significativos en CPR, CTR y resultados
- Indicador visual: ✅ bueno / ⚠️ atención requerida
- Detalles de por qué está pasando

#### Resumen para Cliente
- Texto listo para copiar y enviar por WhatsApp
- Incluye: resultados, inversión, CPR, ganadores, fatiga
- Botón "Copiar" para portapapeles

#### Budget Pacing
- Barra de progreso: gastado vs budget mensual
- Estado: En track / Gastando de más / Gastando de menos
- Días restantes al ritmo actual
- Recomendación de gasto diario

#### Dependencia de Activos
- Nivel de riesgo: Bajo / Medio / Alto / Crítico
- Top 3 anuncios y su % del total de resultados
- Recomendación de diversificación

### Widgets Siempre Visibles

#### Métricas (4 cards)
- **Gasto Total**: Con tendencia vs período anterior
- **Resultados**: Total de conversiones/mensajes/leads
- **CPR Promedio**: Costo por resultado
- **CTR Promedio**: Click-through rate

#### Gráfico de Evolución
- Línea de resultados (verde)
- Línea de gasto (azul)
- Últimos 30 días

#### Clasificación de Anuncios (Pie Chart)
- Distribución visual por clasificación
- Cantidad de anuncios en cada categoría

#### Top Anuncios
- Los 5 mejores anuncios
- Muestra: nombre, CPR, CTR, resultados, clasificación
- Border color indica clasificación

### Personalización de Widgets

El botón ⚙️ activa el modo edición:
- **Arrastrar** para reordenar
- **Click** para ocultar/mostrar
- **Restaurar orden** para volver al default

---

## Vista de Agencia

La sección **Agencia** ofrece una vista panorámica de todos los clientes.

### Cards de Resumen

- **Clientes Activos**: Total de clientes gestionados
- **Budget Mensual Total**: Suma de todos los budgets
- **Resultados del Mes**: Total de conversiones

### Health Score por Cliente

Cada cliente tiene una fila con:
- **Avatar**: Iniciales del cliente con su color
- **Nombre y estado**: Excelente/Bien/Atención/Crítico
- **Issue principal**: Qué necesita atención
- **Health Score**: 0-100 en círculo
- **Tendencia**: % de resultados vs semana anterior
- **Acciones pendientes**: Número de tareas

#### Cómo se calcula el Health Score:
- Empieza en 100
- -20 por cada alerta crítica
- -10 por cada alerta warning
- -10 por cada anuncio fatigado
- -15 por budget overspending
- -20 por dependencia crítica de activos
- -15 por tendencia negativa

### Acciones Urgentes

Lista de las 5 acciones más importantes:
- Cliente + acción requerida
- Prioridad: Alta/Media

### Metas Semanales

Progreso hacia objetivos:
- Resultados semanales
- Rotar creativos fatigados
- Reportes mensuales

### Panel de Detalle de Cliente

Al hacer click en un cliente se abre un panel con:

#### Budget Pacing
- Progreso del mes
- Proyección de gasto
- Días restantes

#### Dependencia de Activos
- Riesgo de concentración
- Top creativos
- Recomendaciones

#### Optimizador de Budget
- Sugerencias de redistribución
- "Mover $X de campaña A → campaña B"
- Impacto estimado: +Y resultados

#### Knowledge Base
- Aprendizajes automáticos:
  - ✅ "Videos funcionan 30% mejor que imágenes"
  - ✅ "Testimoniales generan mejor engagement"
  - 💡 "Fines de semana convierten mejor"
  - 💡 "Creativos se fatigan a los 18 días"
- Mejor y peor anuncio
- Mejores días de la semana

#### Creative Intelligence
- Patrones detectados
- Top formatos por CPR
- Sugerencia de próximo creativo

---

## Campañas

Gestión de campañas activas y pausadas.

### Vista de Lista
- Nombre de campaña
- Objetivo (Mensajes/Ventas/Leads/Tráfico)
- Estado (Activa/Pausada)
- Budget
- Fecha de inicio

### Filtros
- Por cliente
- Por estado
- Por objetivo

---

## Análisis

Sección de diagnósticos profundos.

### Diagnóstico Automático
- Cambios significativos detectados
- Análisis de tendencias
- Comparativa semana vs semana

### Executive Summary
- Resumen listo para cliente
- Copiable con un click
- Formato WhatsApp-friendly

---

## Anuncios

El corazón de Emiti Metrics: clasificación automática de anuncios.

### Sistema de Clasificación

| Clasificación | Color | Significado |
|--------------|-------|-------------|
| GANADOR | 🟢 Verde | CTR >1.5%, CPR estable, frecuencia <3 |
| ESCALABLE | 🔵 Azul | Buen rendimiento, potencial de crecimiento |
| TESTING | 🟡 Amarillo | Pocos datos, en período de aprendizaje |
| FATIGADO | 🟠 Naranja | Señales de fatiga, preparar reemplazo |
| PAUSAR | 🔴 Rojo | Fatiga crítica, pausar inmediatamente |

### Vista de 1 Línea
Cada anuncio muestra:
- Nombre + Ad Set
- CPR y CTR
- Total de resultados
- Clasificación (badge de color)

### Métricas de Fatiga
- **Fatigue Score**: 0-100
- **Días de vida restantes**: Predicción
- **Tendencias**: CTR, CPR, Frecuencia
- **Recomendaciones**: Qué hacer

---

## Alertas

Sistema de notificaciones proactivo.

### Tipos de Alertas

| Tipo | Severidad | Descripción |
|------|-----------|-------------|
| FATIGUE_DETECTED | Warning | Anuncio mostrando fatiga |
| NEW_WINNER | Info | Nuevo anuncio ganador detectado |
| CPA_INCREASE | Critical | CPR subió significativamente |
| CTR_DROP | Warning | CTR cayó más del 20% |
| PERFORMANCE_SPIKE | Info | Pico de rendimiento positivo |
| BUDGET_DEPLETED | Critical | Budget agotándose |

### Vista de Alertas
- Filtro por severidad
- Marcar como leída/acknowledged
- Link a campaña/anuncio afectado

---

## Pattern Mining

**NUEVA FEATURE v2.0**

El Pattern Mining detecta automáticamente correlaciones ocultas en los datos del cliente.

### Tipos de Patrones Detectados

| Categoría | Ejemplos de Patrones |
|-----------|---------------------|
| **Format** | "Videos superan a imágenes en 35%" |
| **Creative** | "Testimoniales generan más confianza" |
| **Timing** | "Fines de semana tienen mejor conversión" |
| **Messaging** | "Promociones 2x1 convierten 40% mejor" |
| **Audience** | "Lookalikes superan a intereses" |

### Información por Patrón
- **Patrón detectado**: Descripción del hallazgo
- **Impacto**: Cuantificación del efecto ("CPR 25% menor")
- **Confianza**: Alta/Media/Baja según cantidad de datos
- **Recomendación**: Qué hacer con este insight

### Cómo se Detectan

El sistema analiza:
1. Comparación entre formatos (video vs imagen vs carrusel)
2. Palabras clave en nombres de anuncios (promo, testimon, etc.)
3. Performance por día de la semana
4. Rendimiento por tipo de audiencia (lookalike, intereses, retargeting)

### Uso Práctico

- Revisar patrones antes de crear nuevos creativos
- Aplicar los patrones "works" a futuros anuncios
- Evitar lo que el patrón dice "doesn't work"

---

## Simulador de Escenarios

**NUEVA FEATURE v2.0**

Proyecta el impacto de cambios antes de hacerlos.

### Simular Cambio de Budget

Ingresá un % de cambio (+20%, -30%, etc.) y obtené:

| Métrica | Actual | Proyectado | Cambio |
|---------|--------|------------|--------|
| Gasto | $100,000 | $120,000 | +$20,000 |
| Resultados | 1,000 | 1,160 | +160 |
| CPR | $100 | $103 | +3% |

#### Consideraciones del Modelo

- **Rendimientos decrecientes**: Al aumentar budget, cada peso adicional rinde menos
- **Factor de eficiencia**: Se aplica 80% de eficiencia en aumentos
- **Confianza**: Media (basado en data histórica)

### Simular Pausar Anuncio

Seleccioná un anuncio y visualizá:

- **Contribución actual**: Cuántos resultados genera, % del total
- **Sin el anuncio**: Cómo quedan las métricas si lo pausás
- **Con redistribución**: Si movés su budget a otros anuncios
- **Recomendación**: Pausar o mantener

#### Lógica de Redistribución

El sistema calcula cuántos resultados generarías si el budget del anuncio pausado se redistribuye a los demás anuncios según su CPR promedio.

---

## Diagnósticos Avanzados

**NUEVAS FEATURES v2.0**

### Account Quality Score

Evalúa si la cuenta tiene suficientes datos para análisis confiable.

#### Cómo se Calcula

| Factor | Penalización |
|--------|-------------|
| < 7 días de datos | -30 puntos |
| 7-14 días de datos | -15 puntos |
| < 1,000 impresiones | -25 puntos |
| 1,000-10,000 impresiones | -10 puntos |
| < 10 resultados | -25 puntos |
| 10-50 resultados | -10 puntos |
| < 3 anuncios únicos | -15 puntos |

#### Estados

| Score | Estado | Significado |
|-------|--------|-------------|
| 70-100 | ✅ Ready | Análisis completo posible |
| 40-69 | ⚠️ Limited | Análisis con limitaciones |
| 0-39 | ❌ Insufficient | Datos insuficientes |

### Predicción de Saturación de Audiencia

Detecta cuando una audiencia se está agotando.

#### Señales Analizadas
- **Frecuencia creciente**: Si sube >20% vs período anterior
- **Reach decreciente**: Si baja >10% vs período anterior
- **Frecuencia alta absoluta**: Si supera 5x por persona

#### Estados de Saturación

| Score | Estado | Recomendación |
|-------|--------|---------------|
| 0-39 | Healthy | Audiencia saludable |
| 40-69 | Warning | Considerar expandir |
| 70-100 | Critical | Expandir urgente o pausar |

#### Predicción
- **Días restantes estimados**: Cuánto tiempo hasta saturación crítica

### Competition Proxy

Analiza presión competitiva a través del CPM.

#### Métricas
- **Tendencia de CPM**: Subiendo = más competencia
- **Mejores días**: Cuándo hay menos competencia (CPM bajo)
- **Peores días**: Cuándo hay más competencia (CPM alto)

#### Uso Práctico
- Concentrar budget en días de menor competencia
- Ajustar expectativas cuando CPM sube por factores externos

---

## ROI de Agencia

**NUEVA FEATURE v2.0**

Demuestra el valor que la agencia genera para el cliente.

### Métricas del ROI

| Métrica | Descripción |
|---------|-------------|
| **Total Spend Managed** | Cuánto dinero maneja la agencia |
| **Total Results** | Resultados generados |
| **Optimized CPR** | CPR actual (con optimización) |
| **Unoptimized CPR Est.** | CPR estimado sin optimización (+25%) |
| **Extra Results Generated** | Resultados adicionales por optimización |
| **Estimated Value Generated** | Valor monetario del extra |

### Cálculo

```
CPR sin agencia = CPR actual × 1.25
Resultados sin agencia = Gasto total / CPR sin agencia
Resultados extra = Resultados actuales - Resultados sin agencia
Valor generado = Resultados extra × Valor por resultado
```

### Uso

- **Justificar fees**: Demostrar que la agencia genera más valor del que cobra
- **Reporting**: Incluir en reportes mensuales
- **Renovaciones**: Argumento para mantener o aumentar contratos

---

## Playbook

**NUEVA FEATURE v2.0**

Genera una guía de mejores prácticas específica para cada cliente.

### Contenido del Playbook

#### Información General
- Nombre del cliente
- Fecha de generación
- Quality Score actual

#### Aprendizajes
Lista de patrones detectados:
- ✅ **Works**: Lo que funciona bien
- 💡 **Insight**: Observaciones importantes
- Evidencia de cada aprendizaje

#### Estructura Recomendada
- **Ads por Ad Set**: 3-5 recomendado
- **Ad Sets por Campaign**: 2-4 recomendado
- **Rotación de Creativos**: Cada 14-21 días

#### DO (Hacer)
Lista de acciones recomendadas basadas en los patrones detectados:
- "Usar formato video"
- "Incluir testimoniales"
- "Aumentar budget los fines de semana"

#### DON'T (No Hacer)
- Usar un solo anuncio por ad set
- Dejar anuncios fatigados corriendo
- Ignorar frecuencia alta

#### MONITOR (Monitorear)
- Frecuencia > 3.5
- CTR cayendo >20% semanal
- CPR subiendo >30% semanal

### Uso del Playbook

1. **Onboarding de ejecutivos**: Nuevo ejecutivo puede entender rápido al cliente
2. **Brief a creativos**: Qué incluir en los próximos ads
3. **Checklist semanal**: Qué revisar cada semana

---

## Snapshots Históricos

**NUEVA FEATURE v2.0**

Guarda el estado del análisis en un momento para comparar evolución.

### Crear Snapshot

Seleccioná un período y guardá:
- Métricas del período (spend, results, CPR, CTR)
- Patrones detectados
- Quality Score
- Fecha de creación

### Listar Snapshots

Ver histórico de snapshots con:
- ID del snapshot
- Período cubierto
- Resumen de métricas
- Fecha de creación

### Comparar Snapshots

Seleccioná dos snapshots y obtené:

| Métrica | Período 1 | Período 2 | Cambio % |
|---------|-----------|-----------|----------|
| Spend | $80,000 | $100,000 | +25% |
| Results | 800 | 1,000 | +25% |
| CPR | $100 | $100 | 0% |
| CTR | 1.5% | 1.8% | +20% ✅ |

#### Cambios en Clasificaciones
- **Nuevos ganadores**: Anuncios que pasaron a GANADOR
- **Nuevos fatigados**: Anuncios que se fatigaron
- **Recuperados**: Anuncios que mejoraron

### Tendencias Históricas

Visualizá la evolución de una métrica a lo largo del tiempo:
- Gráfico con data points por snapshot
- Cambio total desde el primer snapshot
- Dirección de la tendencia: Mejorando / Declinando / Estable

---

## Reportes

Generación de reportes para clientes.

### Tipos de Reportes
- Reporte semanal
- Reporte mensual
- Reporte por campaña

### Formato
- PDF descargable
- Incluye métricas, gráficos y recomendaciones

---

## Métricas

Vista detallada de todos los datos.

### Métricas Disponibles
- Impresiones
- Alcance
- Clicks
- Gasto
- Resultados
- CPR (Costo por Resultado)
- CTR (Click-Through Rate)
- CPM (Costo por Mil)
- Frecuencia

### Filtros
- Por fecha
- Por cliente
- Por campaña
- Por anuncio

---

## Clientes

Gestión de clientes de la agencia.

### Información de Cliente
- Nombre
- Industria
- Meta Account ID
- Estado (Activo/Inactivo)
- Color asignado

### Configuración por Cliente

Cada cliente puede tener configuración personalizada:

| Configuración | Descripción |
|---------------|-------------|
| **Objective** | MESSAGES, SALES, LEADS, TRAFFIC, AWARENESS |
| **Currency** | ARS, USD, etc. |
| **Monthly Budget** | Budget mensual esperado |
| **Result Value** | Valor monetario por resultado |
| **Thresholds** | Umbrales personalizados para clasificación |

### Thresholds Personalizables

| Umbral | Default | Descripción |
|--------|---------|-------------|
| min_results_winner | 10 | Mínimo resultados para ser GANADOR |
| max_cpr_winner | 150 | CPR máximo para ser GANADOR |
| min_ctr_winner | 1.5% | CTR mínimo para ser GANADOR |
| min_frequency_fatigued | 3.5 | Frecuencia que indica fatiga |
| ctr_drop_fatigued | 20% | Caída de CTR que indica fatiga |

---

## Comparar

Comparativa entre múltiples clientes.

### Métricas Comparadas
- CPR (mejor = menor)
- CTR (mejor = mayor)
- Resultados totales
- Cantidad de ganadores
- Cantidad de fatigados

### Insights Automáticos
- "TechMobile tiene el mejor CPR ($85)"
- "Bella Fitness tiene el mejor CTR (2.1%)"
- "CPR promedio industria Restaurantes: $95"

---

## Personalización

### Selector de Tema

15 paletas de colores disponibles:
- Bosque (default - verde vibrante)
- Océano
- Sunset
- Carbón
- Lavanda
- Coral
- Menta
- Rosa Moderno
- Índigo
- Esmeralda
- Vino
- Dorado
- Medianoche
- Terracota
- **Emiti** (paleta oficial de la agencia)

### Modo Oscuro
- Toggle automático o manual
- Todas las paletas funcionan en ambos modos

### Restaurar Defaults
- Botón para volver a configuración original

---

## API Avanzada

**NUEVA v2.0**

Todos los análisis están disponibles via API REST.

### Endpoints Principales

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/advanced/upload/{client_id}` | POST | Subir datos CSV |
| `/api/advanced/patterns/{client_id}` | GET | Pattern Mining |
| `/api/advanced/simulate/budget` | POST | Simular cambio de budget |
| `/api/advanced/simulate/pause` | POST | Simular pausar anuncio |
| `/api/advanced/diagnostics/structure/{client_id}` | GET | Diagnóstico de estructura |
| `/api/advanced/diagnostics/quality/{client_id}` | GET | Account Quality Score |
| `/api/advanced/diagnostics/saturation/{client_id}` | GET | Saturación de audiencia |
| `/api/advanced/diagnostics/competition/{client_id}` | GET | Competition Proxy |
| `/api/advanced/roi/{client_id}` | GET | ROI de agencia |
| `/api/advanced/playbook/{client_id}` | GET | Playbook |
| `/api/advanced/snapshots` | POST | Crear snapshot |
| `/api/advanced/snapshots/{client_id}` | GET | Listar snapshots |
| `/api/advanced/snapshots/compare` | POST | Comparar snapshots |
| `/api/advanced/trends/{client_id}/{metric}` | GET | Tendencias históricas |
| `/api/advanced/learnings` | POST/GET | Knowledge Base |
| `/api/advanced/actions` | POST/GET | Log de acciones |
| `/api/advanced/config/{client_id}` | PUT/GET | Configuración cliente |
| `/api/advanced/full-analysis/{client_id}` | GET | Análisis completo |

### Ejemplo: Análisis Completo

```bash
curl http://localhost:8000/api/advanced/full-analysis/rc
```

Respuesta:
```json
{
  "quality_score": { "score": 85, "status": "ready", ... },
  "patterns": [...],
  "structure_diagnostics": [...],
  "saturation": { "score": 25, "status": "healthy", ... },
  "competition": { "cpm_trend": {...}, ... },
  "config": { "objective": "MESSAGES", ... },
  "learnings": [...],
  "recent_actions": { "total_actions": 15, ... }
}
```

---

## Glosario de Términos

| Término | Definición |
|---------|------------|
| CPR | Costo Por Resultado - cuánto cuesta cada conversión |
| CTR | Click-Through Rate - % de clicks sobre impresiones |
| CPM | Costo Por Mil - costo cada 1000 impresiones |
| Frecuencia | Promedio de veces que una persona ve el anuncio |
| Fatigue Score | Puntuación de desgaste del anuncio (0-100) |
| Health Score | Puntuación de salud del cliente (0-100) |
| Quality Score | Puntuación de calidad de datos (0-100) |
| Pacing | Ritmo de gasto vs tiempo transcurrido |
| Asset Dependency | Dependencia de pocos creativos |
| Saturation Score | Nivel de agotamiento de audiencia (0-100) |
| Pattern | Correlación detectada en los datos |
| Playbook | Guía de mejores prácticas personalizada |
| Snapshot | Foto del análisis en un momento dado |

---

## Flujo de Trabajo Recomendado

### Mañana (5-10 min)
1. Revisar **Morning Brief** para prioridades del día
2. Atender alertas **críticas** primero
3. Revisar clientes en estado **Atención** o **Crítico**
4. Verificar **Quality Score** de cuentas nuevas

### Durante el Día
1. Pausar anuncios marcados como **PAUSAR**
2. Escalar anuncios **GANADOR** (+20-30% budget)
3. Usar **Simulador** antes de cambios grandes
4. Preparar creativos de reemplazo para **FATIGADOS**
5. Revisar **Saturación** de audiencias

### Semanal
1. Revisar **Pattern Mining** por cliente
2. Generar **Playbook** actualizado
3. Crear **Snapshot** semanal
4. Revisar **Tendencias** de métricas clave
5. Actualizar **Knowledge Base**

### Fin de Mes
1. Revisar **Budget Pacing** de todos los clientes
2. Comparar **Snapshots** mes anterior vs actual
3. Generar reporte con **ROI de Agencia**
4. Ajustar budgets según proyecciones
5. Enviar reportes mensuales
6. Actualizar metas para el próximo mes

---

## Casos de Uso

### 1. Cliente Nuevo: ¿Puedo analizar?

1. Subir CSV de datos
2. Verificar **Account Quality Score**
3. Si < 40: Esperar más datos
4. Si >= 40: Proceder con análisis

### 2. Preparar Próxima Campaña

1. Revisar **Pattern Mining** → Qué funciona
2. Revisar **Playbook** → DO y DON'T
3. Revisar **Saturación** → Necesito nuevas audiencias?
4. Revisar **Competition Proxy** → Mejores días para lanzar

### 3. Justificar Fee de Agencia

1. Generar **ROI de Agencia**
2. Mostrar extra results generados
3. Mostrar valor monetario generado
4. Comparar con fee cobrado

### 4. Cliente Pregunta "¿Qué Hicieron?"

1. Revisar **Log de Acciones**
2. Comparar **Snapshots** período anterior vs actual
3. Mostrar mejoras en métricas
4. Destacar patrones aplicados

---

## Soporte

Para dudas o sugerencias:
- **Equipo Emiti**: contacto@emiti.com
- **Documentación**: Esta guía
- **Actualizaciones**: Síguenos para nuevas funcionalidades

---

*Emiti Metrics v2.0 - Construido con ❤️ para agencias que quieren resultados*

**Changelog v2.0:**
- Pattern Mining
- Simulador de Escenarios
- Account Quality Score
- Predicción de Saturación
- Competition Proxy
- ROI de Agencia
- Playbook Generator
- Structure Diagnostics
- Snapshots Históricos
- API Avanzada completa
