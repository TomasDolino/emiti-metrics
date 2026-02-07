import { useState } from 'react'
import { X, Sun, Moon, Palette, Check, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
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
      className={`relative p-2 rounded-xl border-2 transition-all hover:scale-[1.02] ${
        selected
          ? 'border-gray-900 dark:border-white shadow-lg'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
      }`}
    >
      <div className="grid grid-cols-2 gap-0.5 w-full aspect-[2/1] rounded-lg overflow-hidden">
        {palette.preview.map((color, i) => (
          <div key={i} style={{ backgroundColor: color }} className="w-full h-full" />
        ))}
      </div>
      <p className={`mt-1.5 text-[10px] font-medium text-center truncate ${
        selected ? 'text-gray-900 dark:text-white' : 'text-gray-600'
      }`}>
        {palette.name}
      </p>
      {selected && (
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center">
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
        className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0.5 bg-transparent"
      />
      <div className="flex-1">
        <label className="text-[10px] font-medium text-gray-500 block">{label}</label>
        <input
          type="text"
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full bg-transparent text-xs text-gray-900 font-mono border-0 p-0 focus:outline-none"
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Palette size={20} style={{ color: palette.primary }} />
            Personalizar
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-5 overflow-y-auto flex-1 min-h-0">
          {/* Tema claro/oscuro */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Modo</h3>
            <div className="flex gap-2">
              <button
                onClick={() => theme === 'dark' && toggleTheme()}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  theme === 'light'
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Sun size={18} className={theme === 'light' ? 'text-amber-500' : 'text-gray-400'} />
                <span className={`text-sm font-medium ${theme === 'light' ? 'text-gray-900' : 'text-gray-500'}`}>
                  Claro
                </span>
              </button>
              <button
                onClick={() => theme === 'light' && toggleTheme()}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  theme === 'dark'
                    ? 'border-white bg-gray-800'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Moon size={18} className={theme === 'dark' ? 'text-indigo-400' : 'text-gray-400'} />
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-500'}`}>
                  Oscuro
                </span>
              </button>
            </div>
          </div>

          {/* Paletas de colores */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Paleta de colores</h3>
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
              className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                isCustomPalette
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className={`text-sm font-medium ${isCustomPalette ? 'text-gray-900' : 'text-gray-600'}`}>
                Paleta personalizada
              </span>
              {showCustomEditor ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>

            {showCustomEditor && (
              <div className="mt-2 p-3 bg-gray-50 rounded-xl space-y-3">
                <div className="grid grid-cols-2 gap-3">
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
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Vista previa</h3>
            <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: palette.bgMuted }}>
              <div className="flex gap-2 flex-wrap">
                <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: palette.primary }}>
                  Primario
                </button>
                <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: palette.secondary }}>
                  Secundario
                </button>
                <button className="px-3 py-1.5 rounded-lg text-xs font-medium border-2" style={{ borderColor: palette.accent, color: palette.accent }}>
                  Acento
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-medium text-white" style={{ backgroundColor: palette.success }}>
                  Ganador
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium text-white" style={{ backgroundColor: palette.warning }}>
                  Testing
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium text-white" style={{ backgroundColor: palette.danger }}>
                  Pausar
                </span>
              </div>
              <div className="bg-white rounded-lg p-2.5 border-l-4 shadow-sm" style={{ borderColor: palette.primary }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-900">Video Testimonial</p>
                    <p className="text-[10px] text-gray-500">CTR 2.1% • CPR $132</p>
                  </div>
                  <span className="text-xs font-bold" style={{ color: palette.primary }}>GANADOR</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2 flex-shrink-0">
          <button
            onClick={() => { resetToDefaults(); setShowCustomEditor(false) }}
            className="w-full py-2 rounded-xl text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw size={14} />
            Restaurar valores predeterminados
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ backgroundColor: palette.primary }}
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  )
}
