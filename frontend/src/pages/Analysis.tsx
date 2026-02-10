import { useState, useEffect } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Eye,
  EyeOff,
  BarChart2,
  Loader2,
  RefreshCw,
  Zap,
  Clock,
  Pause,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'
import { useTheme } from '../lib/theme'
import { api, type AdAnalysis } from '../lib/api'
import { formatMoney, formatPercent, formatNumber, getClassificationColor, cn } from '../lib/utils'
import type { AdClassification } from '../lib/utils'
import { useSelectedClient } from '../components/Layout'

// ==================== ANALYSIS ROW (1 línea expandible) ====================

interface AnalysisRowProps {
  analysis: AdAnalysis
  isExpanded: boolean
  onToggle: () => void
  showAmounts: boolean
}

function AnalysisRow({ analysis, isExpanded, onToggle, showAmounts }: AnalysisRowProps) {
  const borderColor = getClassificationColor(analysis.classification as AdClassification)

  // Calculate fatigue score based on frequency and days running
  const fatigueScore = Math.min(100, Math.round((analysis.frequency / 4) * 50 + (analysis.days_running / 30) * 50))

  // Get action icon based on action type
  const getActionIcon = () => {
    switch (analysis.action) {
      case 'ESCALAR':
        return <TrendingUp className="w-4 h-4" aria-hidden="true" />
      case 'ESPERAR':
        return <Clock className="w-4 h-4" aria-hidden="true" />
      case 'PAUSAR':
        return <Pause className="w-4 h-4" aria-hidden="true" />
      case 'RENOVAR':
        return <AlertTriangle className="w-4 h-4" aria-hidden="true" />
      default:
        return <Zap className="w-4 h-4" aria-hidden="true" />
    }
  }

  // Get action button color
  const getActionColor = () => {
    switch (analysis.action) {
      case 'ESCALAR':
        return 'bg-green-500 hover:bg-green-600'
      case 'ESPERAR':
        return 'bg-blue-500 hover:bg-blue-600'
      case 'PAUSAR':
        return 'bg-red-500 hover:bg-red-600'
      case 'RENOVAR':
        return 'bg-amber-500 hover:bg-amber-600'
      default:
        return 'bg-slate-500 hover:bg-slate-600'
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border-l-4 shadow-sm" style={{ borderLeftColor: borderColor }}>
      {/* Header Row (always visible) */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors min-h-[44px]"
        aria-expanded={isExpanded}
        aria-label={`${analysis.ad_name} - ${analysis.classification}. ${isExpanded ? 'Contraer' : 'Expandir'} detalles`}
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
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{analysis.ad_name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{analysis.ad_set_name}</p>
        </div>

        {/* Key Metrics */}
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {showAmounts ? formatMoney(analysis.cpr) : '•••'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">CPR</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{formatPercent(analysis.ctr)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">CTR</p>
        </div>
        <div className="text-right hidden md:block">
          <p className={cn(
            'text-sm font-medium',
            analysis.frequency > 3.5 ? 'text-red-500' : analysis.frequency > 2.5 ? 'text-amber-500' : 'text-slate-900 dark:text-white'
          )}>
            {analysis.frequency.toFixed(1)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Freq</p>
        </div>

        {/* Fatigue */}
        <div className="w-10 hidden md:block">
          <div className="h-1.5 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full',
                fatigueScore > 60 ? 'bg-red-500' : fatigueScore > 30 ? 'bg-amber-500' : 'bg-green-500'
              )}
              style={{ width: `${fatigueScore}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 text-center">{fatigueScore}%</p>
        </div>

        {/* Expand Icon */}
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden="true" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-700 pt-3 space-y-3">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-2">
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Gasto Total</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {showAmounts ? formatMoney(analysis.spend) : '•••••'}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-2">
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Resultados</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatNumber(analysis.results)}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-2">
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Días activo</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{analysis.days_running}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-2">
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Fatiga</p>
              <div className="flex items-center gap-1">
                <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      fatigueScore > 60 ? 'bg-red-500' : fatigueScore > 30 ? 'bg-amber-500' : 'bg-green-500'
                    )}
                    style={{ width: `${fatigueScore}%` }}
                  />
                </div>
                <span className="text-xs font-medium">{fatigueScore}%</span>
              </div>
            </div>
          </div>

          {/* AI Recommendation */}
          {analysis.recommendation && (
            <div className="rounded-lg p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-gray-800 dark:to-gray-700 border border-slate-200 dark:border-gray-600">
              <div className="flex items-start gap-3">
                <div className={cn('p-2 rounded-lg text-white', getActionColor())}>
                  {getActionIcon()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('px-2 py-0.5 rounded text-xs font-bold text-white', getActionColor())}>
                      {analysis.action}
                    </span>
                    {analysis.priority && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Prioridad: {analysis.priority === 1 ? '🔥 Alta' : analysis.priority === 2 ? '⚡ Media' : '📋 Normal'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                    {analysis.recommendation}
                  </p>
                  {analysis.action_detail && (
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      <Lightbulb className="w-3 h-3 inline mr-1" aria-hidden="true" />
                      {analysis.action_detail}
                    </p>
                  )}
                  {analysis.reason && (
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-2 italic">
                      📊 {analysis.reason}
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

// ==================== ANALYSIS PAGE ====================

export default function Analysis() {
  useTheme() // For consistency
  const { selectedClientId } = useSelectedClient()
  const [ads, setAds] = useState<AdAnalysis[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterClassification, setFilterClassification] = useState<AdClassification | 'ALL'>('ALL')
  const [showAmounts, setShowAmounts] = useState(true)

  const fetchAds = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.getAdsAnalysis(selectedClientId || undefined)
      setAds(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando análisis')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAds()
  }, [selectedClientId])

  const filteredAds = filterClassification === 'ALL'
    ? ads
    : ads.filter(a => a.classification === filterClassification)

  const classificationCounts = {
    GANADOR: ads.filter(a => a.classification === 'GANADOR').length,
    ESCALABLE: ads.filter(a => a.classification === 'ESCALABLE').length,
    TESTING: ads.filter(a => a.classification === 'TESTING').length,
    FATIGADO: ads.filter(a => a.classification === 'FATIGADO').length,
    PAUSAR: ads.filter(a => a.classification === 'PAUSAR').length,
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Cargando analisis">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" aria-hidden="true" />
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
          aria-label="Reintentar carga de datos"
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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Análisis de Anuncios</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Clasificación automática y recomendaciones basadas en datos</p>
        </div>

        <button
          onClick={() => setShowAmounts(!showAmounts)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 min-w-[40px] min-h-[40px] flex items-center justify-center"
          aria-label={showAmounts ? 'Ocultar montos' : 'Mostrar montos'}
        >
          {showAmounts ? <Eye size={18} aria-hidden="true" /> : <EyeOff size={18} aria-hidden="true" />}
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
          <span className="text-sm text-slate-500 dark:text-slate-400">Mostrando:</span>
          <span
            className="px-2 py-1 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: getClassificationColor(filterClassification) }}
          >
            {filterClassification}
          </span>
          <button
            onClick={() => setFilterClassification('ALL')}
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300"
          >
            Ver todos
          </button>
        </div>
      )}

      {/* Analysis Cards (expandible 1 line) */}
      <div className="space-y-2">
        {filteredAds.map((analysis) => (
          <AnalysisRow
            key={analysis.ad_name}
            analysis={analysis}
            isExpanded={expandedId === analysis.ad_name}
            onToggle={() => setExpandedId(expandedId === analysis.ad_name ? null : analysis.ad_name)}
            showAmounts={showAmounts}
          />
        ))}
      </div>

      {filteredAds.length === 0 && (
        <div className="text-center py-12">
          <BarChart2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" aria-hidden="true" />
          <p className="text-slate-500 dark:text-slate-400">
            {ads.length === 0 ? 'No hay anuncios. Sube un CSV para comenzar.' : 'No hay anuncios con este filtro'}
          </p>
        </div>
      )}
    </div>
  )
}
