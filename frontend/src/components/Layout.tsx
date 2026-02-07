import { useState, createContext, useContext } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  FileText,
  Users,
  Menu,
  X,
  Target,
  Zap,
  Settings as SettingsIcon,
  Palette,
  GitCompare,
  ChevronDown,
  Building2,
  Lightbulb,
  Calculator,
  Activity,
  BookOpen,
  Upload
} from 'lucide-react'
import { useTheme } from '../lib/theme'
import Settings from './Settings'
import { mockClients } from '../lib/mockData'

// Client context for global client selection
interface ClientContextType {
  selectedClientId: string | null
  setSelectedClientId: (id: string | null) => void
}

const ClientContext = createContext<ClientContextType>({
  selectedClientId: null,
  setSelectedClientId: () => {}
})

export function useSelectedClient() {
  return useContext(ClientContext)
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Agencia', href: '/agency', icon: Building2 },
  { name: 'Subir Datos', href: '/upload', icon: Upload },
  { name: 'Campañas', href: '/campaigns', icon: Target },
  { name: 'Análisis', href: '/analysis', icon: TrendingUp },
  { name: 'Anuncios', href: '/ads', icon: Zap },
  { name: 'Alertas', href: '/alerts', icon: AlertTriangle },
  { name: 'Patrones', href: '/patterns', icon: Lightbulb },
  { name: 'Simulador', href: '/simulator', icon: Calculator },
  { name: 'Diagnósticos', href: '/diagnostics', icon: Activity },
  { name: 'Playbook', href: '/playbook', icon: BookOpen },
  { name: 'Reportes', href: '/reports', icon: FileText },
  { name: 'Métricas', href: '/metrics', icon: BarChart3 },
  { name: 'Clientes', href: '/clients', icon: Users },
  { name: 'Comparar', href: '/compare', icon: GitCompare },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)
  const location = useLocation()
  const { palette } = useTheme()

  const activeClients = mockClients.filter(c => c.isActive)
  const selectedClient = selectedClientId ? mockClients.find(c => c.id === selectedClientId) : null

  return (
    <ClientContext.Provider value={{ selectedClientId, setSelectedClientId }}>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          <Link to="/" className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})` }}
            >
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">Emiti Metrics</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                style={isActive ? { backgroundColor: palette.primary } : undefined}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Settings button */}
        <div className="absolute bottom-20 left-0 right-0 px-4">
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Palette className="w-5 h-5 text-gray-400" />
            Personalizar
          </button>
        </div>

        {/* Client selector (bottom) */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="relative">
            <button
              onClick={() => setClientDropdownOpen(!clientDropdownOpen)}
              className="w-full flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                style={{ backgroundColor: selectedClient?.color || palette.primary }}
              >
                {selectedClient ? selectedClient.name.slice(0, 2).toUpperCase() : 'TD'}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {selectedClient?.name || 'Todos los clientes'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedClient ? selectedClient.industry : `${activeClients.length} activos`}
                </p>
              </div>
              <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
            </button>

            {clientDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setClientDropdownOpen(false)}
                />
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto z-50">
                  <button
                    onClick={() => { setSelectedClientId(null); setClientDropdownOpen(false) }}
                    className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      !selectedClientId ? 'bg-gray-50 dark:bg-gray-700' : ''
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: palette.primary }}
                    >
                      TD
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Todos los clientes</p>
                      <p className="text-xs text-gray-500">{activeClients.length} activos</p>
                    </div>
                  </button>
                  <div className="border-t border-gray-100 dark:border-gray-700" />
                  {activeClients.map(client => (
                    <button
                      key={client.id}
                      onClick={() => { setSelectedClientId(client.id); setClientDropdownOpen(false) }}
                      className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        selectedClientId === client.id ? 'bg-gray-50 dark:bg-gray-700' : ''
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                        style={{ backgroundColor: client.color }}
                      >
                        {client.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{client.name}</p>
                        <p className="text-xs text-gray-500">{client.industry}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          {/* Quick actions */}
          <select className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 dark:text-white">
            <option>Últimos 7 días</option>
            <option>Últimos 14 días</option>
            <option>Últimos 30 días</option>
            <option>Este mes</option>
            <option>Mes anterior</option>
          </select>

          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Settings Modal */}
      <Settings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
    </ClientContext.Provider>
  )
}

export { ClientContext }
