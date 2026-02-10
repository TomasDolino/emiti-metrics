import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Image, Eye, EyeOff, ChevronRight, ChevronDown, TrendingUp, TrendingDown, Target, DollarSign, Loader2, RefreshCw, Lightbulb, Zap, Clock, Pause, AlertTriangle } from 'lucide-react'
import { useTheme } from '../lib/theme'
import { api, type AdAnalysis } from '../lib/api'
import { formatMoney, formatNumber, formatPercent, getClassificationColor, cn, safeNumber } from '../lib/utils'
import type { AdClassification } from '../lib/utils'
import { useSelectedClient } from '../components/Layout'

// ==================== AD ROW (1 línea) ====================

interface AdRowProps {
  ad: AdAnalysis
  showAmounts: boolean
}

function AdRow({ ad, showAmounts }: AdRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const borderColor = getClassificationColor(ad.classification as AdClassification)

  // Calculate fatigue score based on frequency and days running
  const fatigueScore = Math.min(100, Math.round((safeNumber(ad.frequency) / 4) * 50 + (safeNumber(ad.days_running) / 30) * 50))

  // Get action icon based on action type
  const getActionIcon = () => {
    switch (ad.action) {
      case 'ESCALAR':
        return <TrendingUp className="w-4 h-4" />
      case 'ESPERAR':
        return <Clock className="w-4 h-4" />
      case 'PAUSAR':
        return <Pause className="w-4 h-4" />
      case 'RENOVAR':
        return <AlertTriangle className="w-4 h-4" />
      default:
        return <Zap className="w-4 h-4" />
    }
  }

  // Get action button color
  const getActionColor = () => {
    switch (ad.action) {
      case 'ESCALAR':
        return 'bg-green-500'
      case 'ESPERAR':
        return 'bg-blue-500'
      case 'PAUSAR':
        return 'bg-red-500'
      case 'RENOVAR':
        return 'bg-amber-500'
      default:
        return 'bg-slate-500'
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border-l-4 overflow-hidden transition-shadow hover:shadow-sm" style={{ borderLeftColor: borderColor }}>
      {/* Main Row */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Thumbnail */}
        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
          <Image className="w-5 h-5 text-slate-400" aria-hidden="true" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate" title={ad.ad_name}>{ad.ad_name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate" title={ad.ad_set_name}>{ad.ad_set_name}</p>
        </div>

        {/* Metrics */}
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {showAmounts ? formatMoney(ad.spend) : '•••'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">gasto</p>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{formatNumber(ad.results)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">resultados</p>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {showAmounts ? formatMoney(ad.cpr) : '•••'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">CPR</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{formatPercent(ad.ctr)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">CTR</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className={cn(
            'text-sm font-medium',
            ad.frequency > 3.5 ? 'text-red-500' : ad.frequency > 2.5 ? 'text-amber-500' : 'text-slate-900 dark:text-white'
          )}>
            {safeNumber(ad.frequency).toFixed(1)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">freq</p>
        </div>

        {/* Fatigue Bar */}
        <div className="w-12 hidden lg:block">
          <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full',
                fatigueScore > 60 ? 'bg-red-500' : fatigueScore > 30 ? 'bg-amber-500' : 'bg-green-500'
              )}
              style={{ width: `${fatigueScore}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-0.5">{fatigueScore}%</p>
        </div>

        {/* Classification Badge */}
        <span
          className="px-2 py-0.5 rounded text-xs font-medium text-white flex-shrink-0"
          style={{ backgroundColor: borderColor }}
        >
          {ad.classification}
        </span>

        {isExpanded ? (
          <ChevronDown size={16} className="text-slate-400 hidden sm:block transition-transform" aria-hidden="true" />
        ) : (
          <ChevronRight size={16} className="text-slate-400 hidden sm:block transition-transform" aria-hidden="true" />
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg">
              <DollarSign size={16} className="text-slate-400" aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Gasto Total</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {showAmounts ? formatMoney(ad.spend) : '•••'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg">
              <Target size={16} className="text-slate-400" aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Resultados</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{formatNumber(ad.results)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg">
              <TrendingUp size={16} className="text-slate-400" aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Dias Activo</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{ad.days_running}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg">
              <TrendingDown size={16} className="text-slate-400" aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Frecuencia</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{safeNumber(ad.frequency).toFixed(1)}</p>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Fatiga:</span>
              <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full',
                    fatigueScore > 60 ? 'bg-red-500' : fatigueScore > 30 ? 'bg-amber-500' : 'bg-green-500'
                  )}
                  style={{ width: `${fatigueScore}%` }}
                />
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{fatigueScore}%</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Campaña: {ad.campaign_name}</span>
          </div>

          {/* AI Recommendation */}
          {ad.recommendation && (
            <div className="mt-3 p-3 bg-gradient-to-r from-slate-100 to-white dark:from-slate-700 dark:to-slate-800 rounded-lg border border-slate-200 dark:border-slate-600">
              <div className="flex items-start gap-2">
                <div className={cn('p-1.5 rounded text-white flex-shrink-0', getActionColor())}>
                  {getActionIcon()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('px-2 py-0.5 rounded text-xs font-bold text-white', getActionColor())}>
                      {ad.action}
                    </span>
                    {ad.priority && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {ad.priority === 1 ? '🔥 Alta' : ad.priority === 2 ? '⚡ Media' : '📋 Normal'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">
                    {ad.recommendation}
                  </p>
                  {ad.action_detail && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      <Lightbulb className="w-3 h-3 inline mr-1" aria-hidden="true" />
                      {ad.action_detail}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ==================== ADS PAGE ====================

export default function Ads() {
  useTheme() // for consistency
  const { selectedClientId } = useSelectedClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [ads, setAds] = useState<AdAnalysis[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAmounts, setShowAmounts] = useState(true)
  const [sortBy, setSortBy] = useState<'results' | 'spend' | 'cpr' | 'ctr'>('results')

  // Get initial filter from URL
  const urlFilter = searchParams.get('filter') as AdClassification | null
  const [filterClassification, setFilterClassification] = useState<AdClassification | 'ALL'>(urlFilter || 'ALL')

  // Update URL when filter changes
  const handleFilterChange = (classification: AdClassification | 'ALL') => {
    setFilterClassification(classification)
    if (classification === 'ALL') {
      searchParams.delete('filter')
    } else {
      searchParams.set('filter', classification)
    }
    setSearchParams(searchParams)
  }

  const fetchAds = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.getAdsAnalysis(selectedClientId || undefined)
      setAds(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando anuncios')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAds()
  }, [selectedClientId])

  const sortedAds = [...ads]
    .filter(a => filterClassification === 'ALL' || a.classification === filterClassification)
    .sort((a, b) => {
      switch (sortBy) {
        case 'results': return b.results - a.results
        case 'spend': return b.spend - a.spend
        case 'cpr': return a.cpr - b.cpr
        case 'ctr': return b.ctr - a.ctr
        default: return 0
      }
    })

  // Classification counts
  const classificationCounts = {
    GANADOR: ads.filter(a => a.classification === 'GANADOR').length,
    ESCALABLE: ads.filter(a => a.classification === 'ESCALABLE').length,
    TESTING: ads.filter(a => a.classification === 'TESTING').length,
    FATIGADO: ads.filter(a => a.classification === 'FATIGADO').length,
    PAUSAR: ads.filter(a => a.classification === 'PAUSAR').length,
  }

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
          onClick={fetchAds}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 min-h-[40px]"
        >
          <RefreshCw size={16} aria-hidden="true" />
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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Anuncios</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{ads.length} anuncios activos</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 dark:text-white min-h-[40px]"
            aria-label="Ordenar anuncios por"
          >
            <option value="results">Por Resultados</option>
            <option value="spend">Por Gasto</option>
            <option value="cpr">Por CPR</option>
            <option value="ctr">Por CTR</option>
          </select>

          {/* Toggle amounts */}
          <button
            onClick={() => setShowAmounts(!showAmounts)}
            className="p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label={showAmounts ? 'Ocultar montos' : 'Mostrar montos'}
          >
            {showAmounts ? <Eye size={18} aria-hidden="true" /> : <EyeOff size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Classification Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
        <button
          onClick={() => handleFilterChange('ALL')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 min-h-[40px]',
            filterClassification === 'ALL'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          )}
        >
          Todos ({ads.length})
        </button>
        {(Object.entries(classificationCounts) as [AdClassification, number][]).map(([classification, count]) => (
          <button
            key={classification}
            onClick={() => handleFilterChange(filterClassification === classification ? 'ALL' : classification)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 min-h-[40px]',
              filterClassification === classification && 'ring-2 ring-offset-1'
            )}
            style={{
              backgroundColor: filterClassification === classification ? getClassificationColor(classification) : `${getClassificationColor(classification)}20`,
              color: filterClassification === classification ? 'white' : getClassificationColor(classification),
            }}
          >
            {classification} ({count})
          </button>
        ))}
      </div>

      {/* Ads List (1 line cards) */}
      <div className="space-y-2">
        {sortedAds.map((ad, i) => (
          <AdRow key={i} ad={ad} showAmounts={showAmounts} />
        ))}
      </div>

      {sortedAds.length === 0 && (
        <div className="text-center py-12">
          <Image className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" aria-hidden="true" />
          <p className="text-slate-500 dark:text-slate-400">
            {ads.length === 0 ? 'No hay anuncios. Sube un CSV para comenzar.' : 'No hay anuncios con este filtro'}
          </p>
        </div>
      )}
    </div>
  )
}
