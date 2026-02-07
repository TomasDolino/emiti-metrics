import { useState } from 'react'
import {
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight,
  Target,
  Zap
} from 'lucide-react'
import { useTheme } from '../lib/theme'
import {
  getAgencyOverview,
  getBudgetPacing,
  getAssetDependency,
  getBudgetOptimizer,
  getKnowledgeBase,
  getCreativeIntelligence,
  minePatterns,
  getAccountQualityScore,
  getAudienceSaturation,
  generatePlaybook,
  type AgencyClientHealth
} from '../lib/mockData'
import { formatMoney, formatNumber, cn } from '../lib/utils'

// ==================== CLIENT HEALTH ROW ====================

function ClientHealthRow({ health, onSelect }: { health: AgencyClientHealth; onSelect: () => void }) {
  const statusColors = {
    excellent: '#22c55e',
    good: '#3b82f6',
    warning: '#f59e0b',
    critical: '#ef4444'
  }

  const statusLabels = {
    excellent: 'Excelente',
    good: 'Bien',
    warning: 'Atención',
    critical: 'Crítico'
  }

  return (
    <div
      onClick={onSelect}
      className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border-l-4 hover:shadow-md transition-all cursor-pointer"
      style={{ borderLeftColor: statusColors[health.status] }}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0"
        style={{ backgroundColor: health.client.color }}
      >
        {health.client.name.slice(0, 2).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{health.client.name}</p>
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
            style={{ backgroundColor: statusColors[health.status] }}
          >
            {statusLabels[health.status]}
          </span>
        </div>
        {health.mainIssue && (
          <p className="text-xs text-gray-500 truncate">{health.mainIssue}</p>
        )}
      </div>

      {/* Health Score */}
      <div className="text-center hidden sm:block">
        <div className="w-10 h-10 rounded-full flex items-center justify-center border-2" style={{ borderColor: statusColors[health.status] }}>
          <span className="text-sm font-bold" style={{ color: statusColors[health.status] }}>{health.healthScore}</span>
        </div>
      </div>

      {/* Trend */}
      <div className="text-right hidden md:block">
        <div className={cn(
          'flex items-center gap-1 text-sm font-medium',
          health.resultsTrend > 0 ? 'text-green-600' : health.resultsTrend < 0 ? 'text-red-600' : 'text-gray-500'
        )}>
          {health.resultsTrend > 0 ? <TrendingUp size={14} /> : health.resultsTrend < 0 ? <TrendingDown size={14} /> : null}
          {health.resultsTrend > 0 ? '+' : ''}{health.resultsTrend.toFixed(0)}%
        </div>
        <p className="text-[10px] text-gray-400">resultados</p>
      </div>

      {/* Pending Actions */}
      {health.pendingActions > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
          <Clock size={12} />
          {health.pendingActions}
        </div>
      )}

      <ChevronRight size={16} className="text-gray-400" />
    </div>
  )
}

// ==================== CLIENT DETAIL MODAL ====================

function ClientDetailPanel({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const { palette } = useTheme()
  const pacing = getBudgetPacing(clientId)
  const dependency = getAssetDependency(clientId)
  const optimizer = getBudgetOptimizer(clientId)
  const knowledge = getKnowledgeBase(clientId)
  const creative = getCreativeIntelligence(clientId)
  const patterns = minePatterns(clientId)
  const quality = getAccountQualityScore(clientId)
  const saturation = getAudienceSaturation(clientId)
  const playbook = generatePlaybook(clientId)

  const pacingColors = {
    on_track: palette.success,
    underspending: '#f59e0b',
    overspending: '#ef4444'
  }

  const riskColors = {
    low: palette.success,
    medium: '#f59e0b',
    high: '#f97316',
    critical: '#ef4444'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{knowledge.clientName} - Panel Detallado</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Budget Pacing */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Target size={18} style={{ color: pacingColors[pacing.status] }} />
              Pacing de Budget
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div>
                <p className="text-xs text-gray-500">Budget Mensual</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatMoney(pacing.monthlyBudget)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Gastado</p>
                <p className="text-lg font-semibold" style={{ color: pacingColors[pacing.status] }}>{formatMoney(pacing.spentToDate)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">% del Budget</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{pacing.percentSpent.toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">% del Mes</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{pacing.percentOfMonth.toFixed(0)}%</p>
              </div>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(pacing.percentSpent, 100)}%`,
                  backgroundColor: pacingColors[pacing.status]
                }}
              />
            </div>
            <p className="text-sm" style={{ color: pacingColors[pacing.status] }}>{pacing.message}</p>
            {pacing.status !== 'on_track' && (
              <p className="text-xs text-gray-500 mt-1">
                Recomendado: {formatMoney(pacing.dailyBudgetRecommended)}/día para cumplir objetivo
              </p>
            )}
          </div>

          {/* Asset Dependency */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <AlertTriangle size={18} style={{ color: riskColors[dependency.concentrationRisk] }} />
              Dependencia de Activos
            </h3>
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-1">
                <p className="text-sm" style={{ color: riskColors[dependency.concentrationRisk] }}>{dependency.message}</p>
                <p className="text-xs text-gray-500 mt-1">{dependency.recommendation}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: riskColors[dependency.concentrationRisk] }}>
                  {dependency.topAd.percentage.toFixed(0)}%
                </p>
                <p className="text-[10px] text-gray-500">Top anuncio</p>
              </div>
            </div>
            <div className="space-y-1">
              {dependency.top3Ads.map((ad, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${ad.percentage}%`, backgroundColor: palette.primary }}
                    />
                  </div>
                  <span className="text-gray-600 dark:text-gray-400 truncate flex-1">{ad.name}</span>
                  <span className="text-gray-900 dark:text-white font-medium">{ad.percentage.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Budget Optimizer */}
          {optimizer.recommendations.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Zap size={18} style={{ color: palette.primary }} />
                Optimización de Budget
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{optimizer.summary}</p>
              <div className="space-y-2">
                {optimizer.recommendations.map((rec, i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-red-500">{rec.fromCampaign.name}</span>
                      <span className="text-gray-400">→</span>
                      <span className="text-green-500">{rec.toCampaign.name}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">Mover {formatMoney(rec.amount)}</span>
                      <span className="text-xs font-medium text-green-600">+{rec.estimatedImpact.additionalResults} resultados</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Knowledge Base */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">Aprendizajes</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-2">Lo que funciona</p>
                {knowledge.learnings.filter(l => l.type === 'works').map(l => (
                  <div key={l.id} className="flex items-start gap-2 text-sm text-green-600 mb-1">
                    <CheckCircle size={14} className="mt-0.5 flex-shrink-0" />
                    <span>{l.text}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">Insights</p>
                {knowledge.learnings.filter(l => l.type === 'insight').map(l => (
                  <div key={l.id} className="flex items-start gap-2 text-sm text-blue-600 mb-1">
                    <Zap size={14} className="mt-0.5 flex-shrink-0" />
                    <span>{l.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div>
                <p className="text-xs text-gray-500">Mejor anuncio</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{knowledge.bestAd?.name || '-'}</p>
                {knowledge.bestAd && <p className="text-xs text-green-600">CPR ${knowledge.bestAd.cpr.toFixed(0)}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-500">Mejores días</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{knowledge.bestDays.join(', ') || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Vida útil promedio</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{knowledge.avgLifespanDays.toFixed(0)} días</p>
              </div>
            </div>
          </div>

          {/* Creative Intelligence */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">Inteligencia Creativa</h3>
            <div className="space-y-2 mb-4">
              {creative.patterns.map((p, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{p.pattern}</p>
                  <p className="text-xs text-gray-500">{p.impact}</p>
                </div>
              ))}
            </div>
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
              <p className="text-xs text-gray-500 mb-1">Próximo creativo sugerido:</p>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">{creative.suggestedNextCreative}</p>
            </div>
          </div>

          {/* Quality & Saturation Row */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Account Quality */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">Calidad de Cuenta</h3>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle cx="32" cy="32" r="28" stroke="#e5e7eb" strokeWidth="6" fill="none" />
                    <circle
                      cx="32" cy="32" r="28"
                      stroke={quality.score >= 70 ? '#22c55e' : quality.score >= 40 ? '#eab308' : '#ef4444'}
                      strokeWidth="6" fill="none"
                      strokeDasharray={`${(quality.score / 100) * 176} 176`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{quality.score}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    quality.status === 'ready' ? 'text-green-600' :
                    quality.status === 'limited' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {quality.status === 'ready' ? 'Listo para análisis' :
                     quality.status === 'limited' ? 'Datos limitados' : 'Datos insuficientes'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {quality.summary.days} días · {quality.summary.impressions.toLocaleString()} impr · {quality.summary.ads} ads
                  </p>
                </div>
              </div>
            </div>

            {/* Audience Saturation */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">Saturación de Audiencia</h3>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle cx="32" cy="32" r="28" stroke="#e5e7eb" strokeWidth="6" fill="none" />
                    <circle
                      cx="32" cy="32" r="28"
                      stroke={saturation.saturationScore <= 39 ? '#22c55e' : saturation.saturationScore <= 69 ? '#eab308' : '#ef4444'}
                      strokeWidth="6" fill="none"
                      strokeDasharray={`${(saturation.saturationScore / 100) * 176} 176`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{saturation.saturationScore}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    saturation.status === 'healthy' ? 'text-green-600' :
                    saturation.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {saturation.status === 'healthy' ? 'Audiencia saludable' :
                     saturation.status === 'warning' ? 'Atención requerida' : 'Saturación crítica'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    ~{saturation.estimatedDaysLeft} días restantes · Freq: {saturation.trends.frequency.secondPeriod.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Pattern Mining */}
          {patterns.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">Patrones Detectados</h3>
              <div className="grid md:grid-cols-2 gap-2">
                {patterns.slice(0, 4).map((p, i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium ${
                        p.category === 'format' ? 'bg-blue-100 text-blue-700' :
                        p.category === 'creative' ? 'bg-purple-100 text-purple-700' :
                        p.category === 'timing' ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {p.category}
                      </span>
                      <span className={`text-[10px] ${
                        p.confidence === 'high' ? 'text-green-600' :
                        p.confidence === 'medium' ? 'text-yellow-600' : 'text-gray-500'
                      }`}>
                        {p.confidence}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{p.pattern}</p>
                    <p className="text-xs text-green-600">{p.impact}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Playbook */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-4 text-white">
            <h3 className="font-medium mb-3">Playbook Rápido</h3>
            <div className="grid md:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-white/70 text-xs mb-1">Hacer</p>
                <ul className="space-y-1">
                  {playbook.do.slice(0, 2).map((item, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <CheckCircle size={12} /> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-white/70 text-xs mb-1">No hacer</p>
                <ul className="space-y-1">
                  {playbook.dont.slice(0, 2).map((item, i) => (
                    <li key={i} className="flex items-center gap-1 text-red-200">
                      ✕ {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-white/70 text-xs mb-1">Monitorear</p>
                <ul className="space-y-1">
                  {playbook.monitor.slice(0, 2).map((item, i) => (
                    <li key={i} className="flex items-center gap-1 text-yellow-200">
                      👁 {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==================== AGENCY PAGE ====================

export default function Agency() {
  const { palette } = useTheme()
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const overview = getAgencyOverview()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Panel de Agencia</h1>
          <p className="text-sm text-gray-500">Vista general de todos los clientes</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-l-4" style={{ borderLeftColor: palette.primary }}>
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-gray-400" />
            <span className="text-xs text-gray-500">Clientes Activos</span>
          </div>
          <p className="text-2xl font-semibold" style={{ color: palette.primary }}>{overview.activeClients}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-l-4" style={{ borderLeftColor: palette.secondary }}>
          <div className="flex items-center gap-2 mb-1">
            <Target size={16} className="text-gray-400" />
            <span className="text-xs text-gray-500">Budget Mensual</span>
          </div>
          <p className="text-2xl font-semibold" style={{ color: palette.secondary }}>{formatMoney(overview.totalMonthlyBudget)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-l-4" style={{ borderLeftColor: palette.success }}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-gray-400" />
            <span className="text-xs text-gray-500">Resultados del Mes</span>
          </div>
          <p className="text-2xl font-semibold" style={{ color: palette.success }}>{formatNumber(overview.totalResultsThisMonth)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-l-4" style={{ borderLeftColor: palette.warning }}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-gray-400" />
            <span className="text-xs text-gray-500">Acciones Urgentes</span>
          </div>
          <p className="text-2xl font-semibold" style={{ color: palette.warning }}>{overview.urgentActions.length}</p>
        </div>
      </div>

      {/* Urgent Actions */}
      {overview.urgentActions.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: `${palette.warning}15`, borderLeft: `4px solid ${palette.warning}` }}
        >
          <h3 className="font-medium mb-2" style={{ color: palette.warning }}>Acciones Urgentes</h3>
          <div className="space-y-2">
            {overview.urgentActions.map((action, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-medium text-white',
                  action.priority === 'high' ? 'bg-red-500' : 'bg-amber-500'
                )}>
                  {action.priority === 'high' ? 'URGENTE' : 'MEDIO'}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">{action.clientName}:</span>
                <span className="text-gray-600 dark:text-gray-400">{action.action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clients Health */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-white">Salud de Clientes</h3>
          <p className="text-xs text-gray-500">Click en un cliente para ver detalles</p>
        </div>
        <div className="p-2 space-y-2">
          {overview.clientsHealth.map(health => (
            <ClientHealthRow
              key={health.client.id}
              health={health}
              onSelect={() => setSelectedClient(health.client.id)}
            />
          ))}
        </div>
      </div>

      {/* Weekly Goals */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <h3 className="font-medium text-gray-900 dark:text-white mb-3">Objetivos de la Semana</h3>
        <div className="space-y-3">
          {overview.weeklyGoals.map((goal, i) => (
            <div key={i}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">{goal.goal}</span>
                <span className={cn(
                  'font-medium',
                  goal.status === 'ahead' ? 'text-green-600' :
                  goal.status === 'behind' ? 'text-red-600' : 'text-blue-600'
                )}>
                  {goal.progress}%
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full',
                    goal.status === 'ahead' ? 'bg-green-500' :
                    goal.status === 'behind' ? 'bg-red-500' : 'bg-blue-500'
                  )}
                  style={{ width: `${Math.min(goal.progress, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Client Detail Modal */}
      {selectedClient && (
        <ClientDetailPanel
          clientId={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </div>
  )
}
