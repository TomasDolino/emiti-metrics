import { useState, useEffect } from 'react'
import { Plus, ChevronRight, ChevronDown, Building2, Globe, BarChart2, Target, Loader2, RefreshCw } from 'lucide-react'
import { useTheme } from '../lib/theme'
import { api, type Client } from '../lib/api'
import { formatDateFull, cn } from '../lib/utils'

// ==================== CLIENT ROW (1 línea) ====================

interface ClientRowProps {
  client: Client
  palette: ReturnType<typeof useTheme>['palette']
}

function ClientRow({ client, palette }: ClientRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const borderColor = client.is_active ? palette.success : '#9ca3af'
  const initials = client.name.split(' ').map(w => w[0]).join('').slice(0, 2)

  return (
    <div
      className="bg-white dark:bg-slate-800 rounded-lg border-l-4 overflow-hidden hover:shadow-sm transition-shadow"
      style={{ borderLeftColor: borderColor }}
    >
      {/* Main Row */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-semibold"
          style={{ backgroundColor: client.color || palette.accent }}
        >
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate" title={client.name}>{client.name}</p>
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white flex-shrink-0"
              style={{ backgroundColor: borderColor }}
            >
              {client.is_active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          {client.industry && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{client.industry}</p>
          )}
        </div>

        {/* Meta Account */}
        {client.meta_account_id && (
          <div className="text-right hidden md:block">
            <p className="text-xs text-slate-500 dark:text-slate-400">Meta ID</p>
            <p className="text-xs font-mono text-slate-700 dark:text-slate-300">{client.meta_account_id}</p>
          </div>
        )}

        {/* Metrics Count */}
        {client.metrics_count !== undefined && (
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-500 dark:text-slate-400">Métricas</p>
            <p className="text-xs text-slate-700 dark:text-slate-300">{client.metrics_count}</p>
          </div>
        )}

        {/* Created */}
        <div className="text-right hidden sm:block">
          <p className="text-xs text-slate-500 dark:text-slate-400">Desde</p>
          <p className="text-xs text-slate-700 dark:text-slate-300">{formatDateFull(client.created_at)}</p>
        </div>

        {/* Action */}
        <button
          className="px-2 py-1.5 text-xs font-medium rounded-lg transition-colors min-h-[40px] min-w-[40px]"
          style={{ color: palette.primary, backgroundColor: `${palette.primary}10` }}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Ver detalles de ${client.name}`}
        >
          Ver
        </button>

        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400 transition-transform" aria-hidden="true" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400 transition-transform hidden sm:block" aria-hidden="true" />
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg">
              <Building2 size={16} className="text-slate-400" aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Industria</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{client.industry || 'Sin especificar'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg">
              <Globe size={16} className="text-slate-400" aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Meta ID</p>
                <p className="text-sm font-mono text-slate-900 dark:text-white">{client.meta_account_id || 'No conectado'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg">
              <BarChart2 size={16} className="text-slate-400" aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Metricas</p>
                <p className="text-sm text-slate-900 dark:text-white">{client.metrics_count ?? 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg">
              <Target size={16} className="text-slate-400" aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Campañas</p>
                <p className="text-sm text-slate-900 dark:text-white">{client.campaigns_count ?? 0}</p>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">Cliente desde {formatDateFull(client.created_at)}</p>
            <button
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors min-h-[40px]"
              style={{ backgroundColor: palette.primary, color: 'white' }}
              aria-label={`Editar cliente ${client.name}`}
            >
              Editar Cliente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== CLIENTS PAGE ====================

export default function Clients() {
  const { palette } = useTheme()
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

  const fetchClients = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.getClients()
      setClients(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando clientes')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const filteredClients = clients.filter(c => {
    if (filter === 'ACTIVE') return c.is_active
    if (filter === 'INACTIVE') return !c.is_active
    return true
  })

  const activeCount = clients.filter(c => c.is_active).length

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
          onClick={fetchClients}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 min-h-[40px]"
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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Clientes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {clients.length} clientes • {activeCount} activos
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors min-h-[36px]',
                  filter === f
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                )}
              >
                {f === 'ALL' ? 'Todos' : f === 'ACTIVE' ? 'Activos' : 'Inactivos'}
              </button>
            ))}
          </div>

          <button
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white rounded-lg transition-colors min-h-[40px]"
            style={{ backgroundColor: palette.primary }}
            aria-label="Agregar nuevo cliente"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Nuevo
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border-l-4" style={{ borderLeftColor: palette.success }}>
          <p className="text-xs text-slate-500 dark:text-slate-400">Activos</p>
          <p className="text-xl font-semibold" style={{ color: palette.success }}>{activeCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border-l-4 border-slate-400">
          <p className="text-xs text-slate-500 dark:text-slate-400">Inactivos</p>
          <p className="text-xl font-semibold text-slate-600 dark:text-slate-400">{clients.length - activeCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border-l-4" style={{ borderLeftColor: palette.primary }}>
          <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
          <p className="text-xl font-semibold" style={{ color: palette.primary }}>{clients.length}</p>
        </div>
      </div>

      {/* Clients List (1 line cards) */}
      <div className="space-y-2">
        {filteredClients.map((client) => (
          <ClientRow key={client.id} client={client} palette={palette} />
        ))}

        {/* Add Client Card */}
        <button
          className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-4 flex items-center justify-center gap-2 text-slate-400 hover:border-slate-300 hover:text-slate-500 dark:hover:border-slate-600 dark:hover:text-slate-300 transition-colors min-h-[56px]"
          aria-label="Agregar nuevo cliente"
        >
          <Plus className="w-5 h-5" aria-hidden="true" />
          <span className="font-medium">Agregar Cliente</span>
        </button>
      </div>

      {filteredClients.length === 0 && clients.length > 0 && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" aria-hidden="true" />
          <p className="text-slate-500 dark:text-slate-400">No hay clientes con este filtro</p>
        </div>
      )}
    </div>
  )
}
