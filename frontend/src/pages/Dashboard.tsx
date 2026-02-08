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
  ChevronDown,
  ChevronRight,
  Zap,
  Trophy,
  Target,
  Activity
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
import { mockClients, mockAlerts, getMetricsByClient, getMetricsByDate, getAdsAnalysis, getAgencyROI } from '../lib/mockData'
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

      {/* Expanded details */}
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

function AdRow({ ad }: { ad: ReturnType<typeof getAdsAnalysis>[0] }) {
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
      {/* Main row */}
      <div className="flex items-center gap-3 p-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{ad.adName}</p>
          <p className="text-xs text-slate-500 truncate">{ad.adSetName}</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{formatMoney(ad.avgCostPerResult)}</p>
          <p className="text-xs text-slate-500">CPR</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{formatPercent(ad.avgCtr)}</p>
          <p className="text-xs text-slate-500">CTR</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold" style={{ color: borderColor }}>{ad.totalResults}</p>
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

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/50 animate-fadeIn">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500">Gasto Total</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatMoney(ad.totalSpend)}</p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500">Días Activo</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{ad.daysRunning}</p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500">Frecuencia</p>
              <p className={cn(
                "text-sm font-semibold",
                ad.avgFrequency > 3 ? "text-amber-600" : "text-slate-900 dark:text-white"
              )}>{ad.avgFrequency.toFixed(1)}</p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500">Fatiga</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      ad.fatigueScore > 60 ? "bg-red-500" : ad.fatigueScore > 30 ? "bg-amber-500" : "bg-emerald-500"
                    )}
                    style={{ width: `${ad.fatigueScore}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{ad.fatigueScore}%</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Campaña: {ad.campaignName}</p>
        </div>
      )}
    </div>
  )
}

// ==================== DASHBOARD ====================

export default function Dashboard() {
  const { selectedClientId } = useSelectedClient()

  const [showAmounts, setShowAmounts] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  // Simulate loading when client changes
  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => setIsLoading(false), 300)
    return () => clearTimeout(timer)
  }, [selectedClientId])

  // Data
  const clientMetrics = getMetricsByClient(selectedClientId || undefined)
  const dailyData = getMetricsByDate(clientMetrics)
  const adsAnalysis = getAdsAnalysis(selectedClientId || undefined)
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

  const roi = getAgencyROI(selectedClientId || undefined)

  if (isLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          {selectedClient && (
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
              style={{ background: `linear-gradient(135deg, ${selectedClient.color}, ${selectedClient.color}cc)` }}
            >
              {selectedClient.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {selectedClient ? selectedClient.name : 'Dashboard'}
            </h1>
            <p className="text-sm text-slate-500">
              {selectedClient ? selectedClient.industry : 'Resumen de todos los clientes'}
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

      {/* Alerts */}
      {activeAlerts.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl p-4 border border-amber-200 dark:border-amber-500/20 flex items-center gap-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
              {activeAlerts.length} alerta{activeAlerts.length > 1 ? 's' : ''} activa{activeAlerts.length > 1 ? 's' : ''}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-500/80 truncate">{activeAlerts[0].message}</p>
          </div>
          <a href="/alerts" className="text-sm font-semibold text-amber-600 hover:underline whitespace-nowrap">
            Ver todas →
          </a>
        </div>
      )}

      {/* Metric Cards - EXPANDABLE */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Gasto Total"
          value={formatMoney(totalSpend)}
          change={12}
          icon={<DollarSign className="w-5 h-5 text-violet-500" />}
          trendIsGood={false}
          hidden={!showAmounts}
          details={[
            { label: 'Promedio diario', value: formatMoney(totalSpend / 30) },
            { label: 'vs mes anterior', value: '+12%' },
            { label: 'Proyección mes', value: formatMoney(totalSpend * 1.1) },
          ]}
        />
        <MetricCard
          title="Resultados"
          value={formatNumber(totalResults)}
          change={18}
          icon={<MessageCircle className="w-5 h-5 text-violet-500" />}
          trendIsGood={true}
          details={[
            { label: 'Promedio diario', value: formatNumber(Math.round(totalResults / 30)) },
            { label: 'Mejor día', value: '156 resultados' },
            { label: 'Peor día', value: '42 resultados' },
          ]}
        />
        <MetricCard
          title="CPR Promedio"
          value={formatMoney(avgCpr)}
          change={-8}
          icon={<TrendingDown className="w-5 h-5 text-violet-500" />}
          trendIsGood={true}
          hidden={!showAmounts}
          details={[
            { label: 'Mejor CPR', value: formatMoney(avgCpr * 0.7) },
            { label: 'Peor CPR', value: formatMoney(avgCpr * 1.5) },
            { label: 'Objetivo', value: formatMoney(avgCpr * 0.85) },
          ]}
        />
        <MetricCard
          title="CTR Promedio"
          value={formatPercent(avgCtr)}
          change={5}
          icon={<MousePointer className="w-5 h-5 text-violet-500" />}
          trendIsGood={true}
          details={[
            { label: 'Clicks totales', value: formatNumber(totalClicks) },
            { label: 'Impresiones', value: formatNumber(totalImpressions) },
            { label: 'Benchmark', value: '1.5%' },
          ]}
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Evolution Chart */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-violet-500/5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Evolución</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
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
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
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

        {/* Classification + ROI */}
        <div className="space-y-6">
          {/* Classification Pie */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-violet-500/5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Clasificación de Anuncios</h3>
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
          </div>

          {/* Agency ROI Card */}
          <div className="bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg shadow-violet-500/25">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5" />
              <h3 className="font-semibold">ROI de Agencia</h3>
            </div>
            <div className="text-3xl font-bold">{roi.optimizationImpact}</div>
            <p className="text-sm text-white/80 mt-1">más resultados vs sin optimización</p>
            <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-white/60">Resultados extra</p>
                <p className="font-semibold">+{roi.extraResultsGenerated.toFixed(0)}</p>
              </div>
              <div>
                <p className="text-white/60">Valor generado</p>
                <p className="font-semibold">${roi.estimatedValueGenerated.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Ads - EXPANDABLE */}
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
          {adsAnalysis.slice(0, 5).map((ad, i) => (
            <AdRow key={i} ad={ad} />
          ))}
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Target className="w-4 h-4" />
            <span className="text-xs font-medium">Campañas</span>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {[...new Set(adsAnalysis.map(a => a.campaignName))].length}
          </p>
        </div>
        <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Zap className="w-4 h-4" />
            <span className="text-xs font-medium">Anuncios</span>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">{adsAnalysis.length}</p>
        </div>
        <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-2 text-emerald-500 mb-1">
            <Activity className="w-4 h-4" />
            <span className="text-xs font-medium">Ganadores</span>
          </div>
          <p className="text-xl font-bold text-emerald-600">{adsAnalysis.filter(a => a.classification === 'GANADOR').length}</p>
        </div>
        <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-2 text-red-500 mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-medium">A Pausar</span>
          </div>
          <p className="text-xl font-bold text-red-600">{adsAnalysis.filter(a => a.classification === 'PAUSAR').length}</p>
        </div>
      </div>
    </div>
  )
}
