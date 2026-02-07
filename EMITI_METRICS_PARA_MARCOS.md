# Emiti Metrics

**Tu copiloto para Meta Ads**

---

## El Problema

Manejar campañas de Meta Ads para varios clientes es un quilombo:

- Revisar cada anuncio manualmente lleva horas
- Cuando te das cuenta que algo anda mal, ya perdiste plata
- El cliente pregunta "¿cómo van mis ads?" y tardás en responder
- No tenés forma fácil de demostrar el valor que generás

---

## La Solución

Emiti Metrics analiza automáticamente todas las campañas y te dice:

**"Este anuncio está funcionando, escalalo"**
**"Este otro se está agotando, cambiá el creativo"**
**"Ojo que el presupuesto se acaba en 3 días"**

Sin que tengas que revisar nada manualmente.

---

## Qué Hace

### 1. Clasifica tus anuncios automáticamente

| Clasificación | Qué significa | Qué hacer |
|---------------|---------------|-----------|
| **GANADOR** | Rinde muy bien | Mantener, escalar |
| **ESCALABLE** | Buen potencial | Subir budget |
| **TESTING** | Muy nuevo | Esperar datos |
| **FATIGADO** | La gente ya lo vio mucho | Cambiar creativo |
| **PAUSAR** | No funciona | Cortar pérdidas |

### 2. Detecta patrones

- "Los videos rinden 40% mejor que las imágenes"
- "Los martes tenés mejor CPR"
- "Los carruseles no funcionan para este cliente"

Esto lo aprendés automáticamente de los datos, no adivinando.

### 3. Te avisa antes de que sea tarde

**Alertas automáticas:**
- Presupuesto agotándose
- CPR subiendo mucho
- Anuncio fatigado
- Nuevo ganador detectado

### 4. Simula antes de actuar

¿Querés subir el budget 20%? El simulador te dice:
- Cuántos resultados extra vas a tener
- Cuánto va a subir el CPR (rendimientos decrecientes)
- Si conviene o no

### 5. Demuestra tu valor

**ROI de Agencia**: Muestra cuántos resultados extra generaste vs. si el cliente manejara solo sus ads.

---

## Cómo Funciona

```
Meta Ads Manager → Exportar CSV → Subir a Emiti → Ver análisis
```

**Tiempo: 2 minutos**

1. Exportás el CSV desde Meta (como siempre)
2. Lo subís a Emiti Metrics
3. Listo - tenés dashboard, alertas, recomendaciones

---

## Para Quién Es

**Para la agencia (nosotros):**
- Ahorrás horas de análisis manual
- Detectás problemas antes
- Tenés argumentos concretos para el cliente
- Escalás sin contratar más gente

**Para el cliente:**
- Ve su inversión optimizada
- Entiende qué funciona
- Confía más en la agencia

---

## Estado Actual

**Funcionando en:** http://76.13.166.17:8080

| Feature | Estado |
|---------|--------|
| Dashboard con métricas | Listo |
| Clasificación de anuncios | Listo |
| Alertas (presupuesto, fatiga, CPR) | Listo |
| Patrones detectados | Listo |
| Simulador de budget | Listo |
| Playbook por cliente | Listo |
| ROI de agencia | Listo |
| Upload de CSV | Listo |
| App instalable (PWA) | Listo |
| Responsive (mobile) | Listo |

---

## Lo Que Viene (Opcional)

Estas son mejoras para más adelante, no urgentes:

1. **Conectar directo con Meta** - Sin exportar CSV
2. **Alertas por WhatsApp/email** - Te avisa al toque
3. **Reportes automáticos** - PDF semanal para el cliente
4. **Predicciones** - Anticipar problemas antes de que pasen

---

## Cómo Usa Inteligencia Artificial

Emiti Metrics usa algoritmos inteligentes para:

**1. Clasificar anuncios**
- Analiza CPR, CTR, frecuencia y tendencias
- Compara cada anuncio contra el promedio de la cuenta
- Detecta patrones de fatiga (cuando la frecuencia sube y el CTR baja)

**2. Detectar patrones**
- Agrupa anuncios por tipo (video, imagen, carrusel)
- Calcula rendimiento promedio de cada grupo
- Identifica qué formato funciona mejor para cada cliente

**3. Predecir saturación**
- Mide la tendencia de frecuencia en el tiempo
- Estima cuántos días quedan antes de fatigar la audiencia
- Sugiere cuándo rotar creativos

**4. Simular escenarios**
- Modela rendimientos decrecientes (más budget ≠ resultados proporcionales)
- Proyecta impacto de cambios antes de hacerlos
- Calcula redistribución óptima de presupuesto

No es "IA mágica" - son algoritmos concretos basados en las mejores prácticas de Meta Ads, aplicados automáticamente a tus datos.

---

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind
- **Backend**: Python + FastAPI + Pandas/NumPy
- **Base de datos**: SQLite
- **Hosting**: VPS en Hostinger

**Código**: https://github.com/TomasDolino/emiti-metrics

---

## Resumen

Emiti Metrics es una herramienta que te hace la vida más fácil manejando Meta Ads:

- **Menos tiempo** revisando manualmente
- **Menos errores** porque te avisa antes
- **Más valor** demostrable al cliente
- **Más escala** sin más laburo

Ya está funcionando. Entrá y probalo.

---

**Link:** http://76.13.166.17:8080

*Febrero 2026*
