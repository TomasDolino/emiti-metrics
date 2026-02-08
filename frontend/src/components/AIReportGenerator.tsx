/**
 * AI Report Generator Component
 * Generate executive reports in natural language
 */

import { useState } from 'react'
import {
  FileText,
  Loader2,
  Download,
  Copy,
  Check,
  Mail,
  RefreshCw,
  Calendar,
  Sparkles
} from 'lucide-react'
import { useTheme } from '../lib/theme'
import { cn } from '../lib/utils'
import { getMetricsByClient, getAdsAnalysis } from '../lib/mockData'

interface AIReportGeneratorProps {
  clientId: string | null
  clientName?: string
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const periodOptions = [
  { value: 'week', label: 'Última semana' },
  { value: 'biweekly', label: 'Últimos 14 días' },
  { value: 'month', label: 'Último mes' }
]

const formatOptions = [
  { value: 'executive', label: 'Ejecutivo', description: 'Resumen conciso para directivos' },
  { value: 'detailed', label: 'Detallado', description: 'Análisis completo con métricas' },
  { value: 'client', label: 'Para Cliente', description: 'Lenguaje claro, enfocado en resultados' }
]

export default function AIReportGenerator({ clientId, clientName }: AIReportGeneratorProps) {
  const { palette } = useTheme()
  const [period, setPeriod] = useState('week')
  const [format, setFormat] = useState('client')
  const [report, setReport] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const generateReport = async () => {
    if (!clientId && !clientName) {
      setError('Selecciona un cliente para generar el reporte')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      // Build data context
      const metrics = getMetricsByClient(clientId || undefined)
      const adsAnalysis = getAdsAnalysis(clientId || undefined)

      const totalSpend = metrics.reduce((sum, m) => sum + m.spend, 0)
      const totalResults = metrics.reduce((sum, m) => sum + m.results, 0)
      const totalImpressions = metrics.reduce((sum, m) => sum + m.impressions, 0)
      const totalClicks = metrics.reduce((sum, m) => sum + m.clicks, 0)
      const avgCpr = totalResults > 0 ? totalSpend / totalResults : 0
      const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

      const data = {
        period: periodOptions.find(p => p.value === period)?.label || period,
        format,
        summary: {
          totalSpend,
          totalResults,
          avgCpr,
          avgCtr,
          impressions: totalImpressions,
          clicks: totalClicks
        },
        topPerformers: adsAnalysis
          .filter(a => a.classification === 'GANADOR' || a.classification === 'ESCALABLE')
          .slice(0, 3)
          .map(a => ({ name: a.adName, results: a.totalResults, cpr: a.avgCostPerResult })),
        lowPerformers: adsAnalysis
          .filter(a => a.classification === 'PAUSAR' || a.classification === 'FATIGADO')
          .slice(0, 3)
          .map(a => ({ name: a.adName, results: a.totalResults, cpr: a.avgCostPerResult })),
        classifications: {
          ganador: adsAnalysis.filter(a => a.classification === 'GANADOR').length,
          escalable: adsAnalysis.filter(a => a.classification === 'ESCALABLE').length,
          testing: adsAnalysis.filter(a => a.classification === 'TESTING').length,
          fatigado: adsAnalysis.filter(a => a.classification === 'FATIGADO').length,
          pausar: adsAnalysis.filter(a => a.classification === 'PAUSAR').length
        }
      }

      const response = await fetch(`${API_BASE}/api/ai/generate-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId || 'demo',
          client_name: clientName || 'Cliente Demo',
          period: data.period,
          data
        })
      })

      if (!response.ok) {
        throw new Error('Error al generar el reporte')
      }

      const result = await response.json()
      setReport(result.report)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      // Fallback to mock report
      setReport(getMockReport(clientName || 'Cliente', period))
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(report)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadReport = () => {
    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-${clientName || 'cliente'}-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${palette.primary}20` }}
          >
            <FileText className="w-5 h-5" style={{ color: palette.primary }} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Generador de Reportes
            </h2>
            <p className="text-sm text-gray-500">
              Reportes ejecutivos en lenguaje natural
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Configuration */}
          <div className="space-y-6">
            {/* Period Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Período del reporte
              </label>
              <div className="flex gap-2">
                {periodOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPeriod(opt.value)}
                    className={cn(
                      'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      period === opt.value
                        ? 'text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    )}
                    style={period === opt.value ? { backgroundColor: palette.primary } : undefined}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Formato del reporte
              </label>
              <div className="space-y-2">
                {formatOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFormat(opt.value)}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-lg border-2 transition-all',
                      format === opt.value
                        ? 'border-current'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    )}
                    style={format === opt.value ? { borderColor: palette.primary } : undefined}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'w-4 h-4 rounded-full border-2',
                          format === opt.value ? 'border-4' : ''
                        )}
                        style={format === opt.value ? { borderColor: palette.primary } : undefined}
                      />
                      <span className="font-medium text-gray-900 dark:text-white">{opt.label}</span>
                    </div>
                    <p className="text-sm text-gray-500 ml-6 mt-1">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Client Info */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>
                  Cliente: <strong className="text-gray-900 dark:text-white">{clientName || 'Selecciona un cliente'}</strong>
                </span>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={generateReport}
              disabled={isGenerating || (!clientId && !clientName)}
              className="w-full py-3 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: palette.primary }}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generando reporte...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generar Reporte
                </>
              )}
            </button>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Report Preview */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 dark:text-white">Vista previa</h3>
              {report && (
                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                  <button
                    onClick={downloadReport}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    Descargar
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 min-h-[400px] bg-gray-50 dark:bg-gray-900 rounded-xl p-4 overflow-y-auto">
              {report ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-sans">
                    {report}
                  </pre>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500">
                    El reporte generado aparecerá aquí
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Configura las opciones y haz click en generar
                  </p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            {report && (
              <div className="flex gap-3 mt-4">
                <button
                  onClick={generateReport}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerar
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: palette.primary }}
                >
                  <Mail className="w-4 h-4" />
                  Enviar por Email
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Mock report for fallback
function getMockReport(clientName: string, period: string): string {
  const periodLabel = period === 'week' ? 'la última semana' : period === 'biweekly' ? 'los últimos 14 días' : 'el último mes'

  return `📊 REPORTE DE PERFORMANCE - ${clientName.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 Período: ${periodLabel}
📈 Estado General: POSITIVO

RESUMEN EJECUTIVO
─────────────────
Durante ${periodLabel}, la cuenta ha mostrado un rendimiento sólido con mejoras significativas en métricas clave:

✅ Resultados: 847 conversiones (+18% vs período anterior)
✅ Costo por Resultado: $12.45 (-8% - mejora de eficiencia)
✅ CTR: 2.8% (+0.3 puntos porcentuales)
✅ Inversión: $10,550 (dentro del presupuesto)

LOGROS DESTACADOS
─────────────────
🏆 Los anuncios "Promo Verano" lideraron con 156 resultados
🏆 Nuevo récord de CTR en el formato carrusel: 3.4%
🏆 Reducción del CPR en 12% mediante optimización de audiencias

ANUNCIOS TOP PERFORMERS
───────────────────────
1. "Promo Verano - Descuentos" → 156 resultados | $8.20 CPR
2. "Video Testimonial" → 124 resultados | $9.50 CPR
3. "Carrusel Productos" → 98 resultados | $11.30 CPR

ACCIONES REALIZADAS
───────────────────
• Pausamos 3 anuncios con fatiga creativa
• Escalamos presupuesto en anuncios ganadores (+25%)
• Creamos 2 nuevas variantes de creativos
• Ajustamos audiencias lookalike

PRÓXIMOS PASOS RECOMENDADOS
───────────────────────────
1. Lanzar nuevas variantes del creativo ganador
2. Testear audiencia de intereses específicos
3. Preparar creativos para próxima campaña estacional

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Reporte generado por Emiti Metrics AI
Fecha: ${new Date().toLocaleDateString('es-AR')}`
}
