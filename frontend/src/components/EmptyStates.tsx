/**
 * Creative empty state components
 * Use these when there's no data to display
 */

import {
  Inbox,
  Search,
  Upload,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Target,
  Zap,
  BarChart3,
  Clock,
  Coffee,
  Rocket
} from 'lucide-react'
import { useTheme } from '../lib/theme'
import { cn } from '../lib/utils'

interface EmptyStateProps {
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

// ==================== BASE EMPTY STATE ====================

function BaseEmptyState({
  icon,
  title,
  description,
  action,
  className,
  variant = 'default'
}: EmptyStateProps & {
  icon: React.ReactNode
  variant?: 'default' | 'compact' | 'card'
}) {
  const { palette } = useTheme()

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-3 p-4 text-center', className)}>
        <div className="text-gray-300 dark:text-gray-600">{icon}</div>
        <div className="text-left">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{description}</p>
        </div>
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div className={cn(
        'bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm text-center',
        className
      )}>
        <div
          className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-4"
          style={{ backgroundColor: `${palette.primary}15` }}
        >
          <div style={{ color: palette.primary }}>{icon}</div>
        </div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{description}</p>
        {action && (
          <button
            onClick={action.onClick}
            className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            style={{ backgroundColor: palette.primary, color: 'white' }}
          >
            {action.label}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 animate-pulse-soft"
        style={{ backgroundColor: `${palette.primary}15` }}
      >
        <div style={{ color: palette.primary }}>{icon}</div>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="text-sm font-medium px-6 py-2.5 rounded-lg transition-all btn-interactive"
          style={{ backgroundColor: palette.primary, color: 'white' }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

// ==================== SPECIFIC EMPTY STATES ====================

export function NoDataYet({ action, className }: Partial<EmptyStateProps>) {
  return (
    <BaseEmptyState
      icon={<Inbox className="w-8 h-8" />}
      title="Sin datos todavía"
      description="Subí tus primeros datos de Meta Ads para comenzar a ver métricas y análisis."
      action={action}
      className={className}
    />
  )
}

export function NoResultsFound({ query, className }: { query?: string; className?: string }) {
  return (
    <BaseEmptyState
      icon={<Search className="w-8 h-8" />}
      title="Sin resultados"
      description={query
        ? `No encontramos resultados para "${query}". Probá con otros términos.`
        : "No hay resultados que coincidan con tu búsqueda."
      }
      className={className}
    />
  )
}

export function UploadNeeded({ action, className }: Partial<EmptyStateProps>) {
  return (
    <BaseEmptyState
      icon={<Upload className="w-8 h-8" />}
      title="Subí tus datos"
      description="Exportá el CSV de Meta Ads Manager y subilo acá para comenzar el análisis."
      action={action || { label: 'Subir CSV', onClick: () => window.location.href = '/upload' }}
      className={className}
    />
  )
}

export function ErrorState({
  message,
  onRetry,
  className
}: {
  message?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <BaseEmptyState
      icon={<AlertCircle className="w-8 h-8" />}
      title="Algo salió mal"
      description={message || "Hubo un error al cargar los datos. Intentá de nuevo."}
      action={onRetry ? { label: 'Reintentar', onClick: onRetry } : undefined}
      className={className}
    />
  )
}

export function ComingSoon({ feature, className }: { feature: string; className?: string }) {
  return (
    <BaseEmptyState
      icon={<Sparkles className="w-8 h-8" />}
      title="Próximamente"
      description={`${feature} estará disponible muy pronto. Estamos trabajando en ello.`}
      className={className}
    />
  )
}

export function NoAlertsActive({ className }: { className?: string }) {
  return (
    <BaseEmptyState
      icon={<Zap className="w-8 h-8" />}
      title="Todo bajo control"
      description="No hay alertas activas. Tu cuenta está funcionando correctamente."
      className={className}
    />
  )
}

export function NoPatternsFound({ className }: { className?: string }) {
  return (
    <BaseEmptyState
      icon={<TrendingUp className="w-8 h-8" />}
      title="Sin patrones aún"
      description="Necesitamos más datos para detectar patrones. Seguí ejecutando campañas."
      className={className}
    />
  )
}

export function NoCampaignsActive({ action, className }: Partial<EmptyStateProps>) {
  return (
    <BaseEmptyState
      icon={<Target className="w-8 h-8" />}
      title="Sin campañas activas"
      description="No hay campañas corriendo actualmente. Subí datos nuevos para ver el estado."
      action={action}
      className={className}
    />
  )
}

export function NoReportsYet({ action, className }: Partial<EmptyStateProps>) {
  return (
    <BaseEmptyState
      icon={<BarChart3 className="w-8 h-8" />}
      title="Sin reportes"
      description="Todavía no generaste ningún reporte. Creá uno para compartir con tu cliente."
      action={action}
      className={className}
    />
  )
}

export function ProcessingData({ className }: { className?: string }) {
  return (
    <BaseEmptyState
      icon={<Clock className="w-8 h-8 animate-spin" />}
      title="Procesando datos"
      description="Estamos analizando tu información. Esto puede tardar unos segundos."
      className={className}
    />
  )
}

// ==================== FUN EMPTY STATES ====================

export function CoffeeBreak({ className }: { className?: string }) {
  return (
    <BaseEmptyState
      icon={<Coffee className="w-8 h-8" />}
      title="Hora del café"
      description="No hay nada urgente que revisar. Tomate un descanso merecido."
      className={className}
    />
  )
}

export function LaunchReady({ action, className }: Partial<EmptyStateProps>) {
  return (
    <BaseEmptyState
      icon={<Rocket className="w-8 h-8" />}
      title="¡Listo para despegar!"
      description="Tu configuración está completa. Es hora de comenzar a analizar tus campañas."
      action={action}
      className={className}
    />
  )
}

// ==================== COMPACT VARIANTS ====================

export function NoDataCompact({ className }: { className?: string }) {
  return (
    <BaseEmptyState
      icon={<Inbox className="w-5 h-5" />}
      title="Sin datos"
      description="Subí datos para ver información"
      variant="compact"
      className={className}
    />
  )
}

export function NoResultsCompact({ className }: { className?: string }) {
  return (
    <BaseEmptyState
      icon={<Search className="w-5 h-5" />}
      title="Sin resultados"
      description="Probá otros filtros"
      variant="compact"
      className={className}
    />
  )
}

// ==================== CARD VARIANTS ====================

export function NoDataCard({ action, className }: Partial<EmptyStateProps>) {
  return (
    <BaseEmptyState
      icon={<Inbox className="w-6 h-6" />}
      title="Sin datos"
      description="Subí un CSV para empezar"
      action={action}
      variant="card"
      className={className}
    />
  )
}

export function NoAlertsCard({ className }: { className?: string }) {
  return (
    <BaseEmptyState
      icon={<Zap className="w-6 h-6" />}
      title="Sin alertas"
      description="Todo funcionando correctamente"
      variant="card"
      className={className}
    />
  )
}

export default {
  NoDataYet,
  NoResultsFound,
  UploadNeeded,
  ErrorState,
  ComingSoon,
  NoAlertsActive,
  NoPatternsFound,
  NoCampaignsActive,
  NoReportsYet,
  ProcessingData,
  CoffeeBreak,
  LaunchReady,
  NoDataCompact,
  NoResultsCompact,
  NoDataCard,
  NoAlertsCard
}
