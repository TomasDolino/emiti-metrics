/**
 * Creative Analyzer Component
 * Analyze ad creatives with Claude Vision AI
 */

import { useState, useCallback } from 'react'
import {
  Upload,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertTriangle,
  X,
  Eye,
  MessageSquare,
  Target,
  Palette
} from 'lucide-react'
import { useTheme } from '../lib/theme'
import { cn } from '../lib/utils'

interface AnalysisResult {
  analysis: string
  score: number
  timestamp: string
}

interface CreativeAnalyzerProps {
  onAnalysisComplete?: (result: AnalysisResult) => void
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function CreativeAnalyzer({ onAnalysisComplete }: CreativeAnalyzerProps) {
  const [image, setImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [context, setContext] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { palette } = useTheme()

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Por favor sube una imagen válida')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen es muy grande (máx 10MB)')
      return
    }

    setImageFile(file)
    setError(null)
    setResult(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      setImage(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      setImageFile(file)
      setError(null)
      setResult(null)

      const reader = new FileReader()
      reader.onload = (event) => {
        setImage(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const analyzeCreative = async () => {
    if (!image || !imageFile) return

    setIsAnalyzing(true)
    setError(null)

    try {
      // Convert image to base64 without the data URL prefix
      const base64 = image.split(',')[1]

      const response = await fetch(`${API_BASE}/api/ai/analyze-creative`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: base64,
          image_type: imageFile.type,
          context: context
        })
      })

      if (!response.ok) {
        throw new Error('Error al analizar el creativo')
      }

      const data = await response.json()
      setResult(data)
      onAnalysisComplete?.(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const clearImage = () => {
    setImage(null)
    setImageFile(null)
    setResult(null)
    setError(null)
    setContext('')
  }

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-500'
    if (score >= 50) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getScoreBg = (score: number) => {
    if (score >= 75) return 'bg-green-100 dark:bg-green-900/30'
    if (score >= 50) return 'bg-yellow-100 dark:bg-yellow-900/30'
    return 'bg-red-100 dark:bg-red-900/30'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${palette.primary}20` }}
          >
            <Sparkles className="w-5 h-5" style={{ color: palette.primary }} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Análisis de Creativos
            </h2>
            <p className="text-sm text-gray-500">
              Powered by Claude Vision AI
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upload area */}
          <div>
            {!image ? (
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Upload className="w-10 h-10 text-gray-400 mb-3" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Arrastra una imagen o haz click para subir
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PNG, JPG hasta 10MB
                </p>
              </label>
            ) : (
              <div className="relative">
                <img
                  src={image}
                  alt="Creative preview"
                  className="w-full h-64 object-contain bg-gray-50 dark:bg-gray-900 rounded-xl"
                />
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            )}

            {/* Context input */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contexto adicional (opcional)
              </label>
              <input
                type="text"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Ej: Campaña de Black Friday, audiencia mujeres 25-45"
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2"
              />
            </div>

            {/* Analyze button */}
            <button
              onClick={analyzeCreative}
              disabled={!image || isAnalyzing}
              className="w-full mt-4 py-3 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: palette.primary }}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Analizar Creativo
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* Results */}
          <div>
            {result ? (
              <div className="space-y-4">
                {/* Score */}
                <div className={cn('p-4 rounded-xl', getScoreBg(result.score))}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Score del Creativo
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-3xl font-bold', getScoreColor(result.score))}>
                        {result.score}
                      </span>
                      <span className="text-sm text-gray-500">/100</span>
                    </div>
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all animate-progress',
                        result.score >= 75 ? 'bg-green-500' :
                        result.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      )}
                      style={{ width: `${result.score}%` }}
                    />
                  </div>
                </div>

                {/* Analysis */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 max-h-80 overflow-y-auto">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                      {result.analysis}
                    </div>
                  </div>
                </div>

                {/* Quick insights */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <Eye className="w-4 h-4 text-blue-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Análisis visual</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <MessageSquare className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Copy analizado</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <Target className="w-4 h-4 text-purple-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">CTA evaluado</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <Palette className="w-4 h-4 text-orange-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Colores analizados</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${palette.primary}15` }}
                >
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-medium text-gray-700 dark:text-gray-300">
                  Sube un creativo para analizar
                </h3>
                <p className="text-sm text-gray-500 mt-1 max-w-xs">
                  El AI analizará composición, colores, copy, CTA y te dará un score de 0-100
                </p>

                <div className="mt-6 space-y-2 text-left">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    El análisis incluye:
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Jerarquía visual y composición
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Psicología del color
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Efectividad del copy y CTA
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Predicción de performance
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Recomendaciones de mejora
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
