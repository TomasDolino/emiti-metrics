import { useState } from 'react'
import { Target, Play, Pause, Eye, EyeOff, ChevronRight } from 'lucide-react'
import { useTheme } from '../lib/theme'
import { mockCampaigns, mockMetrics } from '../lib/mockData'
import { formatMoney, formatNumber, formatPercent, cn } from '../lib/utils'

// ==================== CAMPAIGN ROW (1 línea) ====================

interface CampaignRowProps {
  campaign: ReturnType<typeof useCampaignsWithMetrics>[0]
  showAmounts: boolean
  palette: ReturnType<typeof useTheme>['palette']
}

function CampaignRow({ campaign, showAmounts, palette }: CampaignRowProps) {
  const borderColor = campaign.status === 'ACTIVE' ? palette.success : '#9ca3af'
  const budgetPercent = Math.min(campaign.budgetUsed, 100)

  return (
    <div
      className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border-l-4 hover:shadow-sm transition-shadow cursor-pointer"
      style={{ borderLeftColor: borderColor }}
    >
      {/* Status Icon */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${borderColor}20` }}
      >
        <Target className="w-4 h-4" style={{ color: borderColor }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{campaign.name}</p>
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white flex-shrink-0"
            style={{ backgroundColor: borderColor }}
          >
            {campaign.status === 'ACTIVE' ? 'Activa' : 'Pausada'}
          </span>
        </div>
        <p className="text-xs text-gray-500">{campaign.objective}</p>
      </div>

      {/* Budget Progress */}
      <div className="hidden sm:block w-24">
        <div className="flex items-center justify-between text-xs mb-0.5">
          <span className="text-gray-500">{budgetPercent.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${budgetPercent}%`,
              backgroundColor: budgetPercent > 90 ? palette.danger : budgetPercent > 70 ? palette.warning : palette.success
            }}
          />
        </div>
      </div>

      {/* Metrics */}
      <div className="text-right hidden md:block">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{formatNumber(campaign.totalResults)}</p>
        <p className="text-xs text-gray-500">resultados</p>
      </div>
      <div className="text-right hidden md:block">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {showAmounts ? formatMoney(campaign.cpr) : '•••'}
        </p>
        <p className="text-xs text-gray-500">CPR</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{formatPercent(campaign.ctr)}</p>
        <p className="text-xs text-gray-500">CTR</p>
      </div>

      {/* Actions */}
      <button
        className="p-1.5 rounded-lg transition-colors"
        style={{ color: campaign.status === 'ACTIVE' ? palette.warning : palette.success }}
      >
        {campaign.status === 'ACTIVE' ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <ChevronRight size={16} className="text-gray-400" />
    </div>
  )
}

// ==================== HELPER ====================

function useCampaignsWithMetrics() {
  return mockCampaigns.map(campaign => {
    const metrics = mockMetrics.filter(m => m.campaignName === campaign.name)
    const totalSpend = metrics.reduce((sum, m) => sum + m.spend, 0)
    const totalResults = metrics.reduce((sum, m) => sum + m.results, 0)
    const totalImpressions = metrics.reduce((sum, m) => sum + m.impressions, 0)
    const totalClicks = metrics.reduce((sum, m) => sum + m.clicks, 0)

    return {
      ...campaign,
      totalSpend,
      totalResults,
      cpr: totalResults > 0 ? totalSpend / totalResults : 0,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      budgetUsed: (totalSpend / campaign.budget) * 100
    }
  })
}

// ==================== CAMPAIGNS PAGE ====================

export default function Campaigns() {
  const { palette } = useTheme()
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED'>('ALL')
  const [showAmounts, setShowAmounts] = useState(true)

  const campaignsWithMetrics = useCampaignsWithMetrics()

  const filteredCampaigns = statusFilter === 'ALL'
    ? campaignsWithMetrics
    : campaignsWithMetrics.filter(c => c.status === statusFilter)

  const activeCampaigns = campaignsWithMetrics.filter(c => c.status === 'ACTIVE').length
  const totalSpend = campaignsWithMetrics.reduce((sum, c) => sum + c.totalSpend, 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Campañas</h1>
          <p className="text-sm text-gray-500">
            {activeCampaigns} activas • {showAmounts ? formatMoney(totalSpend) : '•••'} invertido
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {(['ALL', 'ACTIVE', 'PAUSED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                  statusFilter === status
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {status === 'ALL' ? 'Todas' : status === 'ACTIVE' ? 'Activas' : 'Pausadas'}
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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm">
          <p className="text-xs text-gray-500">Campañas Activas</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">{activeCampaigns}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm">
          <p className="text-xs text-gray-500">Resultados Totales</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">
            {formatNumber(campaignsWithMetrics.reduce((sum, c) => sum + c.totalResults, 0))}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm">
          <p className="text-xs text-gray-500">Gasto Total</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">
            {showAmounts ? formatMoney(totalSpend) : '•••••'}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm">
          <p className="text-xs text-gray-500">CPR Promedio</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">
            {showAmounts ? formatMoney(campaignsWithMetrics.reduce((sum, c) => sum + c.cpr, 0) / campaignsWithMetrics.length) : '•••••'}
          </p>
        </div>
      </div>

      {/* Campaigns List (1 line cards) */}
      <div className="space-y-2">
        {filteredCampaigns.map((campaign) => (
          <CampaignRow
            key={campaign.id}
            campaign={campaign}
            showAmounts={showAmounts}
            palette={palette}
          />
        ))}
      </div>

      {filteredCampaigns.length === 0 && (
        <div className="text-center py-12">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No hay campañas con este filtro</p>
        </div>
      )}
    </div>
  )
}
