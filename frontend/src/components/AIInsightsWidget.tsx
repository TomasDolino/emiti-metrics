/**
 * AI Insights Widget for Dashboard
 * Shows daily AI-generated insights
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Brain
} from 'lucide-react'
import { useTheme } from '../lib/theme'
import { cn } from '../lib/utils'

interface Insight {
  id: string
  type: 'positive' | 'negative' | 'neutral' | 'action'
  title: string
  description: string
  metric?: string
  change?: number
}

interface AIInsightsWidgetProps {
  clientId?: string | null
  clientName?: string
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export default function AIInsightsWidget({ clientId, clientName: _clientName }: AIInsightsWidgetProps) {
  // _clientName reserved for future use (e.g., displaying in insights)
  const { palette } = useTheme()
  const [insights, setInsights] = useState<Insight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchInsights = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/ai/daily-insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          date: new Date().toISOString().split('T')[0]
        })
      })

      if (response.ok) {
        const data = await response.json()
        setInsights(data.insights || getMockInsights())
      } else {
        setInsights(getMockInsights())
      }
    } catch {
      setInsights(getMockInsights())
    } finally {
      setIsLoading(false)
      setLastUpdated(new Date())
    }
  }

  useEffect(() => {
    fetchInsights()
  }, [clientId])

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-red-500" />
      case 'action':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />
      default:
        return <CheckCircle className="w-4 h-4 text-blue-500" />
    }
  }

  const getInsightBg = (type: Insight['type']) => {
    switch (type) {
      case 'positive':
        return 'bg-green-50 dark:bg-green-900/20 border-l-green-500'
      case 'negative':
        return 'bg-red-50 dark:bg-red-900/20 border-l-red-500'
      case 'action':
        return 'bg-amber-50 dark:bg-amber-900/20 border-l-amber-500'
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-l-blue-500'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})` }}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white text-sm">
              AI Insights
            </h3>
            {lastUpdated && (
              <p className="text-xs text-gray-400">
                {lastUpdated.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchInsights}
            disabled={isLoading}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
          <Link
            to="/ai-lab"
            className="text-xs font-medium hover:underline"
            style={{ color: palette.primary }}
          >
            AI Lab →
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-6">
            <Brain className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Sin insights disponibles</p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.slice(0, 3).map((insight) => (
              <div
                key={insight.id}
                className={cn(
                  'border-l-4 rounded-lg p-3 transition-all hover:shadow-sm cursor-pointer',
                  getInsightBg(insight.type)
                )}
              >
                <div className="flex items-start gap-2">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {insight.title}
                      </p>
                      {insight.change !== undefined && (
                        <span className={cn(
                          'text-xs font-semibold px-1.5 py-0.5 rounded',
                          insight.change >= 0
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
                        )}>
                          {insight.change >= 0 ? '+' : ''}{insight.change}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      {insight.description}
                    </p>
                    {insight.metric && (
                      <p className="text-xs font-medium mt-1" style={{ color: palette.primary }}>
                        {insight.metric}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {insights.length > 3 && (
              <Link
                to="/ai-lab"
                className="flex items-center justify-center gap-1 py-2 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                style={{ color: palette.primary }}
              >
                Ver {insights.length - 3} insights más
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Mock insights for fallback
function getMockInsights(): Insight[] {
  return [
    {
      id: '1',
      type: 'positive',
      title: 'CTR subiendo',
      description: 'El CTR promedio mejoró significativamente esta semana gracias a los nuevos creativos.',
      metric: '2.8% CTR (+0.5pp)',
      change: 22
    },
    {
      id: '2',
      type: 'action',
      title: 'Fatiga detectada',
      description: '3 anuncios muestran señales de fatiga creativa. Considera renovarlos.',
      metric: 'Anuncios: Promo Verano, Video 1, Carrusel'
    },
    {
      id: '3',
      type: 'positive',
      title: 'CPR optimizado',
      description: 'El costo por resultado bajó un 8% respecto a la semana anterior.',
      metric: '$12.45 CPR',
      change: -8
    },
    {
      id: '4',
      type: 'neutral',
      title: 'Presupuesto en track',
      description: 'El pacing de presupuesto está dentro del rango esperado para este punto del mes.',
      metric: '65% del budget mensual usado'
    }
  ]
}
