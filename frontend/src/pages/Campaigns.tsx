import { useState, useEffect, useRef } from 'react'
import {
  Target, Play, Pause, Eye, EyeOff, ChevronDown, DollarSign, TrendingUp,
  Users, Loader2, RefreshCw, MoreHorizontal, Search, Filter, X,
  TrendingDown, BarChart3, Copy, ExternalLink, Settings2
} from 'lucide-react'
import { useTheme } from '../lib/theme'
import { api, type Campaign } from '../lib/api'
import { formatMoney, formatNumber, formatPercent, cn } from '../lib/utils'
import { useSelectedClient } from '../components/Layout'

// ==================== ACTIONS DROPDOWN ====================

interface ActionsDropdownProps {
  campaign: Campaign
  palette: ReturnType<typeof useTheme>['palette']
  onAction: (action: string, campaign: Campaign) => void
}

function ActionsDropdown({ campaign, palette, onAction }: ActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isActive = campaign.status === 'ACTIVE'

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const actions = [
    {
      id: 'toggle',
      label: isActive ? 'Pausar campaña' : 'Activar campaña',
      icon: isActive ? Pause : Play,
      color: isActive ? palette.warning : palette.success
    },
    {
      id: 'duplicate',
      label: 'Duplicar campaña',
      icon: Copy,
      color: palette.primary
    },
    {
      id: 'edit',
      label: 'Editar en Meta',
      icon: ExternalLink,
      color: '#64748b'
    },
    {
      id: 'settings',
      label: 'Configuración',
      icon: Settings2,
      color: '#64748b'
    }
  ]

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Acciones de campaña"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <MoreHorizontal size={16} className="text-slate-500 dark:text-slate-400" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50 animate-fadeIn"
          role="menu"
          aria-orientation="vertical"
        >
          {actions.map((action) => (
            <button
              key={action.id}
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation()
                onAction(action.id, campaign)
                setIsOpen(false)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-700"
            >
              <action.icon size={14} style={{ color: action.color }} aria-hidden="true" />
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== CAMPAIGN ROW ====================

interface CampaignRowProps {
  campaign: Campaign
  showAmounts: boolean
  palette: ReturnType<typeof useTheme>['palette']
  onAction: (action: string, campaign: Campaign) => void
}

function CampaignRow({ campaign, showAmounts, palette, onAction }: CampaignRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isActive = campaign.status === 'ACTIVE'
  const borderColor = isActive ? palette.success : '#9ca3af'
  const budgetUsed = campaign.daily_budget > 0 ? (campaign.spend / campaign.daily_budget) * 100 : 0
  const budgetPercent = Math.min(budgetUsed, 100)
  // Use CTR from backend (already calculated as clicks/impressions*100)
  const ctr = campaign.ctr || 0

  // Performance indicator
  const getPerformanceColor = () => {
    if (campaign.cpr === 0) return '#9ca3af'
    // Lower CPR is better
    return campaign.cpr < 500 ? palette.success : campaign.cpr < 1000 ? palette.warning : palette.danger
  }

  return (
    <div
      className="bg-white dark:bg-slate-800 rounded-lg border-l-4 overflow-hidden hover:shadow-md transition-all duration-200"
      style={{ borderLeftColor: borderColor }}
    >
      {/* Main Row */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsExpanded(!isExpanded)
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={`${campaign.name} - ${isExpanded ? 'Colapsar' : 'Expandir'} detalles`}
      >
        {/* Status Icon */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${borderColor}20` }}
          aria-hidden="true"
        >
          <Target className="w-4 h-4" style={{ color: borderColor }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate" title={campaign.name}>
              {campaign.name}
            </p>
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
          <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
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
          <p className="text-sm font-medium" style={{ color: getPerformanceColor() }}>
            {showAmounts ? formatMoney(campaign.cpr) : '•••'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">CPR</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{formatPercent(ctr)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">CTR</p>
        </div>

        {/* Actions Dropdown */}
        <ActionsDropdown campaign={campaign} palette={palette} onAction={onAction} />

        {/* Expand Icon */}
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={cn(
            "text-slate-400 transition-transform duration-200",
            isExpanded && "rotate-180"
          )}
        />
      </div>

      {/* Expanded Details with Animation */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-out",
          isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg">
              <DollarSign size={16} className="text-slate-400" aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Presupuesto</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {showAmounts ? formatMoney(campaign.daily_budget) : '•••'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg">
              <TrendingUp size={16} className="text-slate-400" aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Gastado</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {showAmounts ? formatMoney(campaign.spend) : '•••'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg">
              <Target size={16} className="text-slate-400" aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Resultados</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{formatNumber(campaign.results)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg">
              <Users size={16} className="text-slate-400" aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Anuncios</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{campaign.ads_count}</p>
              </div>
            </div>
          </div>

          {/* Additional Metrics Row */}
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg">
              <BarChart3 size={16} className="text-slate-400" aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Impresiones</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {formatNumber(campaign.impressions)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg">
              <TrendingDown size={16} style={{ color: getPerformanceColor() }} aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">CPR</p>
                <p className="text-sm font-medium" style={{ color: getPerformanceColor() }}>
                  {showAmounts ? formatMoney(campaign.cpr) : '•••'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg">
              <Eye size={16} className="text-slate-400" aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">CTR</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{formatPercent(ctr)}</p>
              </div>
            </div>
          </div>

          {/* Budget Progress Bar */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">Uso budget:</span>
              <div className="flex-1 max-w-xs h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${budgetPercent}%`,
                    backgroundColor: budgetPercent > 90 ? palette.danger : budgetPercent > 70 ? palette.warning : palette.success
                  }}
                />
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{budgetPercent.toFixed(0)}%</span>
            </div>
            <span className={cn(
              'text-xs px-2 py-1 rounded ml-4',
              isActive
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            )}>
              {isActive ? 'Campaña activa' : 'Campaña pausada'}
            </span>
          </div>
        </div>
      </div>
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
  const [objectiveFilter, setObjectiveFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAmounts, setShowAmounts] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId])

  // Get unique objectives for filter
  const objectives = Array.from(new Set(campaigns.map(c => c.objective).filter(Boolean)))

  // Apply all filters
  const filteredCampaigns = campaigns.filter(c => {
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter
    const matchesObjective = objectiveFilter === 'ALL' || c.objective === objectiveFilter
    const matchesSearch = !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.objective.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesObjective && matchesSearch
  })

  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE').length
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0)
  const totalResults = campaigns.reduce((sum, c) => sum + c.results, 0)
  const avgCpr = totalResults > 0 ? totalSpend / totalResults : 0

  const activeFiltersCount = [
    statusFilter !== 'ALL',
    objectiveFilter !== 'ALL',
    searchQuery !== ''
  ].filter(Boolean).length

  const clearFilters = () => {
    setStatusFilter('ALL')
    setObjectiveFilter('ALL')
    setSearchQuery('')
  }

  // Handle campaign actions
  const handleAction = (action: string, campaign: Campaign) => {
    switch (action) {
      case 'toggle':
        // TODO: Integrate with Meta API to toggle campaign
        alert(`${campaign.status === 'ACTIVE' ? 'Pausar' : 'Activar'} campaña: ${campaign.name}\n\nPróximamente: Integración con Meta API`)
        break
      case 'duplicate':
        alert(`Duplicar campaña: ${campaign.name}\n\nPróximamente`)
        break
      case 'edit':
        window.open(`https://business.facebook.com/adsmanager/manage/campaigns`, '_blank')
        break
      case 'settings':
        alert(`Configuración de: ${campaign.name}\n\nPróximamente`)
        break
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Cargando campañas">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" aria-hidden="true" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4" role="alert">
        <p className="text-red-500 dark:text-red-400">{error}</p>
        <button
          onClick={fetchCampaigns}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <RefreshCw size={16} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Campañas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {activeCampaigns} activas • {showAmounts ? formatMoney(totalSpend) : '•••'} invertido
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="text"
              placeholder="Buscar campaña..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Buscar campaña por nombre u objetivo"
              className="pl-9 pr-3 py-2 w-48 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Limpiar búsqueda"
              >
                <X size={14} className="text-slate-400" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            aria-label={`Filtros${activeFiltersCount > 0 ? ` (${activeFiltersCount} activos)` : ''}`}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              showFilters || activeFiltersCount > 0
                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            )}
          >
            <Filter size={16} aria-hidden="true" />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 flex items-center justify-center bg-blue-500 text-white text-xs rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Toggle amounts */}
          <button
            onClick={() => setShowAmounts(!showAmounts)}
            className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            title={showAmounts ? 'Ocultar montos' : 'Mostrar montos'}
            aria-label={showAmounts ? 'Ocultar montos' : 'Mostrar montos'}
            aria-pressed={showAmounts}
          >
            {showAmounts ? <Eye size={18} aria-hidden="true" /> : <EyeOff size={18} aria-hidden="true" />}
          </button>

          {/* Refresh */}
          <button
            onClick={fetchCampaigns}
            className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Actualizar"
            aria-label="Actualizar campañas"
          >
            <RefreshCw size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-900 dark:text-white">Filtros</h3>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Estado</label>
              <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                {(['ALL', 'ACTIVE', 'PAUSED'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                      statusFilter === status
                        ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    )}
                  >
                    {status === 'ALL' ? 'Todas' : status === 'ACTIVE' ? 'Activas' : 'Pausadas'}
                  </button>
                ))}
              </div>
            </div>

            {/* Objective Filter */}
            {objectives.length > 0 && (
              <div>
                <label htmlFor="objective-filter" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Objetivo</label>
                <select
                  id="objective-filter"
                  value={objectiveFilter}
                  onChange={(e) => setObjectiveFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                >
                  <option value="ALL">Todos los objetivos</option>
                  {objectives.map((obj) => (
                    <option key={obj} value={obj}>{obj}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">Campañas Activas</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-white">{activeCampaigns}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">Resultados Totales</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-white">
            {formatNumber(totalResults)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">Gasto Total</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-white">
            {showAmounts ? formatMoney(totalSpend) : '•••••'}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">CPR Promedio</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-white">
            {showAmounts ? formatMoney(avgCpr) : '•••••'}
          </p>
        </div>
      </div>

      {/* Results count */}
      {(searchQuery || statusFilter !== 'ALL' || objectiveFilter !== 'ALL') && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Mostrando {filteredCampaigns.length} de {campaigns.length} campañas
        </p>
      )}

      {/* Campaigns List */}
      <div className="space-y-2">
        {filteredCampaigns.map((campaign) => (
          <CampaignRow
            key={campaign.id}
            campaign={campaign}
            showAmounts={showAmounts}
            palette={palette}
            onAction={handleAction}
          />
        ))}
      </div>

      {filteredCampaigns.length === 0 && (
        <div className="text-center py-12">
          <Target className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" aria-hidden="true" />
          <p className="text-slate-500 dark:text-slate-400">
            {campaigns.length === 0
              ? 'No hay campañas. Sube un CSV para comenzar.'
              : 'No hay campañas con estos filtros'
            }
          </p>
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  )
}
