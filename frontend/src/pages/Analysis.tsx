import { useState, useEffect } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Eye,
  EyeOff,
  BarChart2,
  Loader2,
  RefreshCw
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
  palette: ReturnType<typeof useTheme>['palette']
}

function AnalysisRow({ analysis, isExpanded, onToggle, showAmounts, palette }: AnalysisRowProps) {
  const borderColor = getClassificationColor(analysis.classification as AdClassification)

  // Calculate fatigue score based on frequency and days running
  const fatigueScore = Math.min(100, Math.round((analysis.frequency / 4) * 50 + (analysis.days_running / 30) * 50))

  // Generate recommendations based on classification
  const getRecommendations = () => {
    switch (analysis.classification) {
      case 'GANADOR':
        return ['Aumentar presupuesto gradualmente', 'Crear variantes similares', 'Expandir a nuevas audiencias']
      case 'ESCALABLE':
        return ['Probar incremento de presupuesto 20-30%', 'Monitorear frecuencia al escalar']
      case 'TESTING':
        return ['Esperar más datos para evaluar', 'Comparar con otros anuncios del conjunto']
      case 'FATIGADO':
        return ['Renovar creatividad', 'Pausar y rotar con otros anuncios', 'Considerar nuevas audiencias']
      case 'PAUSAR':
        return ['Pausar inmediatamente', 'Reasignar presupuesto a ganadores', 'Analizar qué falló']
      default:
        return ['Continuar monitoreando']
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border-l-4 shadow-sm" style={{ borderLeftColor: borderColor }}>
      {/* Header Row (always visible) */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors"
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
          <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-700 pt-3 space-y-3">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-slate-50 dark:bg-gray-700 rounded-lg p-2">
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Gasto Total</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {showAmounts ? formatMoney(analysis.spend) : '•••••'}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-gray-700 rounded-lg p-2">
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Resultados</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatNumber(analysis.results)}</p>
            </div>
            <div className="bg-slate-50 dark:bg-gray-700 rounded-lg p-2">
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Días activo</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{analysis.days_running}</p>
            </div>
            <div className="bg-slate-50 dark:bg-gray-700 rounded-lg p-2">
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Fatiga</p>
              <div className="flex items-center gap-1">
                <div className="flex-1 h-1.5 bg-slate-200 dark:bg-gray-600 rounded-full overflow-hidden">
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
              {getRecommendations().map((rec, i) => (
                <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1">
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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Análisis de Anuncios</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Clasificación automática y recomendaciones basadas en datos</p>
        </div>

        <button
          onClick={() => setShowAmounts(!showAmounts)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-500 dark:text-slate-400"
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
            palette={palette}
          />
        ))}
      </div>

      {filteredAds.length === 0 && (
        <div className="text-center py-12">
          <BarChart2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">
            {ads.length === 0 ? 'No hay anuncios. Sube un CSV para comenzar.' : 'No hay anuncios con este filtro'}
          </p>
        </div>
      )}
    </div>
  )
}
