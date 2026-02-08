import { useState } from 'react'
import { X, Sun, Moon, Palette, Check, ChevronDown, ChevronUp, RotateCcw, Sparkles } from 'lucide-react'
import { useTheme, COLOR_PALETTES } from '../lib/theme'
import type { ColorPalette } from '../lib/theme'

interface SettingsProps {
  isOpen: boolean
  onClose: () => void
}

function PalettePreview({ palette, selected, onClick }: {
  palette: ColorPalette
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`relative p-2.5 rounded-xl border-2 transition-all hover:scale-[1.02] ${
        selected
          ? 'border-violet-500 shadow-lg shadow-violet-500/20'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
      }`}
    >
      <div className="grid grid-cols-2 gap-0.5 w-full aspect-[2/1] rounded-lg overflow-hidden">
        {palette.preview.map((color, i) => (
          <div key={i} style={{ backgroundColor: color }} className="w-full h-full" />
        ))}
      </div>
      <p className={`mt-1.5 text-[10px] font-medium text-center truncate ${
        selected ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500'
      }`}>
        {palette.name}
      </p>
      {selected && (
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
          <Check size={12} className="text-white" />
        </div>
      )}
    </button>
  )
}

function ColorInput({ label, color, onChange }: {
  label: string
  color: string
  onChange: (color: string) => void
}) {
  const [localValue, setLocalValue] = useState(color)

  const handleChange = (newColor: string) => {
    setLocalValue(newColor)
    if (/^#[0-9A-Fa-f]{6}$/.test(newColor)) {
      onChange(newColor)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={color}
        onChange={(e) => handleChange(e.target.value)}
        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 p-0.5 bg-transparent"
      />
      <div className="flex-1">
        <label className="text-[10px] font-medium text-slate-500 block">{label}</label>
        <input
          type="text"
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full bg-transparent text-xs text-slate-900 dark:text-white font-mono border-0 p-0 focus:outline-none"
        />
      </div>
    </div>
  )
}

export default function Settings({ isOpen, onClose }: SettingsProps) {
  const {
    theme, toggleTheme, palette, paletteId, setPalette,
    customPalette, setCustomPalette, isCustomPalette, resetToDefaults
  } = useTheme()

  const [showCustomEditor, setShowCustomEditor] = useState(isCustomPalette)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl w-full max-w-lg max-h-[90vh] shadow-2xl shadow-violet-500/10 flex flex-col border border-slate-200/50 dark:border-slate-700/50">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Personalizar</h2>
              <p className="text-xs text-slate-500">Adapta la app a tu estilo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto flex-1 min-h-0">
          {/* Tema claro/oscuro */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Modo</h3>
            <div className="flex gap-3">
              <button
                onClick={() => theme === 'dark' && toggleTheme()}
                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  theme === 'light'
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <Sun size={20} className={theme === 'light' ? 'text-amber-500' : 'text-slate-400'} />
                <span className={`text-sm font-medium ${theme === 'light' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                  Claro
                </span>
              </button>
              <button
                onClick={() => theme === 'light' && toggleTheme()}
                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  theme === 'dark'
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <Moon size={20} className={theme === 'dark' ? 'text-violet-400' : 'text-slate-400'} />
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                  Oscuro
                </span>
              </button>
            </div>
          </div>

          {/* Paletas de colores */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Paleta de colores</h3>
            <div className="grid grid-cols-4 gap-2">
              {COLOR_PALETTES.map(p => (
                <PalettePreview
                  key={p.id}
                  palette={p}
                  selected={paletteId === p.id}
                  onClick={() => setPalette(p.id)}
                />
              ))}
            </div>
          </div>

          {/* Paleta personalizada */}
          <div>
            <button
              onClick={() => setShowCustomEditor(!showCustomEditor)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                isCustomPalette
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <Palette size={18} className={isCustomPalette ? 'text-violet-500' : 'text-slate-400'} />
                <span className={`text-sm font-medium ${isCustomPalette ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                  Paleta personalizada
                </span>
              </div>
              {showCustomEditor ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>

            {showCustomEditor && (
              <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <ColorInput
                    label="Primario"
                    color={customPalette.primary}
                    onChange={(color) => setCustomPalette({ primary: color })}
                  />
                  <ColorInput
                    label="Secundario"
                    color={customPalette.secondary}
                    onChange={(color) => setCustomPalette({ secondary: color })}
                  />
                  <ColorInput
                    label="Acento"
                    color={customPalette.accent}
                    onChange={(color) => setCustomPalette({ accent: color })}
                  />
                  <ColorInput
                    label="Fondo"
                    color={customPalette.bgMuted}
                    onChange={(color) => setCustomPalette({ bgMuted: color, bgPage: color })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Preview */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Vista previa</h3>
            <div className="rounded-xl p-4 space-y-3 border border-slate-200 dark:border-slate-700" style={{ backgroundColor: `${palette.bgMuted}20` }}>
              <div className="flex gap-2 flex-wrap">
                <button className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-lg" style={{ backgroundColor: palette.primary }}>
                  Primario
                </button>
                <button className="px-4 py-2 rounded-xl text-xs font-semibold text-white" style={{ backgroundColor: palette.secondary }}>
                  Secundario
                </button>
                <button className="px-4 py-2 rounded-xl text-xs font-semibold border-2 bg-transparent" style={{ borderColor: palette.accent, color: palette.accent }}>
                  Acento
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white" style={{ backgroundColor: palette.success }}>
                  GANADOR
                </span>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white" style={{ backgroundColor: palette.warning }}>
                  TESTING
                </span>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white" style={{ backgroundColor: palette.danger }}>
                  PAUSAR
                </span>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border-l-4 shadow-sm" style={{ borderColor: palette.primary }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Video Testimonial</p>
                    <p className="text-[10px] text-slate-500">CTR 2.1% - CPR $132</p>
                  </div>
                  <span className="text-xs font-bold" style={{ color: palette.primary }}>GANADOR</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-200/50 dark:border-slate-700/50 space-y-3 flex-shrink-0">
          <button
            onClick={() => { resetToDefaults(); setShowCustomEditor(false) }}
            className="w-full py-2.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw size={14} />
            Restaurar valores predeterminados
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 bg-gradient-to-r from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  )
}
