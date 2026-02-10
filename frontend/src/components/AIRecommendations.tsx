/**
 * AI Recommendations Component
 * Get AI-powered optimization recommendations
 */

import { useState, useEffect } from 'react'
import {
  Lightbulb,
  Loader2,
  TrendingUp,
  DollarSign,
  Users,
  Palette,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Zap
} from 'lucide-react'
import { useTheme } from '../lib/theme'
import { cn } from '../lib/utils'
import { getMetricsByClient, getAdsAnalysis } from '../lib/mockData'

interface Recommendation {
  id: string
  category: 'budget' | 'creative' | 'audience' | 'general'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  impact: string
  action: string
}

interface AIRecommendationsProps {
  clientId: string | null
  clientName?: string
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const categoryIcons = {
  budget: DollarSign,
  creative: Palette,
  audience: Users,
  general: Lightbulb
}

const categoryLabels = {
  budget: 'Presupuesto',
  creative: 'Creativos',
  audience: 'Audiencia',
  general: 'General'
}

const priorityColors = {
  high: 'border-red-500 bg-red-50 dark:bg-red-900/20',
  medium: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
  low: 'border-green-500 bg-green-50 dark:bg-green-900/20'
}

export default function AIRecommendations({ clientId, clientName }: AIRecommendationsProps) {
  const { palette } = useTheme()
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [focusArea, setFocusArea] = useState<'all' | 'budget' | 'creative' | 'audience'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchRecommendations = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Build data context from current metrics
      const metrics = getMetricsByClient(clientId || undefined)
      const adsAnalysis = getAdsAnalysis(clientId || undefined)

      const totalSpend = metrics.reduce((sum, m) => sum + m.spend, 0)
      const totalResults = metrics.reduce((sum, m) => sum + m.results, 0)
      const avgCpr = totalResults > 0 ? totalSpend / totalResults : 0

      const data = {
        summary: {
          totalSpend,
          totalResults,
          avgCpr,
          adsCount: adsAnalysis.length
        },
        ads: adsAnalysis.slice(0, 10).map(ad => ({
          name: ad.adName,
          classification: ad.classification,
          cpr: ad.avgCostPerResult,
          ctr: ad.avgCtr,
          spend: ad.totalSpend,
          results: ad.totalResults
        })),
        classifications: {
          ganador: adsAnalysis.filter(a => a.classification === 'GANADOR').length,
          escalable: adsAnalysis.filter(a => a.classification === 'ESCALABLE').length,
          testing: adsAnalysis.filter(a => a.classification === 'TESTING').length,
          fatigado: adsAnalysis.filter(a => a.classification === 'FATIGADO').length,
          pausar: adsAnalysis.filter(a => a.classification === 'PAUSAR').length
        }
      }

      const token = localStorage.getItem('metrics_token') || ''
      const response = await fetch(`${API_BASE}/ai/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          client_id: clientId || 'all',
          data,
          focus_area: focusArea
        })
      })

      if (!response.ok) {
        throw new Error('Error al obtener recomendaciones')
      }

      const result = await response.json()
      setRecommendations(result.recommendations || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      // Fallback to mock recommendations
      setRecommendations(getMockRecommendations(focusArea))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRecommendations()
  }, [clientId, focusArea])

  const filteredRecommendations = focusArea === 'all'
    ? recommendations
    : recommendations.filter(r => r.category === focusArea)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${palette.primary}20` }}
            >
              <Lightbulb className="w-5 h-5" style={{ color: palette.primary }} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Recomendaciones AI
              </h2>
              <p className="text-sm text-slate-500">
                {clientName ? `Para ${clientName}` : 'Todas las cuentas'}
              </p>
            </div>
          </div>

          <button
            onClick={fetchRecommendations}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"
            aria-label="Actualizar recomendaciones"
          >
            <RefreshCw className={cn('w-5 h-5', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Focus Area Tabs */}
      <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700 flex gap-2 overflow-x-auto scrollbar-hide">
        {(['all', 'budget', 'creative', 'audience'] as const).map((area) => (
          <button
            key={area}
            onClick={() => setFocusArea(area)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              focusArea === area
                ? 'text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            )}
            style={focusArea === area ? { backgroundColor: palette.primary } : undefined}
          >
            {area === 'all' ? 'Todas' : categoryLabels[area]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-3" />
            <p className="text-sm text-slate-500">Analizando datos...</p>
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Error al cargar recomendaciones</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        ) : filteredRecommendations.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="font-medium text-slate-900 dark:text-white">Todo está optimizado</p>
            <p className="text-sm text-slate-500 mt-1">No hay recomendaciones pendientes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecommendations.map((rec) => {
              const Icon = categoryIcons[rec.category]
              const isExpanded = expandedId === rec.id

              return (
                <div
                  key={rec.id}
                  className={cn(
                    'border-l-4 rounded-lg p-4 cursor-pointer transition-all',
                    priorityColors[rec.priority],
                    isExpanded && 'ring-2 ring-gray-200 dark:ring-gray-600'
                  )}
                  onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-700 flex-shrink-0">
                      <Icon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-slate-900 dark:text-white">
                          {rec.title}
                        </h4>
                        <span className={cn(
                          'px-2 py-0.5 text-xs font-medium rounded-full',
                          rec.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' :
                          rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400' :
                          'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                        )}>
                          {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Media' : 'Baja'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {rec.description}
                      </p>

                      {isExpanded && (
                        <div className="mt-4 space-y-3 animate-fadeIn">
                          <div className="flex items-center gap-2 text-sm">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            <span className="text-slate-600 dark:text-slate-400">Impacto estimado:</span>
                            <span className="font-medium text-green-600">{rec.impact}</span>
                          </div>

                          <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600">
                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Acción sugerida</p>
                            <p className="text-sm text-slate-900 dark:text-white">{rec.action}</p>
                          </div>

                          <button
                            disabled={true}
                            title="Proximamente"
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: palette.primary }}
                          >
                            <Zap className="w-4 h-4" />
                            Aplicar Recomendación
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <ChevronRight className={cn(
                      'w-5 h-5 text-slate-400 transition-transform flex-shrink-0',
                      isExpanded && 'rotate-90'
                    )} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Mock recommendations for fallback
function getMockRecommendations(focusArea: string): Recommendation[] {
  const all: Recommendation[] = [
    {
      id: '1',
      category: 'budget',
      priority: 'high',
      title: 'Reasignar presupuesto de anuncios fatigados',
      description: 'Detectamos 3 anuncios con fatiga creativa que están consumiendo 25% del presupuesto con CPR alto.',
      impact: '+15-20% resultados',
      action: 'Pausar los anuncios fatigados y redistribuir el presupuesto hacia los anuncios clasificados como GANADOR y ESCALABLE.'
    },
    {
      id: '2',
      category: 'creative',
      priority: 'medium',
      title: 'Renovar creativos de mayor antigüedad',
      description: 'Los creativos con más de 30 días muestran una caída del 18% en CTR respecto a la primera semana.',
      impact: '+10% CTR',
      action: 'Crear variantes de los creativos ganadores con cambios en copy, colores o formato para revitalizar el engagement.'
    },
    {
      id: '3',
      category: 'audience',
      priority: 'medium',
      title: 'Expandir audiencia lookalike',
      description: 'La audiencia actual muestra señales de saturación. El CPR ha aumentado 12% en las últimas 2 semanas.',
      impact: '-10% CPR',
      action: 'Crear nuevas audiencias lookalike basadas en compradores de alto valor y expandir el porcentaje de similitud.'
    },
    {
      id: '4',
      category: 'general',
      priority: 'low',
      title: 'Optimizar horarios de delivery',
      description: 'Los mejores resultados se concentran entre 18:00-22:00. Actualmente el presupuesto se distribuye uniformemente.',
      impact: '+5% eficiencia',
      action: 'Configurar dayparting para concentrar mayor inversión en las horas de mejor performance.'
    }
  ]

  if (focusArea === 'all') return all
  return all.filter(r => r.category === focusArea)
}
