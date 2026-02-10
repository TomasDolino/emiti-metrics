/**
 * Creative Analyzer Component
 * Analyze ad creatives with Claude Vision AI
 * Includes: Visual analysis, Copy analysis, SEO suggestions
 */

import { useState, useCallback, useRef } from 'react'
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
  Palette,
  Camera,
  FileText,
  Search,
  TrendingUp
} from 'lucide-react'
import { useTheme } from '../lib/theme'
import { cn } from '../lib/utils'

interface AnalysisResult {
  analysis: string
  score: number
  timestamp: string
  copy_analysis?: CopyAnalysis
}

interface CopyAnalysis {
  engagement_score: number
  seo_score: number
  suggestions: string[]
  detected_copy: string
  hooks_analysis: string
  cta_analysis: string
}

interface CreativeAnalyzerProps {
  onAnalysisComplete?: (result: AnalysisResult) => void
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const MAX_IMAGE_SIZE = 4 * 1024 * 1024 // 4MB for API
const MAX_DIMENSION = 2048 // Max width/height

// Compress image for mobile uploads
async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    img.onload = () => {
      let { width, height } = img

      // Scale down if too large
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
        width *= ratio
        height *= ratio
      }

      canvas.width = width
      canvas.height = height
      ctx?.drawImage(img, 0, 0, width, height)

      // Compress to JPEG with 0.85 quality
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      resolve(dataUrl)
    }

    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export default function CreativeAnalyzer({ onAnalysisComplete }: CreativeAnalyzerProps) {
  const [image, setImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [context, setContext] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [analysisType, setAnalysisType] = useState<'visual' | 'copy' | 'full'>('full')
  const [isCompressing, setIsCompressing] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { palette } = useTheme()

  const processImage = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Por favor sube una imagen válida')
      return
    }

    setError(null)
    setResult(null)

    // Compress large images
    if (file.size > MAX_IMAGE_SIZE) {
      setIsCompressing(true)
      try {
        const compressed = await compressImage(file)
        setImage(compressed)
        // Create a fake file object for the type
        setImageFile(new File([file], file.name, { type: 'image/jpeg' }))
      } catch (err) {
        setError('Error al procesar la imagen')
      } finally {
        setIsCompressing(false)
      }
    } else {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        setImage(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processImage(file)
  }, [processImage])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) processImage(file)
  }, [processImage])

  const getAuthToken = () => {
    return localStorage.getItem('metrics_token') || ''
  }

  const analyzeCreative = async () => {
    if (!image || !imageFile) return

    setIsAnalyzing(true)
    setError(null)

    try {
      // Convert image to base64 without the data URL prefix
      const base64 = image.split(',')[1]

      const response = await fetch(`${API_BASE}/ai/analyze-creative`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          image_base64: base64,
          image_type: imageFile.type || 'image/jpeg',
          context: context,
          analysis_type: analysisType // 'visual', 'copy', or 'full'
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Error al analizar el creativo')
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
              <div className="space-y-4">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center h-52 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {isCompressing ? (
                    <>
                      <Loader2 className="w-10 h-10 text-gray-400 mb-3 animate-spin" />
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Optimizando imagen...
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-gray-400 mb-3" />
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Arrastra o toca para subir
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        PNG, JPG - se optimizará automáticamente
                      </p>
                    </>
                  )}
                </div>

                {/* Mobile camera button */}
                <button
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = 'image/*'
                    input.capture = 'environment'
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0]
                      if (file) processImage(file)
                    }
                    input.click()
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors md:hidden"
                >
                  <Camera className="w-5 h-5" />
                  Tomar foto con cámara
                </button>
              </div>
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

            {/* Analysis type selector */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipo de análisis
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'full', label: 'Completo', icon: Sparkles },
                  { id: 'visual', label: 'Visual', icon: Eye },
                  { id: 'copy', label: 'Copy/SEO', icon: FileText },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setAnalysisType(type.id as typeof analysisType)}
                    className={cn(
                      'flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all',
                      analysisType === type.id
                        ? 'text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    )}
                    style={analysisType === type.id ? { backgroundColor: palette.primary } : undefined}
                  >
                    <type.icon className="w-4 h-4" />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

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
              disabled={!image || isAnalyzing || isCompressing}
              className="w-full mt-4 py-3 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: palette.primary }}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analizando con Claude AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Analizar {analysisType === 'full' ? 'Completo' : analysisType === 'visual' ? 'Visual' : 'Copy'}
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

                {/* Copy Analysis Section (if available) */}
                {result.copy_analysis && (
                  <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-4 h-4" style={{ color: palette.primary }} />
                      Análisis de Copy
                    </h4>

                    {/* Engagement & SEO Scores */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="text-xs text-green-700 dark:text-green-400 font-medium">Engagement</span>
                        </div>
                        <span className="text-2xl font-bold text-green-600">{result.copy_analysis.engagement_score}</span>
                        <span className="text-xs text-green-600">/100</span>
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Search className="w-4 h-4 text-blue-600" />
                          <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">SEO Score</span>
                        </div>
                        <span className="text-2xl font-bold text-blue-600">{result.copy_analysis.seo_score}</span>
                        <span className="text-xs text-blue-600">/100</span>
                      </div>
                    </div>

                    {/* Detected Copy */}
                    {result.copy_analysis.detected_copy && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Copy detectado:</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                          "{result.copy_analysis.detected_copy}"
                        </p>
                      </div>
                    )}

                    {/* Suggestions */}
                    {result.copy_analysis.suggestions && result.copy_analysis.suggestions.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Sugerencias de mejora:</p>
                        <ul className="space-y-1">
                          {result.copy_analysis.suggestions.map((suggestion, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

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
