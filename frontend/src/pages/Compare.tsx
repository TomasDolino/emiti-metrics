import { useState } from 'react'
import { GitCompare, TrendingUp, TrendingDown, Trophy, AlertTriangle, Lightbulb, Check } from 'lucide-react'
import { useTheme } from '../lib/theme'
import { mockClients, compareClients, type ClientSummary } from '../lib/mockData'
import { formatMoney, formatPercent, formatNumber, cn } from '../lib/utils'

// ==================== CLIENT SELECTOR ====================

interface ClientSelectorProps {
  selected: string[]
  onChange: (ids: string[]) => void
  palette: ReturnType<typeof useTheme>['palette']
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
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
      <h3 className="font-medium text-gray-900 dark:text-white mb-3">Seleccionar Clientes (máx. 4)</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {clients.map(client => {
          const isSelected = selected.includes(client.id)
          return (
            <button
              key={client.id}
              onClick={() => toggle(client.id)}
              className={cn(
                'flex items-center gap-2 p-2 rounded-lg border-2 transition-all text-left',
                isSelected ? 'border-current' : 'border-gray-200 dark:border-gray-700'
              )}
              style={isSelected ? { borderColor: client.color, backgroundColor: `${client.color}10` } : undefined}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: client.color }}
              >
                {client.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-medium truncate',
                  isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
                )}>
                  {client.name}
                </p>
                <p className="text-[10px] text-gray-500">{client.industry}</p>
              </div>
              {isSelected && (
                <Check size={16} style={{ color: client.color }} />
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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50">
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Métrica</th>
              {clients.map(s => (
                <th key={s.client.id} className="text-center py-3 px-4">
                  <div className="flex items-center justify-center gap-2">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ backgroundColor: s.client.color }}
                    >
                      {s.client.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-gray-900 dark:text-white">{s.client.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map(({ metric, values, unit }) => (
              <tr key={metric} className="border-t border-gray-100 dark:border-gray-700">
                <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{metric}</td>
                {values.map(v => {
                  const displayValue = metric === 'CPR' && !showAmounts
                    ? '•••'
                    : unit === '$'
                      ? formatMoney(v.value)
                      : unit === '%'
                        ? formatPercent(v.value)
                        : formatNumber(v.value)

                  return (
                    <td key={v.clientId} className="py-3 px-4 text-center">
                      <span className={cn(
                        'text-sm font-semibold',
                        v.isTop ? 'text-green-600' : 'text-gray-900 dark:text-white'
                      )}>
                        {displayValue}
                      </span>
                      {v.isTop && (
                        <Trophy size={12} className="inline ml-1 text-amber-500" />
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

function ClientCompareCard({ summary, palette }: { summary: ClientSummary; palette: ReturnType<typeof useTheme>['palette'] }) {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-l-4"
      style={{ borderLeftColor: summary.client.color }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
          style={{ backgroundColor: summary.client.color }}
        >
          {summary.client.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">{summary.client.name}</h3>
          <p className="text-xs text-gray-500">{summary.client.industry}</p>
        </div>
        {summary.trend !== 'stable' && (
          <div className={cn(
            'ml-auto flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
            summary.trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          )}>
            {summary.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(summary.trendPercent).toFixed(0)}%
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-gray-500">Resultados</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatNumber(summary.totalResults)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500">CPR</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatMoney(summary.avgCpr)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500">CTR</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatPercent(summary.avgCtr)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500">Ganadores</p>
          <p className="text-lg font-semibold" style={{ color: palette.success }}>{summary.winners}</p>
        </div>
      </div>

      {(summary.alerts > 0 || summary.fatigued > 0) && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex gap-3">
          {summary.fatigued > 0 && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle size={12} />
              {summary.fatigued} fatigados
            </span>
          )}
          {summary.alerts > 0 && (
            <span className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle size={12} />
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
  const { palette } = useTheme()
  const [selectedClients, setSelectedClients] = useState<string[]>(['rc', 'tm'])
  const [showAmounts] = useState(true)

  const comparison = compareClients(selectedClients)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Comparar Clientes</h1>
          <p className="text-sm text-gray-500">Analiza el rendimiento entre clientes y detecta oportunidades</p>
        </div>
      </div>

      {/* Client Selector */}
      <ClientSelector selected={selectedClients} onChange={setSelectedClients} palette={palette} />

      {selectedClients.length >= 2 ? (
        <>
          {/* Client Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {comparison.clients.map(summary => (
              <ClientCompareCard key={summary.client.id} summary={summary} palette={palette} />
            ))}
          </div>

          {/* Comparison Table */}
          <ComparisonTable comparison={comparison} showAmounts={showAmounts} />

          {/* Insights */}
          {comparison.insights.length > 0 && (
            <div
              className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
              style={{ borderLeft: `4px solid ${palette.primary}` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={18} style={{ color: palette.primary }} />
                <h3 className="font-medium text-gray-900 dark:text-white">Insights</h3>
              </div>
              <ul className="space-y-2">
                {comparison.insights.map((insight, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                    <span style={{ color: palette.primary }}>•</span>
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
                <div key={industry} className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
                  <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
                    Comparativa {industry}
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    CPR promedio de tus clientes de {industry}: <strong>${avgCpr.toFixed(0)}</strong>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {industryClients.map(c => (
                      <span
                        key={c.client.id}
                        className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium',
                          c.avgCpr < avgCpr ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
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
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <GitCompare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Seleccioná al menos 2 clientes para comparar</p>
        </div>
      )}
    </div>
  )
}
