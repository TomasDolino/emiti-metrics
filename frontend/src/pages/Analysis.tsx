import { useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Eye,
  EyeOff,
  BarChart2
} from 'lucide-react'
import { useTheme } from '../lib/theme'
import { mockAdsAnalysis } from '../lib/mockData'
import { formatMoney, formatPercent, formatNumber, getClassificationColor, cn } from '../lib/utils'
import type { AdClassification } from '../lib/utils'

// ==================== ANALYSIS ROW (1 línea expandible) ====================

interface AnalysisRowProps {
  analysis: typeof mockAdsAnalysis[0]
  isExpanded: boolean
  onToggle: () => void
  showAmounts: boolean
  palette: ReturnType<typeof useTheme>['palette']
}

function AnalysisRow({ analysis, isExpanded, onToggle, showAmounts, palette }: AnalysisRowProps) {
  const borderColor = getClassificationColor(analysis.classification as AdClassification)

  const getTrendIcon = (value: number, inverted = false) => {
    const isGood = inverted ? value < 0 : value > 0
    if (Math.abs(value) < 3) return <Minus className="w-3 h-3 text-gray-400" />
    if (value > 0) return <TrendingUp className={cn('w-3 h-3', isGood ? 'text-green-500' : 'text-red-500')} />
    return <TrendingDown className={cn('w-3 h-3', isGood ? 'text-green-500' : 'text-red-500')} />
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border-l-4 shadow-sm" style={{ borderLeftColor: borderColor }}>
      {/* Header Row (always visible) */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        {/* Classification Badge */}
        <span
          className="px-2 py-0.5 rounded text-xs font-medium text-white flex-shrink-0"
          style={{ backgroundColor: borderColor }}
        >
          {analysis.classification}
        </span>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{analysis.adName}</p>
          <p className="text-xs text-gray-500 truncate">{analysis.adSetName}</p>
        </div>

        {/* Key Metrics */}
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {showAmounts ? formatMoney(analysis.avgCostPerResult) : '•••'}
          </p>
          <p className="text-xs text-gray-500">CPR</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{formatPercent(analysis.avgCtr)}</p>
          <p className="text-xs text-gray-500">CTR</p>
        </div>
        <div className="text-right hidden md:block">
          <p className={cn(
            'text-sm font-medium',
            analysis.avgFrequency > 3.5 ? 'text-red-500' : analysis.avgFrequency > 2.5 ? 'text-amber-500' : 'text-gray-900 dark:text-white'
          )}>
            {analysis.avgFrequency.toFixed(1)}
          </p>
          <p className="text-xs text-gray-500">Freq</p>
        </div>

        {/* Fatigue */}
        <div className="w-10 hidden md:block">
          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full',
                analysis.fatigueScore > 60 ? 'bg-red-500' : analysis.fatigueScore > 30 ? 'bg-amber-500' : 'bg-green-500'
              )}
              style={{ width: `${analysis.fatigueScore}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 text-center">{analysis.fatigueScore}%</p>
        </div>

        {/* Expand Icon */}
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-700 pt-3 space-y-3">
          {/* Reason */}
          <div
            className="text-sm p-2 rounded-lg"
            style={{ backgroundColor: `${borderColor}10`, color: borderColor }}
          >
            {analysis.classificationReason}
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
              <p className="text-[10px] text-gray-500">Gasto Total</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {showAmounts ? formatMoney(analysis.totalSpend) : '•••••'}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
              <p className="text-[10px] text-gray-500">Resultados</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatNumber(analysis.totalResults)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
              <p className="text-[10px] text-gray-500">Días activo</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{analysis.daysRunning}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
              <p className="text-[10px] text-gray-500">Fatiga</p>
              <div className="flex items-center gap-1">
                <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      analysis.fatigueScore > 60 ? 'bg-red-500' : analysis.fatigueScore > 30 ? 'bg-amber-500' : 'bg-green-500'
                    )}
                    style={{ width: `${analysis.fatigueScore}%` }}
                  />
                </div>
                <span className="text-xs font-medium">{analysis.fatigueScore}%</span>
              </div>
            </div>
          </div>

          {/* Trends */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1">
              {getTrendIcon(analysis.ctrTrend)}
              <span className={cn(
                'font-medium',
                analysis.ctrTrend > 0 ? 'text-green-600' : analysis.ctrTrend < 0 ? 'text-red-600' : 'text-gray-600'
              )}>
                CTR {analysis.ctrTrend > 0 ? '+' : ''}{analysis.ctrTrend.toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center gap-1">
              {getTrendIcon(analysis.cprTrend, true)}
              <span className={cn(
                'font-medium',
                analysis.cprTrend < 0 ? 'text-green-600' : analysis.cprTrend > 0 ? 'text-red-600' : 'text-gray-600'
              )}>
                CPR {analysis.cprTrend > 0 ? '+' : ''}{analysis.cprTrend.toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center gap-1">
              {getTrendIcon(analysis.frequencyTrend, true)}
              <span className={cn(
                'font-medium',
                analysis.frequencyTrend < 0 ? 'text-green-600' : analysis.frequencyTrend > 10 ? 'text-red-600' : 'text-gray-600'
              )}>
                Freq {analysis.frequencyTrend > 0 ? '+' : ''}{analysis.frequencyTrend.toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Recommendations */}
          <div
            className="rounded-lg p-3"
            style={{ backgroundColor: `${palette.primary}10` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4" style={{ color: palette.primary }} />
              <h4 className="font-medium text-sm" style={{ color: palette.primary }}>Recomendaciones</h4>
            </div>
            <ul className="space-y-1">
              {analysis.recommendations.map((rec, i) => (
                <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1">
                  <span style={{ color: palette.primary }}>•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== ANALYSIS PAGE ====================

export default function Analysis() {
  const { palette } = useTheme()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterClassification, setFilterClassification] = useState<AdClassification | 'ALL'>('ALL')
  const [showAmounts, setShowAmounts] = useState(true)

  const filteredAds = filterClassification === 'ALL'
    ? mockAdsAnalysis
    : mockAdsAnalysis.filter(a => a.classification === filterClassification)

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
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Análisis de Anuncios</h1>
          <p className="text-sm text-gray-500">Clasificación automática y recomendaciones basadas en datos</p>
        </div>

        <button
          onClick={() => setShowAmounts(!showAmounts)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          title={showAmounts ? 'Ocultar montos' : 'Mostrar montos'}
        >
          {showAmounts ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {(Object.entries(classificationCounts) as [AdClassification, number][]).map(([classification, count]) => {
          const color = getClassificationColor(classification)
          const isActive = filterClassification === classification
          return (
            <button
              key={classification}
              onClick={() => setFilterClassification(isActive ? 'ALL' : classification)}
              className={cn(
                'p-3 rounded-xl text-center transition-all border-l-4',
                isActive && 'ring-2 ring-offset-1'
              )}
              style={{
                backgroundColor: isActive ? color : `${color}15`,
                borderLeftColor: color,
                ...(isActive ? { ringColor: color } : {})
              }}
            >
              <p
                className="text-2xl font-bold"
                style={{ color: isActive ? 'white' : color }}
              >
                {count}
              </p>
              <p
                className="text-[10px] font-medium"
                style={{ color: isActive ? 'rgba(255,255,255,0.8)' : color }}
              >
                {classification}
              </p>
            </button>
          )
        })}
      </div>

      {/* Active Filter */}
      {filterClassification !== 'ALL' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Mostrando:</span>
          <span
            className="px-2 py-1 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: getClassificationColor(filterClassification) }}
          >
            {filterClassification}
          </span>
          <button
            onClick={() => setFilterClassification('ALL')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Ver todos
          </button>
        </div>
      )}

      {/* Analysis Cards (expandible 1 line) */}
      <div className="space-y-2">
        {filteredAds.map((analysis) => (
          <AnalysisRow
            key={analysis.adName}
            analysis={analysis}
            isExpanded={expandedId === analysis.adName}
            onToggle={() => setExpandedId(expandedId === analysis.adName ? null : analysis.adName)}
            showAmounts={showAmounts}
            palette={palette}
          />
        ))}
      </div>

      {filteredAds.length === 0 && (
        <div className="text-center py-12">
          <BarChart2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No hay anuncios con este filtro</p>
        </div>
      )}
    </div>
  )
}
