import { useSelectedClient } from '../components/Layout'
import { useTheme } from '../lib/theme'
import {
  getAccountQualityScore,
  getAudienceSaturation,
  getStructureDiagnostics,
  mockClients
} from '../lib/mockData'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  Layers,
  TrendingUp,
  TrendingDown,
  Clock
} from 'lucide-react'

export default function Diagnostics() {
  const { selectedClientId } = useSelectedClient()
  const { palette } = useTheme()
  const client = selectedClientId ? mockClients.find(c => c.id === selectedClientId) : null

  const quality = getAccountQualityScore(selectedClientId || undefined)
  const saturation = getAudienceSaturation(selectedClientId || undefined)
  const structure = getStructureDiagnostics(selectedClientId || undefined)

  const getQualityColor = (status: string) => {
    switch (status) {
      case 'ready': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800'
      case 'limited': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800'
      case 'insufficient': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800'
      default: return 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
    }
  }

  const getSaturationColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800'
      case 'warning': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800'
      case 'critical': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800'
      default: return 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-l-red-500 bg-red-50 dark:bg-red-900/20'
      case 'warning': return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
      case 'info': return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20'
      default: return 'border-l-slate-500 bg-slate-50 dark:bg-slate-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Diagnósticos Avanzados</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          {client ? `Diagnósticos para ${client.name}` : 'Diagnósticos de todos los clientes'}
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Quality Score */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5" style={{ color: palette.primary }} aria-hidden="true" />
              Account Quality Score
            </h3>
            <div className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-1.5 ${getQualityColor(quality.status)}`}>
              {quality.status === 'ready' ? (
                <><CheckCircle className="w-3.5 h-3.5" aria-hidden="true" /> Listo</>
              ) : quality.status === 'limited' ? (
                <><AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> Limitado</>
              ) : (
                <><XCircle className="w-3.5 h-3.5" aria-hidden="true" /> Insuficiente</>
              )}
            </div>
          </div>

          {/* Score Circle */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke={quality.score >= 70 ? '#22c55e' : quality.score >= 40 ? '#eab308' : '#ef4444'}
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(quality.score / 100) * 352} 352`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">{quality.score}</span>
              </div>
            </div>
          </div>

          <p className="text-center text-slate-600 dark:text-slate-400 mb-4">{quality.message}</p>

          {/* Summary */}
          <div className="grid grid-cols-4 gap-2 text-center mb-4">
            <div className="bg-slate-50 dark:bg-slate-800 rounded p-2">
              <div className="text-lg font-bold text-slate-900 dark:text-white">{quality.summary.days}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Días</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded p-2">
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {(quality.summary.impressions / 1000).toFixed(0)}k
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Impr.</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded p-2">
              <div className="text-lg font-bold text-slate-900 dark:text-white">{quality.summary.results}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Results</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded p-2">
              <div className="text-lg font-bold text-slate-900 dark:text-white">{quality.summary.ads}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Ads</div>
            </div>
          </div>

          {/* Issues */}
          {quality.issues.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Issues detectados:</div>
              {quality.issues.map((issue, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-100 dark:border-red-800">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500 dark:text-red-400" aria-hidden="true" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{issue.issue}</span>
                  </div>
                  <span className="text-sm text-red-600 dark:text-red-400 font-medium">{issue.impact}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audience Saturation */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5" style={{ color: palette.primary }} aria-hidden="true" />
              Saturacion de Audiencia
            </h3>
            <div className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-1.5 ${getSaturationColor(saturation.status)}`}>
              {saturation.status === 'healthy' ? (
                <><CheckCircle className="w-3.5 h-3.5" aria-hidden="true" /> Saludable</>
              ) : saturation.status === 'warning' ? (
                <><AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> Atencion</>
              ) : (
                <><XCircle className="w-3.5 h-3.5" aria-hidden="true" /> Critico</>
              )}
            </div>
          </div>

          {/* Score */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke={saturation.saturationScore <= 39 ? '#22c55e' : saturation.saturationScore <= 69 ? '#eab308' : '#ef4444'}
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(saturation.saturationScore / 100) * 352} 352`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">{saturation.saturationScore}</span>
              </div>
            </div>
          </div>

          <p className="text-center text-slate-600 dark:text-slate-400 mb-4">{saturation.recommendation}</p>

          {/* Trends */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Frecuencia</div>
              <div className="flex items-center gap-2">
                {saturation.trends.frequency.changePercent > 0 ? (
                  <TrendingUp className="w-4 h-4 text-red-500" aria-hidden="true" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-green-500" aria-hidden="true" />
                )}
                <span className="font-medium">
                  {saturation.trends.frequency.secondPeriod.toFixed(2)}
                </span>
                <span className={`text-sm ${saturation.trends.frequency.changePercent > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  ({saturation.trends.frequency.changePercent > 0 ? '+' : ''}
                  {saturation.trends.frequency.changePercent.toFixed(0)}%)
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Reach</div>
              <div className="flex items-center gap-2">
                {saturation.trends.reach.changePercent < 0 ? (
                  <TrendingDown className="w-4 h-4 text-red-500" aria-hidden="true" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-green-500" aria-hidden="true" />
                )}
                <span className="font-medium">
                  {(saturation.trends.reach.secondPeriod / 1000).toFixed(0)}k
                </span>
                <span className={`text-sm ${saturation.trends.reach.changePercent < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  ({saturation.trends.reach.changePercent > 0 ? '+' : ''}
                  {saturation.trends.reach.changePercent.toFixed(0)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Days Left */}
          <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <span className="text-blue-700 dark:text-blue-300 font-medium">
              ~{saturation.estimatedDaysLeft} dias hasta saturacion critica
            </span>
          </div>
        </div>
      </div>

      {/* Structure Diagnostics */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5" style={{ color: palette.primary }} aria-hidden="true" />
          Diagnostico de Estructura
        </h3>

        {structure.length === 0 ? (
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" aria-hidden="true" />
            <div>
              <div className="font-medium text-green-700 dark:text-green-300">Estructura correcta</div>
              <div className="text-sm text-green-600 dark:text-green-400">No se detectaron problemas de estructura.</div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {structure.map((diag, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-l-4 ${getSeverityColor(diag.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-4 h-4 ${
                        diag.severity === 'critical' ? 'text-red-500' :
                        diag.severity === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                      }`} aria-hidden="true" />
                      <span className="font-medium text-slate-900 dark:text-white">{diag.title}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{diag.message}</p>
                    {diag.campaign && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Campaña: {diag.campaign} {diag.adSet && `→ ${diag.adSet}`}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full uppercase font-medium ${
                    diag.severity === 'critical' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                    diag.severity === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  }`}>
                    {diag.severity}
                  </span>
                </div>
                <div className="mt-3 p-2 bg-white dark:bg-slate-900 rounded border">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Recomendación: </span>
                  <span className="text-sm text-slate-700 dark:text-slate-300">{diag.recommendation}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
