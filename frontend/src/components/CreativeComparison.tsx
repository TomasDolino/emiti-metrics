/**
 * Creative Comparison Component
 * Compares new creatives with top performers from the database
 * All recommendations are based on REAL performance data
 */

import { useState, useCallback, useRef } from 'react'
import {
  Upload,
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
  TrendingUp,
  Search,
  BarChart3,
  Target,
  Sparkles,
  Camera,
  ExternalLink,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useTheme } from '../lib/theme'
import { cn } from '../lib/utils'

interface CreativeAttributes {
  photography: {
    photo_type: string
    photo_angle: string
    background_type: string
    lighting: string
    image_quality: string
  }
  composition: {
    has_props: string
    dominant_color: string
    contrast_level: string
  }
  human_elements: {
    has_person: boolean
    person_type: string | null
  }
  commercial_info: {
    has_price: boolean
    has_discount: boolean
    has_urgency: boolean
    cta_text: string
  }
  copy_text: {
    detected_copy: string
    headline_type: string
  }
  product_info: {
    product_category: string
    product_material: string
  }
}

interface TopPerformer {
  id: number
  ad_name: string
  image_url: string | null
  metrics: {
    ctr: number
    cpr: number
    results: number
    spend: number
  }
  attributes: Record<string, any>
}

interface Comparison {
  has_references: boolean
  match_score: number
  matches: Array<{ field: string; label: string; value: any }>
  differences: Array<{ field: string; label: string; your_value: any; top_performer_value: any }>
  top_reference: {
    ad_name: string
    metrics: Record<string, number>
    image_url: string | null
  }
}

interface Insight {
  attribute: string
  insight: string
  recommendation: string
  sample_size: number
  impact: string
}

interface Recommendation {
  priority: string
  change: string
  expected_impact: string
  based_on: string
}

interface AnalysisResult {
  success: boolean
  analysis: {
    attributes: CreativeAttributes
    flat_attributes: Record<string, any>
  }
  similar_creatives: TopPerformer[]
  top_performers: TopPerformer[]
  comparison: Comparison
  insights: {
    has_data: boolean
    total_creatives: number
    insights: Insight[]
  }
  recommendations: Recommendation[]
  data_quality: {
    total_creatives_in_db: number
    has_enough_data: boolean
    confidence: string
  }
}

interface SEOResult {
  keywords: string[]
  copy_suggestions: Array<{
    type: string
    template: string
    note: string
  }>
  sources: Array<{
    name: string
    url: string
    note: string
  }>
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const MAX_IMAGE_SIZE = 4 * 1024 * 1024

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      let { width, height } = img
      const MAX_DIM = 1500

      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height)
        width *= ratio
        height *= ratio
      }

      canvas.width = width
      canvas.height = height
      ctx?.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(objectUrl)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Error loading image'))
    }
    img.src = objectUrl
  })
}

export default function CreativeComparison() {
  const [image, setImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [copyText, setCopyText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSearchingSEO, setIsSearchingSEO] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [seoResult, setSeoResult] = useState<SEOResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCompressing, setIsCompressing] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    attributes: true,
    comparison: true,
    insights: true,
    seo: true
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { palette } = useTheme()

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const getAuthToken = () => localStorage.getItem('metrics_token') || ''

  const processImage = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Por favor sube una imagen valida')
      return
    }

    setError(null)
    setResult(null)
    setSeoResult(null)

    if (file.size > MAX_IMAGE_SIZE) {
      setIsCompressing(true)
      try {
        const compressed = await compressImage(file)
        setImage(compressed)
        setImageFile(new File([file], file.name, { type: 'image/jpeg' }))
      } catch {
        setError('Error al procesar la imagen')
      } finally {
        setIsCompressing(false)
      }
    } else {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setImage(e.target?.result as string)
      reader.readAsDataURL(file)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) processImage(file)
  }, [processImage])

  const analyzeCreative = async () => {
    if (!image || !imageFile) return

    setIsAnalyzing(true)
    setError(null)

    try {
      const base64 = image.split(',')[1]

      const response = await fetch(`${API_BASE}/creative/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          image_base64: base64,
          image_type: imageFile.type || 'image/jpeg',
          copy_text: copyText || null
        })
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.detail || 'Error al analizar')
      }

      const data = await response.json()
      setResult(data)

      // Auto-search SEO if we detected product info
      const productCategory = data.analysis?.flat_attributes?.product_category
      if (productCategory) {
        searchSEO(productCategory)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const searchSEO = async (productName: string) => {
    setIsSearchingSEO(true)
    try {
      const response = await fetch(`${API_BASE}/creative/seo-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          product_name: productName,
          product_category: result?.analysis?.flat_attributes?.product_category
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSeoResult(data)
      }
    } catch {
      // SEO search is optional, don't show error
    } finally {
      setIsSearchingSEO(false)
    }
  }

  const clearAll = () => {
    setImage(null)
    setImageFile(null)
    setResult(null)
    setSeoResult(null)
    setError(null)
    setCopyText('')
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-500'
      case 'medium': return 'text-yellow-500'
      case 'low': return 'text-red-500'
      default: return 'text-slate-500'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${palette.primary}20` }}
          >
            <BarChart3 className="w-5 h-5" style={{ color: palette.primary }} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Comparacion de Creativos
            </h2>
            <p className="text-sm text-slate-500">
              Analisis basado en datos reales de tus campanas
            </p>
          </div>
        </div>

        {/* Data quality badge */}
        {result?.data_quality && (
          <div className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
            result.data_quality.has_enough_data
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
          )}>
            <Info className="w-3 h-3" />
            {result.data_quality.has_enough_data
              ? `${result.insights.total_creatives} creativos analizados`
              : "Pocos datos - sigue corriendo campanas para mejores insights"
            }
            <span className={getConfidenceColor(result.data_quality.confidence)}>
              (Confianza: {result.data_quality.confidence})
            </span>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="font-medium text-slate-900 dark:text-white mb-4">Tu Creativo</h3>

          {!image ? (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => e.target.files?.[0] && processImage(e.target.files[0])}
                  className="hidden"
                />
                {isCompressing ? (
                  <>
                    <Loader2 className="w-10 h-10 text-slate-400 mb-3 animate-spin" />
                    <p className="text-sm text-slate-600 dark:text-slate-300">Optimizando...</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-slate-400 mb-3" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      Arrastra o toca para subir
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      PNG, JPG - maximo 4MB
                    </p>
                  </>
                )}
              </div>

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
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 md:hidden"
              >
                <Camera className="w-5 h-5" />
                Tomar foto
              </button>
            </div>
          ) : (
            <div className="relative">
              <img
                src={image}
                alt="Tu creativo"
                className="w-full h-64 object-contain bg-slate-50 dark:bg-slate-900 rounded-xl"
              />
              <button
                onClick={clearAll}
                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full"
                aria-label="Quitar imagen"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          )}

          {/* Copy text input */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Copy del anuncio (opcional)
            </label>
            <textarea
              value={copyText}
              onChange={(e) => setCopyText(e.target.value)}
              placeholder="Pega el copy que vas a usar con este creativo..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2"
            />
          </div>

          {/* Analyze button */}
          <button
            onClick={analyzeCreative}
            disabled={!image || isAnalyzing}
            className="w-full mt-4 py-3 rounded-lg font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: palette.primary }}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analizando y comparando...
              </>
            ) : (
              <>
                <BarChart3 className="w-5 h-5" />
                Comparar con Top Performers
              </>
            )}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Match Score */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-slate-900 dark:text-white">Match Score</h3>
                  <span className={cn(
                    "text-3xl font-bold",
                    result.comparison.match_score >= 70 ? "text-green-500" :
                    result.comparison.match_score >= 50 ? "text-yellow-500" : "text-red-500"
                  )}>
                    {result.comparison.match_score}%
                  </span>
                </div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      result.comparison.match_score >= 70 ? "bg-green-500" :
                      result.comparison.match_score >= 50 ? "bg-yellow-500" : "bg-red-500"
                    )}
                    style={{ width: `${result.comparison.match_score}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Similitud con tus mejores anuncios
                </p>
              </div>

              {/* Top Performer Comparison */}
              {result.comparison.top_reference && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleSection('comparison')}
                  >
                    <h3 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" style={{ color: palette.primary }} />
                      vs Top Performer
                    </h3>
                    {expandedSections.comparison ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>

                  {expandedSections.comparison && (
                    <div className="mt-4 space-y-4">
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-sm font-medium text-green-700 dark:text-green-400 truncate">
                          {result.comparison.top_reference.ad_name}
                        </p>
                        <div className="flex gap-4 mt-2 text-xs text-green-600 dark:text-green-500">
                          <span>CTR: {result.comparison.top_reference.metrics.ctr?.toFixed(2) ?? '0.00'}%</span>
                          <span>CPR: ${result.comparison.top_reference.metrics.cpr?.toFixed(0) ?? '0'}</span>
                        </div>
                      </div>

                      {/* Matches */}
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-2">COINCIDENCIAS</p>
                        <div className="flex flex-wrap gap-2">
                          {result.comparison.matches.slice(0, 6).map((match, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                              <CheckCircle className="w-3 h-3" />
                              {match.label}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Differences */}
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-2">DIFERENCIAS CLAVE</p>
                        <div className="space-y-2">
                          {result.comparison.differences.slice(0, 5).map((diff, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <XCircle className="w-3 h-3 text-red-500" />
                              <span className="text-slate-600 dark:text-slate-400">{diff.label}:</span>
                              <span className="text-red-600 dark:text-red-400 line-through">{String(diff.your_value)}</span>
                              <span className="text-slate-400">→</span>
                              <span className="text-green-600 dark:text-green-400">{String(diff.top_performer_value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="font-medium text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Target className="w-4 h-4" style={{ color: palette.primary }} />
                    Recomendaciones (Basadas en Datos)
                  </h3>
                  <div className="space-y-3">
                    {result.recommendations.map((rec, i) => (
                      <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                        <div className="flex items-start gap-2">
                          <span className={cn("px-2 py-0.5 text-xs font-medium rounded", getPriorityColor(rec.priority))}>
                            {rec.priority === 'high' ? 'ALTO IMPACTO' : 'MEDIO'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">{rec.change}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {rec.expected_impact} ({rec.based_on})
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Insights from Data */}
              {result.insights.has_data && result.insights.insights.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleSection('insights')}
                  >
                    <h3 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4" style={{ color: palette.primary }} />
                      Insights de tus Datos
                    </h3>
                    {expandedSections.insights ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>

                  {expandedSections.insights && (
                    <div className="mt-4 space-y-2">
                      {result.insights.insights.map((insight, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            insight.impact === 'high' ? 'bg-green-500' : 'bg-yellow-500'
                          )} />
                          <span className="text-slate-700 dark:text-slate-300">{insight.insight}</span>
                          <span className="text-xs text-slate-400">({insight.sample_size} creativos)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SEO / Copy Suggestions */}
              {(seoResult || isSearchingSEO) && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleSection('seo')}
                  >
                    <h3 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                      <Search className="w-4 h-4" style={{ color: palette.primary }} />
                      SEO y Copy
                    </h3>
                    {expandedSections.seo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>

                  {expandedSections.seo && (
                    <div className="mt-4">
                      {isSearchingSEO ? (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Buscando keywords y competencia...
                        </div>
                      ) : seoResult && (
                        <div className="space-y-4">
                          {/* Keywords */}
                          {seoResult.keywords.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-slate-500 mb-2">KEYWORDS SUGERIDAS</p>
                              <div className="flex flex-wrap gap-2">
                                {seoResult.keywords.map((kw, i) => (
                                  <span key={i} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Copy suggestions */}
                          {seoResult.copy_suggestions.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-slate-500 mb-2">SUGERENCIAS DE COPY</p>
                              <div className="space-y-2">
                                {seoResult.copy_suggestions.map((sug, i) => (
                                  <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                      {sug.template}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">{sug.note}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Sources */}
                          {seoResult.sources.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-slate-500 mb-2">FUENTES</p>
                              {seoResult.sources.map((src, i) => (
                                <a
                                  key={i}
                                  href={src.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  {src.name}: {src.note}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Detected Copy */}
              {result.analysis.attributes.copy_text?.detected_copy && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="font-medium text-slate-900 dark:text-white mb-2">Texto Detectado</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                    "{result.analysis.attributes.copy_text.detected_copy}"
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 flex flex-col items-center justify-center text-center">
              <ImageIcon className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="font-medium text-slate-700 dark:text-slate-300">
                Sube un creativo para comparar
              </h3>
              <p className="text-sm text-slate-500 mt-2 max-w-xs">
                Lo compararemos con tus anuncios de mejor rendimiento y te daremos recomendaciones basadas en datos reales.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
