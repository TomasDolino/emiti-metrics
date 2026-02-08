/**
 * Command Palette (Cmd+K)
 * Quick navigation and actions for power users
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  LayoutDashboard,
  Target,
  TrendingUp,
  Zap,
  AlertTriangle,
  FileText,
  Settings,
  Upload,
  Building2,
  Lightbulb,
  Calculator,
  Activity,
  BookOpen,
  BarChart3,
  Users,
  GitCompare,
  ArrowRight,
  Command
} from 'lucide-react'
import { useTheme, COLOR_PALETTES } from '../lib/theme'
import { cn } from '../lib/utils'

interface CommandItem {
  id: string
  title: string
  description?: string
  icon: React.ReactNode
  action: () => void
  category: 'navigation' | 'action' | 'settings'
  keywords?: string[]
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { palette, setPalette } = useTheme()

  // Define commands
  const commands: CommandItem[] = [
    // Navigation
    { id: 'dashboard', title: 'Ir a Dashboard', icon: <LayoutDashboard size={18} />, action: () => navigate('/'), category: 'navigation', keywords: ['inicio', 'home'] },
    { id: 'agency', title: 'Ir a Agencia', icon: <Building2 size={18} />, action: () => navigate('/agency'), category: 'navigation', keywords: ['roi', 'valor'] },
    { id: 'upload', title: 'Subir Datos', icon: <Upload size={18} />, action: () => navigate('/upload'), category: 'navigation', keywords: ['csv', 'importar'] },
    { id: 'campaigns', title: 'Ver Campañas', icon: <Target size={18} />, action: () => navigate('/campaigns'), category: 'navigation' },
    { id: 'analysis', title: 'Análisis', icon: <TrendingUp size={18} />, action: () => navigate('/analysis'), category: 'navigation', keywords: ['tendencias'] },
    { id: 'ads', title: 'Ver Anuncios', icon: <Zap size={18} />, action: () => navigate('/ads'), category: 'navigation', keywords: ['creativos'] },
    { id: 'alerts', title: 'Ver Alertas', icon: <AlertTriangle size={18} />, action: () => navigate('/alerts'), category: 'navigation', keywords: ['warnings', 'problemas'] },
    { id: 'patterns', title: 'Patrones', icon: <Lightbulb size={18} />, action: () => navigate('/patterns'), category: 'navigation', keywords: ['insights'] },
    { id: 'simulator', title: 'Simulador', icon: <Calculator size={18} />, action: () => navigate('/simulator'), category: 'navigation', keywords: ['budget', 'presupuesto'] },
    { id: 'diagnostics', title: 'Diagnósticos', icon: <Activity size={18} />, action: () => navigate('/diagnostics'), category: 'navigation', keywords: ['salud', 'health'] },
    { id: 'playbook', title: 'Playbook', icon: <BookOpen size={18} />, action: () => navigate('/playbook'), category: 'navigation', keywords: ['guia', 'mejores practicas'] },
    { id: 'reports', title: 'Reportes', icon: <FileText size={18} />, action: () => navigate('/reports'), category: 'navigation', keywords: ['pdf', 'exportar'] },
    { id: 'metrics', title: 'Métricas', icon: <BarChart3 size={18} />, action: () => navigate('/metrics'), category: 'navigation', keywords: ['kpis'] },
    { id: 'clients', title: 'Clientes', icon: <Users size={18} />, action: () => navigate('/clients'), category: 'navigation' },
    { id: 'compare', title: 'Comparar', icon: <GitCompare size={18} />, action: () => navigate('/compare'), category: 'navigation', keywords: ['vs', 'versus'] },

    // Actions
    { id: 'new-report', title: 'Generar Nuevo Reporte', description: 'Crear PDF para cliente', icon: <FileText size={18} />, action: () => { navigate('/reports'); onClose() }, category: 'action' },
    { id: 'upload-csv', title: 'Importar CSV', description: 'Subir datos de Meta Ads', icon: <Upload size={18} />, action: () => { navigate('/upload'); onClose() }, category: 'action' },

    // Theme settings
    ...COLOR_PALETTES.slice(0, 5).map(theme => ({
      id: `theme-${theme.id}`,
      title: `Tema: ${theme.name}`,
      description: 'Cambiar apariencia',
      icon: <Settings size={18} />,
      action: () => { setPalette(theme.id); onClose() },
      category: 'settings' as const,
      keywords: ['color', 'paleta', 'tema']
    }))
  ]

  // Filter commands based on query
  const filteredCommands = query
    ? commands.filter(cmd => {
        const searchText = [
          cmd.title,
          cmd.description,
          ...(cmd.keywords || [])
        ].join(' ').toLowerCase()
        return searchText.includes(query.toLowerCase())
      })
    : commands

  // Group by category
  const groupedCommands = {
    navigation: filteredCommands.filter(c => c.category === 'navigation'),
    action: filteredCommands.filter(c => c.category === 'action'),
    settings: filteredCommands.filter(c => c.category === 'settings')
  }

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action()
          onClose()
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }, [isOpen, filteredCommands, selectedIndex, onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[200] backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-[15%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-xl z-[201] animate-fadeIn">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar comandos..."
              className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
            />
            <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto p-2">
            {filteredCommands.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <p>No se encontraron comandos</p>
              </div>
            ) : (
              <>
                {/* Navigation */}
                {groupedCommands.navigation.length > 0 && (
                  <div className="mb-2">
                    <p className="px-2 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Navegación
                    </p>
                    {groupedCommands.navigation.map((cmd) => (
                      <CommandRow
                        key={cmd.id}
                        command={cmd}
                        isSelected={filteredCommands.indexOf(cmd) === selectedIndex}
                        onClick={() => { cmd.action(); onClose() }}
                        palette={palette}
                      />
                    ))}
                  </div>
                )}

                {/* Actions */}
                {groupedCommands.action.length > 0 && (
                  <div className="mb-2">
                    <p className="px-2 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Acciones
                    </p>
                    {groupedCommands.action.map((cmd) => (
                      <CommandRow
                        key={cmd.id}
                        command={cmd}
                        isSelected={filteredCommands.indexOf(cmd) === selectedIndex}
                        onClick={() => { cmd.action(); onClose() }}
                        palette={palette}
                      />
                    ))}
                  </div>
                )}

                {/* Settings */}
                {groupedCommands.settings.length > 0 && (
                  <div className="mb-2">
                    <p className="px-2 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Configuración
                    </p>
                    {groupedCommands.settings.map((cmd) => (
                      <CommandRow
                        key={cmd.id}
                        command={cmd}
                        isSelected={filteredCommands.indexOf(cmd) === selectedIndex}
                        onClick={() => { cmd.action(); onClose() }}
                        palette={palette}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↑</kbd>
                  <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↓</kbd>
                  navegar
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↵</kbd>
                  seleccionar
                </span>
              </div>
              <span className="flex items-center gap-1">
                <Command size={12} />
                <span>K para abrir</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// Individual command row
function CommandRow({
  command,
  isSelected,
  onClick,
  palette
}: {
  command: CommandItem
  isSelected: boolean
  onClick: () => void
  palette: { primary: string }
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left',
        isSelected
          ? 'text-white'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      )}
      style={isSelected ? { backgroundColor: palette.primary } : undefined}
    >
      <span className={cn(
        'flex-shrink-0',
        isSelected ? 'text-white' : 'text-gray-400'
      )}>
        {command.icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{command.title}</p>
        {command.description && (
          <p className={cn(
            'text-xs truncate',
            isSelected ? 'text-white/70' : 'text-gray-400'
          )}>
            {command.description}
          </p>
        )}
      </div>
      {isSelected && (
        <ArrowRight size={16} className="flex-shrink-0 text-white/70" />
      )}
    </button>
  )
}

// Hook for global keyboard shortcut
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev)
  }
}
