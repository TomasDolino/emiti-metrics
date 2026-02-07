import { clsx, type ClassValue } from 'clsx'

// ==================== FORMATTING ====================

export function formatMoney(amount: number, currency = 'ARS'): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value >= 0 ? '' : ''}${value.toFixed(decimals)}%`
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-AR').format(Math.round(value))
}

export function formatCompact(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return formatNumber(value)
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
  })
}

export function formatDateFull(date: string | Date): string {
  return new Date(date).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function timeAgo(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Ahora'
  if (diffMins < 60) return `Hace ${diffMins}min`
  if (diffHours < 24) return `Hace ${diffHours}h`
  if (diffDays < 7) return `Hace ${diffDays}d`
  return formatDate(date)
}

// ==================== CALCULATIONS ====================

export function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export function calculateCTR(clicks: number, impressions: number): number {
  if (impressions === 0) return 0
  return (clicks / impressions) * 100
}

export function calculateCPR(spend: number, results: number): number {
  if (results === 0) return 0
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

// ==================== FATIGUE DETECTION ====================

export function calculateFatigueScore(
  frequency: number,
  ctrTrend7d: number,
  cpaTrend7d: number,
  daysRunning: number
): number {
  let score = 0

  // Frecuencia (0-30 pts) - Meta dice fatiga a 4+ exposiciones
  if (frequency >= 6) score += 30
  else if (frequency >= 4) score += 25
  else if (frequency >= 3) score += 15
  else if (frequency >= 2) score += 5

  // Tendencia CTR últimos 7 días (0-30 pts)
  if (ctrTrend7d < -25) score += 30
  else if (ctrTrend7d < -15) score += 20
  else if (ctrTrend7d < -10) score += 10

  // Tendencia CPA últimos 7 días (0-25 pts)
  if (cpaTrend7d > 50) score += 25
  else if (cpaTrend7d > 30) score += 15
  else if (cpaTrend7d > 15) score += 8

  // Días corriendo (0-15 pts)
  if (daysRunning >= 21) score += 15
  else if (daysRunning >= 14) score += 10
  else if (daysRunning >= 10) score += 5

  return Math.min(score, 100)
}

// ==================== STATISTICAL SIGNIFICANCE ====================

export function calculateSignificance(
  conversionsA: number,
  visitorsA: number,
  conversionsB: number,
  visitorsB: number
): { isSignificant: boolean; zScore: number; lift: number; confidence: number } {
  const crA = conversionsA / visitorsA
  const crB = conversionsB / visitorsB

  const seA = Math.sqrt((crA * (1 - crA)) / visitorsA)
  const seB = Math.sqrt((crB * (1 - crB)) / visitorsB)
  const seDiff = Math.sqrt(seA * seA + seB * seB)

  const zScore = seDiff > 0 ? (crB - crA) / seDiff : 0
  const isSignificant = Math.abs(zScore) > 1.96 // 95% confidence

  return {
    isSignificant,
    zScore,
    lift: crA > 0 ? ((crB - crA) / crA) * 100 : 0,
    confidence: 0.95,
  }
}

export function minimumSampleSize(
  baselineCR: number,
  minimumDetectableEffect: number
): number {
  const zAlpha = 1.96 // 95% confidence
  const zBeta = 0.84 // 80% power

  const p1 = baselineCR
  const p2 = baselineCR * (1 + minimumDetectableEffect)
  const pAvg = (p1 + p2) / 2

  const n = (2 * pAvg * (1 - pAvg) * Math.pow(zAlpha + zBeta, 2)) / Math.pow(p2 - p1, 2)

  return Math.ceil(n)
}

// ==================== CLASSIFICATION ====================

export type AdClassification = 'GANADOR' | 'ESCALABLE' | 'TESTING' | 'FATIGADO' | 'PAUSAR'

export function getClassificationColor(classification: AdClassification): string {
  const colors: Record<AdClassification, string> = {
    GANADOR: '#22c55e',
    ESCALABLE: '#3b82f6',
    TESTING: '#eab308',
    FATIGADO: '#f97316',
    PAUSAR: '#ef4444',
  }
  return colors[classification]
}

export function getClassificationBg(classification: AdClassification): string {
  const colors: Record<AdClassification, string> = {
    GANADOR: 'bg-green-100 text-green-700 border-green-300',
    ESCALABLE: 'bg-blue-100 text-blue-700 border-blue-300',
    TESTING: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    FATIGADO: 'bg-orange-100 text-orange-700 border-orange-300',
    PAUSAR: 'bg-red-100 text-red-700 border-red-300',
  }
  return colors[classification]
}

// ==================== STORAGE ====================

export function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : defaultValue
  } catch {
    return defaultValue
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

// ==================== CN HELPER ====================

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}
