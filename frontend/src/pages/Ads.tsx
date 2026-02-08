import { useState } from 'react'
import { Image, Eye, EyeOff, ChevronRight, ChevronDown, TrendingUp, TrendingDown, Target, DollarSign } from 'lucide-react'
import { useTheme } from '../lib/theme'
import { mockAdsAnalysis } from '../lib/mockData'
import { formatMoney, formatNumber, formatPercent, getClassificationColor, cn } from '../lib/utils'
import type { AdClassification } from '../lib/utils'

// ==================== AD ROW (1 línea) ====================

interface AdRowProps {
  ad: typeof mockAdsAnalysis[0]
  showAmounts: boolean
}

function AdRow({ ad, showAmounts }: AdRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const borderColor = getClassificationColor(ad.classification as AdClassification)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border-l-4 overflow-hidden transition-shadow hover:shadow-sm" style={{ borderLeftColor: borderColor }}>
      {/* Main Row */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Thumbnail */}
        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
          <Image className="w-5 h-5 text-gray-400" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={ad.adName}>{ad.adName}</p>
          <p className="text-xs text-gray-500 truncate" title={ad.adSetName}>{ad.adSetName}</p>
        </div>

        {/* Metrics */}
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {showAmounts ? formatMoney(ad.totalSpend) : '•••'}
          </p>
          <p className="text-xs text-gray-500">gasto</p>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{formatNumber(ad.totalResults)}</p>
          <p className="text-xs text-gray-500">resultados</p>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {showAmounts ? formatMoney(ad.avgCostPerResult) : '•••'}
          </p>
          <p className="text-xs text-gray-500">CPR</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{formatPercent(ad.avgCtr)}</p>
          <p className="text-xs text-gray-500">CTR</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className={cn(
            'text-sm font-medium',
            ad.avgFrequency > 3.5 ? 'text-red-500' : ad.avgFrequency > 2.5 ? 'text-amber-500' : 'text-gray-900 dark:text-white'
          )}>
            {ad.avgFrequency.toFixed(1)}
          </p>
          <p className="text-xs text-gray-500">freq</p>
        </div>

        {/* Fatigue Bar */}
        <div className="w-12 hidden lg:block">
          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full',
                ad.fatigueScore > 60 ? 'bg-red-500' : ad.fatigueScore > 30 ? 'bg-amber-500' : 'bg-green-500'
              )}
              style={{ width: `${ad.fatigueScore}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-0.5">{ad.fatigueScore}%</p>
        </div>

        {/* Classification Badge */}
        <span
          className="px-2 py-0.5 rounded text-xs font-medium text-white flex-shrink-0"
          style={{ backgroundColor: borderColor }}
        >
          {ad.classification}
        </span>

        {isExpanded ? (
          <ChevronDown size={16} className="text-gray-400 hidden sm:block transition-transform" />
        ) : (
          <ChevronRight size={16} className="text-gray-400 hidden sm:block transition-transform" />
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg">
              <DollarSign size={16} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Gasto Total</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {showAmounts ? formatMoney(ad.totalSpend) : '•••'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg">
              <Target size={16} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Resultados</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{formatNumber(ad.totalResults)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg">
              <TrendingUp size={16} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Días Activo</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{ad.daysRunning}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg">
              <TrendingDown size={16} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Frecuencia</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{ad.avgFrequency.toFixed(1)}</p>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Fatiga:</span>
              <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full',
                    ad.fatigueScore > 60 ? 'bg-red-500' : ad.fatigueScore > 30 ? 'bg-amber-500' : 'bg-green-500'
                  )}
                  style={{ width: `${ad.fatigueScore}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{ad.fatigueScore}%</span>
            </div>
            <span className="text-xs text-gray-500">Campaña: {ad.campaignName}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== ADS PAGE ====================

export default function Ads() {
  useTheme() // for consistency
  const [showAmounts, setShowAmounts] = useState(true)
  const [sortBy, setSortBy] = useState<'results' | 'spend' | 'cpr' | 'ctr'>('results')
  const [filterClassification, setFilterClassification] = useState<AdClassification | 'ALL'>('ALL')

  const sortedAds = [...mockAdsAnalysis]
    .filter(a => filterClassification === 'ALL' || a.classification === filterClassification)
    .sort((a, b) => {
      switch (sortBy) {
        case 'results': return b.totalResults - a.totalResults
        case 'spend': return b.totalSpend - a.totalSpend
        case 'cpr': return a.avgCostPerResult - b.avgCostPerResult
        case 'ctr': return b.avgCtr - a.avgCtr
        default: return 0
      }
    })

  // Classification counts
  const classificationCounts = {
    GANADOR: mockAdsAnalysis.filter(a => a.classification === 'GANADOR').length,
    ESCALABLE: mockAdsAnalysis.filter(a => a.classification === 'ESCALABLE').length,
    TESTING: mockAdsAnalysis.filter(a => a.classification === 'TESTING').length,
    FATIGADO: mockAdsAnalysis.filter(a => a.classification === 'FATIGADO').length,
    PAUSAR: mockAdsAnalysis.filter(a => a.classification === 'PAUSAR').length,
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Anuncios</h1>
          <p className="text-sm text-gray-500">{mockAdsAnalysis.length} anuncios activos</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 dark:text-white"
          >
            <option value="results">Por Resultados</option>
            <option value="spend">Por Gasto</option>
            <option value="cpr">Por CPR</option>
            <option value="ctr">Por CTR</option>
          </select>

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

      {/* Classification Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
        <button
          onClick={() => setFilterClassification('ALL')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0',
            filterClassification === 'ALL'
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          )}
        >
          Todos ({mockAdsAnalysis.length})
        </button>
        {(Object.entries(classificationCounts) as [AdClassification, number][]).map(([classification, count]) => (
          <button
            key={classification}
            onClick={() => setFilterClassification(filterClassification === classification ? 'ALL' : classification)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0',
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
          <Image className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No hay anuncios con este filtro</p>
        </div>
      )}
    </div>
  )
}
