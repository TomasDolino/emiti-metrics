import { useState } from 'react'
import { GitCompare, TrendingUp, TrendingDown, Trophy, AlertTriangle, Lightbulb, Check, Calendar, Download, RefreshCw, Filter, ArrowRight, BarChart3 } from 'lucide-react'
import { useTheme } from '../lib/theme'
import { useSelectedClient } from '../components/Layout'
import { mockClients, compareClients, type ClientSummary } from '../lib/mockData'
import { formatMoney, formatPercent, formatNumber, cn } from '../lib/utils'

// Date period options
type DatePeriod = '7d' | '14d' | '30d' | 'month' | 'last_month' | 'custom'
const dateOptions: { value: DatePeriod; label: string }[] = [
  { value: '7d', label: 'Últimos 7 días' },
  { value: '14d', label: 'Últimos 14 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: 'month', label: 'Este mes' },
  { value: 'last_month', label: 'Mes anterior' },
]

// ==================== CLIENT SELECTOR ====================

interface ClientSelectorProps {
  selected: string[]
  onChange: (ids: string[]) => void
}

function ClientSelector({ selected, onChange }: ClientSelectorProps) {
  const clients = mockClients.filter(c => c.isActive)

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id))
    } else if (selected.length < 4) {
      onChange([...selected, id])
    }
  }

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-violet-500/5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900 dark:text-white">Seleccionar Clientes</h3>
        <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg">
          {selected.length}/4 seleccionados
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {clients.map(client => {
          const isSelected = selected.includes(client.id)
          return (
            <button
              key={client.id}
              onClick={() => toggle(client.id)}
              className={cn(
                'flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left',
                isSelected
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 shadow-md'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              )}
              style={isSelected ? { borderColor: client.color, backgroundColor: `${client.color}10` } : undefined}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md"
                style={{ backgroundColor: client.color }}
              >
                {client.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-medium truncate',
                  isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'
                )}>
                  {client.name}
                </p>
                <p className="text-[10px] text-slate-500">{client.industry}</p>
              </div>
              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                  <Check size={12} className="text-white" aria-hidden="true" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ==================== COMPARISON TABLE ====================

interface ComparisonTableProps {
  comparison: ReturnType<typeof compareClients>
  showAmounts: boolean
}

function ComparisonTable({ comparison, showAmounts }: ComparisonTableProps) {
  const { clients, metrics } = comparison

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-violet-500/5 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-900/50">
              <th className="text-left py-4 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Métrica</th>
              {clients.map(s => (
                <th key={s.client.id} className="text-center py-4 px-5">
                  <div className="flex items-center justify-center gap-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shadow-md"
                      style={{ backgroundColor: s.client.color }}
                    >
                      {s.client.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{s.client.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map(({ metric, values, unit }, idx) => (
              <tr key={metric} className={cn(
                "border-t border-slate-100 dark:border-slate-700/50",
                idx % 2 === 0 ? "bg-white/50 dark:bg-slate-800/30" : "bg-slate-50/50 dark:bg-slate-900/20"
              )}>
                <td className="py-4 px-5 text-sm font-medium text-slate-600 dark:text-slate-400">{metric}</td>
                {values.map(v => {
                  const displayValue = metric === 'CPR' && !showAmounts
                    ? '•••'
                    : unit === '$'
                      ? formatMoney(v.value)
                      : unit === '%'
                        ? formatPercent(v.value)
                        : formatNumber(v.value)

                  return (
                    <td key={v.clientId} className="py-4 px-5 text-center">
                      <span className={cn(
                        'text-sm font-bold',
                        v.isTop ? 'text-emerald-600' : 'text-slate-900 dark:text-white'
                      )}>
                        {displayValue}
                      </span>
                      {v.isTop && (
                        <Trophy size={14} className="inline ml-1.5 text-amber-500" aria-hidden="true" />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ==================== CLIENT CARD ====================

function ClientCompareCard({ summary }: { summary: ClientSummary }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={cn(
        "bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 border-l-4 cursor-pointer transition-all duration-300",
        "border border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-violet-500/5",
        expanded && "ring-2 ring-violet-500/20"
      )}
      style={{ borderLeftColor: summary.client.color }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold shadow-md"
          style={{ backgroundColor: summary.client.color }}
        >
          {summary.client.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 dark:text-white truncate">{summary.client.name}</h3>
          <p className="text-xs text-slate-500">{summary.client.industry}</p>
        </div>
        {summary.trend !== 'stable' && (
          <div className={cn(
            'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold',
            summary.trend === 'up'
              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
          )}>
            {summary.trend === 'up' ? <TrendingUp size={12} aria-hidden="true" /> : <TrendingDown size={12} aria-hidden="true" />}
            {Math.abs(summary.trendPercent).toFixed(0)}%
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Resultados</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{formatNumber(summary.totalResults)}</p>
        </div>
        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">CPR</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{formatMoney(summary.avgCpr)}</p>
        </div>
        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">CTR</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{formatPercent(summary.avgCtr)}</p>
        </div>
        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Ganadores</p>
          <p className="text-lg font-bold text-emerald-600">{summary.winners}</p>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50 animate-fadeIn">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] text-slate-500">Escalables</p>
              <p className="text-sm font-semibold text-blue-600">{summary.winners}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500">Testing</p>
              <p className="text-sm font-semibold text-amber-600">{summary.fatigued}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500">Pausar</p>
              <p className="text-sm font-semibold text-red-600">{summary.alerts}</p>
            </div>
          </div>
        </div>
      )}

      {(summary.alerts > 0 || summary.fatigued > 0) && !expanded && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex gap-3">
          {summary.fatigued > 0 && (
            <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle size={12} aria-hidden="true" />
              {summary.fatigued} fatigados
            </span>
          )}
          {summary.alerts > 0 && (
            <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertTriangle size={12} aria-hidden="true" />
              {summary.alerts} alertas
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ==================== COMPARE PAGE ====================

export default function Compare() {
  useTheme() // For future use with dynamic palette
  useSelectedClient() // For future use with date filtering
  const [selectedClients, setSelectedClients] = useState<string[]>(['rc', 'tm'])
  const [showAmounts] = useState(true)
  const [periodA, setPeriodA] = useState<DatePeriod>('7d')
  const [periodB, setPeriodB] = useState<DatePeriod>('last_month')
  const [compareMode, setCompareMode] = useState<'clients' | 'periods'>('clients')

  const comparison = compareClients(selectedClients)

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header - ENHANCED */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10">
            <GitCompare className="w-6 h-6 text-violet-500" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Comparar</h1>
            <p className="text-sm text-slate-500">Analiza rendimiento y detecta oportunidades</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            <button
              onClick={() => setCompareMode('clients')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                compareMode === 'clients'
                  ? "bg-white dark:bg-slate-700 text-violet-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              Por Cliente
            </button>
            <button
              onClick={() => setCompareMode('periods')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                compareMode === 'periods'
                  ? "bg-white dark:bg-slate-700 text-violet-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              Por Período
            </button>
          </div>

          <button
            aria-label="Filtrar datos"
            className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            <Filter className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            aria-label="Actualizar datos"
            className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            aria-label="Exportar datos"
            className="min-h-[44px] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-medium shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
        </div>
      </div>

      {/* Period Comparison Selector (when in period mode) */}
      {compareMode === 'periods' && (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-violet-500/5">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-violet-500" aria-hidden="true" />
            Comparar Periodos
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={periodA}
              onChange={(e) => setPeriodA(e.target.value as DatePeriod)}
              className="px-4 py-2.5 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 text-slate-800 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            >
              {dateOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 text-slate-400">
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm">vs</span>
              <ArrowRight className="w-4 h-4 rotate-180" aria-hidden="true" />
            </div>
            <select
              value={periodB}
              onChange={(e) => setPeriodB(e.target.value as DatePeriod)}
              className="px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-slate-800 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              {dateOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button className="ml-auto min-h-[44px] px-4 py-2 rounded-xl bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900">
              <BarChart3 className="w-4 h-4" aria-hidden="true" />
              Comparar
            </button>
          </div>
        </div>
      )}

      {/* Client Selector */}
      <ClientSelector selected={selectedClients} onChange={setSelectedClients} />

      {selectedClients.length >= 2 ? (
        <>
          {/* Client Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {comparison.clients.map(summary => (
              <ClientCompareCard key={summary.client.id} summary={summary} />
            ))}
          </div>

          {/* Comparison Table */}
          <ComparisonTable comparison={comparison} showAmounts={showAmounts} />

          {/* Insights */}
          {comparison.insights.length > 0 && (
            <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-500/10 dark:to-indigo-500/10 rounded-2xl p-5 border border-violet-200/50 dark:border-violet-500/20">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-violet-500/10">
                  <Lightbulb size={18} className="text-violet-500" aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Insights</h3>
              </div>
              <ul className="space-y-3">
                {comparison.insights.map((insight, i) => (
                  <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-violet-500 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Same Industry Comparison */}
          {(() => {
            const industries = [...new Set(comparison.clients.map(c => c.client.industry))]
            const multiIndustry = industries.filter(ind =>
              comparison.clients.filter(c => c.client.industry === ind).length > 1
            )

            if (multiIndustry.length === 0) return null

            return multiIndustry.map(industry => {
              const industryClients = comparison.clients.filter(c => c.client.industry === industry)
              const avgCpr = industryClients.reduce((sum, c) => sum + c.avgCpr, 0) / industryClients.length

              return (
                <div key={industry} className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 rounded-2xl p-5 border border-amber-200/50 dark:border-amber-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-5 h-5 text-amber-600" aria-hidden="true" />
                    <h4 className="font-semibold text-amber-800 dark:text-amber-200">
                      Comparativa {industry}
                    </h4>
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                    CPR promedio de tus clientes de {industry}: <strong className="text-lg">${avgCpr.toFixed(0)}</strong>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {industryClients.map(c => (
                      <span
                        key={c.client.id}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-semibold',
                          c.avgCpr < avgCpr
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                            : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                        )}
                      >
                        {c.client.name}: ${c.avgCpr.toFixed(0)}
                        {c.avgCpr < avgCpr ? ' (mejor)' : ' (mejorable)'}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })
          })()}
        </>
      ) : (
        <div className="text-center py-16 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 flex items-center justify-center mx-auto mb-4">
            <GitCompare className="w-8 h-8 text-violet-400" aria-hidden="true" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Seleccioná al menos 2 clientes para comparar</p>
          <p className="text-sm text-slate-400 mt-1">Podés comparar hasta 4 clientes simultáneamente</p>
        </div>
      )}
    </div>
  )
}
