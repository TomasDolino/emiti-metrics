import { useState, useEffect } from 'react'
import { Target, Play, Pause, Eye, EyeOff, ChevronRight, ChevronDown, DollarSign, TrendingUp, Users, Loader2, RefreshCw } from 'lucide-react'
import { useTheme } from '../lib/theme'
import { api, type Campaign } from '../lib/api'
import { formatMoney, formatNumber, formatPercent, cn } from '../lib/utils'
import { useSelectedClient } from '../components/Layout'

// ==================== CAMPAIGN ROW (1 línea) ====================

interface CampaignRowProps {
  campaign: Campaign
  showAmounts: boolean
  palette: ReturnType<typeof useTheme>['palette']
}

function CampaignRow({ campaign, showAmounts, palette }: CampaignRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isActive = campaign.status === 'ACTIVE'
  const borderColor = isActive ? palette.success : '#9ca3af'
  const budgetUsed = campaign.daily_budget > 0 ? (campaign.spend / campaign.daily_budget) * 100 : 0
  const budgetPercent = Math.min(budgetUsed, 100)
  const ctr = campaign.impressions > 0 ? (campaign.results / campaign.impressions) * 100 : 0

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg border-l-4 overflow-hidden hover:shadow-sm transition-shadow"
      style={{ borderLeftColor: borderColor }}
    >
      {/* Main Row */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
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
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate" title={campaign.name}>{campaign.name}</p>
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white flex-shrink-0"
              style={{ backgroundColor: borderColor }}
            >
              {isActive ? 'Activa' : 'Pausada'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{campaign.objective}</p>
        </div>

        {/* Budget Progress */}
        <div className="hidden sm:block w-24">
          <div className="flex items-center justify-between text-xs mb-0.5">
            <span className="text-slate-500 dark:text-slate-400">{budgetPercent.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 dark:bg-gray-700 rounded-full overflow-hidden">
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
          <p className="text-sm font-medium text-slate-900 dark:text-white">{formatNumber(campaign.results)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">resultados</p>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {showAmounts ? formatMoney(campaign.cpr) : '•••'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">CPR</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{formatPercent(ctr)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">CTR</p>
        </div>

        {/* Actions */}
        <button
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: isActive ? palette.warning : palette.success }}
          onClick={(e) => e.stopPropagation()}
        >
          {isActive ? <Pause size={16} /> : <Play size={16} />}
        </button>
        {isExpanded ? (
          <ChevronDown size={16} className="text-slate-400 transition-transform" />
        ) : (
          <ChevronRight size={16} className="text-slate-400 transition-transform" />
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:bg-gray-800/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg">
              <DollarSign size={16} className="text-slate-400" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Presupuesto</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {showAmounts ? formatMoney(campaign.daily_budget) : '•••'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg">
              <TrendingUp size={16} className="text-slate-400" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Gastado</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {showAmounts ? formatMoney(campaign.spend) : '•••'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg">
              <Target size={16} className="text-slate-400" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Resultados</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{formatNumber(campaign.results)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg">
              <Users size={16} className="text-slate-400" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Anuncios</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{campaign.ads_count}</p>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Uso budget:</span>
              <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${budgetPercent}%`,
                    backgroundColor: budgetPercent > 90 ? palette.danger : budgetPercent > 70 ? palette.warning : palette.success
                  }}
                />
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{budgetPercent.toFixed(0)}%</span>
            </div>
            <span className={cn(
              'text-xs px-2 py-1 rounded',
              isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            )}>
              {isActive ? 'Campaña activa' : 'Campaña pausada'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== CAMPAIGNS PAGE ====================

export default function Campaigns() {
  const { palette } = useTheme()
  const { selectedClientId } = useSelectedClient()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED'>('ALL')
  const [showAmounts, setShowAmounts] = useState(true)

  const fetchCampaigns = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.getCampaigns(selectedClientId || undefined)
      setCampaigns(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando campañas')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCampaigns()
  }, [selectedClientId])

  const filteredCampaigns = statusFilter === 'ALL'
    ? campaigns
    : campaigns.filter(c => c.status === statusFilter)

  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE').length
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0)
  const totalResults = campaigns.reduce((sum, c) => sum + c.results, 0)
  const avgCpr = totalResults > 0 ? totalSpend / totalResults : 0

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
          onClick={fetchCampaigns}
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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Campañas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {activeCampaigns} activas • {showAmounts ? formatMoney(totalSpend) : '•••'} invertido
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 dark:bg-gray-800 rounded-lg p-1">
            {(['ALL', 'ACTIVE', 'PAUSED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                  statusFilter === status
                    ? 'bg-white dark:bg-gray-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'
                )}
              >
                {status === 'ALL' ? 'Todas' : status === 'ACTIVE' ? 'Activas' : 'Pausadas'}
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">Campañas Activas</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-white">{activeCampaigns}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">Resultados Totales</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-white">
            {formatNumber(totalResults)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">Gasto Total</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-white">
            {showAmounts ? formatMoney(totalSpend) : '•••••'}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">CPR Promedio</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-white">
            {showAmounts ? formatMoney(avgCpr) : '•••••'}
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
          <Target className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">
            {campaigns.length === 0 ? 'No hay campañas. Sube un CSV para comenzar.' : 'No hay campañas con este filtro'}
          </p>
        </div>
      )}
    </div>
  )
}
