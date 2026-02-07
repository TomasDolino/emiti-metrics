import { useState, useEffect } from 'react'
import {
  DollarSign,
  MessageCircle,
  MousePointer,
  TrendingDown,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  EyeOff,
  GripVertical,
  Settings2,
  RotateCcw,
  Stethoscope,
  Send,
  Copy,
  Check,
  Sun,
  Zap,
  Clock,
  Trophy,
  ChevronRight
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { useTheme } from '../lib/theme'
import { useSelectedClient } from '../components/Layout'
import { mockClients, mockAlerts, getMetricsByClient, getMetricsByDate, getAdsAnalysis, getDiagnostic, getExecutiveSummary, getMorningBrief, getBudgetPacing, getAssetDependency, minePatterns, getAccountQualityScore, getAgencyROI } from '../lib/mockData'
import { formatMoney, formatNumber, formatPercent, getClassificationColor, getFromStorage, saveToStorage, cn } from '../lib/utils'
import type { AdClassification } from '../lib/utils'

// ==================== TYPES ====================

type WidgetId = 'metrics' | 'pipeline' | 'alerts' | 'evolution' | 'classification' | 'topAds'
type Period = 'today' | 'week' | 'month' | 'all'

interface WidgetConfig {
  id: WidgetId
  name: string
  visible: boolean
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'metrics', name: 'Métricas', visible: true },
  { id: 'alerts', name: 'Alertas', visible: true },
  { id: 'evolution', name: 'Evolución', visible: true },
  { id: 'classification', name: 'Clasificación', visible: true },
  { id: 'topAds', name: 'Top Anuncios', visible: true },
]

// ==================== METRIC CARD ====================

interface MetricCardProps {
  title: string
  value: string
  change?: number
  icon: React.ReactNode
  trendIsGood?: boolean
  hidden?: boolean
}

function MetricCard({ title, value, change, icon, trendIsGood, hidden }: MetricCardProps) {
  const { palette } = useTheme()

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-semibold mt-1 dark:text-white">
            {hidden ? '•••••' : value}
          </p>
          {change !== undefined && !hidden && (
            <div className="flex items-center gap-1 mt-2">
              {change >= 0 ? (
                <ArrowUpRight className={`w-4 h-4 ${trendIsGood ? 'text-green-500' : 'text-red-500'}`} />
              ) : (
                <ArrowDownRight className={`w-4 h-4 ${trendIsGood ? 'text-green-500' : 'text-red-500'}`} />
              )}
              <span className={`text-sm font-medium ${trendIsGood ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(change).toFixed(1)}%
              </span>
              <span className="text-xs text-gray-400">vs anterior</span>
            </div>
          )}
        </div>
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${palette.primary}20` }}>
          {icon}
        </div>
      </div>
    </div>
  )
}

// ==================== AD ROW (1 línea) ====================

function AdRow({ ad }: { ad: ReturnType<typeof getAdsAnalysis>[0] }) {
  const borderColor = getClassificationColor(ad.classification as AdClassification)

  return (
    <div
      className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border-l-4 hover:shadow-sm transition-shadow cursor-pointer"
      style={{ borderLeftColor: borderColor }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ad.adName}</p>
        <p className="text-xs text-gray-500 truncate">{ad.adSetName}</p>
      </div>
      <div className="text-right hidden sm:block">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{formatMoney(ad.avgCostPerResult)}</p>
        <p className="text-xs text-gray-500">CPR</p>
      </div>
      <div className="text-right hidden sm:block">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{formatPercent(ad.avgCtr)}</p>
        <p className="text-xs text-gray-500">CTR</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold" style={{ color: borderColor }}>{ad.totalResults}</p>
        <p className="text-xs text-gray-500">resultados</p>
      </div>
      <span
        className="px-2 py-0.5 rounded text-xs font-medium text-white flex-shrink-0"
        style={{ backgroundColor: borderColor }}
      >
        {ad.classification}
      </span>
    </div>
  )
}

// ==================== DASHBOARD ====================

export default function Dashboard() {
  const { palette } = useTheme()
  const { selectedClientId } = useSelectedClient()

  // State
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => getFromStorage('dashboard_widgets', DEFAULT_WIDGETS))
  const [editMode, setEditMode] = useState(false)
  const [showAmounts, setShowAmounts] = useState(true)
  const [period, setPeriod] = useState<Period>('month')
  const [draggedWidget, setDraggedWidget] = useState<WidgetId | null>(null)
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  // Data - filter by selected client
  const clientMetrics = getMetricsByClient(selectedClientId || undefined)
  const dailyData = getMetricsByDate(clientMetrics)
  const adsAnalysis = getAdsAnalysis(selectedClientId || undefined)
  const diagnostics = selectedClientId ? getDiagnostic(selectedClientId) : []
  const executiveSummary = selectedClientId ? getExecutiveSummary(selectedClientId) : ''
  const activeAlerts = mockAlerts.filter(a => !a.acknowledged && (!selectedClientId || a.clientId === selectedClientId))
  const selectedClient = selectedClientId ? mockClients.find(c => c.id === selectedClientId) : null

  // Totals
  const totalSpend = clientMetrics.reduce((sum, m) => sum + m.spend, 0)
  const totalResults = clientMetrics.reduce((sum, m) => sum + m.results, 0)
  const totalImpressions = clientMetrics.reduce((sum, m) => sum + m.impressions, 0)
  const totalClicks = clientMetrics.reduce((sum, m) => sum + m.clicks, 0)
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const avgCpr = totalResults > 0 ? totalSpend / totalResults : 0

  // Classification counts
  const classificationData = [
    { name: 'Ganador', value: adsAnalysis.filter(a => a.classification === 'GANADOR').length, color: '#22c55e' },
    { name: 'Escalable', value: adsAnalysis.filter(a => a.classification === 'ESCALABLE').length, color: '#3b82f6' },
    { name: 'Testing', value: adsAnalysis.filter(a => a.classification === 'TESTING').length, color: '#eab308' },
    { name: 'Fatigado', value: adsAnalysis.filter(a => a.classification === 'FATIGADO').length, color: '#f97316' },
    { name: 'Pausar', value: adsAnalysis.filter(a => a.classification === 'PAUSAR').length, color: '#ef4444' },
  ].filter(d => d.value > 0)

  // Copy summary to clipboard
  const copySummary = () => {
    navigator.clipboard.writeText(executiveSummary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Save widgets
  useEffect(() => {
    saveToStorage('dashboard_widgets', widgets)
  }, [widgets])

  // Drag handlers
  const handleDragStart = (id: WidgetId) => setDraggedWidget(id)
  const handleDragOver = (e: React.DragEvent, targetId: WidgetId) => {
    e.preventDefault()
    if (!draggedWidget || draggedWidget === targetId) return

    const newWidgets = [...widgets]
    const draggedIndex = newWidgets.findIndex(w => w.id === draggedWidget)
    const targetIndex = newWidgets.findIndex(w => w.id === targetId)

    const [removed] = newWidgets.splice(draggedIndex, 1)
    newWidgets.splice(targetIndex, 0, removed)
    setWidgets(newWidgets)
  }
  const handleDragEnd = () => setDraggedWidget(null)

  const toggleWidget = (id: WidgetId) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w))
  }

  const resetWidgets = () => {
    setWidgets(DEFAULT_WIDGETS)
  }

  const isVisible = (id: WidgetId) => widgets.find(w => w.id === id)?.visible ?? true

  // Morning Brief data
  const morningBrief = getMorningBrief()
  const budgetPacing = selectedClientId ? getBudgetPacing(selectedClientId) : null
  const assetDependency = selectedClientId ? getAssetDependency(selectedClientId) : null

  // ==================== RENDER ====================

  return (
    <div className="space-y-4">
      {/* Morning Brief - Only show when no client selected */}
      {!selectedClientId && morningBrief.priorities.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-800 rounded-xl p-4 border border-amber-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Sun className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">{morningBrief.greeting}</h2>
              <p className="text-sm text-gray-500">
                Ayer: {morningBrief.totalResultsYesterday} resultados
                {morningBrief.vsAverage !== 0 && (
                  <span className={morningBrief.vsAverage > 0 ? 'text-green-600' : 'text-red-600'}>
                    {' '}({morningBrief.vsAverage > 0 ? '+' : ''}{morningBrief.vsAverage.toFixed(0)}% vs promedio)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Priorities */}
          <div className="space-y-2">
            {morningBrief.priorities.slice(0, 3).map(p => (
              <div
                key={p.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg',
                  p.type === 'urgent' ? 'bg-red-50 dark:bg-red-900/20' :
                  p.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20' :
                  p.type === 'action' ? 'bg-blue-50 dark:bg-blue-900/20' :
                  'bg-green-50 dark:bg-green-900/20'
                )}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                  style={{ backgroundColor: p.clientColor }}
                >
                  {p.clientName.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{p.title}</p>
                  <p className="text-xs text-gray-500 truncate">{p.description}</p>
                </div>
                {p.actionLabel && (
                  <button
                    className={cn(
                      'px-3 py-1 text-xs font-medium rounded-lg flex items-center gap-1',
                      p.type === 'urgent' ? 'bg-red-600 text-white' :
                      p.type === 'warning' ? 'bg-amber-600 text-white' :
                      'bg-blue-600 text-white'
                    )}
                  >
                    {p.actionLabel}
                    <ChevronRight size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Wins */}
          {morningBrief.wins.length > 0 && (
            <div className="mt-4 pt-4 border-t border-amber-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Trophy size={14} className="text-amber-600" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Logros recientes</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {morningBrief.wins.map((win, i) => (
                  <span key={i} className="text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded border border-amber-200 dark:border-gray-600">
                    <span className="font-medium">{win.clientName}:</span> {win.message}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {selectedClient && (
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0"
              style={{ backgroundColor: selectedClient.color }}
            >
              {selectedClient.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {selectedClient ? selectedClient.name : 'Dashboard'}
            </h1>
            <p className="text-sm text-gray-500">
              {selectedClient ? selectedClient.industry : 'Todos los clientes'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Tabs */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {(['today', 'week', 'month', 'all'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  period === p
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p === 'today' ? 'Hoy' : p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : 'Todo'}
              </button>
            ))}
          </div>

          {/* Toggle amounts */}
          <button
            onClick={() => setShowAmounts(!showAmounts)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            title={showAmounts ? 'Ocultar montos' : 'Mostrar montos'}
          >
            {showAmounts ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>

          {/* Edit mode */}
          <button
            onClick={() => setEditMode(!editMode)}
            className={`p-2 rounded-lg transition-colors ${
              editMode ? 'bg-gray-900 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500'
            }`}
            title="Personalizar widgets"
          >
            <Settings2 size={18} />
          </button>
        </div>
      </div>

      {/* Edit Mode Panel */}
      {editMode && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Arrastrá para reordenar • Click para ocultar/mostrar
            </p>
            <button
              onClick={resetWidgets}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <RotateCcw size={12} />
              Restaurar orden
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {widgets.map(w => (
              <button
                key={w.id}
                onClick={() => toggleWidget(w.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
                  w.visible
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-500 line-through'
                }`}
              >
                <GripVertical size={12} className="text-gray-400" />
                {w.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Alerts Banner */}
      {activeAlerts.length > 0 && isVisible('alerts') && (
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{ backgroundColor: `${palette.warning}15`, borderLeft: `4px solid ${palette.warning}` }}
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: palette.warning }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: palette.warning }}>
              {activeAlerts.length} alerta{activeAlerts.length > 1 ? 's' : ''} activa{activeAlerts.length > 1 ? 's' : ''}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{activeAlerts[0].message}</p>
          </div>
          <a href="/alerts" className="text-sm font-medium hover:underline" style={{ color: palette.warning }}>
            Ver →
          </a>
        </div>
      )}

      {/* Diagnostic & Executive Summary (only when client selected) */}
      {selectedClientId && (diagnostics.length > 0 || executiveSummary) && (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Diagnostics */}
          {diagnostics.length > 0 && (
            <div
              className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
              style={{ borderLeft: `4px solid ${palette.primary}` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Stethoscope size={18} style={{ color: palette.primary }} />
                <h3 className="font-medium text-gray-900 dark:text-white">Diagnóstico</h3>
              </div>
              <div className="space-y-3">
                {diagnostics.map((d, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-sm font-semibold',
                        d.isGood ? 'text-green-600' : 'text-red-600'
                      )}>
                        {d.isGood ? '✓' : '!'} {d.reason}
                      </span>
                    </div>
                    <ul className="text-xs text-gray-500 space-y-0.5 ml-4">
                      {d.details.map((detail, j) => (
                        <li key={j}>• {detail}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Executive Summary */}
          {executiveSummary && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Send size={18} style={{ color: palette.success }} />
                  <h3 className="font-medium text-gray-900 dark:text-white">Resumen para Cliente</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSummaryExpanded(!summaryExpanded)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    {summaryExpanded ? 'Colapsar' : 'Expandir'}
                  </button>
                  <button
                    onClick={copySummary}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg transition-colors',
                      copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
              <pre className={cn(
                'text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-sans',
                !summaryExpanded && 'line-clamp-4'
              )}>
                {executiveSummary}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Budget Pacing & Asset Dependency - Only when client selected */}
      {selectedClientId && budgetPacing && assetDependency && (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Budget Pacing */}
          <div
            className={cn(
              'bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-l-4',
              budgetPacing.status === 'on_track' ? 'border-l-green-500' :
              budgetPacing.status === 'underspending' ? 'border-l-blue-500' :
              'border-l-red-500'
            )}
          >
            <div className="flex items-center gap-2 mb-3">
              <Clock size={18} className={cn(
                budgetPacing.status === 'on_track' ? 'text-green-500' :
                budgetPacing.status === 'underspending' ? 'text-blue-500' :
                'text-red-500'
              )} />
              <h3 className="font-medium text-gray-900 dark:text-white">Pacing de Presupuesto</h3>
            </div>

            <div className="space-y-3">
              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Gastado: {formatMoney(budgetPacing.spentToDate)}</span>
                  <span>Budget: {formatMoney(budgetPacing.monthlyBudget)}</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      budgetPacing.status === 'on_track' ? 'bg-green-500' :
                      budgetPacing.status === 'underspending' ? 'bg-blue-500' :
                      'bg-red-500'
                    )}
                    style={{ width: `${Math.min(budgetPacing.percentSpent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-gray-400">Día {budgetPacing.dayOfMonth}/{budgetPacing.daysInMonth}</span>
                  <span className={cn(
                    'font-medium',
                    budgetPacing.status === 'on_track' ? 'text-green-600' :
                    budgetPacing.status === 'underspending' ? 'text-blue-600' :
                    'text-red-600'
                  )}>
                    {budgetPacing.percentSpent.toFixed(0)}% gastado
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400">{budgetPacing.message}</p>

              {budgetPacing.status !== 'on_track' && (
                <div className="text-xs bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                  <span className="text-gray-500">Recomendado/día:</span>{' '}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatMoney(budgetPacing.dailyBudgetRecommended)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Asset Dependency */}
          <div
            className={cn(
              'bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-l-4',
              assetDependency.concentrationRisk === 'low' ? 'border-l-green-500' :
              assetDependency.concentrationRisk === 'medium' ? 'border-l-yellow-500' :
              assetDependency.concentrationRisk === 'high' ? 'border-l-orange-500' :
              'border-l-red-500'
            )}
          >
            <div className="flex items-center gap-2 mb-3">
              <Zap size={18} className={cn(
                assetDependency.concentrationRisk === 'low' ? 'text-green-500' :
                assetDependency.concentrationRisk === 'medium' ? 'text-yellow-500' :
                assetDependency.concentrationRisk === 'high' ? 'text-orange-500' :
                'text-red-500'
              )} />
              <h3 className="font-medium text-gray-900 dark:text-white">Dependencia de Activos</h3>
              <span className={cn(
                'px-2 py-0.5 text-xs font-medium rounded-full ml-auto',
                assetDependency.concentrationRisk === 'low' ? 'bg-green-100 text-green-700' :
                assetDependency.concentrationRisk === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                assetDependency.concentrationRisk === 'high' ? 'bg-orange-100 text-orange-700' :
                'bg-red-100 text-red-700'
              )}>
                {assetDependency.concentrationRisk === 'low' ? 'Bajo' :
                 assetDependency.concentrationRisk === 'medium' ? 'Medio' :
                 assetDependency.concentrationRisk === 'high' ? 'Alto' : 'Crítico'}
              </span>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{assetDependency.message}</p>

            {/* Top 3 ads */}
            <div className="space-y-2">
              {assetDependency.top3Ads.map((ad, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{ad.name}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{ad.percentage.toFixed(0)}%</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              💡 {assetDependency.recommendation}
            </p>
          </div>
        </div>
      )}

      {/* Metrics Cards */}
      {isVisible('metrics') && (
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          draggable={editMode}
          onDragStart={() => handleDragStart('metrics')}
          onDragOver={(e) => handleDragOver(e, 'metrics')}
          onDragEnd={handleDragEnd}
        >
          <MetricCard
            title="Gasto Total"
            value={formatMoney(totalSpend)}
            change={12}
            icon={<DollarSign className="w-5 h-5" style={{ color: palette.primary }} />}
            trendIsGood={false}
            hidden={!showAmounts}
          />
          <MetricCard
            title="Resultados"
            value={formatNumber(totalResults)}
            change={18}
            icon={<MessageCircle className="w-5 h-5" style={{ color: palette.primary }} />}
            trendIsGood={true}
          />
          <MetricCard
            title="CPR Promedio"
            value={formatMoney(avgCpr)}
            change={-8}
            icon={<TrendingDown className="w-5 h-5" style={{ color: palette.primary }} />}
            trendIsGood={true}
            hidden={!showAmounts}
          />
          <MetricCard
            title="CTR Promedio"
            value={formatPercent(avgCtr)}
            change={5}
            icon={<MousePointer className="w-5 h-5" style={{ color: palette.primary }} />}
            trendIsGood={true}
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Evolution Chart */}
        {isVisible('evolution') && (
          <div
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
            draggable={editMode}
            onDragStart={() => handleDragStart('evolution')}
            onDragOver={(e) => handleDragOver(e, 'evolution')}
            onDragEnd={handleDragEnd}
          >
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">Evolución</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(d) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value, name) => {
                      const v = value as number
                      if (name === 'results') return [formatNumber(v), 'Resultados']
                      if (name === 'spend') return [showAmounts ? formatMoney(v) : '•••', 'Gasto']
                      return [v, name]
                    }}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('es-AR')}
                  />
                  <Line type="monotone" dataKey="results" stroke={palette.primary} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="spend" stroke={palette.secondary} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: palette.primary }} />
                <span className="text-xs text-gray-500">Resultados</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: palette.secondary }} />
                <span className="text-xs text-gray-500">Gasto</span>
              </div>
            </div>
          </div>
        )}

        {/* Classification Pie */}
        {isVisible('classification') && (
          <div
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
            draggable={editMode}
            onDragStart={() => handleDragStart('classification')}
            onDragOver={(e) => handleDragOver(e, 'classification')}
            onDragEnd={handleDragEnd}
          >
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">Clasificación de Anuncios</h3>
            <div className="flex items-center">
              <div className="w-1/2 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={classificationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {classificationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-2">
                {classificationData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">{item.name}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Top Ads (1 line cards) */}
      {isVisible('topAds') && (
        <div
          className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
          draggable={editMode}
          onDragStart={() => handleDragStart('topAds')}
          onDragOver={(e) => handleDragOver(e, 'topAds')}
          onDragEnd={handleDragEnd}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900 dark:text-white">Top Anuncios</h3>
            <a href="/ads" className="text-sm font-medium hover:underline" style={{ color: palette.primary }}>
              Ver todos →
            </a>
          </div>
          <div className="space-y-2">
            {adsAnalysis.slice(0, 5).map((ad, i) => (
              <AdRow key={i} ad={ad} />
            ))}
          </div>
        </div>
      )}

      {/* Advanced Insights Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Patterns Quick View */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: palette.primary }} />
              Patrones Detectados
            </h3>
            <a href="/patterns" className="text-xs hover:underline" style={{ color: palette.primary }}>
              Ver todos →
            </a>
          </div>
          {(() => {
            const patterns = minePatterns(selectedClientId || undefined)
            if (patterns.length === 0) {
              return <p className="text-sm text-gray-500">Sin patrones detectados aún</p>
            }
            return (
              <div className="space-y-2">
                {patterns.slice(0, 2).map((p, i) => (
                  <div key={i} className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{p.pattern}</p>
                    <p className="text-xs text-green-600">{p.impact}</p>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>

        {/* Account Quality */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Stethoscope className="w-4 h-4" style={{ color: palette.primary }} />
              Calidad de Datos
            </h3>
            <a href="/diagnostics" className="text-xs hover:underline" style={{ color: palette.primary }}>
              Diagnósticos →
            </a>
          </div>
          {(() => {
            const quality = getAccountQualityScore(selectedClientId || undefined)
            const statusColor = quality.status === 'ready' ? 'text-green-600 bg-green-100' :
                               quality.status === 'limited' ? 'text-yellow-600 bg-yellow-100' :
                               'text-red-600 bg-red-100'
            return (
              <div className="flex items-center gap-4">
                <div className="relative">
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle cx="32" cy="32" r="28" stroke="#e5e7eb" strokeWidth="6" fill="none" />
                    <circle
                      cx="32" cy="32" r="28"
                      stroke={quality.score >= 70 ? '#22c55e' : quality.score >= 40 ? '#eab308' : '#ef4444'}
                      strokeWidth="6" fill="none"
                      strokeDasharray={`${(quality.score / 100) * 176} 176`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{quality.score}</span>
                  </div>
                </div>
                <div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor}`}>
                    {quality.status === 'ready' ? 'Listo' : quality.status === 'limited' ? 'Limitado' : 'Insuficiente'}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">{quality.summary.days} días, {quality.summary.ads} ads</p>
                </div>
              </div>
            )
          })()}
        </div>

        {/* Agency ROI */}
        <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl p-4 shadow-sm text-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              ROI Agencia
            </h3>
            <a href="/playbook" className="text-xs text-white/80 hover:text-white">
              Playbook →
            </a>
          </div>
          {(() => {
            const roi = getAgencyROI(selectedClientId || undefined)
            return (
              <div>
                <div className="text-2xl font-bold">{roi.optimizationImpact}</div>
                <p className="text-sm text-white/80">más resultados vs sin optimización</p>
                <div className="mt-2 pt-2 border-t border-white/20 flex justify-between text-sm">
                  <span>+{roi.extraResultsGenerated.toFixed(0)} resultados</span>
                  <span>${roi.estimatedValueGenerated.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
