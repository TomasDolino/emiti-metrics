import { useState } from 'react'
import { Plus, ChevronRight, Building2 } from 'lucide-react'
import { useTheme } from '../lib/theme'
import { mockClients } from '../lib/mockData'
import { formatDateFull, cn } from '../lib/utils'

// ==================== CLIENT ROW (1 línea) ====================

interface ClientRowProps {
  client: typeof mockClients[0]
  palette: ReturnType<typeof useTheme>['palette']
}

function ClientRow({ client, palette }: ClientRowProps) {
  const borderColor = client.isActive ? palette.success : '#9ca3af'
  const initials = client.name.split(' ').map(w => w[0]).join('').slice(0, 2)

  return (
    <div
      className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border-l-4 hover:shadow-sm transition-shadow cursor-pointer"
      style={{ borderLeftColor: borderColor }}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-semibold"
        style={{ backgroundColor: palette.accent }}
      >
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{client.name}</p>
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white flex-shrink-0"
            style={{ backgroundColor: borderColor }}
          >
            {client.isActive ? 'Activo' : 'Inactivo'}
          </span>
        </div>
        {client.industry && (
          <p className="text-xs text-gray-500 truncate">{client.industry}</p>
        )}
      </div>

      {/* Meta Account */}
      {client.metaAccountId && (
        <div className="text-right hidden md:block">
          <p className="text-xs text-gray-500">Meta ID</p>
          <p className="text-xs font-mono text-gray-700 dark:text-gray-300">{client.metaAccountId}</p>
        </div>
      )}

      {/* Created */}
      <div className="text-right hidden sm:block">
        <p className="text-xs text-gray-500">Desde</p>
        <p className="text-xs text-gray-700 dark:text-gray-300">{formatDateFull(client.createdAt)}</p>
      </div>

      {/* Action */}
      <button
        className="px-2 py-1 text-xs font-medium rounded-lg transition-colors"
        style={{ color: palette.primary, backgroundColor: `${palette.primary}10` }}
      >
        Ver
      </button>

      <ChevronRight className="w-4 h-4 text-gray-400 hidden sm:block" />
    </div>
  )
}

// ==================== CLIENTS PAGE ====================

export default function Clients() {
  const { palette } = useTheme()
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

  const filteredClients = mockClients.filter(c => {
    if (filter === 'ACTIVE') return c.isActive
    if (filter === 'INACTIVE') return !c.isActive
    return true
  })

  const activeCount = mockClients.filter(c => c.isActive).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Clientes</h1>
          <p className="text-sm text-gray-500">
            {mockClients.length} clientes • {activeCount} activos
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                  filter === f
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500'
                )}
              >
                {f === 'ALL' ? 'Todos' : f === 'ACTIVE' ? 'Activos' : 'Inactivos'}
              </button>
            ))}
          </div>

          <button
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-colors"
            style={{ backgroundColor: palette.primary }}
          >
            <Plus className="w-4 h-4" />
            Nuevo
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border-l-4" style={{ borderLeftColor: palette.success }}>
          <p className="text-xs text-gray-500">Activos</p>
          <p className="text-xl font-semibold" style={{ color: palette.success }}>{activeCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border-l-4 border-gray-400">
          <p className="text-xs text-gray-500">Inactivos</p>
          <p className="text-xl font-semibold text-gray-600">{mockClients.length - activeCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border-l-4" style={{ borderLeftColor: palette.primary }}>
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-xl font-semibold" style={{ color: palette.primary }}>{mockClients.length}</p>
        </div>
      </div>

      {/* Clients List (1 line cards) */}
      <div className="space-y-2">
        {filteredClients.map((client) => (
          <ClientRow key={client.id} client={client} palette={palette} />
        ))}

        {/* Add Client Card */}
        <button
          className="w-full border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-center gap-2 text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Agregar Cliente</span>
        </button>
      </div>

      {filteredClients.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No hay clientes con este filtro</p>
        </div>
      )}
    </div>
  )
}
