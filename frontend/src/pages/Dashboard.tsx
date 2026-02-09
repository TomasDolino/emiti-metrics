import { useState, useEffect, useRef } from 'react'
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
  ChevronDown,
  ChevronRight,
  Zap,
  Target,
  Activity,
  Calendar,
  Building2,
  X
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
import { useSelectedClient } from '../components/Layout'
import { DashboardSkeleton } from '../components/Skeleton'
import { api, type DashboardData, type AdAnalysis, type Alert, type Client } from '../lib/api'
import { formatMoney, formatNumber, formatPercent, getClassificationColor, cn } from '../lib/utils'
import type { AdClassification } from '../lib/utils'

// ==================== EXPANDABLE METRIC CARD ====================

interface MetricCardProps {
  title: string
  value: string
  change?: number
  icon: React.ReactNode
  trendIsGood?: boolean
  hidden?: boolean
  details?: { label: string; value: string }[]
}

function MetricCard({ title, value, change, icon, trendIsGood, hidden, details }: MetricCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={cn(
        "bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50",
        "shadow-lg shadow-violet-500/5 transition-all duration-300 cursor-pointer",
        expanded && "ring-2 ring-violet-500/30"
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">
            {hidden ? '•••••' : value}
          </p>
          {change !== undefined && !hidden && (
            <div className="flex items-center gap-1 mt-2">
              {change >= 0 ? (
                <ArrowUpRight className={`w-4 h-4 ${trendIsGood ? 'text-emerald-500' : 'text-red-500'}`} />
              ) : (
                <ArrowDownRight className={`w-4 h-4 ${trendIsGood ? 'text-emerald-500' : 'text-red-500'}`} />
              )}
              <span className={`text-sm font-medium ${trendIsGood ? 'text-emerald-600' : 'text-red-600'}`}>
                {Math.abs(change).toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400">vs anterior</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10">
            {icon}
          </div>
          {details && details.length > 0 && (
            <ChevronDown className={cn(
              "w-4 h-4 text-slate-400 transition-transform",
              expanded && "rotate-180"
            )} />
          )}
        </div>
      </div>

      {expanded && details && details.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50 space-y-2 animate-fadeIn">
          {details.map((d, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-slate-500">{d.label}</span>
              <span className="font-medium text-slate-900 dark:text-white">{d.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== EXPANDABLE AD ROW ====================

function AdRow({ ad }: { ad: AdAnalysis }) {
  const [expanded, setExpanded] = useState(false)
  const borderColor = getClassificationColor(ad.classification as AdClassification)

  return (
    <div
      className={cn(
        "bg-white/60 dark:bg-slate-800/60 rounded-xl border-l-4 overflow-hidden transition-all duration-200 cursor-pointer",
        expanded ? "ring-1 ring-violet-500/20" : "hover:bg-white dark:hover:bg-slate-800"
      )}
      style={{ borderLeftColor: borderColor }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-3 p-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{ad.ad_name}</p>
          <p className="text-xs text-slate-500 truncate">{ad.ad_set_name}</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{formatMoney(ad.cpr)}</p>
          <p className="text-xs text-slate-500">CPR</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{formatPercent(ad.ctr)}</p>
          <p className="text-xs text-slate-500">CTR</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold" style={{ color: borderColor }}>{ad.results}</p>
          <p className="text-xs text-slate-500">resultados</p>
        </div>
        <span
          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white flex-shrink-0"
          style={{ backgroundColor: borderColor }}
        >
          {ad.classification}
        </span>
        <ChevronRight className={cn(
          "w-4 h-4 text-slate-400 transition-transform hidden sm:block",
          expanded && "rotate-90"
        )} />
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/50 animate-fadeIn">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500">Gasto Total</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatMoney(ad.spend)}</p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500">Días Activo</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{ad.days_running}</p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500">Frecuencia</p>
              <p className={cn(
                "text-sm font-semibold",
                ad.frequency > 3 ? "text-amber-600" : "text-slate-900 dark:text-white"
              )}>{ad.frequency.toFixed(1)}</p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500">Impresiones</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatNumber(ad.impressions)}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Campaña: {ad.campaign_name}</p>
        </div>
      )}
    </div>
  )
}

// ==================== DASHBOARD ====================

// Period options
const PERIOD_OPTIONS = [
  { value: '7', label: '7 días' },
  { value: '14', label: '14 días' },
  { value: '30', label: '30 días' },
  { value: '60', label: '60 días' },
  { value: '90', label: '90 días' },
  { value: 'custom', label: 'Personalizado' },
]

interface Brand {
  id: string
  name: string
  color?: string
}

export default function Dashboard() {
  const { selectedClientId } = useSelectedClient()

  const [showAmounts, setShowAmounts] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [showBrandDropdown, setShowBrandDropdown] = useState(false)
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const brandDropdownRef = useRef<HTMLDivElement>(null)
  const periodDropdownRef = useRef<HTMLDivElement>(null)

  // Data from API
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [comparison, setComparison] = useState<{ changes: Record<string, number> } | null>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(e.target as Node)) {
        setShowBrandDropdown(false)
      }
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(e.target as Node)) {
        setShowPeriodDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch brands when client changes
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const brandsData = await api.getBrands(selectedClientId || undefined)
        setBrands(brandsData)
        setSelectedBrand('') // Reset brand selection when client changes
      } catch (err) {
        console.error('Error fetching brands:', err)
        setBrands([])
      }
    }
    fetchBrands()
  }, [selectedClientId])

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const dashboardParams: Parameters<typeof api.getDashboard>[0] = {
          clientId: selectedClientId || undefined,
          brandId: selectedBrand || undefined,
        }

        const comparisonParams: Parameters<typeof api.getPeriodComparison>[0] = {
          clientId: selectedClientId || undefined,
          brandId: selectedBrand || undefined,
        }

        // Handle period selection
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
  }, [selectedClientId, selectedBrand, selectedPeriod, customStartDate, customEndDate])

  const selectedClient = selectedClientId ? clients.find(c => c.id === selectedClientId) : null

  // Classification data for pie chart
  const classificationData = dashboard ? [
    { name: 'Ganador', value: dashboard.classification_counts?.GANADOR || 0, color: '#22c55e' },
    { name: 'Escalable', value: dashboard.classification_counts?.ESCALABLE || 0, color: '#3b82f6' },
    { name: 'Testing', value: dashboard.classification_counts?.TESTING || 0, color: '#eab308' },
    { name: 'Fatigado', value: dashboard.classification_counts?.FATIGADO || 0, color: '#f97316' },
    { name: 'Pausar', value: dashboard.classification_counts?.PAUSAR || 0, color: '#ef4444' },
  ].filter(d => d.value > 0) : []

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
        <a href="/upload" className="mt-4 px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600">
          Subir CSV
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          {selectedClient && (
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
              style={{ background: `linear-gradient(135deg, ${selectedClient.color || '#6366f1'}, ${selectedClient.color || '#6366f1'}cc)` }}
            >
              {selectedClient.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {selectedClient ? selectedClient.name : 'Dashboard'}
            </h1>
            <p className="text-sm text-slate-500">
              {selectedClient ? selectedClient.industry || 'Cliente' : 'Resumen de todos los clientes'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAmounts(!showAmounts)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          {showAmounts ? <Eye size={18} /> : <EyeOff size={18} />}
          <span className="text-sm font-medium">{showAmounts ? 'Ocultar' : 'Mostrar'}</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Brand Filter */}
        {brands.length > 0 && (
          <div className="relative" ref={brandDropdownRef}>
            <button
              onClick={() => setShowBrandDropdown(!showBrandDropdown)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                selectedBrand
                  ? "bg-violet-500 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              <Building2 size={16} />
              <span>{selectedBrand ? brands.find(b => b.id === selectedBrand)?.name : 'Todas las marcas'}</span>
              <ChevronDown size={14} className={cn("transition-transform", showBrandDropdown && "rotate-180")} />
            </button>

            {showBrandDropdown && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 max-h-64 overflow-y-auto">
                <button
                  onClick={() => { setSelectedBrand(''); setShowBrandDropdown(false) }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-sm transition-colors",
                    !selectedBrand
                      ? "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 font-medium"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  )}
                >
                  Todas las marcas
                </button>
                {brands.map(brand => (
                  <button
                    key={brand.id}
                    onClick={() => { setSelectedBrand(brand.id); setShowBrandDropdown(false) }}
                    className={cn(
                      "w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors",
                      selectedBrand === brand.id
                        ? "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 font-medium"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    )}
                  >
                    {brand.color && (
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: brand.color }} />
                    )}
                    {brand.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Period Filter */}
        <div className="relative" ref={periodDropdownRef}>
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
            <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50">
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
          )}
        </div>

        {/* Clear Filters */}
        {(selectedBrand || selectedPeriod !== '30' || customStartDate) && (
          <button
            onClick={() => {
              setSelectedBrand('')
              setSelectedPeriod('30')
              setCustomStartDate('')
              setCustomEndDate('')
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm transition-colors"
          >
            <X size={14} />
            Limpiar filtros
          </button>
        )}
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

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl p-4 border border-amber-200 dark:border-amber-500/20 flex items-center gap-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
              {alerts.length} alerta{alerts.length > 1 ? 's' : ''} activa{alerts.length > 1 ? 's' : ''}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-500/80 truncate">{alerts[0].message}</p>
          </div>
          <a href="/alerts" className="text-sm font-semibold text-amber-600 hover:underline whitespace-nowrap">
            Ver todas →
          </a>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Gasto Total"
          value={formatMoney(dashboard.total_spend)}
          change={comparison?.changes?.spend}
          icon={<DollarSign className="w-5 h-5 text-violet-500" />}
          trendIsGood={false}
          hidden={!showAmounts}
          details={[
            { label: 'Promedio diario', value: formatMoney(dashboard.total_spend / (dashboard.period_days || 30)) },
            { label: 'CPM promedio', value: formatMoney(dashboard.avg_cpm) },
          ]}
        />
        <MetricCard
          title="Resultados"
          value={formatNumber(dashboard.total_results)}
          change={comparison?.changes?.results}
          icon={<MessageCircle className="w-5 h-5 text-violet-500" />}
          trendIsGood={true}
          details={[
            { label: 'Promedio diario', value: formatNumber(Math.round(dashboard.total_results / (dashboard.period_days || 30))) },
            { label: 'Alcance total', value: formatNumber(dashboard.total_reach) },
          ]}
        />
        <MetricCard
          title="CPR Promedio"
          value={formatMoney(dashboard.avg_cpr)}
          change={comparison?.changes?.cpr}
          icon={<TrendingDown className="w-5 h-5 text-violet-500" />}
          trendIsGood={true}
          hidden={!showAmounts}
        />
        <MetricCard
          title="CTR Promedio"
          value={formatPercent(dashboard.avg_ctr)}
          icon={<MousePointer className="w-5 h-5 text-violet-500" />}
          trendIsGood={true}
          details={[
            { label: 'Impresiones', value: formatNumber(dashboard.total_impressions) },
            { label: 'Frecuencia', value: dashboard.avg_frequency.toFixed(1) },
          ]}
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Evolution Chart */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-violet-500/5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Evolución</h3>
          <div className="h-64">
            {dashboard.daily_metrics.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboard.daily_metrics}>
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
                    formatter={(value, name) => {
                      const v = value as number
                      if (name === 'results') return [formatNumber(v), 'Resultados']
                      if (name === 'spend') return [showAmounts ? formatMoney(v) : '•••', 'Gasto']
                      return [v, name]
                    }}
                  />
                  <Line type="monotone" dataKey="results" stroke="#8b5cf6" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="spend" stroke="#06b6d4" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                Sin datos de evolución
              </div>
            )}
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-violet-500" />
              <span className="text-xs text-slate-500">Resultados</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500" />
              <span className="text-xs text-slate-500">Gasto</span>
            </div>
          </div>
        </div>

        {/* Classification Pie */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-violet-500/5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Clasificación de Anuncios</h3>
          {classificationData.length > 0 ? (
            <div className="flex items-center">
              <div className="w-1/2 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={classificationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={60}
                      paddingAngle={3}
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
                    <span className="text-sm text-slate-600 dark:text-slate-400 flex-1">{item.name}</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400">
              Sin anuncios clasificados
            </div>
          )}
        </div>
      </div>

      {/* Top Ads */}
      {dashboard.top_ads && dashboard.top_ads.length > 0 && (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-violet-500/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-violet-500" />
              Top Anuncios
            </h3>
            <a href="/ads" className="text-sm font-medium text-violet-500 hover:text-violet-600">
              Ver todos →
            </a>
          </div>
          <div className="space-y-2">
            {dashboard.top_ads.slice(0, 5).map((ad, i) => (
              <AdRow key={i} ad={ad} />
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Target className="w-4 h-4" />
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
    </div>
  )
}
