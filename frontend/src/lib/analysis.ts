import type { MetricsData, AdAnalysis, AdClassification, Alert, CampaignObjective } from '../types'

// ==================== CLASSIFICATION THRESHOLDS ====================

interface Thresholds {
  ganador: {
    minResults: number
    maxCpr: number      // Cost per result
    minCtr: number
  }
  fatigado: {
    minFrequency: number
    ctrDropPercent: number
  }
  pausar: {
    minSpend: number
    maxResults: number
    maxCtr: number
  }
}

// Default thresholds (can be customized per client/objective)
const DEFAULT_THRESHOLDS: Thresholds = {
  ganador: {
    minResults: 10,
    maxCpr: 150,        // $150 ARS per result max
    minCtr: 1.5,        // 1.5% CTR minimum
  },
  fatigado: {
    minFrequency: 3.5,  // Seen 3.5+ times on average
    ctrDropPercent: 20, // CTR dropped 20%+
  },
  pausar: {
    minSpend: 1000,     // Spent at least $1000
    maxResults: 2,      // Less than 2 results
    maxCtr: 0.5,        // CTR below 0.5%
  }
}

// ==================== METRICS CALCULATIONS ====================

export function calculateCTR(clicks: number, impressions: number): number {
  if (impressions === 0) return 0
  return (clicks / impressions) * 100
}

export function calculateCPR(spend: number, results: number): number {
  if (results === 0) return Infinity
  return spend / results
}

export function calculateCPM(spend: number, impressions: number): number {
  if (impressions === 0) return 0
  return (spend / impressions) * 1000
}

export function calculateROAS(revenue: number, spend: number): number {
  if (spend === 0) return 0
  return revenue / spend
}

export function calculateFrequency(impressions: number, reach: number): number {
  if (reach === 0) return 0
  return impressions / reach
}

// ==================== TREND ANALYSIS ====================

export function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export function getTrendDirection(percent: number): 'up' | 'down' | 'stable' {
  if (percent > 5) return 'up'
  if (percent < -5) return 'down'
  return 'stable'
}

// For metrics where lower is better (CPR, CPC, etc.)
export function isNegativeTrendGood(metric: string): boolean {
  return ['cpr', 'cpc', 'cpm', 'costPerResult', 'costPerLead'].includes(metric)
}

// ==================== AD CLASSIFICATION ====================

export function classifyAd(
  metrics: MetricsData[],
  thresholds: Thresholds = DEFAULT_THRESHOLDS
): { classification: AdClassification; reason: string } {

  if (metrics.length < 3) {
    return { classification: 'TESTING', reason: 'Pocos datos, necesita más tiempo' }
  }

  const totalSpend = metrics.reduce((sum, m) => sum + m.spend, 0)
  const totalResults = metrics.reduce((sum, m) => sum + m.results, 0)
  const avgCtr = metrics.reduce((sum, m) => sum + m.ctr, 0) / metrics.length
  const avgFrequency = metrics.reduce((sum, m) => sum + m.frequency, 0) / metrics.length
  const avgCpr = totalResults > 0 ? totalSpend / totalResults : Infinity

  // Check for fatigue first
  const recentMetrics = metrics.slice(-7)
  const olderMetrics = metrics.slice(-14, -7)

  if (olderMetrics.length >= 3) {
    const recentCtr = recentMetrics.reduce((sum, m) => sum + m.ctr, 0) / recentMetrics.length
    const olderCtr = olderMetrics.reduce((sum, m) => sum + m.ctr, 0) / olderMetrics.length
    const ctrChange = calculateTrend(recentCtr, olderCtr)

    if (avgFrequency >= thresholds.fatigado.minFrequency && ctrChange < -thresholds.fatigado.ctrDropPercent) {
      return {
        classification: 'FATIGADO',
        reason: `Frecuencia alta (${avgFrequency.toFixed(1)}) y CTR cayendo ${Math.abs(ctrChange).toFixed(0)}%`
      }
    }
  }

  // Check for winner
  if (
    totalResults >= thresholds.ganador.minResults &&
    avgCpr <= thresholds.ganador.maxCpr &&
    avgCtr >= thresholds.ganador.minCtr
  ) {
    return {
      classification: 'GANADOR',
      reason: `CPR bajo ($${avgCpr.toFixed(0)}), CTR alto (${avgCtr.toFixed(1)}%), ${totalResults} resultados`
    }
  }

  // Check for scalable (good but not great)
  if (totalResults >= thresholds.ganador.minResults / 2 && avgCpr <= thresholds.ganador.maxCpr * 1.5) {
    return {
      classification: 'ESCALABLE',
      reason: `Performance estable, potencial de mejora`
    }
  }

  // Check for pause
  if (
    totalSpend >= thresholds.pausar.minSpend &&
    (totalResults <= thresholds.pausar.maxResults || avgCtr < thresholds.pausar.maxCtr)
  ) {
    return {
      classification: 'PAUSAR',
      reason: `Gasto alto ($${totalSpend.toFixed(0)}) con pocos resultados (${totalResults})`
    }
  }

  // Default to testing
  return { classification: 'TESTING', reason: 'En evaluación' }
}

// ==================== FATIGUE DETECTION ====================

export function calculateFatigueScore(
  avgFrequency: number,
  ctrTrend: number,
  daysRunning: number
): number {
  let score = 0

  // Frequency contribution (0-40 points)
  if (avgFrequency >= 5) score += 40
  else if (avgFrequency >= 4) score += 30
  else if (avgFrequency >= 3) score += 20
  else if (avgFrequency >= 2) score += 10

  // CTR trend contribution (0-40 points)
  if (ctrTrend < -30) score += 40
  else if (ctrTrend < -20) score += 30
  else if (ctrTrend < -10) score += 20
  else if (ctrTrend < 0) score += 10

  // Days running contribution (0-20 points)
  if (daysRunning >= 30) score += 20
  else if (daysRunning >= 21) score += 15
  else if (daysRunning >= 14) score += 10
  else if (daysRunning >= 7) score += 5

  return Math.min(score, 100)
}

// ==================== ALERT GENERATION ====================

export function generateAlerts(
  metrics: MetricsData[],
  previousMetrics: MetricsData[],
  objective: CampaignObjective
): Alert[] {
  const alerts: Alert[] = []
  const now = new Date().toISOString()

  // Aggregate current and previous periods
  const currentSpend = metrics.reduce((sum, m) => sum + m.spend, 0)
  const currentResults = metrics.reduce((sum, m) => sum + m.results, 0)
  const currentCpr = currentResults > 0 ? currentSpend / currentResults : 0
  const currentCtr = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.ctr, 0) / metrics.length
    : 0

  const prevSpend = previousMetrics.reduce((sum, m) => sum + m.spend, 0)
  const prevResults = previousMetrics.reduce((sum, m) => sum + m.results, 0)
  const prevCpr = prevResults > 0 ? prevSpend / prevResults : 0
  const prevCtr = previousMetrics.length > 0
    ? previousMetrics.reduce((sum, m) => sum + m.ctr, 0) / previousMetrics.length
    : 0

  // ROAS drop for sales campaigns
  if (objective === 'SALES') {
    const currentRevenue = metrics.reduce((sum, m) => sum + (m.purchaseValue || 0), 0)
    const prevRevenue = previousMetrics.reduce((sum, m) => sum + (m.purchaseValue || 0), 0)
    const currentRoas = currentSpend > 0 ? currentRevenue / currentSpend : 0
    const prevRoas = prevSpend > 0 ? prevRevenue / prevSpend : 0
    const roasChange = calculateTrend(currentRoas, prevRoas)

    if (roasChange < -30) {
      alerts.push({
        id: `alert-roas-${now}`,
        type: 'ROAS_DROP',
        severity: roasChange < -50 ? 'CRITICAL' : 'WARNING',
        title: 'Caída de ROAS',
        message: `ROAS cayó ${Math.abs(roasChange).toFixed(0)}% respecto al período anterior`,
        metric: 'roas',
        previousValue: prevRoas,
        currentValue: currentRoas,
        changePercent: roasChange,
        createdAt: now,
        acknowledged: false
      })
    }
  }

  // CPA increase
  if (prevCpr > 0 && currentCpr > 0) {
    const cprChange = calculateTrend(currentCpr, prevCpr)
    if (cprChange > 50) {
      alerts.push({
        id: `alert-cpa-${now}`,
        type: 'CPA_INCREASE',
        severity: cprChange > 100 ? 'CRITICAL' : 'WARNING',
        title: 'Aumento de costo por resultado',
        message: `El CPR aumentó ${cprChange.toFixed(0)}% ($${prevCpr.toFixed(0)} → $${currentCpr.toFixed(0)})`,
        metric: 'cpr',
        previousValue: prevCpr,
        currentValue: currentCpr,
        changePercent: cprChange,
        createdAt: now,
        acknowledged: false
      })
    }
  }

  // CTR drop
  if (prevCtr > 0 && currentCtr > 0) {
    const ctrChange = calculateTrend(currentCtr, prevCtr)
    if (ctrChange < -25) {
      alerts.push({
        id: `alert-ctr-${now}`,
        type: 'CTR_DROP',
        severity: 'WARNING',
        title: 'CTR en descenso',
        message: `El CTR cayó ${Math.abs(ctrChange).toFixed(0)}% (${prevCtr.toFixed(2)}% → ${currentCtr.toFixed(2)}%)`,
        metric: 'ctr',
        previousValue: prevCtr,
        currentValue: currentCtr,
        changePercent: ctrChange,
        createdAt: now,
        acknowledged: false
      })
    }
  }

  return alerts
}

// ==================== RECOMMENDATIONS ====================

export function generateRecommendations(analysis: AdAnalysis): string[] {
  const recommendations: string[] = []

  switch (analysis.classification) {
    case 'GANADOR':
      recommendations.push('Aumentar presupuesto gradualmente (20-30%)')
      recommendations.push('Crear variaciones del creativo para testear')
      recommendations.push('Expandir audiencia similar')
      break

    case 'ESCALABLE':
      recommendations.push('Mantener presupuesto actual')
      recommendations.push('Optimizar segmentación')
      recommendations.push('Probar diferentes horarios de publicación')
      break

    case 'TESTING':
      recommendations.push('Esperar más datos (mínimo 7 días)')
      recommendations.push('Monitorear métricas diariamente')
      break

    case 'FATIGADO':
      recommendations.push('Pausar temporalmente')
      recommendations.push('Refrescar creativo')
      recommendations.push('Cambiar copy o imágenes')
      if (analysis.avgFrequency > 4) {
        recommendations.push('Reducir frecuencia ampliando audiencia')
      }
      break

    case 'PAUSAR':
      recommendations.push('Pausar inmediatamente')
      recommendations.push('Analizar por qué no funcionó')
      recommendations.push('Reasignar presupuesto a ganadores')
      break
  }

  // Additional context-based recommendations
  if (analysis.avgCtr < 1) {
    recommendations.push('CTR bajo: revisar relevancia del mensaje')
  }

  if (analysis.avgFrequency > 3 && analysis.classification !== 'FATIGADO') {
    recommendations.push('Frecuencia elevada: monitorear fatiga')
  }

  return recommendations
}

// ==================== FORMATTING HELPERS ====================

export function formatMoney(amount: number, currency = 'ARS'): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-AR').format(value)
}

export function formatCompactNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toString()
}
