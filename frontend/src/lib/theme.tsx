import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

// ==================== TYPES ====================

export interface ColorPalette {
  id: string
  name: string
  primary: string
  secondary: string
  accent: string
  success: string
  warning: string
  danger: string
  bgPage: string
  bgCard: string
  bgMuted: string
  preview: string[]
}

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  palette: ColorPalette
  paletteId: string
  setPalette: (id: string) => void
  customPalette: ColorPalette
  setCustomPalette: (partial: Partial<ColorPalette>) => void
  isCustomPalette: boolean
  resetToDefaults: () => void
}

// ==================== PALETTES ====================

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: 'emiti',
    name: 'Emiti',
    primary: '#A8B5A0',
    secondary: '#7D8471',
    accent: '#C4A484',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    bgPage: '#f8faf8',
    bgCard: '#ffffff',
    bgMuted: '#f0f4f0',
    preview: ['#A8B5A0', '#7D8471', '#C4A484', '#f0f4f0'],
  },
  {
    id: 'bosque',
    name: 'Bosque',
    primary: '#10B981',
    secondary: '#059669',
    accent: '#34D399',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    bgPage: '#f0fdf4',
    bgCard: '#ffffff',
    bgMuted: '#dcfce7',
    preview: ['#10B981', '#059669', '#34D399', '#dcfce7'],
  },
  {
    id: 'oceano',
    name: 'Océano',
    primary: '#3B82F6',
    secondary: '#1D4ED8',
    accent: '#60A5FA',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    bgPage: '#eff6ff',
    bgCard: '#ffffff',
    bgMuted: '#dbeafe',
    preview: ['#3B82F6', '#1D4ED8', '#60A5FA', '#dbeafe'],
  },
  {
    id: 'atardecer',
    name: 'Atardecer',
    primary: '#F97316',
    secondary: '#EA580C',
    accent: '#FB923C',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    bgPage: '#fff7ed',
    bgCard: '#ffffff',
    bgMuted: '#ffedd5',
    preview: ['#F97316', '#EA580C', '#FB923C', '#ffedd5'],
  },
  {
    id: 'lavanda',
    name: 'Lavanda',
    primary: '#8B5CF6',
    secondary: '#7C3AED',
    accent: '#A78BFA',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    bgPage: '#faf5ff',
    bgCard: '#ffffff',
    bgMuted: '#f3e8ff',
    preview: ['#8B5CF6', '#7C3AED', '#A78BFA', '#f3e8ff'],
  },
  {
    id: 'rosa',
    name: 'Rosa',
    primary: '#EC4899',
    secondary: '#DB2777',
    accent: '#F472B6',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    bgPage: '#fdf2f8',
    bgCard: '#ffffff',
    bgMuted: '#fce7f3',
    preview: ['#EC4899', '#DB2777', '#F472B6', '#fce7f3'],
  },
  {
    id: 'carbon',
    name: 'Carbón',
    primary: '#374151',
    secondary: '#1F2937',
    accent: '#6B7280',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    bgPage: '#f9fafb',
    bgCard: '#ffffff',
    bgMuted: '#f3f4f6',
    preview: ['#374151', '#1F2937', '#6B7280', '#f3f4f6'],
  },
  {
    id: 'rojo',
    name: 'Rojo',
    primary: '#DC2626',
    secondary: '#B91C1C',
    accent: '#F87171',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    bgPage: '#fef2f2',
    bgCard: '#ffffff',
    bgMuted: '#fee2e2',
    preview: ['#DC2626', '#B91C1C', '#F87171', '#fee2e2'],
  },
]

const DEFAULT_PALETTE = COLOR_PALETTES[0] // Emiti

// ==================== CONTEXT ====================

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme')
    return (saved as Theme) || 'light'
  })

  const [paletteId, setPaletteId] = useState(() => {
    return localStorage.getItem('paletteId') || 'emiti'
  })

  const [customPalette, setCustomPaletteState] = useState<ColorPalette>(() => {
    const saved = localStorage.getItem('customPalette')
    return saved ? JSON.parse(saved) : { ...DEFAULT_PALETTE, id: 'custom', name: 'Personalizada' }
  })

  const isCustomPalette = paletteId === 'custom'

  const palette = isCustomPalette
    ? customPalette
    : COLOR_PALETTES.find((p) => p.id === paletteId) || DEFAULT_PALETTE

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('paletteId', paletteId)
  }, [paletteId])

  useEffect(() => {
    localStorage.setItem('customPalette', JSON.stringify(customPalette))
  }, [customPalette])

  // Apply CSS variables
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--color-primary', palette.primary)
    root.style.setProperty('--color-secondary', palette.secondary)
    root.style.setProperty('--color-accent', palette.accent)
    root.style.setProperty('--color-success', palette.success)
    root.style.setProperty('--color-warning', palette.warning)
    root.style.setProperty('--color-danger', palette.danger)
    root.style.setProperty('--color-bg-page', palette.bgPage)
    root.style.setProperty('--color-bg-card', palette.bgCard)
    root.style.setProperty('--color-bg-muted', palette.bgMuted)
  }, [palette])

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))

  const setPalette = (id: string) => setPaletteId(id)

  const setCustomPalette = (partial: Partial<ColorPalette>) => {
    setCustomPaletteState((prev) => {
      const updated = { ...prev, ...partial }
      updated.preview = [updated.primary, updated.secondary, updated.accent, updated.bgMuted]
      return updated
    })
    setPaletteId('custom')
  }

  const resetToDefaults = () => {
    setPaletteId('emiti')
    setTheme('light')
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        palette,
        paletteId,
        setPalette,
        customPalette,
        setCustomPalette,
        isCustomPalette,
        resetToDefaults,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
