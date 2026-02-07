// ==================== CLIENTS ====================

export interface Client {
  id: string
  name: string
  industry: string
  metaAccountId?: string
  isActive: boolean
  createdAt: string
  color: string
}

export const mockClients: Client[] = [
  { id: 'rc', name: 'Restauración Central', industry: 'Restaurantes', metaAccountId: 'act_123456', isActive: true, createdAt: '2024-01-15', color: '#ef4444' },
  { id: 'tm', name: 'TechMobile', industry: 'E-commerce', metaAccountId: 'act_234567', isActive: true, createdAt: '2024-02-01', color: '#3b82f6' },
  { id: 'bf', name: 'Bella Fitness', industry: 'Fitness', metaAccountId: 'act_345678', isActive: true, createdAt: '2024-01-20', color: '#22c55e' },
  { id: 'cd', name: 'Casa Deco', industry: 'E-commerce', metaAccountId: 'act_456789', isActive: true, createdAt: '2024-03-01', color: '#f59e0b' },
  { id: 'dr', name: 'Dr. Smile', industry: 'Salud', metaAccountId: 'act_567890', isActive: false, createdAt: '2023-11-01', color: '#8b5cf6' },
  { id: 'pm', name: 'Pizza Maestro', industry: 'Restaurantes', metaAccountId: 'act_678901', isActive: true, createdAt: '2024-02-15', color: '#ec4899' },
]

// ==================== CAMPAIGNS ====================

export interface Campaign {
  id: string
  clientId: string
  name: string
  status: 'ACTIVE' | 'PAUSED'
  objective: 'MESSAGES' | 'SALES' | 'LEADS' | 'TRAFFIC' | 'AWARENESS'
  budget: number
  startDate: string
  endDate?: string
}

export const mockCampaigns: Campaign[] = [
  // Restauración Central
  { id: 'c1', clientId: 'rc', name: 'Mensajes WhatsApp - Delivery', status: 'ACTIVE', objective: 'MESSAGES', budget: 50000, startDate: '2024-01-15' },
  { id: 'c2', clientId: 'rc', name: 'Reservas Online', status: 'ACTIVE', objective: 'LEADS', budget: 30000, startDate: '2024-02-01' },
  { id: 'c3', clientId: 'rc', name: 'Branding Local', status: 'PAUSED', objective: 'AWARENESS', budget: 20000, startDate: '2024-01-20' },
  // TechMobile
  { id: 'c4', clientId: 'tm', name: 'Ventas Celulares', status: 'ACTIVE', objective: 'SALES', budget: 100000, startDate: '2024-02-01' },
  { id: 'c5', clientId: 'tm', name: 'Accesorios - Remarketing', status: 'ACTIVE', objective: 'SALES', budget: 40000, startDate: '2024-02-15' },
  // Bella Fitness
  { id: 'c6', clientId: 'bf', name: 'Inscripciones Gym', status: 'ACTIVE', objective: 'LEADS', budget: 60000, startDate: '2024-01-20' },
  { id: 'c7', clientId: 'bf', name: 'Clases Online', status: 'ACTIVE', objective: 'SALES', budget: 25000, startDate: '2024-03-01' },
  // Casa Deco
  { id: 'c8', clientId: 'cd', name: 'Muebles - Catálogo', status: 'ACTIVE', objective: 'SALES', budget: 80000, startDate: '2024-03-01' },
  { id: 'c9', clientId: 'cd', name: 'Mensajes Consultas', status: 'ACTIVE', objective: 'MESSAGES', budget: 35000, startDate: '2024-03-10' },
  // Pizza Maestro
  { id: 'c10', clientId: 'pm', name: 'Pedidos WhatsApp', status: 'ACTIVE', objective: 'MESSAGES', budget: 45000, startDate: '2024-02-15' },
  { id: 'c11', clientId: 'pm', name: 'Promociones Finde', status: 'ACTIVE', objective: 'MESSAGES', budget: 20000, startDate: '2024-03-01' },
]

// ==================== DAILY METRICS ====================

export interface DailyMetric {
  id: string
  clientId: string
  campaignId: string
  campaignName: string
  adSetName: string
  adName: string
  date: string
  impressions: number
  reach: number
  clicks: number
  spend: number
  results: number
  resultType: string
  frequency: number
}

// Generate realistic mock data
function generateDailyMetrics(): DailyMetric[] {
  const metrics: DailyMetric[] = []
  const today = new Date()

  const adsByClient: Record<string, { campaignId: string, adSetName: string, adName: string, basePerformance: number }[]> = {
    'rc': [
      { campaignId: 'c1', adSetName: 'Zona Norte', adName: 'Video Testimonial Cliente', basePerformance: 1.2 },
      { campaignId: 'c1', adSetName: 'Zona Norte', adName: 'Carrusel Platos', basePerformance: 0.9 },
      { campaignId: 'c1', adSetName: 'Zona Sur', adName: 'Video Testimonial Cliente', basePerformance: 1.1 },
      { campaignId: 'c2', adSetName: 'Lookalike', adName: 'Imagen Mesa Reservada', basePerformance: 0.8 },
    ],
    'tm': [
      { campaignId: 'c4', adSetName: 'Intereses Tech', adName: 'Video Unboxing iPhone', basePerformance: 1.4 },
      { campaignId: 'c4', adSetName: 'Intereses Tech', adName: 'Carrusel Ofertas', basePerformance: 1.0 },
      { campaignId: 'c4', adSetName: 'Remarketing', adName: 'DPA Catálogo', basePerformance: 1.3 },
      { campaignId: 'c5', adSetName: 'Compradores', adName: 'Accesorios Bundle', basePerformance: 0.95 },
    ],
    'bf': [
      { campaignId: 'c6', adSetName: 'Fitness Enthusiasts', adName: 'Video Transformación', basePerformance: 1.5 },
      { campaignId: 'c6', adSetName: 'Fitness Enthusiasts', adName: 'Testimonio Miembro', basePerformance: 1.1 },
      { campaignId: 'c6', adSetName: 'Lookalike', adName: 'Promo Inscripción', basePerformance: 0.85 },
      { campaignId: 'c7', adSetName: 'Workout Home', adName: 'Demo Clase', basePerformance: 1.0 },
    ],
    'cd': [
      { campaignId: 'c8', adSetName: 'Hogar Intereses', adName: 'Video Ambiente Living', basePerformance: 1.2 },
      { campaignId: 'c8', adSetName: 'Hogar Intereses', adName: 'Carrusel Productos', basePerformance: 0.9 },
      { campaignId: 'c9', adSetName: 'Retargeting Web', adName: 'DPA Muebles', basePerformance: 1.1 },
    ],
    'pm': [
      { campaignId: 'c10', adSetName: 'Zona Delivery', adName: 'Video Pizza Horno', basePerformance: 1.3 },
      { campaignId: 'c10', adSetName: 'Zona Delivery', adName: 'Promo 2x1', basePerformance: 1.4 },
      { campaignId: 'c11', adSetName: 'Finde Target', adName: 'Combo Familiar', basePerformance: 1.1 },
    ],
  }

  let metricId = 1

  for (const [clientId, ads] of Object.entries(adsByClient)) {
    for (const ad of ads) {
      const campaign = mockCampaigns.find(c => c.id === ad.campaignId)!

      for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
        const date = new Date(today)
        date.setDate(date.getDate() - daysAgo)

        const dayVariance = 0.7 + Math.random() * 0.6
        const fatigueFactor = daysAgo < 7 ? 1 : daysAgo < 14 ? 0.95 : daysAgo < 21 ? 0.9 : 0.85
        const weekendBoost = [0, 6].includes(date.getDay()) ? 1.2 : 1
        const performanceMultiplier = ad.basePerformance * dayVariance * fatigueFactor * weekendBoost

        const baseImpressions = 3000 + Math.random() * 5000
        const impressions = Math.round(baseImpressions * performanceMultiplier)
        const reach = Math.round(impressions * (0.7 + Math.random() * 0.2))
        const ctr = (1.2 + Math.random() * 1.5) * performanceMultiplier
        const clicks = Math.round(impressions * (ctr / 100))
        const cpm = 2 + Math.random() * 3
        const spend = (impressions / 1000) * cpm
        const cvr = (5 + Math.random() * 10) * performanceMultiplier
        const results = Math.round(clicks * (cvr / 100))
        const frequency = impressions / reach

        metrics.push({
          id: `m${metricId++}`,
          clientId,
          campaignId: ad.campaignId,
          campaignName: campaign.name,
          adSetName: ad.adSetName,
          adName: ad.adName,
          date: date.toISOString().split('T')[0],
          impressions,
          reach,
          clicks,
          spend,
          results: Math.max(1, results),
          resultType: campaign.objective === 'MESSAGES' ? 'Mensajes' : campaign.objective === 'SALES' ? 'Compras' : 'Leads',
          frequency
        })
      }
    }
  }

  return metrics
}

export const mockMetrics = generateDailyMetrics()

// ==================== AGGREGATED DATA HELPERS ====================

export function getMetricsByClient(clientId?: string) {
  return clientId ? mockMetrics.filter(m => m.clientId === clientId) : mockMetrics
}

export function getMetricsByDate(metrics: DailyMetric[]) {
  const byDate: Record<string, { date: string, impressions: number, clicks: number, spend: number, results: number, reach: number }> = {}

  for (const m of metrics) {
    if (!byDate[m.date]) {
      byDate[m.date] = { date: m.date, impressions: 0, clicks: 0, spend: 0, results: 0, reach: 0 }
    }
    byDate[m.date].impressions += m.impressions
    byDate[m.date].clicks += m.clicks
    byDate[m.date].spend += m.spend
    byDate[m.date].results += m.results
    byDate[m.date].reach += m.reach
  }

  return Object.values(byDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({
      ...d,
      ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
      cpr: d.results > 0 ? d.spend / d.results : 0,
      cpm: d.impressions > 0 ? (d.spend / d.impressions) * 1000 : 0,
    }))
}

export function getMetricsByAd(metrics: DailyMetric[]) {
  const byAd: Record<string, {
    adName: string
    adSetName: string
    campaignName: string
    clientId: string
    impressions: number
    clicks: number
    spend: number
    results: number
    reach: number
    days: number
    firstDate: string
    lastDate: string
  }> = {}

  for (const m of metrics) {
    const key = `${m.clientId}-${m.adName}`
    if (!byAd[key]) {
      byAd[key] = {
        adName: m.adName,
        adSetName: m.adSetName,
        campaignName: m.campaignName,
        clientId: m.clientId,
        impressions: 0, clicks: 0, spend: 0, results: 0, reach: 0, days: 0,
        firstDate: m.date, lastDate: m.date
      }
    }
    byAd[key].impressions += m.impressions
    byAd[key].clicks += m.clicks
    byAd[key].spend += m.spend
    byAd[key].results += m.results
    byAd[key].reach += m.reach
    byAd[key].days++
    if (m.date < byAd[key].firstDate) byAd[key].firstDate = m.date
    if (m.date > byAd[key].lastDate) byAd[key].lastDate = m.date
  }

  return Object.values(byAd).map(ad => ({
    ...ad,
    avgCtr: ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0,
    avgCostPerResult: ad.results > 0 ? ad.spend / ad.results : 0,
    avgFrequency: ad.reach > 0 ? ad.impressions / ad.reach : 0,
    totalSpend: ad.spend,
    totalResults: ad.results,
    daysRunning: ad.days,
  }))
}

// ==================== ADS ANALYSIS ====================

export interface AdAnalysis {
  adName: string
  adSetName: string
  campaignName: string
  clientId: string
  totalSpend: number
  totalResults: number
  avgCostPerResult: number
  avgCtr: number
  avgFrequency: number
  daysRunning: number
  classification: 'GANADOR' | 'ESCALABLE' | 'TESTING' | 'FATIGADO' | 'PAUSAR'
  classificationReason: string
  fatigueScore: number
  ctrTrend: number
  cprTrend: number
  frequencyTrend: number
  recommendations: string[]
  predictedDaysLeft: number
}

function classifyAd(ad: ReturnType<typeof getMetricsByAd>[0], clientMetrics: DailyMetric[]): AdAnalysis {
  const { avgCtr: ctr, avgCostPerResult: cpr, avgFrequency: frequency, daysRunning: days, totalResults: results } = ad

  const adMetrics = clientMetrics.filter(m => m.adName === ad.adName).sort((a, b) => a.date.localeCompare(b.date))
  const last7 = adMetrics.slice(-7)
  const prev7 = adMetrics.slice(-14, -7)

  const calcAvg = (arr: DailyMetric[], fn: (m: DailyMetric) => number) =>
    arr.length > 0 ? arr.reduce((sum, m) => sum + fn(m), 0) / arr.length : 0

  const last7Ctr = calcAvg(last7, m => m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0)
  const prev7Ctr = calcAvg(prev7, m => m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0) || ctr
  const ctrTrend = prev7Ctr > 0 ? ((last7Ctr - prev7Ctr) / prev7Ctr) * 100 : 0

  const last7Cpr = calcAvg(last7, m => m.results > 0 ? m.spend / m.results : 0)
  const prev7Cpr = calcAvg(prev7, m => m.results > 0 ? m.spend / m.results : 0) || cpr
  const cprTrend = prev7Cpr > 0 ? ((last7Cpr - prev7Cpr) / prev7Cpr) * 100 : 0

  const last7Freq = calcAvg(last7, m => m.frequency)
  const prev7Freq = calcAvg(prev7, m => m.frequency) || frequency
  const frequencyTrend = prev7Freq > 0 ? ((last7Freq - prev7Freq) / prev7Freq) * 100 : 0

  let fatigueScore = 0
  if (frequency >= 6) fatigueScore += 30
  else if (frequency >= 4) fatigueScore += 25
  else if (frequency >= 3) fatigueScore += 15
  else if (frequency >= 2) fatigueScore += 5

  if (ctrTrend < -25) fatigueScore += 30
  else if (ctrTrend < -15) fatigueScore += 20
  else if (ctrTrend < -10) fatigueScore += 10

  if (cprTrend > 50) fatigueScore += 25
  else if (cprTrend > 30) fatigueScore += 15
  else if (cprTrend > 15) fatigueScore += 8

  if (days >= 21) fatigueScore += 15
  else if (days >= 14) fatigueScore += 10
  else if (days >= 10) fatigueScore += 5

  fatigueScore = Math.min(fatigueScore, 100)

  const fatigueRate = days > 0 ? fatigueScore / days : 0
  const predictedDaysLeft = fatigueRate > 0 ? Math.max(0, Math.round((70 - fatigueScore) / fatigueRate)) : 30

  let classification: AdAnalysis['classification']
  let classificationReason: string
  const recommendations: string[] = []

  if (fatigueScore >= 60) {
    classification = 'PAUSAR'
    classificationReason = `Fatiga crítica (${fatigueScore}%). Frecuencia ${frequency.toFixed(1)}, CTR cayendo.`
    recommendations.push('Pausar inmediatamente y rotar creativo')
    recommendations.push('Crear variaciones del mensaje')
  } else if (fatigueScore >= 40) {
    classification = 'FATIGADO'
    classificationReason = `Señales de fatiga (${fatigueScore}%). Rendimiento decayendo.`
    recommendations.push('Preparar creativos de reemplazo')
    recommendations.push(`~${predictedDaysLeft} días de vida útil`)
  } else if (results < 10 || days < 5) {
    classification = 'TESTING'
    classificationReason = `En aprendizaje. ${results} resultados en ${days} días.`
    recommendations.push('Mantener presupuesto estable')
    recommendations.push('Esperar 50+ resultados')
  } else if (ctr >= 1.5 && cprTrend <= 0 && frequency < 3) {
    classification = 'GANADOR'
    classificationReason = `CTR ${ctr.toFixed(1)}%, CPR estable, frecuencia saludable.`
    recommendations.push('Aumentar presupuesto 20-30%')
    recommendations.push('Duplicar en nuevas audiencias')
  } else if (ctr >= 1.0 && cprTrend <= 10 && frequency < 3.5) {
    classification = 'ESCALABLE'
    classificationReason = `Buen rendimiento. CTR ${ctr.toFixed(1)}%.`
    recommendations.push('Aumentar presupuesto 10-15%')
    recommendations.push('Monitorear frecuencia')
  } else {
    classification = 'TESTING'
    classificationReason = `Rendimiento mixto. Necesita ajustes.`
    recommendations.push('Revisar segmentación')
    recommendations.push('Testear diferentes copys')
  }

  return {
    ...ad,
    classification, classificationReason, fatigueScore,
    ctrTrend, cprTrend, frequencyTrend, recommendations, predictedDaysLeft,
  }
}

export function getAdsAnalysis(clientId?: string): AdAnalysis[] {
  const metrics = getMetricsByClient(clientId)
  const ads = getMetricsByAd(metrics)
  return ads.map(ad => classifyAd(ad, metrics))
}

export const mockAdsAnalysis = getAdsAnalysis()

// ==================== ALERTS ====================

export interface Alert {
  id: string
  clientId: string
  type: 'ROAS_DROP' | 'CTR_DROP' | 'CPA_INCREASE' | 'FATIGUE_DETECTED' | 'BUDGET_DEPLETED' | 'NEW_WINNER' | 'PERFORMANCE_SPIKE'
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  title: string
  message: string
  adName?: string
  campaignName?: string
  previousValue?: number
  currentValue?: number
  changePercent?: number
  createdAt: string
  acknowledged: boolean
}

export const mockAlerts: Alert[] = [
  { id: 'a1', clientId: 'rc', type: 'FATIGUE_DETECTED', severity: 'WARNING', title: 'Fatiga detectada', message: 'Video Testimonial muestra fatiga. Frecuencia: 4.2', adName: 'Video Testimonial Cliente', campaignName: 'Mensajes WhatsApp - Delivery', createdAt: new Date(Date.now() - 2 * 3600000).toISOString(), acknowledged: false },
  { id: 'a2', clientId: 'tm', type: 'NEW_WINNER', severity: 'INFO', title: 'Nuevo ganador', message: 'Video Unboxing superó al resto: CTR 2.8%, CPR $85', adName: 'Video Unboxing iPhone', campaignName: 'Ventas Celulares', createdAt: new Date(Date.now() - 5 * 3600000).toISOString(), acknowledged: false },
  { id: 'a3', clientId: 'bf', type: 'CPA_INCREASE', severity: 'CRITICAL', title: 'CPR +45%', message: 'El costo por resultado subió 45% en 48hs', campaignName: 'Inscripciones Gym', previousValue: 120, currentValue: 174, changePercent: 45, createdAt: new Date(Date.now() - 1 * 3600000).toISOString(), acknowledged: false },
  { id: 'a4', clientId: 'cd', type: 'CTR_DROP', severity: 'WARNING', title: 'CTR -25%', message: 'El CTR cayó 25% esta semana', campaignName: 'Muebles - Catálogo', previousValue: 1.8, currentValue: 1.35, changePercent: -25, createdAt: new Date(Date.now() - 12 * 3600000).toISOString(), acknowledged: true },
  { id: 'a5', clientId: 'pm', type: 'PERFORMANCE_SPIKE', severity: 'INFO', title: 'Pico de rendimiento', message: 'Promo 2x1 genera 3x más resultados', adName: 'Promo 2x1', campaignName: 'Pedidos WhatsApp', createdAt: new Date(Date.now() - 8 * 3600000).toISOString(), acknowledged: false },
  { id: 'a6', clientId: 'tm', type: 'BUDGET_DEPLETED', severity: 'CRITICAL', title: 'Presupuesto agotandose', message: 'Ventas Celulares gastó 92% del presupuesto mensual. Quedan 3 días.', campaignName: 'Ventas Celulares', previousValue: 100000, currentValue: 92000, changePercent: 92, createdAt: new Date(Date.now() - 30 * 60000).toISOString(), acknowledged: false },
  { id: 'a7', clientId: 'bf', type: 'BUDGET_DEPLETED', severity: 'WARNING', title: 'Presupuesto al 80%', message: 'Inscripciones Gym llegó al 80% del presupuesto con 10 días restantes.', campaignName: 'Inscripciones Gym', previousValue: 60000, currentValue: 48000, changePercent: 80, createdAt: new Date(Date.now() - 4 * 3600000).toISOString(), acknowledged: false },
]

// Generate budget alerts dynamically based on pacing
export function generateBudgetAlerts(clientId?: string): Alert[] {
  const alerts: Alert[] = []
  const clients = clientId ? mockClients.filter(c => c.id === clientId) : mockClients.filter(c => c.isActive)

  for (const client of clients) {
    const campaigns = mockCampaigns.filter(c => c.clientId === client.id && c.status === 'ACTIVE')

    for (const campaign of campaigns) {
      const now = new Date()
      const dayOfMonth = now.getDate()
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const percentOfMonth = (dayOfMonth / daysInMonth) * 100

      // Get spend for this campaign this month
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const campaignMetrics = mockMetrics.filter(m =>
        m.clientId === client.id &&
        m.campaignId === campaign.id &&
        m.date >= monthStart
      )
      const spentToDate = campaignMetrics.reduce((sum, m) => sum + m.spend, 0)
      const percentSpent = campaign.budget > 0 ? (spentToDate / campaign.budget) * 100 : 0
      const pacingRatio = percentSpent / percentOfMonth

      // Generate alert if overspending
      if (pacingRatio > 1.2 && percentSpent >= 80) {
        const dailySpendAvg = dayOfMonth > 0 ? spentToDate / dayOfMonth : 0
        const daysUntilDepleted = dailySpendAvg > 0
          ? Math.floor((campaign.budget - spentToDate) / dailySpendAvg)
          : 0

        alerts.push({
          id: `budget-${campaign.id}-${Date.now()}`,
          clientId: client.id,
          type: percentSpent >= 90 ? 'BUDGET_DEPLETED' : 'BUDGET_DEPLETED',
          severity: percentSpent >= 90 ? 'CRITICAL' : 'WARNING',
          title: percentSpent >= 90 ? 'Presupuesto agotandose' : `Presupuesto al ${Math.round(percentSpent)}%`,
          message: `${campaign.name} gastó ${Math.round(percentSpent)}% del presupuesto mensual. ${daysUntilDepleted > 0 ? `Quedan ~${daysUntilDepleted} días.` : 'Se agota hoy.'}`,
          campaignName: campaign.name,
          previousValue: campaign.budget,
          currentValue: spentToDate,
          changePercent: percentSpent,
          createdAt: new Date().toISOString(),
          acknowledged: false
        })
      }
    }
  }

  return alerts
}

// ==================== CLIENT SUMMARY ====================

export interface ClientSummary {
  client: Client
  totalSpend: number
  totalResults: number
  avgCpr: number
  avgCtr: number
  activeCampaigns: number
  activeAds: number
  winners: number
  fatigued: number
  alerts: number
  trend: 'up' | 'down' | 'stable'
  trendPercent: number
}

export function getClientSummaries(): ClientSummary[] {
  return mockClients.filter(c => c.isActive).map(client => {
    const metrics = getMetricsByClient(client.id)
    const ads = getAdsAnalysis(client.id)
    const alerts = mockAlerts.filter(a => a.clientId === client.id && !a.acknowledged)
    const campaigns = mockCampaigns.filter(c => c.clientId === client.id && c.status === 'ACTIVE')

    const totalSpend = metrics.reduce((sum, m) => sum + m.spend, 0)
    const totalResults = metrics.reduce((sum, m) => sum + m.results, 0)
    const totalClicks = metrics.reduce((sum, m) => sum + m.clicks, 0)
    const totalImpressions = metrics.reduce((sum, m) => sum + m.impressions, 0)

    const now = new Date()
    const last7 = metrics.filter(m => (now.getTime() - new Date(m.date).getTime()) / 86400000 <= 7)
    const prev7 = metrics.filter(m => {
      const diff = (now.getTime() - new Date(m.date).getTime()) / 86400000
      return diff > 7 && diff <= 14
    })

    const last7Results = last7.reduce((sum, m) => sum + m.results, 0)
    const prev7Results = prev7.reduce((sum, m) => sum + m.results, 0)
    const trendPercent = prev7Results > 0 ? ((last7Results - prev7Results) / prev7Results) * 100 : 0

    return {
      client,
      totalSpend,
      totalResults,
      avgCpr: totalResults > 0 ? totalSpend / totalResults : 0,
      avgCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      activeCampaigns: campaigns.length,
      activeAds: ads.length,
      winners: ads.filter(a => a.classification === 'GANADOR').length,
      fatigued: ads.filter(a => a.classification === 'FATIGADO' || a.classification === 'PAUSAR').length,
      alerts: alerts.length,
      trend: trendPercent > 5 ? 'up' : trendPercent < -5 ? 'down' : 'stable',
      trendPercent,
    }
  })
}

// ==================== DIAGNOSTIC ====================

export interface Diagnostic {
  metric: string
  change: number
  direction: 'up' | 'down'
  isGood: boolean
  reason: string
  details: string[]
}

export function getDiagnostic(clientId: string): Diagnostic[] {
  const metrics = getMetricsByClient(clientId)
  const dailyData = getMetricsByDate(metrics)
  if (dailyData.length < 14) return []

  const last7 = dailyData.slice(-7)
  const prev7 = dailyData.slice(-14, -7)
  const diagnostics: Diagnostic[] = []

  const avg = (arr: typeof dailyData, key: keyof typeof dailyData[0]) =>
    arr.reduce((sum, d) => sum + (d[key] as number), 0) / arr.length

  // CPR
  const last7Cpr = avg(last7, 'cpr')
  const prev7Cpr = avg(prev7, 'cpr')
  const cprChange = prev7Cpr > 0 ? ((last7Cpr - prev7Cpr) / prev7Cpr) * 100 : 0

  if (Math.abs(cprChange) > 10) {
    const details: string[] = []
    const ctrChange = prev7.length ? ((avg(last7, 'ctr') - avg(prev7, 'ctr')) / avg(prev7, 'ctr')) * 100 : 0

    if (cprChange > 0) {
      if (ctrChange < -10) details.push(`CTR bajó ${Math.abs(ctrChange).toFixed(0)}%`)
      const avgFreq = metrics.filter(m => (new Date().getTime() - new Date(m.date).getTime()) / 86400000 <= 7)
        .reduce((sum, m) => sum + m.frequency, 0) / metrics.length
      if (avgFreq > 3.5) details.push(`Frecuencia alta (${avgFreq.toFixed(1)})`)
      if (!details.length) details.push('Posible aumento de competencia')
    } else {
      if (ctrChange > 10) details.push(`CTR mejoró ${ctrChange.toFixed(0)}%`)
      details.push('Anuncios ganadores tomando más presupuesto')
    }

    diagnostics.push({
      metric: 'CPR', change: cprChange, direction: cprChange > 0 ? 'up' : 'down',
      isGood: cprChange < 0, reason: `CPR ${cprChange > 0 ? 'subió' : 'bajó'} ${Math.abs(cprChange).toFixed(0)}%`, details
    })
  }

  // CTR
  const last7Ctr = avg(last7, 'ctr')
  const prev7Ctr = avg(prev7, 'ctr')
  const ctrChange = prev7Ctr > 0 ? ((last7Ctr - prev7Ctr) / prev7Ctr) * 100 : 0

  if (Math.abs(ctrChange) > 10) {
    diagnostics.push({
      metric: 'CTR', change: ctrChange, direction: ctrChange > 0 ? 'up' : 'down',
      isGood: ctrChange > 0, reason: `CTR ${ctrChange > 0 ? 'mejoró' : 'cayó'} ${Math.abs(ctrChange).toFixed(0)}%`,
      details: ctrChange > 0 ? ['Creativos resonando mejor'] : ['Creativos perdiendo relevancia']
    })
  }

  // Results
  const last7Results = last7.reduce((sum, d) => sum + d.results, 0)
  const prev7Results = prev7.reduce((sum, d) => sum + d.results, 0)
  const resultsChange = prev7Results > 0 ? ((last7Results - prev7Results) / prev7Results) * 100 : 0

  if (Math.abs(resultsChange) > 15) {
    const spendChange = ((last7.reduce((s, d) => s + d.spend, 0) - prev7.reduce((s, d) => s + d.spend, 0)) /
      prev7.reduce((s, d) => s + d.spend, 0)) * 100

    const details = resultsChange > 0
      ? [spendChange > 0 ? `Presupuesto +${spendChange.toFixed(0)}%` : 'Mejor eficiencia']
      : [spendChange < 0 ? `Presupuesto ${spendChange.toFixed(0)}%` : 'Menor eficiencia']

    diagnostics.push({
      metric: 'Resultados', change: resultsChange, direction: resultsChange > 0 ? 'up' : 'down',
      isGood: resultsChange > 0, reason: `Resultados ${resultsChange > 0 ? '+' : ''}${resultsChange.toFixed(0)}%`, details
    })
  }

  return diagnostics
}

// ==================== EXECUTIVE SUMMARY ====================

export function getExecutiveSummary(clientId: string): string {
  const client = mockClients.find(c => c.id === clientId)
  if (!client) return ''

  const metrics = getMetricsByClient(clientId)
  const dailyData = getMetricsByDate(metrics)
  const ads = getAdsAnalysis(clientId)
  const diagnostics = getDiagnostic(clientId)

  const last7 = dailyData.slice(-7)
  const prev7 = dailyData.slice(-14, -7)

  const last7Spend = last7.reduce((sum, d) => sum + d.spend, 0)
  const last7Results = last7.reduce((sum, d) => sum + d.results, 0)
  const prev7Results = prev7.reduce((sum, d) => sum + d.results, 0)
  const resultsChange = prev7Results > 0 ? ((last7Results - prev7Results) / prev7Results) * 100 : 0
  const avgCpr = last7Results > 0 ? last7Spend / last7Results : 0

  const winners = ads.filter(a => a.classification === 'GANADOR')
  const fatigued = ads.filter(a => a.classification === 'FATIGADO' || a.classification === 'PAUSAR')

  let summary = `📊 *Resumen Semanal - ${client.name}*\n\n`
  summary += `*Resultados:* ${last7Results} ${resultsChange > 0 ? `(↑${resultsChange.toFixed(0)}%) ✅` : resultsChange < 0 ? `(↓${Math.abs(resultsChange).toFixed(0)}%) ⚠️` : ''}\n`
  summary += `*Inversión:* $${last7Spend.toLocaleString('es-AR', { maximumFractionDigits: 0 })}\n`
  summary += `*CPR:* $${avgCpr.toFixed(0)}\n\n`

  if (winners.length > 0) {
    summary += `🏆 *Ganadores:* ${winners.length}\n`
    winners.slice(0, 2).forEach(w => { summary += `  • ${w.adName} (CPR $${w.avgCostPerResult.toFixed(0)})\n` })
    summary += '\n'
  }

  if (fatigued.length > 0) {
    summary += `⚠️ *Fatiga:* ${fatigued.length} anuncio(s)\n`
    fatigued.slice(0, 2).forEach(f => { summary += `  • ${f.adName}\n` })
    summary += '\n'
  }

  if (diagnostics.length > 0) {
    summary += `📈 *Cambios:*\n`
    diagnostics.forEach(d => { summary += `${d.isGood ? '✅' : '⚠️'} ${d.reason}\n` })
    summary += '\n'
  }

  summary += `💡 *Próximos pasos:*\n`
  if (winners.length) summary += `• Escalar ganadores\n`
  if (fatigued.length) summary += `• Rotar creativos fatigados\n`

  return summary
}

// ==================== COMPARISON HELPER ====================

export interface ClientComparison {
  clients: ClientSummary[]
  metrics: {
    metric: string
    values: { clientId: string; value: number; isTop: boolean }[]
    unit: string
  }[]
  insights: string[]
}

export function compareClients(clientIds: string[]): ClientComparison {
  const summaries = getClientSummaries().filter(s => clientIds.includes(s.client.id))

  const metrics = [
    { metric: 'CPR', key: 'avgCpr' as const, unit: '$', lowerIsBetter: true },
    { metric: 'CTR', key: 'avgCtr' as const, unit: '%', lowerIsBetter: false },
    { metric: 'Resultados', key: 'totalResults' as const, unit: '', lowerIsBetter: false },
    { metric: 'Ganadores', key: 'winners' as const, unit: '', lowerIsBetter: false },
    { metric: 'Fatigados', key: 'fatigued' as const, unit: '', lowerIsBetter: true },
  ].map(({ metric, key, unit, lowerIsBetter }) => {
    const values = summaries.map(s => ({ clientId: s.client.id, value: s[key], isTop: false }))
    const sorted = [...values].sort((a, b) => lowerIsBetter ? a.value - b.value : b.value - a.value)
    if (sorted.length > 0) {
      const top = values.find(v => v.clientId === sorted[0].clientId)
      if (top) top.isTop = true
    }
    return { metric, values, unit }
  })

  const insights: string[] = []
  const topCpr = summaries.reduce((min, s) => s.avgCpr < min.avgCpr ? s : min, summaries[0])
  const topCtr = summaries.reduce((max, s) => s.avgCtr > max.avgCtr ? s : max, summaries[0])

  if (summaries.length > 1) {
    insights.push(`${topCpr.client.name} tiene el mejor CPR ($${topCpr.avgCpr.toFixed(0)})`)
    insights.push(`${topCtr.client.name} tiene el mejor CTR (${topCtr.avgCtr.toFixed(1)}%)`)

    const sameIndustry = summaries.filter(s => s.client.industry === summaries[0].client.industry)
    if (sameIndustry.length > 1) {
      const avgCprIndustry = sameIndustry.reduce((sum, s) => sum + s.avgCpr, 0) / sameIndustry.length
      insights.push(`CPR promedio ${sameIndustry[0].client.industry}: $${avgCprIndustry.toFixed(0)}`)
    }
  }

  return { clients: summaries, metrics, insights }
}

// ==================== MORNING BRIEF ====================

export interface MorningBriefPriority {
  id: string
  clientId: string
  clientName: string
  clientColor: string
  type: 'urgent' | 'warning' | 'action' | 'win'
  title: string
  description: string
  actionLabel?: string
}

export interface MorningBrief {
  date: string
  greeting: string
  priorities: MorningBriefPriority[]
  wins: { clientName: string; message: string }[]
  totalResultsYesterday: number
  vsAverage: number
}

export function getMorningBrief(): MorningBrief {
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  const priorities: MorningBriefPriority[] = []
  const wins: { clientName: string; message: string }[] = []

  // Get all client data
  const summaries = getClientSummaries()

  for (const summary of summaries) {
    const ads = getAdsAnalysis(summary.client.id)
    const alerts = mockAlerts.filter(a => a.clientId === summary.client.id && !a.acknowledged)

    // Check for critical alerts
    const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL')
    for (const alert of criticalAlerts) {
      priorities.push({
        id: `p-${alert.id}`,
        clientId: summary.client.id,
        clientName: summary.client.name,
        clientColor: summary.client.color,
        type: 'urgent',
        title: alert.title,
        description: alert.message,
        actionLabel: 'Revisar ahora'
      })
    }

    // Check for fatigued ads that need rotation
    const fatiguedAds = ads.filter(a => a.classification === 'PAUSAR')
    if (fatiguedAds.length > 0) {
      priorities.push({
        id: `p-fatigue-${summary.client.id}`,
        clientId: summary.client.id,
        clientName: summary.client.name,
        clientColor: summary.client.color,
        type: 'urgent',
        title: `${fatiguedAds.length} anuncio(s) para pausar`,
        description: fatiguedAds.map(a => a.adName).join(', '),
        actionLabel: 'Pausar'
      })
    }

    // Check budget pacing
    const pacing = getBudgetPacing(summary.client.id)
    if (pacing.status === 'overspending') {
      priorities.push({
        id: `p-budget-${summary.client.id}`,
        clientId: summary.client.id,
        clientName: summary.client.name,
        clientColor: summary.client.color,
        type: 'warning',
        title: 'Budget se agota rápido',
        description: `${pacing.daysRemaining} días de presupuesto restante`,
        actionLabel: 'Ajustar'
      })
    }

    // Check for winners to scale
    const winners = ads.filter(a => a.classification === 'GANADOR')
    if (winners.length > 0 && summary.trend === 'up') {
      priorities.push({
        id: `p-scale-${summary.client.id}`,
        clientId: summary.client.id,
        clientName: summary.client.name,
        clientColor: summary.client.color,
        type: 'action',
        title: `Escalar ${winners.length} ganador(es)`,
        description: `Oportunidad: aumentar budget 20-30%`,
        actionLabel: 'Escalar'
      })
    }

    // Wins
    if (summary.trend === 'up' && summary.trendPercent > 10) {
      wins.push({
        clientName: summary.client.name,
        message: `+${summary.trendPercent.toFixed(0)}% resultados vs semana anterior`
      })
    }

    // New winners detected
    const newWinners = alerts.filter(a => a.type === 'NEW_WINNER')
    for (const alert of newWinners) {
      wins.push({
        clientName: summary.client.name,
        message: alert.message
      })
    }
  }

  // Sort priorities: urgent > warning > action
  priorities.sort((a, b) => {
    const order = { urgent: 0, warning: 1, action: 2, win: 3 }
    return order[a.type] - order[b.type]
  })

  // Calculate yesterday's results
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  const yesterdayMetrics = mockMetrics.filter(m => m.date === yesterdayStr)
  const totalResultsYesterday = yesterdayMetrics.reduce((sum, m) => sum + m.results, 0)

  // Calculate average
  const last7Days = mockMetrics.filter(m => {
    const diff = (now.getTime() - new Date(m.date).getTime()) / 86400000
    return diff <= 7
  })
  const avgDaily = last7Days.reduce((sum, m) => sum + m.results, 0) / 7
  const vsAverage = avgDaily > 0 ? ((totalResultsYesterday - avgDaily) / avgDaily) * 100 : 0

  return {
    date: now.toISOString().split('T')[0],
    greeting,
    priorities: priorities.slice(0, 5),
    wins: wins.slice(0, 3),
    totalResultsYesterday,
    vsAverage
  }
}

// ==================== BUDGET PACING ====================

export interface BudgetPacing {
  clientId: string
  monthlyBudget: number
  spentToDate: number
  percentSpent: number
  daysInMonth: number
  dayOfMonth: number
  percentOfMonth: number
  projectedSpend: number
  status: 'on_track' | 'underspending' | 'overspending'
  daysRemaining: number
  dailyBudgetRecommended: number
  message: string
}

export function getBudgetPacing(clientId: string): BudgetPacing {
  const campaigns = mockCampaigns.filter(c => c.clientId === clientId && c.status === 'ACTIVE')
  const monthlyBudget = campaigns.reduce((sum, c) => sum + c.budget, 0)

  const now = new Date()
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const percentOfMonth = (dayOfMonth / daysInMonth) * 100

  // Get this month's spend
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const metrics = mockMetrics.filter(m => m.clientId === clientId && m.date >= monthStart)
  const spentToDate = metrics.reduce((sum, m) => sum + m.spend, 0)
  const percentSpent = monthlyBudget > 0 ? (spentToDate / monthlyBudget) * 100 : 0

  // Project end of month spend
  const dailySpendAvg = dayOfMonth > 0 ? spentToDate / dayOfMonth : 0
  const projectedSpend = dailySpendAvg * daysInMonth

  // Determine status
  const pacingRatio = percentSpent / percentOfMonth
  let status: BudgetPacing['status']
  let message: string

  if (pacingRatio > 1.15) {
    status = 'overspending'
    const daysRemaining = monthlyBudget > spentToDate
      ? Math.floor((monthlyBudget - spentToDate) / dailySpendAvg)
      : 0
    message = `A este ritmo, el budget se agota en ${daysRemaining} días`
  } else if (pacingRatio < 0.85) {
    status = 'underspending'
    const surplus = monthlyBudget - projectedSpend
    message = `Proyección: sobran $${surplus.toLocaleString('es-AR', { maximumFractionDigits: 0 })} a fin de mes`
  } else {
    status = 'on_track'
    message = 'Gasto alineado con el plan mensual'
  }

  const daysRemaining = daysInMonth - dayOfMonth
  const remainingBudget = monthlyBudget - spentToDate
  const dailyBudgetRecommended = daysRemaining > 0 ? remainingBudget / daysRemaining : 0

  return {
    clientId,
    monthlyBudget,
    spentToDate,
    percentSpent,
    daysInMonth,
    dayOfMonth,
    percentOfMonth,
    projectedSpend,
    status,
    daysRemaining,
    dailyBudgetRecommended,
    message
  }
}

// ==================== ASSET DEPENDENCY ====================

export interface AssetDependency {
  clientId: string
  totalResults: number
  topAd: { name: string; results: number; percentage: number }
  top3Ads: { name: string; results: number; percentage: number }[]
  concentrationRisk: 'low' | 'medium' | 'high' | 'critical'
  message: string
  recommendation: string
}

export function getAssetDependency(clientId: string): AssetDependency {
  const metrics = getMetricsByClient(clientId)
  const adResults: Record<string, number> = {}

  for (const m of metrics) {
    adResults[m.adName] = (adResults[m.adName] || 0) + m.results
  }

  const totalResults = Object.values(adResults).reduce((sum, r) => sum + r, 0)
  const sortedAds = Object.entries(adResults)
    .sort((a, b) => b[1] - a[1])
    .map(([name, results]) => ({
      name,
      results,
      percentage: totalResults > 0 ? (results / totalResults) * 100 : 0
    }))

  const topAd = sortedAds[0] || { name: '-', results: 0, percentage: 0 }
  const top3Ads = sortedAds.slice(0, 3)
  const top3Percentage = top3Ads.reduce((sum, a) => sum + a.percentage, 0)

  let concentrationRisk: AssetDependency['concentrationRisk']
  let message: string
  let recommendation: string

  if (topAd.percentage >= 60) {
    concentrationRisk = 'critical'
    message = `${topAd.percentage.toFixed(0)}% de resultados dependen de "${topAd.name}"`
    recommendation = 'Riesgo crítico: crear 3-4 variaciones urgente'
  } else if (topAd.percentage >= 45 || top3Percentage >= 85) {
    concentrationRisk = 'high'
    message = `Alta concentración: top 3 anuncios = ${top3Percentage.toFixed(0)}%`
    recommendation = 'Diversificar con 2-3 creativos nuevos'
  } else if (topAd.percentage >= 30 || top3Percentage >= 70) {
    concentrationRisk = 'medium'
    message = `Concentración moderada en ${top3Ads.length} anuncios`
    recommendation = 'Monitorear y preparar backups'
  } else {
    concentrationRisk = 'low'
    message = 'Buena diversificación de creativos'
    recommendation = 'Mantener estrategia actual'
  }

  return {
    clientId,
    totalResults,
    topAd,
    top3Ads,
    concentrationRisk,
    message,
    recommendation
  }
}

// ==================== BUDGET OPTIMIZER ====================

export interface BudgetRecommendation {
  fromCampaign: { id: string; name: string; cpr: number; currentBudget: number }
  toCampaign: { id: string; name: string; cpr: number; currentBudget: number }
  amount: number
  estimatedImpact: { additionalResults: number; cprImprovement: number }
}

export interface BudgetOptimizer {
  clientId: string
  currentTotalBudget: number
  currentAvgCpr: number
  optimizedAvgCpr: number
  recommendations: BudgetRecommendation[]
  totalAdditionalResults: number
  summary: string
}

export function getBudgetOptimizer(clientId: string): BudgetOptimizer {
  const campaigns = mockCampaigns.filter(c => c.clientId === clientId && c.status === 'ACTIVE')
  const metrics = getMetricsByClient(clientId)

  // Calculate CPR by campaign
  const campaignPerformance = campaigns.map(campaign => {
    const campaignMetrics = metrics.filter(m => m.campaignId === campaign.id)
    const totalSpend = campaignMetrics.reduce((sum, m) => sum + m.spend, 0)
    const totalResults = campaignMetrics.reduce((sum, m) => sum + m.results, 0)
    const cpr = totalResults > 0 ? totalSpend / totalResults : 999
    return { ...campaign, cpr, totalSpend, totalResults }
  }).sort((a, b) => a.cpr - b.cpr)

  const currentTotalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0)
  const totalSpend = metrics.reduce((sum, m) => sum + m.spend, 0)
  const totalResults = metrics.reduce((sum, m) => sum + m.results, 0)
  const currentAvgCpr = totalResults > 0 ? totalSpend / totalResults : 0

  const recommendations: BudgetRecommendation[] = []
  let totalAdditionalResults = 0

  // Find opportunities: move from high CPR to low CPR campaigns
  const inefficient = campaignPerformance.filter(c => c.cpr > currentAvgCpr * 1.2)
  const efficient = campaignPerformance.filter(c => c.cpr < currentAvgCpr * 0.9)

  for (const from of inefficient) {
    for (const to of efficient) {
      if (recommendations.length >= 3) break

      const moveAmount = Math.min(from.budget * 0.3, to.budget * 0.5)
      if (moveAmount < 5000) continue

      const additionalResults = Math.round(moveAmount / to.cpr - moveAmount / from.cpr)
      if (additionalResults <= 0) continue

      recommendations.push({
        fromCampaign: { id: from.id, name: from.name, cpr: from.cpr, currentBudget: from.budget },
        toCampaign: { id: to.id, name: to.name, cpr: to.cpr, currentBudget: to.budget },
        amount: moveAmount,
        estimatedImpact: {
          additionalResults,
          cprImprovement: ((from.cpr - to.cpr) / from.cpr) * 100
        }
      })

      totalAdditionalResults += additionalResults
    }
  }

  const optimizedResults = totalResults + totalAdditionalResults
  const optimizedAvgCpr = optimizedResults > 0 ? totalSpend / optimizedResults : currentAvgCpr

  const summary = recommendations.length > 0
    ? `Redistribuyendo budget: +${totalAdditionalResults} resultados estimados con mismo presupuesto`
    : 'Distribución de budget ya está optimizada'

  return {
    clientId,
    currentTotalBudget,
    currentAvgCpr,
    optimizedAvgCpr,
    recommendations,
    totalAdditionalResults,
    summary
  }
}

// ==================== KNOWLEDGE BASE ====================

export interface ClientLearning {
  id: string
  type: 'works' | 'doesnt_work' | 'insight'
  category: 'creative' | 'audience' | 'timing' | 'budget' | 'general'
  text: string
  confidence: 'high' | 'medium' | 'low'
  source: string
}

export interface KnowledgeBase {
  clientId: string
  clientName: string
  learnings: ClientLearning[]
  bestAd: { name: string; cpr: number; results: number } | null
  worstAd: { name: string; cpr: number; results: number } | null
  bestDays: string[]
  avgLifespanDays: number
}

export function getKnowledgeBase(clientId: string): KnowledgeBase {
  const client = mockClients.find(c => c.id === clientId)
  const metrics = getMetricsByClient(clientId)
  const ads = getAdsAnalysis(clientId)

  // Find best and worst ads
  const sortedByCpr = [...ads].sort((a, b) => a.avgCostPerResult - b.avgCostPerResult)
  const bestAd = sortedByCpr[0] ? {
    name: sortedByCpr[0].adName,
    cpr: sortedByCpr[0].avgCostPerResult,
    results: sortedByCpr[0].totalResults
  } : null
  const worstAd = sortedByCpr[sortedByCpr.length - 1] ? {
    name: sortedByCpr[sortedByCpr.length - 1].adName,
    cpr: sortedByCpr[sortedByCpr.length - 1].avgCostPerResult,
    results: sortedByCpr[sortedByCpr.length - 1].totalResults
  } : null

  // Find best days
  const byDay: Record<number, { results: number; spend: number }> = {}
  for (const m of metrics) {
    const day = new Date(m.date).getDay()
    if (!byDay[day]) byDay[day] = { results: 0, spend: 0 }
    byDay[day].results += m.results
    byDay[day].spend += m.spend
  }
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const bestDays = Object.entries(byDay)
    .sort((a, b) => (b[1].results / b[1].spend) - (a[1].results / a[1].spend))
    .slice(0, 2)
    .map(([day]) => dayNames[parseInt(day)])

  // Calculate average ad lifespan
  const avgLifespanDays = ads.length > 0
    ? ads.reduce((sum, a) => sum + a.daysRunning, 0) / ads.length
    : 0

  // Generate learnings based on data
  const learnings: ClientLearning[] = []

  // Creative learnings
  const videoAds = ads.filter(a => a.adName.toLowerCase().includes('video'))
  const imageAds = ads.filter(a => !a.adName.toLowerCase().includes('video') && !a.adName.toLowerCase().includes('carrusel'))

  const avgCprVideo = videoAds.length ? videoAds.reduce((s, a) => s + a.avgCostPerResult, 0) / videoAds.length : 0
  const avgCprImage = imageAds.length ? imageAds.reduce((s, a) => s + a.avgCostPerResult, 0) / imageAds.length : 0

  if (avgCprVideo && avgCprImage && avgCprVideo < avgCprImage * 0.85) {
    learnings.push({
      id: 'l1', type: 'works', category: 'creative',
      text: `Videos funcionan ${((1 - avgCprVideo / avgCprImage) * 100).toFixed(0)}% mejor que imágenes`,
      confidence: 'high', source: 'Análisis de CPR por formato'
    })
  }

  if (bestAd && bestAd.name.toLowerCase().includes('testimon')) {
    learnings.push({
      id: 'l2', type: 'works', category: 'creative',
      text: 'Testimoniales generan mejor engagement',
      confidence: 'high', source: `Mejor anuncio: ${bestAd.name}`
    })
  }

  // Timing learnings
  if (bestDays.includes('Sábado') || bestDays.includes('Domingo')) {
    learnings.push({
      id: 'l3', type: 'insight', category: 'timing',
      text: `Fines de semana tienen mejor conversión`,
      confidence: 'medium', source: 'Análisis por día'
    })
  }

  // Fatigue learnings
  const avgFatigueDays = ads.filter(a => a.fatigueScore > 50).map(a => a.daysRunning)
  if (avgFatigueDays.length > 0) {
    const avgDays = avgFatigueDays.reduce((s, d) => s + d, 0) / avgFatigueDays.length
    learnings.push({
      id: 'l4', type: 'insight', category: 'creative',
      text: `Creativos se fatigan en promedio a los ${avgDays.toFixed(0)} días`,
      confidence: 'high', source: 'Análisis de fatiga'
    })
  }

  // Audience learnings based on ad set names
  const lookalike = metrics.filter(m => m.adSetName.toLowerCase().includes('lookalike'))
  const interests = metrics.filter(m => m.adSetName.toLowerCase().includes('interes'))
  if (lookalike.length && interests.length) {
    const cprLookalike = lookalike.reduce((s, m) => s + m.spend, 0) / lookalike.reduce((s, m) => s + m.results, 0)
    const cprInterests = interests.reduce((s, m) => s + m.spend, 0) / interests.reduce((s, m) => s + m.results, 0)
    if (cprLookalike < cprInterests * 0.9) {
      learnings.push({
        id: 'l5', type: 'works', category: 'audience',
        text: 'Lookalikes convierten mejor que intereses',
        confidence: 'medium', source: 'Comparativa de audiencias'
      })
    }
  }

  return {
    clientId,
    clientName: client?.name || '',
    learnings,
    bestAd,
    worstAd,
    bestDays,
    avgLifespanDays
  }
}

// ==================== CREATIVE INTELLIGENCE ====================

export interface CreativePattern {
  pattern: string
  impact: string
  examples: string[]
  confidence: 'high' | 'medium' | 'low'
}

export interface CreativeIntelligence {
  clientId: string
  industry: string
  patterns: CreativePattern[]
  suggestedNextCreative: string
  topFormats: { format: string; avgCpr: number; count: number }[]
}

// ==================== PATTERN MINING ====================

export interface Pattern {
  pattern: string
  impact: string
  confidence: 'high' | 'medium' | 'low'
  category: 'format' | 'creative' | 'timing' | 'messaging' | 'audience'
  recommendation: string
}

export function minePatterns(clientId?: string): Pattern[] {
  const metrics = getMetricsByClient(clientId)
  const patterns: Pattern[] = []

  if (metrics.length < 10) return patterns

  // Pattern 1: Video performance
  const videoAds = metrics.filter(m => m.adName.toLowerCase().includes('video'))
  const nonVideoAds = metrics.filter(m => !m.adName.toLowerCase().includes('video'))

  if (videoAds.length >= 5 && nonVideoAds.length >= 5) {
    const cprVideo = videoAds.reduce((s, m) => s + m.spend, 0) / videoAds.reduce((s, m) => s + m.results, 0)
    const cprOther = nonVideoAds.reduce((s, m) => s + m.spend, 0) / nonVideoAds.reduce((s, m) => s + m.results, 0)

    if (cprVideo < cprOther * 0.85) {
      const improvement = ((cprOther - cprVideo) / cprOther * 100).toFixed(0)
      patterns.push({
        pattern: 'Videos superan a otros formatos',
        impact: `${improvement}% menor CPR`,
        confidence: 'high',
        category: 'format',
        recommendation: 'Priorizar contenido en video'
      })
    }
  }

  // Pattern 2: Weekend performance
  const weekendMetrics = metrics.filter(m => {
    const day = new Date(m.date).getDay()
    return day === 0 || day === 6
  })
  const weekdayMetrics = metrics.filter(m => {
    const day = new Date(m.date).getDay()
    return day >= 1 && day <= 5
  })

  if (weekendMetrics.length >= 3 && weekdayMetrics.length >= 5) {
    const cprWeekend = weekendMetrics.reduce((s, m) => s + m.spend, 0) / weekendMetrics.reduce((s, m) => s + m.results, 0)
    const cprWeekday = weekdayMetrics.reduce((s, m) => s + m.spend, 0) / weekdayMetrics.reduce((s, m) => s + m.results, 0)

    if (cprWeekend < cprWeekday * 0.85) {
      patterns.push({
        pattern: 'Fines de semana tienen mejor conversión',
        impact: `CPR ${((cprWeekday - cprWeekend) / cprWeekday * 100).toFixed(0)}% menor`,
        confidence: 'medium',
        category: 'timing',
        recommendation: 'Aumentar budget los fines de semana'
      })
    }
  }

  // Pattern 3: Promo performance
  const promoAds = metrics.filter(m =>
    m.adName.toLowerCase().includes('promo') ||
    m.adName.toLowerCase().includes('2x1') ||
    m.adName.toLowerCase().includes('oferta')
  )
  const nonPromoAds = metrics.filter(m =>
    !m.adName.toLowerCase().includes('promo') &&
    !m.adName.toLowerCase().includes('2x1') &&
    !m.adName.toLowerCase().includes('oferta')
  )

  if (promoAds.length >= 3 && nonPromoAds.length >= 3) {
    const cprPromo = promoAds.reduce((s, m) => s + m.spend, 0) / promoAds.reduce((s, m) => s + m.results, 0)
    const cprNonPromo = nonPromoAds.reduce((s, m) => s + m.spend, 0) / nonPromoAds.reduce((s, m) => s + m.results, 0)

    if (cprPromo < cprNonPromo * 0.8) {
      patterns.push({
        pattern: 'Promociones convierten mejor',
        impact: `${((cprNonPromo - cprPromo) / cprNonPromo * 100).toFixed(0)}% menor CPR`,
        confidence: 'high',
        category: 'messaging',
        recommendation: 'Incluir ofertas y promociones en creativos'
      })
    }
  }

  // Pattern 4: Testimonial performance
  const testimonialAds = metrics.filter(m => m.adName.toLowerCase().includes('testimon'))
  if (testimonialAds.length >= 3) {
    const cprTest = testimonialAds.reduce((s, m) => s + m.spend, 0) / testimonialAds.reduce((s, m) => s + m.results, 0)
    const allCpr = metrics.reduce((s, m) => s + m.spend, 0) / metrics.reduce((s, m) => s + m.results, 0)

    if (cprTest < allCpr * 0.9) {
      patterns.push({
        pattern: 'Testimoniales generan más confianza',
        impact: `CPR ${((allCpr - cprTest) / allCpr * 100).toFixed(0)}% mejor que promedio`,
        confidence: 'high',
        category: 'creative',
        recommendation: 'Crear más contenido con testimoniales de clientes'
      })
    }
  }

  return patterns
}

// ==================== SCENARIO SIMULATOR ====================

export interface ScenarioResult {
  scenario: string
  current: { spend: number; results: number; cpr: number }
  projected: { spend: number; results: number; cpr: number }
  delta: { spend: number; results: number; cprChange: number }
  confidence: 'high' | 'medium' | 'low'
  note: string
}

export function simulateBudgetChange(clientId: string, changePercent: number): ScenarioResult {
  const metrics = getMetricsByClient(clientId)
  const currentSpend = metrics.reduce((s, m) => s + m.spend, 0)
  const currentResults = metrics.reduce((s, m) => s + m.results, 0)
  const currentCpr = currentSpend / currentResults

  const newSpend = currentSpend * (1 + changePercent / 100)

  // Diminishing returns for increases
  const efficiencyFactor = changePercent > 0 ? 0.8 : 1
  const resultChange = changePercent * efficiencyFactor
  const estimatedResults = currentResults * (1 + resultChange / 100)
  const estimatedCpr = newSpend / estimatedResults

  return {
    scenario: `${changePercent > 0 ? 'Aumentar' : 'Reducir'} budget ${Math.abs(changePercent)}%`,
    current: { spend: currentSpend, results: currentResults, cpr: currentCpr },
    projected: { spend: newSpend, results: estimatedResults, cpr: estimatedCpr },
    delta: {
      spend: newSpend - currentSpend,
      results: estimatedResults - currentResults,
      cprChange: ((estimatedCpr - currentCpr) / currentCpr) * 100
    },
    confidence: 'medium',
    note: 'Proyección basada en rendimientos decrecientes'
  }
}

export function simulatePauseAd(clientId: string, adName: string): {
  scenario: string
  adContribution: { spend: number; results: number; percentOfTotal: number }
  withoutAd: { spend: number; results: number; cpr: number }
  withRedistribution: { spend: number; results: number; cpr: number; extraResults: number }
  recommendation: 'pausar' | 'mantener'
} {
  const metrics = getMetricsByClient(clientId)
  const adMetrics = metrics.filter(m => m.adName === adName)
  const otherMetrics = metrics.filter(m => m.adName !== adName)

  const adSpend = adMetrics.reduce((s, m) => s + m.spend, 0)
  const adResults = adMetrics.reduce((s, m) => s + m.results, 0)
  const adCpr = adResults > 0 ? adSpend / adResults : Infinity

  const otherSpend = otherMetrics.reduce((s, m) => s + m.spend, 0)
  const otherResults = otherMetrics.reduce((s, m) => s + m.results, 0)
  const otherCpr = otherResults > 0 ? otherSpend / otherResults : 0

  const totalResults = adResults + otherResults
  const redistributedResults = otherCpr > 0 ? adSpend / otherCpr : 0

  return {
    scenario: `Pausar "${adName}"`,
    adContribution: {
      spend: adSpend,
      results: adResults,
      percentOfTotal: totalResults > 0 ? (adResults / totalResults) * 100 : 0
    },
    withoutAd: {
      spend: otherSpend,
      results: otherResults,
      cpr: otherCpr
    },
    withRedistribution: {
      spend: otherSpend + adSpend,
      results: otherResults + redistributedResults,
      cpr: (otherSpend + adSpend) / (otherResults + redistributedResults),
      extraResults: redistributedResults
    },
    recommendation: otherCpr < adCpr ? 'pausar' : 'mantener'
  }
}

// ==================== ACCOUNT QUALITY SCORE ====================

export interface AccountQuality {
  score: number
  status: 'ready' | 'limited' | 'insufficient'
  message: string
  issues: { issue: string; detail: string; impact: number }[]
  summary: { days: number; impressions: number; results: number; ads: number }
}

export function getAccountQualityScore(clientId?: string): AccountQuality {
  const metrics = getMetricsByClient(clientId)
  let score = 100
  const issues: AccountQuality['issues'] = []

  // Check days
  const dates = [...new Set(metrics.map(m => m.date))]
  const days = dates.length

  if (days < 7) {
    score -= 30
    issues.push({ issue: 'Pocos días de datos', detail: `Solo ${days} días. Mínimo: 7`, impact: -30 })
  } else if (days < 14) {
    score -= 15
    issues.push({ issue: 'Datos limitados', detail: `${days} días. Ideal: 14+`, impact: -15 })
  }

  // Check impressions
  const impressions = metrics.reduce((s, m) => s + m.impressions, 0)
  if (impressions < 1000) {
    score -= 25
    issues.push({ issue: 'Pocas impresiones', detail: `${impressions.toLocaleString()}. Mínimo: 1,000`, impact: -25 })
  } else if (impressions < 10000) {
    score -= 10
    issues.push({ issue: 'Impresiones moderadas', detail: `${impressions.toLocaleString()}. Ideal: 10,000+`, impact: -10 })
  }

  // Check results
  const results = metrics.reduce((s, m) => s + m.results, 0)
  if (results < 10) {
    score -= 25
    issues.push({ issue: 'Pocos resultados', detail: `${results}. Mínimo: 10`, impact: -25 })
  } else if (results < 50) {
    score -= 10
    issues.push({ issue: 'Resultados limitados', detail: `${results}. Ideal: 50+`, impact: -10 })
  }

  // Check diversification
  const uniqueAds = [...new Set(metrics.map(m => m.adName))].length
  if (uniqueAds < 3) {
    score -= 15
    issues.push({ issue: 'Poca diversificación', detail: `${uniqueAds} anuncio(s). Mínimo: 3`, impact: -15 })
  }

  score = Math.max(0, score)

  return {
    score,
    status: score >= 70 ? 'ready' : score >= 40 ? 'limited' : 'insufficient',
    message: score >= 70 ? 'Cuenta lista para análisis completo' :
             score >= 40 ? 'Análisis posible con limitaciones' :
             'Datos insuficientes para análisis confiable',
    issues,
    summary: { days, impressions, results, ads: uniqueAds }
  }
}

// ==================== AUDIENCE SATURATION ====================

export interface AudienceSaturation {
  saturationScore: number
  status: 'healthy' | 'warning' | 'critical'
  trends: {
    frequency: { firstPeriod: number; secondPeriod: number; changePercent: number }
    reach: { firstPeriod: number; secondPeriod: number; changePercent: number }
  }
  recommendation: string
  estimatedDaysLeft: number
}

export function getAudienceSaturation(clientId?: string): AudienceSaturation {
  const metrics = getMetricsByClient(clientId)

  if (metrics.length < 14) {
    return {
      saturationScore: 0,
      status: 'healthy',
      trends: {
        frequency: { firstPeriod: 0, secondPeriod: 0, changePercent: 0 },
        reach: { firstPeriod: 0, secondPeriod: 0, changePercent: 0 }
      },
      recommendation: 'Necesita más datos para evaluar',
      estimatedDaysLeft: 30
    }
  }

  const sorted = [...metrics].sort((a, b) => a.date.localeCompare(b.date))
  const mid = Math.floor(sorted.length / 2)
  const firstHalf = sorted.slice(0, mid)
  const secondHalf = sorted.slice(mid)

  const freqFirst = firstHalf.reduce((s, m) => s + m.frequency, 0) / firstHalf.length
  const freqSecond = secondHalf.reduce((s, m) => s + m.frequency, 0) / secondHalf.length
  const freqChange = freqFirst > 0 ? ((freqSecond - freqFirst) / freqFirst) * 100 : 0

  const reachFirst = firstHalf.reduce((s, m) => s + m.reach, 0)
  const reachSecond = secondHalf.reduce((s, m) => s + m.reach, 0)
  const reachChange = reachFirst > 0 ? ((reachSecond - reachFirst) / reachFirst) * 100 : 0

  let saturationScore = 0
  if (freqChange > 20) saturationScore += 40
  else if (freqChange > 10) saturationScore += 20

  if (reachChange < -10) saturationScore += 40
  else if (reachChange < 0) saturationScore += 20

  if (freqSecond > 5) saturationScore += 20
  else if (freqSecond > 3) saturationScore += 10

  saturationScore = Math.min(saturationScore, 100)

  const status = saturationScore >= 70 ? 'critical' : saturationScore >= 40 ? 'warning' : 'healthy'

  return {
    saturationScore,
    status,
    trends: {
      frequency: { firstPeriod: freqFirst, secondPeriod: freqSecond, changePercent: freqChange },
      reach: { firstPeriod: reachFirst, secondPeriod: reachSecond, changePercent: reachChange }
    },
    recommendation: status === 'critical' ? 'Expandir audiencia urgentemente o pausar' :
                    status === 'warning' ? 'Considerar expandir audiencia' :
                    'Audiencia saludable',
    estimatedDaysLeft: freqChange > 0 ? Math.max(0, Math.floor((100 - saturationScore) / 5)) : 30
  }
}

// ==================== AGENCY ROI ====================

export interface AgencyROI {
  totalSpendManaged: number
  totalResults: number
  optimizedCpr: number
  estimatedUnoptimizedCpr: number
  extraResultsGenerated: number
  estimatedValueGenerated: number
  optimizationImpact: string
  actionsTaken: number
}

export function getAgencyROI(clientId?: string): AgencyROI {
  const metrics = getMetricsByClient(clientId)
  const totalSpend = metrics.reduce((s, m) => s + m.spend, 0)
  const totalResults = metrics.reduce((s, m) => s + m.results, 0)
  const avgCpr = totalResults > 0 ? totalSpend / totalResults : 0

  // Assume without optimization, CPR would be 25% worse
  const unoptimizedCpr = avgCpr * 1.25
  const resultsAtUnoptimized = totalSpend / unoptimizedCpr
  const extraResults = totalResults - resultsAtUnoptimized

  const resultValue = 100 // Could be configurable
  const valueGenerated = extraResults * resultValue

  return {
    totalSpendManaged: totalSpend,
    totalResults,
    optimizedCpr: avgCpr,
    estimatedUnoptimizedCpr: unoptimizedCpr,
    extraResultsGenerated: extraResults,
    estimatedValueGenerated: valueGenerated,
    optimizationImpact: resultsAtUnoptimized > 0 ? `+${((extraResults / resultsAtUnoptimized) * 100).toFixed(0)}% más resultados` : 'N/A',
    actionsTaken: Math.floor(Math.random() * 20) + 10 // Mock
  }
}

// ==================== STRUCTURE DIAGNOSTICS ====================

export interface StructureDiagnostic {
  type: 'structure' | 'duplication'
  severity: 'critical' | 'warning' | 'info'
  title: string
  message: string
  campaign?: string
  adSet?: string
  recommendation: string
}

export function getStructureDiagnostics(clientId?: string): StructureDiagnostic[] {
  const metrics = getMetricsByClient(clientId)
  const diagnostics: StructureDiagnostic[] = []

  // Check for single-ad adsets
  const adSetAds: Record<string, Set<string>> = {}
  for (const m of metrics) {
    const key = `${m.campaignName}|${m.adSetName}`
    if (!adSetAds[key]) adSetAds[key] = new Set()
    adSetAds[key].add(m.adName)
  }

  for (const [key, ads] of Object.entries(adSetAds)) {
    if (ads.size === 1) {
      const [campaign, adSet] = key.split('|')
      diagnostics.push({
        type: 'structure',
        severity: 'warning',
        title: 'Ad Set con un solo anuncio',
        message: `"${adSet}" tiene solo 1 anuncio. Recomendamos 3-5.`,
        campaign,
        adSet,
        recommendation: 'Agregar 2-4 variaciones del creativo'
      })
    }
  }

  // Check for too many campaigns
  const campaigns = [...new Set(metrics.map(m => m.campaignName))]
  if (campaigns.length > 5) {
    diagnostics.push({
      type: 'structure',
      severity: 'info',
      title: 'Muchas campañas activas',
      message: `Hay ${campaigns.length} campañas. Considerar consolidar.`,
      recommendation: 'Revisar si hay campañas con el mismo objetivo que puedan unificarse'
    })
  }

  return diagnostics
}

// ==================== PLAYBOOK ====================

export interface Playbook {
  clientName: string
  generatedAt: string
  qualityScore: number
  learnings: { type: 'works' | 'insight'; text: string; evidence: string; category: string }[]
  recommendedStructure: { adsPerAdset: string; adsetsPerCampaign: string; creativeRotation: string }
  do: string[]
  dont: string[]
  monitor: string[]
}

export function generatePlaybook(clientId: string): Playbook {
  const client = mockClients.find(c => c.id === clientId)
  const patterns = minePatterns(clientId)
  const quality = getAccountQualityScore(clientId)

  const learnings: { type: 'works' | 'insight'; text: string; evidence: string; category: string }[] = patterns.map(p => ({
    type: 'works' as const,
    text: p.pattern,
    evidence: p.impact,
    category: p.category
  }))

  // Add timing insights
  const metrics = getMetricsByClient(clientId)
  if (metrics.length >= 7) {
    const dayStats: Record<number, { spend: number; results: number }> = {}
    for (const m of metrics) {
      const day = new Date(m.date).getDay()
      if (!dayStats[day]) dayStats[day] = { spend: 0, results: 0 }
      dayStats[day].spend += m.spend
      dayStats[day].results += m.results
    }

    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    let bestDay = 0, bestCpr = Infinity
    for (const [day, stats] of Object.entries(dayStats)) {
      const cpr = stats.results > 0 ? stats.spend / stats.results : Infinity
      if (cpr < bestCpr) {
        bestCpr = cpr
        bestDay = parseInt(day)
      }
    }

    learnings.push({
      type: 'insight' as const,
      text: `Mejor día: ${dayNames[bestDay]}`,
      evidence: `CPR más bajo`,
      category: 'timing'
    })
  }

  return {
    clientName: client?.name || 'Cliente',
    generatedAt: new Date().toISOString(),
    qualityScore: quality.score,
    learnings,
    recommendedStructure: {
      adsPerAdset: '3-5',
      adsetsPerCampaign: '2-4',
      creativeRotation: 'Cada 14-21 días'
    },
    do: learnings.filter(l => l.type === 'works').map(l => l.text).slice(0, 5),
    dont: [
      'Usar un solo anuncio por ad set',
      'Dejar anuncios fatigados corriendo',
      'Ignorar frecuencia alta'
    ],
    monitor: [
      'Frecuencia > 3.5',
      'CTR cayendo >20% semanal',
      'CPR subiendo >30% semanal'
    ]
  }
}

export function getCreativeIntelligence(clientId: string): CreativeIntelligence {
  const client = mockClients.find(c => c.id === clientId)
  const ads = getAdsAnalysis(clientId)

  const patterns: CreativePattern[] = []
  const formats: Record<string, { cpr: number[]; count: number }> = {}

  // Analyze formats
  for (const ad of ads) {
    let format = 'Imagen'
    if (ad.adName.toLowerCase().includes('video')) format = 'Video'
    else if (ad.adName.toLowerCase().includes('carrusel')) format = 'Carrusel'
    else if (ad.adName.toLowerCase().includes('dpa')) format = 'DPA'

    if (!formats[format]) formats[format] = { cpr: [], count: 0 }
    formats[format].cpr.push(ad.avgCostPerResult)
    formats[format].count++
  }

  const topFormats = Object.entries(formats)
    .map(([format, data]) => ({
      format,
      avgCpr: data.cpr.reduce((s, c) => s + c, 0) / data.cpr.length,
      count: data.count
    }))
    .sort((a, b) => a.avgCpr - b.avgCpr)

  // Generate patterns
  const winners = ads.filter(a => a.classification === 'GANADOR')

  if (topFormats[0]) {
    patterns.push({
      pattern: `${topFormats[0].format} es el formato más eficiente`,
      impact: `CPR promedio: $${topFormats[0].avgCpr.toFixed(0)}`,
      examples: ads.filter(a => a.adName.toLowerCase().includes(topFormats[0].format.toLowerCase())).map(a => a.adName).slice(0, 2),
      confidence: topFormats[0].count >= 3 ? 'high' : 'medium'
    })
  }

  // Check for testimonial pattern
  const testimonials = ads.filter(a => a.adName.toLowerCase().includes('testimon'))
  if (testimonials.length > 0) {
    const avgCprTestimonial = testimonials.reduce((s, a) => s + a.avgCostPerResult, 0) / testimonials.length
    const avgCprOthers = ads.filter(a => !a.adName.toLowerCase().includes('testimon'))
      .reduce((s, a) => s + a.avgCostPerResult, 0) / (ads.length - testimonials.length)

    if (avgCprTestimonial < avgCprOthers) {
      patterns.push({
        pattern: 'Testimoniales generan más confianza',
        impact: `${((1 - avgCprTestimonial / avgCprOthers) * 100).toFixed(0)}% mejor CPR`,
        examples: testimonials.map(t => t.adName).slice(0, 2),
        confidence: 'high'
      })
    }
  }

  // Check for promo pattern
  const promos = ads.filter(a => a.adName.toLowerCase().includes('promo') || a.adName.toLowerCase().includes('2x1'))
  if (promos.length > 0 && promos.some(p => p.classification === 'GANADOR')) {
    patterns.push({
      pattern: 'Promociones con urgencia convierten mejor',
      impact: 'Mayor tasa de conversión',
      examples: promos.map(p => p.adName).slice(0, 2),
      confidence: 'medium'
    })
  }

  // Generate suggestion
  let suggestedNextCreative = ''
  if (winners.length > 0 && topFormats[0]) {
    const winnerTheme = winners[0].adName.includes('Testimon') ? 'testimonial' :
                        winners[0].adName.includes('Promo') ? 'promocional' : 'de producto'
    suggestedNextCreative = `${topFormats[0].format} ${winnerTheme} con variación en el copy/visual`
  } else {
    suggestedNextCreative = `Probar ${topFormats[0]?.format || 'Video'} con testimonial de cliente real`
  }

  return {
    clientId,
    industry: client?.industry || '',
    patterns,
    suggestedNextCreative,
    topFormats
  }
}

// ==================== AGENCY OVERVIEW ====================

export interface AgencyClientHealth {
  client: Client
  healthScore: number
  status: 'excellent' | 'good' | 'warning' | 'critical'
  mainIssue: string | null
  resultsTrend: number
  cprTrend: number
  pendingActions: number
  lastUpdated: string
}

export interface AgencyOverview {
  totalClients: number
  activeClients: number
  totalMonthlyBudget: number
  totalResultsThisMonth: number
  clientsHealth: AgencyClientHealth[]
  urgentActions: { clientName: string; action: string; priority: 'high' | 'medium' }[]
  weeklyGoals: { goal: string; progress: number; status: 'on_track' | 'behind' | 'ahead' }[]
}

export function getAgencyOverview(): AgencyOverview {
  const summaries = getClientSummaries()
  const clientsHealth: AgencyClientHealth[] = []
  const urgentActions: AgencyOverview['urgentActions'] = []

  for (const summary of summaries) {
    const ads = getAdsAnalysis(summary.client.id)
    const alerts = mockAlerts.filter(a => a.clientId === summary.client.id && !a.acknowledged)
    const pacing = getBudgetPacing(summary.client.id)
    const dependency = getAssetDependency(summary.client.id)

    // Calculate health score (0-100)
    let healthScore = 100
    let mainIssue: string | null = null

    // Deduct for alerts
    healthScore -= alerts.filter(a => a.severity === 'CRITICAL').length * 20
    healthScore -= alerts.filter(a => a.severity === 'WARNING').length * 10

    // Deduct for fatigued ads
    const fatiguedCount = ads.filter(a => a.classification === 'FATIGADO' || a.classification === 'PAUSAR').length
    healthScore -= fatiguedCount * 10
    if (fatiguedCount > 0 && !mainIssue) mainIssue = `${fatiguedCount} anuncio(s) fatigado(s)`

    // Deduct for budget issues
    if (pacing.status === 'overspending') {
      healthScore -= 15
      if (!mainIssue) mainIssue = 'Budget se agota rápido'
    }

    // Deduct for concentration risk
    if (dependency.concentrationRisk === 'critical') {
      healthScore -= 20
      if (!mainIssue) mainIssue = 'Alta dependencia de 1 anuncio'
    } else if (dependency.concentrationRisk === 'high') {
      healthScore -= 10
    }

    // Deduct for negative trend
    if (summary.trend === 'down') {
      healthScore -= 15
      if (!mainIssue) mainIssue = `Resultados -${Math.abs(summary.trendPercent).toFixed(0)}%`
    }

    healthScore = Math.max(0, Math.min(100, healthScore))

    const status: AgencyClientHealth['status'] =
      healthScore >= 85 ? 'excellent' :
      healthScore >= 70 ? 'good' :
      healthScore >= 50 ? 'warning' : 'critical'

    // Count pending actions
    const pendingActions = alerts.length + fatiguedCount + (pacing.status !== 'on_track' ? 1 : 0)

    clientsHealth.push({
      client: summary.client,
      healthScore,
      status,
      mainIssue,
      resultsTrend: summary.trendPercent,
      cprTrend: 0, // Would calculate from diagnostics
      pendingActions,
      lastUpdated: new Date().toISOString()
    })

    // Add urgent actions
    if (alerts.some(a => a.severity === 'CRITICAL')) {
      urgentActions.push({
        clientName: summary.client.name,
        action: 'Revisar alertas críticas',
        priority: 'high'
      })
    }
    if (fatiguedCount > 0) {
      urgentActions.push({
        clientName: summary.client.name,
        action: `Rotar ${fatiguedCount} creativo(s)`,
        priority: fatiguedCount > 2 ? 'high' : 'medium'
      })
    }
  }

  // Sort clients by health score
  clientsHealth.sort((a, b) => a.healthScore - b.healthScore)

  // Calculate totals
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const thisMonthMetrics = mockMetrics.filter(m => m.date >= monthStart)

  const totalMonthlyBudget = mockCampaigns
    .filter(c => c.status === 'ACTIVE')
    .reduce((sum, c) => sum + c.budget, 0)

  const totalResultsThisMonth = thisMonthMetrics.reduce((sum, m) => sum + m.results, 0)

  // Weekly goals (mock)
  const weeklyGoals = [
    { goal: 'Resultados semanales: 500', progress: 78, status: 'on_track' as const },
    { goal: 'Rotar creativos fatigados', progress: 40, status: 'behind' as const },
    { goal: 'Reportes mensuales', progress: 100, status: 'ahead' as const }
  ]

  return {
    totalClients: mockClients.length,
    activeClients: mockClients.filter(c => c.isActive).length,
    totalMonthlyBudget,
    totalResultsThisMonth,
    clientsHealth,
    urgentActions: urgentActions.slice(0, 5),
    weeklyGoals
  }
}
