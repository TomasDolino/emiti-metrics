import { useState, createContext, useContext, useEffect, useRef, useCallback } from 'react'
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom'
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
  GitCompare,
  ChevronDown,
  Building2,
  Lightbulb,
  Calculator,
  Activity,
  BookOpen,
  Upload,
  Brain,
  Sparkles,
  Sun,
  Moon,
  RefreshCw,
  Download,
  Bell,
  LogOut
} from 'lucide-react'
import { useTheme } from '../lib/theme'
import { useAuth } from '../lib/AuthContext'
import Settings from './Settings'
import CommandPalette, { useCommandPalette } from './CommandPalette'
import AIChat from './AIChat'
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

// Flat navigation - NO groups, Dashboard first
const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'AI Lab', href: '/ai-lab', icon: Brain },
  { name: 'Campañas', href: '/campaigns', icon: Target },
  { name: 'Anuncios', href: '/ads', icon: Zap },
  { name: 'Análisis', href: '/analysis', icon: TrendingUp },
  { name: 'Alertas', href: '/alerts', icon: AlertTriangle },
  { name: 'Patrones', href: '/patterns', icon: Lightbulb },
  { name: 'Diagnósticos', href: '/diagnostics', icon: Activity },
  { name: 'Simulador', href: '/simulator', icon: Calculator },
  { name: 'Playbook', href: '/playbook', icon: BookOpen },
  { name: 'Reportes', href: '/reports', icon: FileText },
  { name: 'Comparar', href: '/compare', icon: GitCompare },
  { name: 'Métricas', href: '/metrics', icon: BarChart3 },
  { name: 'Clientes', href: '/clients', icon: Users },
  { name: 'Agencia', href: '/agency', icon: Building2 },
  { name: 'Subir Datos', href: '/upload', icon: Upload },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const commandPalette = useCommandPalette()
  const { theme, toggleTheme, palette } = useTheme()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const activeClients = mockClients.filter(c => c.isActive)
  const selectedClient = selectedClientId ? mockClients.find(c => c.id === selectedClientId) : null

  // Close dropdown on escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setClientDropdownOpen(false)
    }
  }, [])

  useEffect(() => {
    if (clientDropdownOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [clientDropdownOpen, handleKeyDown])

  return (
    <ClientContext.Provider value={{ selectedClientId, setSelectedClientId }}>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Modern glassmorphism */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 md:w-60 lg:w-64
          bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl
          border-r border-slate-200/50 dark:border-slate-700/50
          shadow-xl shadow-slate-200/20 dark:shadow-slate-900/50
          transform transition-transform duration-300 ease-out
          flex flex-col
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Logo - gradient accent */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200/50 dark:border-slate-700/50">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-slate-800 dark:text-white text-lg">Emiti</span>
              <span className="text-xs text-slate-400 dark:text-slate-500 block -mt-0.5">Metrics</span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Client selector - top, prominent */}
        <div className="p-4 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="relative">
            <button
              onClick={() => setClientDropdownOpen(!clientDropdownOpen)}
              className="w-full flex items-center gap-3 px-3 py-2.5
                bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-800/50
                hover:from-slate-200 hover:to-slate-100 dark:hover:from-slate-700 dark:hover:to-slate-800
                rounded-xl transition-all duration-200
                border border-slate-200/50 dark:border-slate-700/50"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-md"
                style={{
                  background: selectedClient?.color
                    ? `linear-gradient(135deg, ${selectedClient.color}, ${selectedClient.color}dd)`
                    : 'linear-gradient(135deg, #8b5cf6, #6366f1)'
                }}
              >
                {selectedClient ? selectedClient.name.slice(0, 2).toUpperCase() : 'TD'}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                  {selectedClient?.name || 'Todos los clientes'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedClient ? selectedClient.industry : `${activeClients.length} activos`}
                </p>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${clientDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {clientDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setClientDropdownOpen(false)} />
                <div
                  ref={dropdownRef}
                  className="absolute top-full left-0 right-0 mt-2
                    bg-white dark:bg-slate-800 rounded-xl
                    shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50
                    border border-slate-200/50 dark:border-slate-700/50
                    max-h-80 overflow-y-auto z-50 animate-fadeIn"
                >
                  <div className="p-2">
                    <button
                      onClick={() => { setSelectedClientId(null); setClientDropdownOpen(false) }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        !selectedClientId ? 'bg-violet-50 dark:bg-violet-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                        TD
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Todos los clientes</span>
                    </button>

                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />

                    {activeClients.map(client => (
                      <button
                        key={client.id}
                        onClick={() => { setSelectedClientId(client.id); setClientDropdownOpen(false) }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                          selectedClientId === client.id ? 'bg-violet-50 dark:bg-violet-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: client.color }}
                        >
                          {client.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{client.name}</p>
                          <p className="text-xs text-slate-400">{client.industry}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Navigation - FLAT, SCROLLABLE */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/25'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Settings button - bottom */}
        <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50">
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
              text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800
              transition-colors"
          >
            <SettingsIcon className="w-5 h-5 text-slate-400" />
            <span>Configuración</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="md:pl-60 lg:pl-64">
        {/* Top header - minimal, modern */}
        <header className="sticky top-0 z-30 h-16
          bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl
          border-b border-slate-200/50 dark:border-slate-700/50
          flex items-center px-4 lg:px-6 gap-3">

          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          {/* Action buttons */}
          <button
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Actualizar datos"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Exportar"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors relative"
            title="Notificaciones"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">3</span>
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-500" />
            ) : (
              <Moon className="w-5 h-5 text-slate-500" />
            )}
          </button>

          {/* Palette indicator + Settings */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-2 p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="Configuracion"
          >
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: palette.primary }}
            />
            <SettingsIcon className="w-5 h-5 text-slate-500" />
          </button>

          {/* User menu */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{user?.name}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors group"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-500 transition-colors" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Settings Modal */}
      <Settings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Command Palette */}
      <CommandPalette isOpen={commandPalette.isOpen} onClose={commandPalette.close} />

      {/* AI Chat (floating) */}
      <AIChat
        clientName={selectedClient?.name}
        dataContext={{
          client: selectedClient,
          metrics: {}
        }}
        isFloating={true}
      />
    </div>
    </ClientContext.Provider>
  )
}

export { ClientContext }
