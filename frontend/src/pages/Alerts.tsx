import { useState, useEffect } from 'react'
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Battery,
  Zap,
  CheckCircle,
  Clock,
  X,
  Bell,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { useTheme } from '../lib/theme'
import { api, type Alert } from '../lib/api'
import { timeAgo, cn } from '../lib/utils'
import { useSelectedClient } from '../components/Layout'

type AlertType = string
type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

// ==================== ALERT ROW (1 línea) ====================

interface AlertRowProps {
  alert: Alert
  onAcknowledge: (id: string) => void
  palette: ReturnType<typeof useTheme>['palette']
}

function AlertRow({ alert, onAcknowledge, palette }: AlertRowProps) {
  const getIcon = (type: AlertType) => {
    switch (type) {
      case 'ROAS_DROP':
      case 'CTR_DROP':
        return TrendingDown
      case 'CPA_INCREASE':
        return TrendingUp
      case 'FATIGUE_DETECTED':
        return Battery
      case 'BUDGET_DEPLETED':
        return AlertTriangle
      case 'NEW_WINNER':
      case 'PERFORMANCE_SPIKE':
        return Zap
      default:
        return AlertTriangle
    }
  }

  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'CRITICAL': return palette.danger
      case 'WARNING': return palette.warning
      case 'INFO': return palette.primary
    }
  }

  const Icon = getIcon(alert.type)
  const borderColor = getSeverityColor(alert.severity)

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border-l-4 hover:shadow-sm transition-all',
        alert.acknowledged && 'opacity-60'
      )}
      style={{ borderLeftColor: borderColor }}
    >
      {/* Icon */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${borderColor}20` }}
      >
        <Icon className="w-4 h-4" style={{ color: borderColor }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{alert.title}</p>
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white flex-shrink-0"
            style={{ backgroundColor: borderColor }}
          >
            {alert.severity}
          </span>
          {alert.acknowledged && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-0.5">
              <CheckCircle className="w-3 h-3" />
              Leída
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{alert.message}</p>
      </div>

      {/* Ad name */}
      {alert.ad_name && (
        <div className="text-right hidden sm:block">
          <p className="text-xs text-slate-500 dark:text-slate-400">Anuncio</p>
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[120px]">{alert.ad_name}</p>
        </div>
      )}

      {/* Change */}
      {alert.change_percent !== undefined && (
        <div className="text-right hidden md:block">
          <p className={cn(
            'text-sm font-semibold',
            alert.change_percent > 0 ? 'text-red-600' : 'text-green-600'
          )}>
            {alert.change_percent > 0 ? '+' : ''}{alert.change_percent.toFixed(0)}%
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">cambio</p>
        </div>
      )}

      {/* Time */}
      <div className="text-xs text-slate-400 flex items-center gap-1 flex-shrink-0">
        <Clock className="w-3 h-3" />
        {timeAgo(alert.created_at)}
      </div>

      {/* Actions */}
      {!alert.acknowledged && (
        <button
          onClick={() => onAcknowledge(alert.id)}
          className="p-1.5 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-gray-700 rounded text-slate-400 hover:text-slate-600 dark:text-slate-400"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

// ==================== ALERTS PAGE ====================

export default function Alerts() {
  const { palette } = useTheme()
  const { selectedClientId } = useSelectedClient()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'ACKNOWLEDGED'>('ALL')

  const fetchAlerts = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.getAlerts({ clientId: selectedClientId || undefined })
      setAlerts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando alertas')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [selectedClientId])

  const handleAcknowledge = async (id: string) => {
    try {
      await api.acknowledgeAlert(id)
      setAlerts(prev => prev.map(a =>
        a.id === id ? { ...a, acknowledged: true } : a
      ))
    } catch (err) {
      console.error('Error acknowledging alert:', err)
    }
  }

  const handleAcknowledgeAll = async () => {
    try {
      await api.acknowledgeAllAlerts()
      setAlerts(prev => prev.map(a => ({ ...a, acknowledged: true })))
    } catch (err) {
      console.error('Error acknowledging all alerts:', err)
    }
  }

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'ACTIVE') return !a.acknowledged
    if (filter === 'ACKNOWLEDGED') return a.acknowledged
    return true
  })

  const activeCount = alerts.filter(a => !a.acknowledged).length
  const criticalCount = alerts.filter(a => !a.acknowledged && a.severity === 'CRITICAL').length

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
          onClick={fetchAlerts}
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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Alertas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {activeCount > 0
              ? `${activeCount} alerta${activeCount > 1 ? 's' : ''} activa${activeCount > 1 ? 's' : ''}`
              : 'Sin alertas activas'}
            {criticalCount > 0 && (
              <span className="text-red-600 ml-2">({criticalCount} crítica{criticalCount > 1 ? 's' : ''})</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 dark:bg-gray-800 rounded-lg p-1">
            {(['ALL', 'ACTIVE', 'ACKNOWLEDGED'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                  filter === f
                    ? 'bg-white dark:bg-gray-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'
                )}
              >
                {f === 'ALL' ? 'Todas' : f === 'ACTIVE' ? 'Activas' : 'Leídas'}
              </button>
            ))}
          </div>

          {activeCount > 0 && (
            <button
              onClick={handleAcknowledgeAll}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
              style={{ color: palette.primary, backgroundColor: `${palette.primary}10` }}
            >
              Marcar todas
            </button>
          )}
        </div>
      </div>

      {/* Summary by severity */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { severity: 'CRITICAL', color: palette.danger, label: 'Críticas' },
          { severity: 'WARNING', color: palette.warning, label: 'Advertencias' },
          { severity: 'INFO', color: palette.primary, label: 'Información' },
        ].map(({ severity, color, label }) => {
          const count = alerts.filter(a => !a.acknowledged && a.severity === severity).length
          return (
            <div
              key={severity}
              className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border-l-4"
              style={{ borderLeftColor: color }}
            >
              <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              <p className="text-xl font-semibold" style={{ color }}>{count}</p>
            </div>
          )
        })}
      </div>

      {/* Alerts List (1 line cards) */}
      <div className="space-y-2">
        {filteredAlerts.map((alert) => (
          <AlertRow
            key={alert.id}
            alert={alert}
            onAcknowledge={handleAcknowledge}
            palette={palette}
          />
        ))}
      </div>

      {filteredAlerts.length === 0 && (
        <div className="text-center py-12">
          <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">
            {filter === 'ACTIVE'
              ? 'No hay alertas activas'
              : filter === 'ACKNOWLEDGED'
                ? 'No hay alertas leídas'
                : 'No hay alertas'}
          </p>
        </div>
      )}
    </div>
  )
}
