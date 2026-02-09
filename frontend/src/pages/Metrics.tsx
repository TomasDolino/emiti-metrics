import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { Eye, EyeOff, Loader2, RefreshCw } from 'lucide-react'
import { useTheme } from '../lib/theme'
import { api, type DashboardData } from '../lib/api'
import { formatMoney, formatNumber, formatPercent, cn } from '../lib/utils'
import { useSelectedClient } from '../components/Layout'

type MetricType = 'spend' | 'results' | 'cpr' | 'ctr' | 'impressions'

interface DailyMetric {
  date: string
  spend: number
  results: number
  impressions: number
  cpr: number
  ctr: number
}

export default function Metrics() {
  const { palette } = useTheme()
  const { selectedClientId } = useSelectedClient()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMetrics, setSelectedMetrics] = useState<MetricType[]>(['spend', 'results'])
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line')
  const [showAmounts, setShowAmounts] = useState(true)

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.getDashboard({ clientId: selectedClientId || undefined, days: 30 })
      setDashboardData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando métricas')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedClientId])

  // Process daily data with calculated CPR and CTR
  const dailyData: DailyMetric[] = (dashboardData?.daily_metrics || []).map(day => ({
    ...day,
    cpr: day.results > 0 ? day.spend / day.results : 0,
    ctr: day.impressions > 0 ? (day.results / day.impressions) * 100 : 0
  }))

  const metricConfig: Record<MetricType, { label: string; color: string; format: (v: number) => string }> = {
    spend: { label: 'Gasto', color: palette.secondary, format: (v) => showAmounts ? formatMoney(v) : '•••' },
    results: { label: 'Resultados', color: palette.primary, format: (v) => formatNumber(v) },
    cpr: { label: 'CPR', color: palette.accent, format: (v) => showAmounts ? formatMoney(v) : '•••' },
    ctr: { label: 'CTR', color: '#6366f1', format: (v) => formatPercent(v) },
    impressions: { label: 'Impresiones', color: '#ec4899', format: (v) => formatNumber(v) }
  }

  const toggleMetric = (metric: MetricType) => {
    if (selectedMetrics.includes(metric)) {
      if (selectedMetrics.length > 1) {
        setSelectedMetrics(selectedMetrics.filter(m => m !== metric))
      }
    } else {
      setSelectedMetrics([...selectedMetrics, metric])
    }
  }

  // Use dashboard totals
  const totals = {
    spend: dashboardData?.total_spend || 0,
    results: dashboardData?.total_results || 0,
    impressions: dashboardData?.total_impressions || 0
  }

  const avgCpr = dashboardData?.avg_cpr || 0
  const avgCtr = dashboardData?.avg_ctr || 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
        >
          <RefreshCw size={16} />
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white dark:text-white">Métricas Detalladas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Análisis profundo de rendimiento por período</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Chart Type */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 dark:bg-gray-800 rounded-lg p-1">
            {(['line', 'area', 'bar'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                  chartType === type
                    ? 'bg-white dark:bg-gray-700 text-slate-900 dark:text-white dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                )}
              >
                {type === 'line' ? 'Líneas' : type === 'area' ? 'Área' : 'Barras'}
              </button>
            ))}
          </div>

          {/* Toggle amounts */}
          <button
            onClick={() => setShowAmounts(!showAmounts)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-gray-800 text-slate-500 dark:text-slate-400"
            title={showAmounts ? 'Ocultar montos' : 'Mostrar montos'}
          >
            {showAmounts ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {(Object.entries(metricConfig) as [MetricType, typeof metricConfig[MetricType]][]).map(([key, config]) => {
          const value = key === 'spend' ? totals.spend :
                       key === 'results' ? totals.results :
                       key === 'cpr' ? avgCpr :
                       key === 'ctr' ? avgCtr :
                       totals.impressions
          const isSelected = selectedMetrics.includes(key)

          return (
            <button
              key={key}
              onClick={() => toggleMetric(key)}
              className={cn(
                'p-3 rounded-xl transition-all text-left border-l-4',
                isSelected
                  ? 'bg-white dark:bg-gray-800 ring-2 ring-offset-1 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800'
              )}
              style={{
                borderLeftColor: config.color,
                ...(isSelected ? { ringColor: config.color } : {})
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">{config.label}</span>
              </div>
              <p className="text-lg font-semibold text-slate-900 dark:text-white dark:text-white">
                {config.format(value)}
              </p>
            </button>
          )
        })}
      </div>

      {/* Main Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <h3 className="font-medium text-slate-900 dark:text-white dark:text-white mb-4">Evolución Temporal</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
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
                    const config = metricConfig[name as MetricType]
                    return config ? [config.format(v), config.label] : [v, name]
                  }}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('es-AR')}
                />
                <Legend />
                {selectedMetrics.map((metric) => (
                  <Line
                    key={metric}
                    type="monotone"
                    dataKey={metric}
                    name={metric}
                    stroke={metricConfig[metric].color}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            ) : chartType === 'area' ? (
              <AreaChart data={dailyData}>
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
                    const config = metricConfig[name as MetricType]
                    return config ? [config.format(v), config.label] : [v, name]
                  }}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('es-AR')}
                />
                <Legend />
                {selectedMetrics.map((metric) => (
                  <Area
                    key={metric}
                    type="monotone"
                    dataKey={metric}
                    name={metric}
                    stroke={metricConfig[metric].color}
                    fill={metricConfig[metric].color}
                    fillOpacity={0.2}
                  />
                ))}
              </AreaChart>
            ) : (
              <BarChart data={dailyData}>
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
                    const config = metricConfig[name as MetricType]
                    return config ? [config.format(v), config.label] : [v, name]
                  }}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('es-AR')}
                />
                <Legend />
                {selectedMetrics.map((metric) => (
                  <Bar
                    key={metric}
                    dataKey={metric}
                    name={metric}
                    fill={metricConfig[metric].color}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-3 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-medium text-slate-900 dark:text-white dark:text-white">Datos Diarios</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 dark:bg-gray-700/50">
                <th className="text-left py-2 px-3 font-medium text-slate-500 dark:text-slate-400 text-xs">Fecha</th>
                <th className="text-right py-2 px-3 font-medium text-slate-500 dark:text-slate-400 text-xs">Gasto</th>
                <th className="text-right py-2 px-3 font-medium text-slate-500 dark:text-slate-400 text-xs">Resultados</th>
                <th className="text-right py-2 px-3 font-medium text-slate-500 dark:text-slate-400 text-xs">CPR</th>
                <th className="text-right py-2 px-3 font-medium text-slate-500 dark:text-slate-400 text-xs">CTR</th>
                <th className="text-right py-2 px-3 font-medium text-slate-500 dark:text-slate-400 text-xs">Impresiones</th>
              </tr>
            </thead>
            <tbody>
              {dailyData.slice(-14).reverse().map((day, i) => (
                <tr key={i} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-gray-700/30">
                  <td className="py-2 px-3 text-slate-900 dark:text-white dark:text-white text-xs">
                    {new Date(day.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400 dark:text-slate-400 text-xs">
                    {showAmounts ? formatMoney(day.spend) : '•••'}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400 dark:text-slate-400 text-xs">{formatNumber(day.results)}</td>
                  <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400 dark:text-slate-400 text-xs">
                    {showAmounts ? formatMoney(day.cpr) : '•••'}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400 dark:text-slate-400 text-xs">{formatPercent(day.ctr)}</td>
                  <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400 dark:text-slate-400 text-xs">{formatNumber(day.impressions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
