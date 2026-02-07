// ==================== BENCHMARKS LATAM ====================

export interface IndustryBenchmarks {
  ctr: number      // %
  cpc: number      // USD
  cpm: number      // USD
  cvr: number      // %
  cpa: number      // USD
  frequency_warning: number
  frequency_critical: number
}

// Benchmarks por industria para Argentina/LATAM
// Fuentes: XYZ Lab, WordStream, datos propios
export const BENCHMARKS_ARGENTINA: Record<string, IndustryBenchmarks> = {
  ecommerce: {
    ctr: 1.1,
    cpc: 0.25,
    cpm: 2.50,
    cvr: 8.5,
    cpa: 12.00,
    frequency_warning: 3.0,
    frequency_critical: 4.5,
  },
  servicios: {
    ctr: 0.9,
    cpc: 0.35,
    cpm: 3.20,
    cvr: 10.0,
    cpa: 18.00,
    frequency_warning: 3.5,
    frequency_critical: 5.0,
  },
  restaurantes: {
    ctr: 1.4,
    cpc: 0.18,
    cpm: 2.10,
    cvr: 12.0,
    cpa: 8.00,
    frequency_warning: 2.5,
    frequency_critical: 4.0,
  },
  inmobiliaria: {
    ctr: 0.8,
    cpc: 0.45,
    cpm: 4.00,
    cvr: 6.0,
    cpa: 25.00,
    frequency_warning: 4.0,
    frequency_critical: 6.0,
  },
  educacion: {
    ctr: 0.7,
    cpc: 0.30,
    cpm: 2.80,
    cvr: 11.0,
    cpa: 15.00,
    frequency_warning: 3.0,
    frequency_critical: 5.0,
  },
  fitness: {
    ctr: 1.0,
    cpc: 0.28,
    cpm: 2.60,
    cvr: 14.0,
    cpa: 10.00,
    frequency_warning: 3.0,
    frequency_critical: 4.5,
  },
  salud: {
    ctr: 0.85,
    cpc: 0.38,
    cpm: 3.50,
    cvr: 9.0,
    cpa: 20.00,
    frequency_warning: 3.5,
    frequency_critical: 5.0,
  },
  default: {
    ctr: 0.9,
    cpc: 0.30,
    cpm: 3.00,
    cvr: 9.0,
    cpa: 15.00,
    frequency_warning: 3.0,
    frequency_critical: 4.5,
  },
}

// Benchmarks globales (USA/EU)
export const BENCHMARKS_GLOBAL: Record<string, IndustryBenchmarks> = {
  ecommerce: {
    ctr: 1.24,
    cpc: 0.70,
    cpm: 5.50,
    cvr: 9.21,
    cpa: 7.60,
    frequency_warning: 3.0,
    frequency_critical: 4.0,
  },
  retail: {
    ctr: 1.59,
    cpc: 0.70,
    cpm: 4.50,
    cvr: 3.26,
    cpa: 21.47,
    frequency_warning: 3.0,
    frequency_critical: 4.0,
  },
  b2b: {
    ctr: 0.78,
    cpc: 2.52,
    cpm: 8.00,
    cvr: 10.63,
    cpa: 23.77,
    frequency_warning: 4.0,
    frequency_critical: 6.0,
  },
  finance: {
    ctr: 0.56,
    cpc: 3.77,
    cpm: 12.00,
    cvr: 9.09,
    cpa: 41.43,
    frequency_warning: 4.0,
    frequency_critical: 6.0,
  },
  default: {
    ctr: 0.90,
    cpc: 1.72,
    cpm: 7.00,
    cvr: 9.21,
    cpa: 18.68,
    frequency_warning: 3.0,
    frequency_critical: 4.0,
  },
}

// ==================== BENCHMARK FUNCTIONS ====================

export function getBenchmarks(industry: string, region: 'argentina' | 'global' = 'argentina'): IndustryBenchmarks {
  const benchmarks = region === 'argentina' ? BENCHMARKS_ARGENTINA : BENCHMARKS_GLOBAL
  return benchmarks[industry.toLowerCase()] || benchmarks.default
}

export function compareToBenchmark(value: number, benchmark: number, lowerIsBetter = false): {
  percent: number
  status: 'good' | 'average' | 'bad'
  label: string
} {
  const percent = ((value - benchmark) / benchmark) * 100

  let status: 'good' | 'average' | 'bad'
  if (lowerIsBetter) {
    status = percent <= -15 ? 'good' : percent <= 15 ? 'average' : 'bad'
  } else {
    status = percent >= 15 ? 'good' : percent >= -15 ? 'average' : 'bad'
  }

  const absPercent = Math.abs(percent)
  let label: string
  if (absPercent < 5) {
    label = 'En el promedio'
  } else if (percent > 0) {
    label = lowerIsBetter ? `${absPercent.toFixed(0)}% arriba del benchmark` : `${absPercent.toFixed(0)}% arriba del benchmark`
  } else {
    label = lowerIsBetter ? `${absPercent.toFixed(0)}% debajo del benchmark` : `${absPercent.toFixed(0)}% debajo del benchmark`
  }

  return { percent, status, label }
}

// ==================== CREATIVE BENCHMARKS ====================

export const CREATIVE_BENCHMARKS = {
  thumbstop_rate: {
    bad: 20,
    average: 30,
    good: 40,
  },
  hold_rate: {
    bad: 15,
    average: 25,
    good: 35,
  },
  completion_rate_15s: {
    bad: 30,
    average: 45,
    good: 60,
  },
  result_rate: {
    bad: 5,
    average: 10,
    good: 15,
  },
}

// ==================== FATIGUE THRESHOLDS ====================

export const FATIGUE_THRESHOLDS = {
  frequency: {
    safe: 2.0,
    warning: 3.0,
    critical: 4.0,
    severe: 6.0,
  },
  ctr_drop_percent: {
    warning: 15,
    critical: 25,
  },
  cpa_increase_percent: {
    warning: 30,
    critical: 50,
  },
  days_to_refresh: {
    minimum: 7,
    recommended: 14,
    maximum: 21,
  },
}
