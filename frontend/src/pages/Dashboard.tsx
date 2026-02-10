import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  DollarSign,
  MessageCircle,
  MousePointer,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Zap,
  Target,
  Activity,
  Calendar,
  X,
  Sparkles,
  BarChart3,
  PieChart as PieChartIcon,
  Gauge,
  Wallet,
  ExternalLink,
  Settings2,
  CheckCircle2,
  XCircle,
  Brain,
  Image,
  Info,
  Users,
  BarChart2,
  Building2,
  Crown
} from 'lucide-react'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts'
import { useSelectedClient } from '../components/Layout'
import { DashboardSkeleton } from '../components/Skeleton'
import AIInsightsWidget from '../components/AIInsightsWidget'
import { api, type DashboardData, type AdAnalysis, type Alert, type Client } from '../lib/api'
import { formatMoney, formatNumber, formatPercent, getClassificationColor, cn } from '../lib/utils'
import type { AdClassification } from '../lib/utils'

// ==================== TYPES ====================

type WidgetId =
  | 'metrics'
  | 'evolution'
  | 'classification'
  | 'topAds'
  | 'aiInsights'
  | 'performanceScore'
  | 'budgetPacing'
  | 'campaignBreakdown'
  | 'quickStats'
  | 'alerts'
  | 'bottomAds'

interface WidgetConfig {
  id: WidgetId
  name: string
  description: string
  icon: React.ElementType
  defaultEnabled: boolean
}

// ==================== WIDGET DEFINITIONS ====================

const AVAILABLE_WIDGETS: WidgetConfig[] = [
  { id: 'metrics', name: 'KPIs Principales', description: 'Gasto, resultados, CPR, CTR', icon: BarChart3, defaultEnabled: true },
  { id: 'performanceScore', name: 'Score de Performance', description: 'Puntuación general de la cuenta', icon: Gauge, defaultEnabled: true },
  { id: 'aiInsights', name: 'AI Insights', description: 'Insights generados por IA', icon: Brain, defaultEnabled: true },
  { id: 'evolution', name: 'Evolución', description: 'Gráfico de tendencias', icon: TrendingUp, defaultEnabled: true },
  { id: 'classification', name: 'Clasificación', description: 'Distribución de anuncios', icon: PieChartIcon, defaultEnabled: true },
  { id: 'budgetPacing', name: 'Budget Pacing', description: 'Ritmo de gasto vs objetivo', icon: Wallet, defaultEnabled: true },
  { id: 'topAds', name: 'Top Anuncios', description: 'Mejores anuncios por resultados', icon: Zap, defaultEnabled: true },
  { id: 'bottomAds', name: 'Anuncios a Mejorar', description: 'Anuncios con bajo rendimiento', icon: AlertTriangle, defaultEnabled: false },
  { id: 'campaignBreakdown', name: 'Campañas', description: 'Desglose por campaña', icon: Target, defaultEnabled: false },
  { id: 'quickStats', name: 'Stats Rápidos', description: 'Estadísticas resumidas', icon: Activity, defaultEnabled: true },
  { id: 'alerts', name: 'Alertas', description: 'Alertas activas', icon: AlertTriangle, defaultEnabled: true },
]

const PERIOD_OPTIONS = [
  { value: '1', label: 'Hoy' },
  { value: '7', label: '7 días' },
  { value: '14', label: '14 días' },
  { value: '30', label: '30 días' },
  { value: '60', label: '60 días' },
  { value: '90', label: '90 días' },
  { value: 'custom', label: 'Personalizado' },
]

// ==================== HELPER FUNCTIONS ====================

function calculatePerformanceScore(dashboard: DashboardData): { score: number; status: 'excellent' | 'good' | 'warning' | 'critical'; breakdown: { metric: string; score: number; weight: number }[] } {
  const breakdown: { metric: string; score: number; weight: number }[] = []

  // CPR Score (lower is better) - weight 30%
  const avgCpr = dashboard.avg_cpr
  let cprScore = 100
  if (avgCpr > 50) cprScore = 20
  else if (avgCpr > 30) cprScore = 40
  else if (avgCpr > 20) cprScore = 60
  else if (avgCpr > 10) cprScore = 80
  breakdown.push({ metric: 'CPR', score: cprScore, weight: 30 })

  // CTR Score - weight 20%
  const ctr = dashboard.avg_ctr
  let ctrScore = 0
  if (ctr >= 3) ctrScore = 100
  else if (ctr >= 2) ctrScore = 80
  else if (ctr >= 1) ctrScore = 60
  else if (ctr >= 0.5) ctrScore = 40
  else ctrScore = 20
  breakdown.push({ metric: 'CTR', score: ctrScore, weight: 20 })

  // Classification score - weight 25%
  const counts = dashboard.classification_counts || {}
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1
  const ganadores = (counts.GANADOR || 0) / total * 100
  const pausar = (counts.PAUSAR || 0) / total * 100
  let classScore = Math.min(100, ganadores * 3 - pausar * 2)
  classScore = Math.max(0, classScore)
  breakdown.push({ metric: 'Calidad Ads', score: classScore, weight: 25 })

  // Frequency score - weight 15%
  const freq = dashboard.avg_frequency
  let freqScore = 100
  if (freq > 4) freqScore = 20
  else if (freq > 3) freqScore = 50
  else if (freq > 2.5) freqScore = 70
  else if (freq > 2) freqScore = 85
  breakdown.push({ metric: 'Frecuencia', score: freqScore, weight: 15 })

  // Results trend - weight 10%
  const dailyMetrics = dashboard.daily_metrics || []
  let trendScore = 50
  if (dailyMetrics.length >= 7) {
    const firstHalf = dailyMetrics.slice(0, Math.floor(dailyMetrics.length / 2))
    const secondHalf = dailyMetrics.slice(Math.floor(dailyMetrics.length / 2))
    const firstAvg = firstHalf.reduce((a, b) => a + b.results, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b.results, 0) / secondHalf.length
    if (secondAvg > firstAvg * 1.1) trendScore = 100
    else if (secondAvg > firstAvg) trendScore = 80
    else if (secondAvg > firstAvg * 0.9) trendScore = 60
    else trendScore = 30
  }
  breakdown.push({ metric: 'Tendencia', score: trendScore, weight: 10 })

  // Calculate weighted average
  const totalWeight = breakdown.reduce((a, b) => a + b.weight, 0)
  const score = Math.round(breakdown.reduce((a, b) => a + (b.score * b.weight), 0) / totalWeight)

  let status: 'excellent' | 'good' | 'warning' | 'critical' = 'good'
  if (score >= 80) status = 'excellent'
  else if (score >= 60) status = 'good'
  else if (score >= 40) status = 'warning'
  else status = 'critical'

  return { score, status, breakdown }
}

function getScoreColor(status: string) {
  switch (status) {
    case 'excellent': return 'text-green-500'
    case 'good': return 'text-blue-500'
    case 'warning': return 'text-amber-500'
    case 'critical': return 'text-red-500'
    default: return 'text-slate-500'
  }
}

function getScoreBg(status: string) {
  switch (status) {
    case 'excellent': return 'from-green-500 to-emerald-600'
    case 'good': return 'from-blue-500 to-indigo-600'
    case 'warning': return 'from-amber-500 to-orange-600'
    case 'critical': return 'from-red-500 to-rose-600'
    default: return 'from-slate-500 to-slate-600'
  }
}

// ==================== EXPANDABLE METRIC CARD ====================

interface MetricCardProps {
  title: string
  value: string
  change?: number
  icon: React.ReactNode
  trendIsGood?: boolean
  hidden?: boolean
  details?: { label: string; value: string; trend?: number; info?: string }[]
  accentColor?: string
  onClick?: () => void
}

function MetricCard({ title, value, change, icon, trendIsGood, hidden, details, accentColor, onClick }: MetricCardProps) {
  const [expanded, setExpanded] = useState(false)
  const hasDetails = details && details.length > 0

  return (
    <div
      className={cn(
        "bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50",
        "shadow-lg shadow-violet-500/5 transition-all duration-300",
        hasDetails && "cursor-pointer hover:shadow-xl",
        expanded && "ring-2 ring-violet-500/30"
      )}
      onClick={() => hasDetails && setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
            {hasDetails && (
              <Info className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
          <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">
            {hidden ? '•••••' : value}
          </p>
          {change !== undefined && !hidden && (
            <div className="flex items-center gap-1 mt-2">
              {change >= 0 ? (
                <ArrowUpRight className={`w-4 h-4 ${trendIsGood !== false ? 'text-emerald-500' : 'text-red-500'}`} />
              ) : (
                <ArrowDownRight className={`w-4 h-4 ${trendIsGood !== false ? 'text-red-500' : 'text-emerald-500'}`} />
              )}
              <span className={`text-sm font-medium ${
                (change >= 0 && trendIsGood !== false) || (change < 0 && trendIsGood === false)
                  ? 'text-emerald-600'
                  : 'text-red-600'
              }`}>
                {Math.abs(change).toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400">vs anterior</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div
            className="p-2.5 rounded-xl"
            style={{
              background: accentColor
                ? `linear-gradient(135deg, ${accentColor}20, ${accentColor}10)`
                : 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(99,102,241,0.1))'
            }}
          >
            {icon}
          </div>
          {hasDetails && (
            <ChevronDown className={cn(
              "w-4 h-4 text-slate-400 transition-transform",
              expanded && "rotate-180"
            )} />
          )}
        </div>
      </div>

      {expanded && hasDetails && (
        <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50 space-y-3 animate-fadeIn">
          {details.map((d, i) => (
            <div key={i} className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">{d.label}</span>
                {d.info && (
                  <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                    {d.info}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900 dark:text-white">{d.value}</span>
                {d.trend !== undefined && (
                  <span className={cn(
                    "text-xs font-medium px-1.5 py-0.5 rounded",
                    d.trend >= 0
                      ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                  )}>
                    {d.trend >= 0 ? '+' : ''}{d.trend.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          ))}
          {onClick && (
            <button
              onClick={(e) => { e.stopPropagation(); onClick() }}
              className="w-full mt-2 px-3 py-2 text-sm font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors flex items-center justify-center gap-2"
            >
              Ver más detalles
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ==================== PERFORMANCE SCORE WIDGET ====================

function PerformanceScoreWidget({ dashboard }: { dashboard: DashboardData }) {
  const { score, status, breakdown } = calculatePerformanceScore(dashboard)

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-violet-500/5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Gauge className="w-5 h-5 text-violet-500" />
          Performance Score
        </h3>
      </div>

      <div className="flex items-center gap-6">
        {/* Score Circle */}
        <div className="relative w-28 h-28">
          <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              className="text-slate-200 dark:text-slate-700"
            />
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="url(#scoreGradient)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${score * 3.14} 314`}
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" className={getScoreColor(status).replace('text-', 'stop-color:')} style={{ stopColor: status === 'excellent' ? '#22c55e' : status === 'good' ? '#3b82f6' : status === 'warning' ? '#f59e0b' : '#ef4444' }} />
                <stop offset="100%" className={getScoreColor(status).replace('text-', 'stop-color:')} style={{ stopColor: status === 'excellent' ? '#10b981' : status === 'good' ? '#6366f1' : status === 'warning' ? '#f97316' : '#f43f5e' }} />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${getScoreColor(status)}`}>{score}</span>
            <span className="text-xs text-slate-500">/100</span>
          </div>
        </div>

        {/* Status & Message */}
        <div className="flex-1">
          <div className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium text-white mb-2",
            `bg-gradient-to-r ${getScoreBg(status)}`
          )}>
            {status === 'excellent' && <CheckCircle2 className="w-4 h-4" />}
            {status === 'good' && <TrendingUp className="w-4 h-4" />}
            {status === 'warning' && <AlertTriangle className="w-4 h-4" />}
            {status === 'critical' && <XCircle className="w-4 h-4" />}
            {status === 'excellent' ? 'Excelente' : status === 'good' ? 'Bueno' : status === 'warning' ? 'Mejorable' : 'Crítico'}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {status === 'excellent' && 'Tu cuenta está rindiendo muy bien. Mantén el buen trabajo.'}
            {status === 'good' && 'Buen rendimiento general. Hay oportunidades de mejora.'}
            {status === 'warning' && 'Algunos métricas necesitan atención. Revisa las recomendaciones.'}
            {status === 'critical' && 'Se detectaron problemas importantes. Acción inmediata requerida.'}
          </p>
        </div>
      </div>

      {/* Breakdown - Always visible */}
      <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50 space-y-2.5 overflow-hidden">
        {breakdown.map((item) => (
          <div key={item.metric} className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-20 flex-shrink-0 truncate">{item.metric}</span>
            <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden min-w-0">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  item.score >= 70 ? "bg-green-500" : item.score >= 40 ? "bg-amber-500" : "bg-red-500"
                )}
                style={{ width: `${item.score}%` }}
              />
            </div>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-8 text-right flex-shrink-0">
              {item.score}
            </span>
            <span className="text-[10px] text-slate-400 w-8 flex-shrink-0">
              ({item.weight}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ==================== BUDGET PACING WIDGET ====================

function BudgetPacingWidget({ dashboard }: { dashboard: DashboardData }) {
  const today = new Date()
  const dayOfMonth = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const expectedPacing = (dayOfMonth / daysInMonth) * 100

  // Estimate monthly budget based on daily spend
  const dailyAvg = dashboard.total_spend / (dashboard.period_days || 30)
  const projectedMonthlySpend = dailyAvg * daysInMonth
  const currentMonthSpend = dailyAvg * dayOfMonth
  const actualPacing = (currentMonthSpend / projectedMonthlySpend) * 100

  const pacingDiff = actualPacing - expectedPacing
  const status = Math.abs(pacingDiff) < 10 ? 'on-track' : pacingDiff > 0 ? 'ahead' : 'behind'

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-violet-500/5">
      <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
        <Wallet className="w-5 h-5 text-violet-500" />
        Budget Pacing
      </h3>

      <div className="space-y-4">
        {/* Main Progress */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-500">Gasto del mes</span>
            <span className="font-medium text-slate-900 dark:text-white">
              {formatMoney(currentMonthSpend)} / {formatMoney(projectedMonthlySpend)}
            </span>
          </div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative">
            {/* Expected position marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
              style={{ left: `${expectedPacing}%` }}
            />
            {/* Actual progress */}
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                status === 'on-track' ? "bg-gradient-to-r from-green-500 to-emerald-500" :
                status === 'ahead' ? "bg-gradient-to-r from-amber-500 to-orange-500" :
                "bg-gradient-to-r from-blue-500 to-indigo-500"
              )}
              style={{ width: `${Math.min(100, actualPacing)}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Día</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{dayOfMonth}/{daysInMonth}</p>
          </div>
          <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Pacing</p>
            <p className={cn(
              "text-lg font-bold",
              status === 'on-track' ? "text-green-600" : status === 'ahead' ? "text-amber-600" : "text-blue-600"
            )}>
              {actualPacing.toFixed(0)}%
            </p>
          </div>
          <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Proyección</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{formatMoney(projectedMonthlySpend)}</p>
          </div>
        </div>

        {/* Status Message */}
        <div className={cn(
          "flex items-center gap-2 p-2 rounded-lg text-sm",
          status === 'on-track' ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" :
          status === 'ahead' ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400" :
          "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
        )}>
          {status === 'on-track' && <CheckCircle2 className="w-4 h-4" />}
          {status === 'ahead' && <TrendingUp className="w-4 h-4" />}
          {status === 'behind' && <TrendingDown className="w-4 h-4" />}
          <span>
            {status === 'on-track' && 'En track - El gasto va acorde al esperado'}
            {status === 'ahead' && `Adelantado ${pacingDiff.toFixed(0)}% - Considera reducir gasto`}
            {status === 'behind' && `Atrasado ${Math.abs(pacingDiff).toFixed(0)}% - Hay margen para escalar`}
          </span>
        </div>
      </div>
    </div>
  )
}

// ==================== EVOLUTION SLIDER WIDGET ====================

interface EvolutionSliderProps {
  dashboard: DashboardData
  showAmounts: boolean
  periodDays: number
  periodLabel: string
}

const EVOLUTION_CHARTS = [
  { id: 'results-spend', title: 'Resultados y Gasto', icon: BarChart2 },
  { id: 'cpr', title: 'CPR', icon: DollarSign },
  { id: 'ctr', title: 'CTR', icon: MousePointer },
  { id: 'frequency', title: 'Frecuencia', icon: Users },
  { id: 'reach', title: 'Alcance Acumulado', icon: TrendingUp },
]

function EvolutionSliderWidget({ dashboard, showAmounts, periodDays, periodLabel }: EvolutionSliderProps) {
  const [currentChart, setCurrentChart] = useState(0)

  const nextChart = () => {
    setCurrentChart((prev) => (prev + 1) % EVOLUTION_CHARTS.length)
  }

  const prevChart = () => {
    setCurrentChart((prev) => (prev - 1 + EVOLUTION_CHARTS.length) % EVOLUTION_CHARTS.length)
  }

  // Prepare data with computed metrics
  const chartData = useMemo(() => {
    if (!dashboard.daily_metrics || dashboard.daily_metrics.length === 0) return []

    let cumulativeReach = 0
    return dashboard.daily_metrics.map((d) => {
      // Calculate daily CPR (spend / results)
      const dailyCpr = d.results > 0 ? d.spend / d.results : 0
      // Estimate daily CTR (we'll use avg or simulate based on impressions)
      const dailyCtr = d.impressions > 0 ? ((d.results * 10) / d.impressions) * 100 : 0 // Approximation
      // Frequency = impressions / reach estimate
      const dailyReach = d.impressions / (dashboard.avg_frequency || 2)
      const dailyFrequency = dailyReach > 0 ? d.impressions / dailyReach : 1
      // Cumulative reach
      cumulativeReach += dailyReach

      return {
        ...d,
        cpr: dailyCpr,
        ctr: Math.min(dailyCtr, 10), // Cap at 10%
        frequency: Math.min(dailyFrequency, 5), // Cap at 5
        cumulativeReach: Math.round(cumulativeReach),
      }
    })
  }, [dashboard])

  const currentChartConfig = EVOLUTION_CHARTS[currentChart]
  const ChartIcon = currentChartConfig.icon

  // Generate dynamic title based on period
  const getChartTitle = () => {
    const baseTitle = currentChartConfig.title
    if (periodDays === 1) {
      if (currentChartConfig.id === 'results-spend') return 'Resultados y Gasto (Hoy)'
      if (currentChartConfig.id === 'reach') return 'Alcance Total (Hoy)'
      return `${baseTitle} (Hoy)`
    }
    if (currentChartConfig.id === 'reach') return `Alcance Acumulado (${periodLabel})`
    return `${baseTitle} (${periodLabel})`
  }

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-slate-400">
          Sin datos de evolución
        </div>
      )
    }

    switch (currentChartConfig.id) {
      case 'results-spend':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorResults" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={(d) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
              />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} yAxisId="left" />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} yAxisId="right" orientation="right" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                }}
                formatter={(value, name) => {
                  const v = value as number
                  if (name === 'results') return [formatNumber(v), 'Resultados']
                  if (name === 'spend') return [showAmounts ? formatMoney(v) : '•••', 'Gasto']
                  return [v, name]
                }}
              />
              <Area type="monotone" dataKey="results" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#colorResults)" yAxisId="left" />
              <Area type="monotone" dataKey="spend" stroke="#06b6d4" strokeWidth={2.5} fill="url(#colorSpend)" yAxisId="right" />
            </AreaChart>
          </ResponsiveContainer>
        )

      case 'cpr':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCpr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={(d) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
              />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                }}
                formatter={(value) => [showAmounts ? formatMoney(value as number) : '•••', 'CPR']}
              />
              <Area type="monotone" dataKey="cpr" stroke="#f59e0b" strokeWidth={2.5} fill="url(#colorCpr)" />
            </AreaChart>
          </ResponsiveContainer>
        )

      case 'ctr':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCtr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={(d) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
              />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                }}
                formatter={(value) => [`${(value as number).toFixed(2)}%`, 'CTR']}
              />
              <Area type="monotone" dataKey="ctr" stroke="#10b981" strokeWidth={2.5} fill="url(#colorCtr)" />
            </AreaChart>
          </ResponsiveContainer>
        )

      case 'frequency':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorFreq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={(d) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
              />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} domain={[0, 'auto']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                }}
                formatter={(value) => [(value as number).toFixed(2), 'Frecuencia']}
              />
              <Area type="monotone" dataKey="frequency" stroke="#ec4899" strokeWidth={2.5} fill="url(#colorFreq)" />
            </AreaChart>
          </ResponsiveContainer>
        )

      case 'reach':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={(d) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
              />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => formatNumber(v)} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                }}
                formatter={(value) => [formatNumber(value as number), 'Alcance Acumulado']}
              />
              <Area type="monotone" dataKey="cumulativeReach" stroke="#6366f1" strokeWidth={2.5} fill="url(#colorReach)" />
            </AreaChart>
          </ResponsiveContainer>
        )

      default:
        return null
    }
  }

  const getLegendItems = () => {
    switch (currentChartConfig.id) {
      case 'results-spend':
        return [
          { color: '#8b5cf6', label: 'Resultados' },
          { color: '#06b6d4', label: 'Gasto' },
        ]
      case 'cpr':
        return [{ color: '#f59e0b', label: 'CPR (Costo por Resultado)' }]
      case 'ctr':
        return [{ color: '#10b981', label: 'CTR (Click Through Rate)' }]
      case 'frequency':
        return [{ color: '#ec4899', label: 'Frecuencia de Impresión' }]
      case 'reach':
        return [{ color: '#6366f1', label: 'Alcance Acumulado' }]
      default:
        return []
    }
  }

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-violet-500/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 truncate">
            <ChartIcon className="w-5 h-5 text-violet-500 flex-shrink-0" />
            <span className="truncate">{getChartTitle()}</span>
          </h3>
          <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full flex-shrink-0">
            {currentChart + 1}/{EVOLUTION_CHARTS.length}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={prevChart}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            aria-label="Gráfico anterior"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
          <button
            onClick={nextChart}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            aria-label="Siguiente gráfico"
          >
            <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
      </div>

      {/* Chart dots indicator */}
      <div className="flex justify-center gap-1.5 mb-3">
        {EVOLUTION_CHARTS.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentChart(index)}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              currentChart === index
                ? "bg-violet-500 w-4"
                : "bg-slate-300 dark:bg-slate-600 hover:bg-slate-400"
            )}
            aria-label={`Ir a gráfico ${index + 1}`}
          />
        ))}
      </div>

      <div className="h-64">
        {renderChart()}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4">
        {getLegendItems().map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-slate-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ==================== INTERACTIVE CLASSIFICATION CHART ====================

interface ClassificationChartProps {
  dashboard: DashboardData
}

function ClassificationChart({ dashboard }: ClassificationChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [selectedClassification, setSelectedClassification] = useState<string | null>(null)

  const classificationData = useMemo(() => [
    { name: 'Ganador', value: dashboard.classification_counts?.GANADOR || 0, color: '#22c55e', key: 'GANADOR' },
    { name: 'Escalable', value: dashboard.classification_counts?.ESCALABLE || 0, color: '#3b82f6', key: 'ESCALABLE' },
    { name: 'Testing', value: dashboard.classification_counts?.TESTING || 0, color: '#eab308', key: 'TESTING' },
    { name: 'Fatigado', value: dashboard.classification_counts?.FATIGADO || 0, color: '#f97316', key: 'FATIGADO' },
    { name: 'Pausar', value: dashboard.classification_counts?.PAUSAR || 0, color: '#ef4444', key: 'PAUSAR' },
  ].filter(d => d.value > 0), [dashboard])

  const totalAds = classificationData.reduce((a, b) => a + b.value, 0)

  // Get ads for selected classification
  const selectedAds = useMemo(() => {
    if (!selectedClassification || !dashboard.top_ads) return []
    return dashboard.top_ads.filter(ad => ad.classification === selectedClassification).slice(0, 5)
  }, [selectedClassification, dashboard.top_ads])

  const handleClick = (classification: string) => {
    if (selectedClassification === classification) {
      setSelectedClassification(null)
    } else {
      setSelectedClassification(classification)
    }
  }

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-violet-500/5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <PieChartIcon className="w-5 h-5 text-violet-500" />
          Clasificación de Anuncios
        </h3>
        <Link
          to="/ads"
          className="text-sm font-medium text-violet-500 hover:text-violet-600 flex items-center gap-1"
        >
          Ver todos
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {classificationData.length > 0 ? (
        <div className="flex flex-col lg:flex-row items-center gap-4">
          {/* Pie Chart */}
          <div className="w-full lg:w-1/2 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={classificationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onClick={(data) => handleClick(data.key)}
                  className="cursor-pointer"
                >
                  {classificationData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      opacity={activeIndex === null || activeIndex === index ? 1 : 0.5}
                      stroke={selectedClassification === entry.key ? '#8b5cf6' : 'transparent'}
                      strokeWidth={3}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ payload }) => {
                    if (!payload || !payload[0]) return null
                    const data = payload[0].payload
                    return (
                      <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                        <p className="font-medium text-slate-900 dark:text-white">{data.name}</p>
                        <p className="text-sm text-slate-500">{data.value} anuncios ({((data.value / totalAds) * 100).toFixed(0)}%)</p>
                      </div>
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend & Stats */}
          <div className="w-full lg:w-1/2 space-y-2">
            {classificationData.map((item) => (
              <button
                key={item.name}
                onClick={() => handleClick(item.key)}
                className={cn(
                  "w-full flex items-center gap-2 p-2 rounded-lg transition-all text-left",
                  selectedClassification === item.key
                    ? "bg-violet-50 dark:bg-violet-900/20 ring-2 ring-violet-500"
                    : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                )}
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-slate-600 dark:text-slate-400 flex-1">{item.name}</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{item.value}</span>
                <span className="text-xs text-slate-400">({((item.value / totalAds) * 100).toFixed(0)}%)</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-48 text-slate-400">
          Sin anuncios clasificados
        </div>
      )}

      {/* Selected Classification Detail */}
      {selectedClassification && selectedAds.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50 animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Anuncios {selectedClassification.toLowerCase()}
            </h4>
            <button
              onClick={() => setSelectedClassification(null)}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {selectedAds.map((ad, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div className="w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded flex items-center justify-center">
                  <Image className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{ad.ad_name}</p>
                  <p className="text-xs text-slate-500">{formatNumber(ad.results)} results • {formatMoney(ad.cpr)} CPR</p>
                </div>
              </div>
            ))}
          </div>
          <Link
            to={`/ads?filter=${selectedClassification}`}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors text-sm font-medium"
          >
            Ver todos los {selectedClassification.toLowerCase()}
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  )
}

// ==================== TOP/BOTTOM ADS WIDGET ====================

interface AdsListWidgetProps {
  ads: AdAnalysis[]
  title: string
  icon: React.ReactNode
  type: 'top' | 'bottom'
  showAmounts: boolean
}

function AdsListWidget({ ads, title, icon, type, showAmounts }: AdsListWidgetProps) {
  const navigate = useNavigate()
  const displayAds = type === 'top'
    ? [...ads].sort((a, b) => b.results - a.results).slice(0, 5)
    : [...ads].sort((a, b) => a.results - b.results).filter(a => a.classification === 'PAUSAR' || a.classification === 'FATIGADO').slice(0, 5)

  if (displayAds.length === 0) return null

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-violet-500/5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          {icon}
          {title}
        </h3>
        <Link to="/ads" className="text-sm font-medium text-violet-500 hover:text-violet-600">
          Ver todos →
        </Link>
      </div>
      <div className="space-y-2">
        {displayAds.map((ad, i) => {
          const borderColor = getClassificationColor(ad.classification as AdClassification)
          return (
            <div
              key={i}
              className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border-l-4 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              style={{ borderLeftColor: borderColor }}
              onClick={() => navigate('/ads')}
            >
              <div className="w-10 h-10 bg-slate-200 dark:bg-slate-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Image className="w-5 h-5 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{ad.ad_name}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{formatNumber(ad.results)} results</span>
                  <span>•</span>
                  <span>{showAmounts ? formatMoney(ad.cpr) : '•••'} CPR</span>
                  <span>•</span>
                  <span>{formatPercent(ad.ctr)} CTR</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium text-white"
                  style={{ backgroundColor: borderColor }}
                >
                  {ad.classification}
                </span>
                {ad.recommendation && (
                  <span className="text-xs text-violet-500 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {ad.action}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ==================== CLIENTS RANKING WIDGET (for "All Clients" view) ====================

interface ClientsRankingWidgetProps {
  clients: Client[]
}

function ClientsRankingWidget({ clients }: ClientsRankingWidgetProps) {
  const navigate = useNavigate()
  const activeClients = clients.filter(c => c.is_active)

  if (activeClients.length === 0) return null

  // Sort by metrics_count descending
  const sortedClients = [...activeClients].sort((a, b) => (b.metrics_count || 0) - (a.metrics_count || 0))

  return (
    <div className="bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-fuchsia-500/10 dark:from-violet-500/20 dark:via-purple-500/10 dark:to-fuchsia-500/20 backdrop-blur-sm rounded-2xl p-5 border border-violet-200/50 dark:border-violet-700/50 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-500" />
          Ranking de Clientes
        </h3>
        <Link to="/clients" className="text-sm font-medium text-violet-500 hover:text-violet-600">
          Ver todos →
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {sortedClients.slice(0, 5).map((client, index) => (
          <button
            key={client.id}
            onClick={() => navigate(`/?client=${client.id}`)}
            className="bg-white/80 dark:bg-slate-800/80 rounded-xl p-3 text-left hover:shadow-md transition-all hover:scale-[1.02] border border-slate-200/50 dark:border-slate-700/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ background: client.color || '#6366f1' }}
              >
                {client.name.slice(0, 2).toUpperCase()}
              </div>
              {index < 3 && (
                <span className={cn(
                  "text-xs font-bold px-1.5 py-0.5 rounded",
                  index === 0 ? "bg-amber-100 text-amber-700" :
                  index === 1 ? "bg-slate-100 text-slate-600" :
                  "bg-orange-100 text-orange-700"
                )}>
                  #{index + 1}
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{client.name}</p>
            <p className="text-xs text-slate-500">
              {client.campaigns_count || 0} campañas
            </p>
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-4 pt-4 border-t border-violet-200/30 dark:border-violet-700/30 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{activeClients.length}</p>
          <p className="text-xs text-slate-500">Clientes Activos</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {activeClients.reduce((a, b) => a + (b.campaigns_count || 0), 0)}
          </p>
          <p className="text-xs text-slate-500">Campañas Totales</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-fuchsia-600 dark:text-fuchsia-400">
            {activeClients.reduce((a, b) => a + (b.metrics_count || 0), 0)}
          </p>
          <p className="text-xs text-slate-500">Registros</p>
        </div>
      </div>
    </div>
  )
}

// ==================== WIDGET CONFIGURATOR ====================

interface WidgetConfiguratorProps {
  enabledWidgets: WidgetId[]
  onToggleWidget: (id: WidgetId) => void
  onClose: () => void
}

function WidgetConfigurator({ enabledWidgets, onToggleWidget, onClose }: WidgetConfiguratorProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-fadeIn">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-violet-500" />
            Configurar Dashboard
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto">
          <p className="text-sm text-slate-500 mb-4">
            Selecciona los widgets que quieres ver en tu dashboard
          </p>
          <div className="space-y-2">
            {AVAILABLE_WIDGETS.map((widget) => {
              const Icon = widget.icon
              const isEnabled = enabledWidgets.includes(widget.id)
              return (
                <button
                  key={widget.id}
                  onClick={() => onToggleWidget(widget.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                    isEnabled
                      ? "bg-violet-50 dark:bg-violet-900/20 border-2 border-violet-500"
                      : "bg-slate-50 dark:bg-slate-700/50 border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    isEnabled ? "bg-violet-500 text-white" : "bg-slate-200 dark:bg-slate-600 text-slate-500"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className={cn(
                      "font-medium",
                      isEnabled ? "text-violet-700 dark:text-violet-300" : "text-slate-700 dark:text-slate-300"
                    )}>
                      {widget.name}
                    </p>
                    <p className="text-xs text-slate-500">{widget.description}</p>
                  </div>
                  <div className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                    isEnabled ? "bg-violet-500 border-violet-500" : "border-slate-300 dark:border-slate-600"
                  )}>
                    {isEnabled && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-violet-500 text-white rounded-xl font-medium hover:bg-violet-600 transition-colors"
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  )
}

// ==================== MAIN DASHBOARD ====================

export default function Dashboard() {
  const { selectedClientId } = useSelectedClient()
  const navigate = useNavigate()

  const [showAmounts, setShowAmounts] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showConfigurator, setShowConfigurator] = useState(false)

  // Period filter
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)

  // Enabled widgets
  const [enabledWidgets, setEnabledWidgets] = useState<WidgetId[]>(() => {
    const saved = localStorage.getItem('metrics_dashboard_widgets')
    if (saved) return JSON.parse(saved)
    return AVAILABLE_WIDGETS.filter(w => w.defaultEnabled).map(w => w.id)
  })

  // Data
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [comparison, setComparison] = useState<{ changes: Record<string, number> } | null>(null)

  // Save widgets to localStorage
  useEffect(() => {
    localStorage.setItem('metrics_dashboard_widgets', JSON.stringify(enabledWidgets))
  }, [enabledWidgets])

  const toggleWidget = (id: WidgetId) => {
    setEnabledWidgets(prev =>
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    )
  }

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const dashboardParams: Parameters<typeof api.getDashboard>[0] = {
          clientId: selectedClientId || undefined,
        }

        const comparisonParams: Parameters<typeof api.getPeriodComparison>[0] = {
          clientId: selectedClientId || undefined,
        }

        if (selectedPeriod === 'custom' && customStartDate && customEndDate) {
          dashboardParams.startDate = customStartDate
          dashboardParams.endDate = customEndDate
          comparisonParams.startDate = customStartDate
          comparisonParams.endDate = customEndDate
        } else {
          dashboardParams.days = parseInt(selectedPeriod) || 30
          comparisonParams.days = parseInt(selectedPeriod) || 7
        }

        const [dashboardData, alertsData, clientsData, comparisonData] = await Promise.all([
          api.getDashboard(dashboardParams),
          api.getAlerts({ clientId: selectedClientId || undefined, acknowledged: false, limit: 10 }),
          api.getClients(),
          api.getPeriodComparison(comparisonParams)
        ])

        setDashboard(dashboardData)
        setAlerts(alertsData)
        setClients(clientsData)
        setComparison(comparisonData)
      } catch (err) {
        console.error('Error fetching dashboard:', err)
        setError(err instanceof Error ? err.message : 'Error cargando datos')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [selectedClientId, selectedPeriod, customStartDate, customEndDate])

  const selectedClient = selectedClientId ? clients.find(c => c.id === selectedClientId) : null

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Error cargando datos</h3>
        <p className="text-slate-500 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Target className="w-12 h-12 text-slate-400 mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Sin datos</h3>
        <p className="text-slate-500">Subí un CSV para empezar a ver métricas</p>
        <Link to="/upload" className="mt-4 px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600">
          Subir CSV
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          {selectedClient ? (
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
              style={{ background: `linear-gradient(135deg, ${selectedClient.color || '#6366f1'}, ${selectedClient.color || '#6366f1'}cc)` }}
            >
              {selectedClient.name.slice(0, 2).toUpperCase()}
            </div>
          ) : (
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500">
              <Building2 className="w-6 h-6" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {selectedClient ? selectedClient.name : 'Resumen General'}
            </h1>
            <p className="text-sm text-slate-500">
              {selectedClient
                ? selectedClient.industry || 'Cliente'
                : `${clients.filter(c => c.is_active).length} clientes activos`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Filter */}
          <div className="relative">
            <button
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-medium transition-all"
            >
              <Calendar size={16} />
              <span>
                {selectedPeriod === 'custom' && customStartDate && customEndDate
                  ? `${new Date(customStartDate).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })} - ${new Date(customEndDate).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}`
                  : PERIOD_OPTIONS.find(p => p.value === selectedPeriod)?.label || '30 días'
                }
              </span>
              <ChevronDown size={14} className={cn("transition-transform", showPeriodDropdown && "rotate-180")} />
            </button>

            {showPeriodDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowPeriodDropdown(false)} />
                <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50">
                  {PERIOD_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        if (option.value === 'custom') {
                          setShowDatePicker(true)
                        } else {
                          setSelectedPeriod(option.value)
                          setCustomStartDate('')
                          setCustomEndDate('')
                        }
                        setShowPeriodDropdown(false)
                      }}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-sm transition-colors",
                        selectedPeriod === option.value
                          ? "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 font-medium"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setShowAmounts(!showAmounts)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title={showAmounts ? 'Ocultar montos' : 'Mostrar montos'}
          >
            {showAmounts ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>

          <button
            onClick={() => setShowConfigurator(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500 text-white hover:bg-violet-600 transition-colors"
          >
            <Settings2 size={18} />
            <span className="hidden sm:inline text-sm font-medium">Configurar</span>
          </button>
        </div>
      </div>

      {/* Custom Date Picker Modal */}
      {showDatePicker && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowDatePicker(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 z-50 w-full max-w-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Seleccionar período</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Desde</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 border-0 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Hasta</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 border-0 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDatePicker(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (customStartDate && customEndDate) {
                    setSelectedPeriod('custom')
                    setShowDatePicker(false)
                  }
                }}
                disabled={!customStartDate || !customEndDate}
                className="flex-1 px-4 py-2.5 rounded-xl bg-violet-500 text-white font-medium hover:bg-violet-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Aplicar
              </button>
            </div>
          </div>
        </>
      )}

      {/* Alerts Banner */}
      {enabledWidgets.includes('alerts') && alerts.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl p-4 border border-amber-200 dark:border-amber-500/20 flex items-center gap-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
              {alerts.length} alerta{alerts.length > 1 ? 's' : ''} activa{alerts.length > 1 ? 's' : ''}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-500/80 truncate">{alerts[0].message}</p>
          </div>
          <Link to="/alerts" className="text-sm font-semibold text-amber-600 hover:underline whitespace-nowrap">
            Ver todas →
          </Link>
        </div>
      )}

      {/* KPI Metric Cards */}
      {enabledWidgets.includes('metrics') && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Gasto Total"
            value={formatMoney(dashboard.total_spend)}
            change={comparison?.changes?.spend}
            icon={<DollarSign className="w-5 h-5 text-violet-500" />}
            trendIsGood={false}
            hidden={!showAmounts}
            accentColor="#8b5cf6"
            details={[
              { label: 'Promedio diario', value: formatMoney(dashboard.total_spend / (dashboard.period_days || 30)) },
              { label: 'CPM promedio', value: formatMoney(dashboard.avg_cpm) },
              { label: 'Costo por clic', value: formatMoney(dashboard.total_spend / (dashboard.total_impressions * (dashboard.avg_ctr / 100) || 1)), info: 'Estimado' },
              { label: 'Alcance', value: formatNumber(dashboard.total_reach) },
            ]}
            onClick={() => navigate('/metrics')}
          />
          <MetricCard
            title="Resultados"
            value={formatNumber(dashboard.total_results)}
            change={comparison?.changes?.results}
            icon={<MessageCircle className="w-5 h-5 text-emerald-500" />}
            trendIsGood={true}
            accentColor="#10b981"
            details={[
              { label: 'Promedio diario', value: formatNumber(Math.round(dashboard.total_results / (dashboard.period_days || 30))) },
              { label: 'Mejor día', value: dashboard.daily_metrics?.length > 0 ? formatNumber(Math.max(...dashboard.daily_metrics.map(d => d.results))) : '—' },
              { label: 'Peor día', value: dashboard.daily_metrics?.length > 0 ? formatNumber(Math.min(...dashboard.daily_metrics.map(d => d.results))) : '—' },
              { label: 'Alcance total', value: formatNumber(dashboard.total_reach) },
            ]}
            onClick={() => navigate('/analysis')}
          />
          <MetricCard
            title="CPR Promedio"
            value={formatMoney(dashboard.avg_cpr)}
            change={comparison?.changes?.cpr}
            icon={<TrendingDown className="w-5 h-5 text-blue-500" />}
            trendIsGood={false}
            hidden={!showAmounts}
            accentColor="#3b82f6"
            details={[
              { label: 'Ganadores', value: formatMoney(dashboard.top_ads?.filter(a => a.classification === 'GANADOR').reduce((a, b) => a + b.cpr, 0) / (dashboard.classification_counts?.GANADOR || 1) || 0), info: 'Promedio' },
              { label: 'Escalables', value: formatMoney(dashboard.top_ads?.filter(a => a.classification === 'ESCALABLE').reduce((a, b) => a + b.cpr, 0) / (dashboard.classification_counts?.ESCALABLE || 1) || 0), info: 'Promedio' },
              { label: 'Testing', value: formatMoney(dashboard.top_ads?.filter(a => a.classification === 'TESTING').reduce((a, b) => a + b.cpr, 0) / (dashboard.classification_counts?.TESTING || 1) || 0), info: 'Promedio' },
            ]}
            onClick={() => navigate('/ads')}
          />
          <MetricCard
            title="CTR Promedio"
            value={formatPercent(dashboard.avg_ctr)}
            icon={<MousePointer className="w-5 h-5 text-cyan-500" />}
            trendIsGood={true}
            accentColor="#06b6d4"
            details={[
              { label: 'Impresiones', value: formatNumber(dashboard.total_impressions) },
              { label: 'Clics estimados', value: formatNumber(Math.round(dashboard.total_impressions * (dashboard.avg_ctr / 100))) },
              { label: 'Frecuencia', value: dashboard.avg_frequency.toFixed(1), info: dashboard.avg_frequency > 3 ? 'Alta' : 'Normal' },
            ]}
            onClick={() => navigate('/metrics')}
          />
        </div>
      )}

      {/* Clients Ranking - Only shown when no client selected */}
      {!selectedClientId && clients.length > 0 && (
        <ClientsRankingWidget clients={clients} />
      )}

      {/* Performance Score + AI Insights Row */}
      {(enabledWidgets.includes('performanceScore') || enabledWidgets.includes('aiInsights')) && (
        <div className="grid lg:grid-cols-2 gap-6">
          {enabledWidgets.includes('performanceScore') && (
            <PerformanceScoreWidget dashboard={dashboard} />
          )}
          {enabledWidgets.includes('aiInsights') && (
            <AIInsightsWidget clientId={selectedClientId} clientName={selectedClient?.name} />
          )}
        </div>
      )}

      {/* Evolution + Classification Row */}
      {(enabledWidgets.includes('evolution') || enabledWidgets.includes('classification')) && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Evolution Chart Slider */}
          {enabledWidgets.includes('evolution') && (
            <EvolutionSliderWidget
              dashboard={dashboard}
              showAmounts={showAmounts}
              periodDays={parseInt(selectedPeriod) || dashboard.period_days || 30}
              periodLabel={
                selectedPeriod === 'custom'
                  ? 'Período personalizado'
                  : selectedPeriod === '1'
                    ? 'Hoy'
                    : `Últimos ${selectedPeriod} días`
              }
            />
          )}

          {/* Classification Chart */}
          {enabledWidgets.includes('classification') && (
            <ClassificationChart dashboard={dashboard} />
          )}
        </div>
      )}

      {/* Budget Pacing */}
      {enabledWidgets.includes('budgetPacing') && (
        <BudgetPacingWidget dashboard={dashboard} />
      )}

      {/* Top Ads */}
      {enabledWidgets.includes('topAds') && dashboard.top_ads && dashboard.top_ads.length > 0 && (
        <AdsListWidget
          ads={dashboard.top_ads}
          title="Top Anuncios"
          icon={<Zap className="w-5 h-5 text-emerald-500" />}
          type="top"
          showAmounts={showAmounts}
        />
      )}

      {/* Bottom Ads */}
      {enabledWidgets.includes('bottomAds') && dashboard.top_ads && dashboard.top_ads.length > 0 && (
        <AdsListWidget
          ads={dashboard.top_ads}
          title="Anuncios a Mejorar"
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
          type="bottom"
          showAmounts={showAmounts}
        />
      )}

      {/* Quick Stats */}
      {enabledWidgets.includes('quickStats') && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-medium">Período</span>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {dashboard.period_days} días
            </p>
          </div>
          <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Zap className="w-4 h-4" />
              <span className="text-xs font-medium">Anuncios</span>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{dashboard.top_ads?.length || 0}</p>
          </div>
          <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-2 text-emerald-500 mb-1">
              <Activity className="w-4 h-4" />
              <span className="text-xs font-medium">Ganadores</span>
            </div>
            <p className="text-xl font-bold text-emerald-600">{dashboard.classification_counts?.GANADOR || 0}</p>
          </div>
          <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-2 text-red-500 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-medium">A Pausar</span>
            </div>
            <p className="text-xl font-bold text-red-600">{dashboard.classification_counts?.PAUSAR || 0}</p>
          </div>
        </div>
      )}

      {/* Widget Configurator Modal */}
      {showConfigurator && (
        <WidgetConfigurator
          enabledWidgets={enabledWidgets}
          onToggleWidget={toggleWidget}
          onClose={() => setShowConfigurator(false)}
        />
      )}
    </div>
  )
}
