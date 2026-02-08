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
    id: 'violet',
    name: 'Violet',
    primary: '#8B5CF6',
    secondary: '#6366F1',
    accent: '#A78BFA',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    bgPage: '#faf5ff',
    bgCard: '#ffffff',
    bgMuted: '#f3e8ff',
    preview: ['#8B5CF6', '#6366F1', '#A78BFA', '#f3e8ff'],
  },
  {
    id: 'indigo',
    name: 'Indigo',
    primary: '#6366F1',
    secondary: '#4F46E5',
    accent: '#818CF8',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    bgPage: '#eef2ff',
    bgCard: '#ffffff',
    bgMuted: '#e0e7ff',
    preview: ['#6366F1', '#4F46E5', '#818CF8', '#e0e7ff'],
  },
  {
    id: 'purple',
    name: 'Purple',
    primary: '#9333EA',
    secondary: '#7E22CE',
    accent: '#A855F7',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    bgPage: '#faf5ff',
    bgCard: '#ffffff',
    bgMuted: '#f3e8ff',
    preview: ['#9333EA', '#7E22CE', '#A855F7', '#f3e8ff'],
  },
  {
    id: 'oceano',
    name: 'Oceano',
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
    id: 'cyan',
    name: 'Cyan',
    primary: '#06B6D4',
    secondary: '#0891B2',
    accent: '#22D3EE',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    bgPage: '#ecfeff',
    bgCard: '#ffffff',
    bgMuted: '#cffafe',
    preview: ['#06B6D4', '#0891B2', '#22D3EE', '#cffafe'],
  },
  {
    id: 'emerald',
    name: 'Emerald',
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
    id: 'rose',
    name: 'Rose',
    primary: '#F43F5E',
    secondary: '#E11D48',
    accent: '#FB7185',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    bgPage: '#fff1f2',
    bgCard: '#ffffff',
    bgMuted: '#ffe4e6',
    preview: ['#F43F5E', '#E11D48', '#FB7185', '#ffe4e6'],
  },
  {
    id: 'slate',
    name: 'Slate',
    primary: '#475569',
    secondary: '#334155',
    accent: '#64748B',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    bgPage: '#f8fafc',
    bgCard: '#ffffff',
    bgMuted: '#f1f5f9',
    preview: ['#475569', '#334155', '#64748B', '#f1f5f9'],
  },
]

const DEFAULT_PALETTE = COLOR_PALETTES[0] // Violet

// ==================== CONTEXT ====================

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme')
    return (saved as Theme) || 'light'
  })

  const [paletteId, setPaletteId] = useState(() => {
    return localStorage.getItem('paletteId') || 'violet'
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
    setPaletteId('violet')
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
