/**
 * AI Chat Component - Production Grade AI Assistant for Metrics v2.0
 * Features: Claude AI integration, voice input, contextual suggestions, history, alerts
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Send, X, Sparkles, Bot, User, Maximize2, Minimize2,
  Trash2, MessageCircle, BarChart3, PieChart, LineChart as LineChartIcon,
  TrendingUp, ExternalLink, ArrowRight, DollarSign, Target,
  RefreshCw, Copy, Check, Mic, MicOff, Zap, Clock, Star, StarOff, Bell, Download
} from 'lucide-react'
import { useTheme } from '../lib/theme'
import { cn, safeNumber } from '../lib/utils'
import { api } from '../lib/api'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart as RechartsPie, Pie, LineChart as RechartsLine, Line, CartesianGrid, Legend
} from 'recharts'
import html2canvas from 'html2canvas'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  data?: any
  chartType?: 'bar' | 'pie' | 'line' | null
  action?: { label: string; path: string }
  confidence?: 'high' | 'medium' | 'low'
}

interface AIChatProps {
  dataContext?: Record<string, unknown>
  clientName?: string
  selectedClientId?: string
  isFloating?: boolean
}

const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#6366f1']

const STORAGE_KEYS = {
  history: 'metrics-ai-chat-history',
  favorites: 'metrics-ai-chat-favorites',
  smartMode: 'metrics-ai-chat-smart-mode'
}

// Get page name from path
const getPageFromPath = (pathname: string): string => {
  const page = pathname.split('/')[1] || 'dashboard'
  return page === '' ? 'dashboard' : page
}

export default function AIChat({ clientName, selectedClientId, isFloating = true }: AIChatProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [expandedChart, setExpandedChart] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // New features state
  const [smartMode, setSmartMode] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [alerts, setAlerts] = useState<{ type: string; message: string; count?: number }[]>([])
  const [showAlerts, setShowAlerts] = useState(true)
  const [suggestions, setSuggestions] = useState<{ query: string; icon: string }[]>([])

  const { palette } = useTheme()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150)
      loadStoredData()
      fetchAlerts()
      fetchSuggestions()
    }
  }, [isOpen])

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false)
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen])

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'es-AR'

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setInput(transcript)
        setIsListening(false)
      }

      recognitionRef.current.onerror = () => setIsListening(false)
      recognitionRef.current.onend = () => setIsListening(false)
    }
  }, [])

  // Update suggestions when page changes
  useEffect(() => {
    if (isOpen) {
      fetchSuggestions()
    }
  }, [location.pathname, isOpen])

  // Storage functions
  const loadStoredData = () => {
    try {
      const storedHistory = localStorage.getItem(STORAGE_KEYS.history)
      const storedFavorites = localStorage.getItem(STORAGE_KEYS.favorites)
      const storedSmartMode = localStorage.getItem(STORAGE_KEYS.smartMode)
      if (storedHistory) setHistory(JSON.parse(storedHistory))
      if (storedFavorites) setFavorites(JSON.parse(storedFavorites))
      if (storedSmartMode) setSmartMode(storedSmartMode === 'true')
    } catch {}
  }

  const toggleSmartMode = () => {
    const newValue = !smartMode
    setSmartMode(newValue)
    localStorage.setItem(STORAGE_KEYS.smartMode, String(newValue))
  }

  const saveToHistory = (query: string) => {
    const newHistory = [query, ...history.filter(h => h !== query)].slice(0, 10)
    setHistory(newHistory)
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(newHistory))
  }

  const toggleFavorite = (query: string) => {
    const newFavorites = favorites.includes(query)
      ? favorites.filter(f => f !== query)
      : [...favorites, query]
    setFavorites(newFavorites)
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(newFavorites))
  }

  // Fetch alerts from API
  const fetchAlerts = async () => {
    try {
      const alertsData = await api.getAlerts({ clientId: selectedClientId || undefined, limit: 5 })
      const activeAlerts = alertsData.filter((a: any) => !a.acknowledged)

      const criticalCount = activeAlerts.filter((a: any) => a.severity === 'CRITICAL').length
      const warningCount = activeAlerts.filter((a: any) => a.severity === 'WARNING').length

      const newAlerts: typeof alerts = []
      if (criticalCount > 0) {
        newAlerts.push({ type: 'error', message: 'Alertas críticas', count: criticalCount })
      }
      if (warningCount > 0) {
        newAlerts.push({ type: 'warning', message: 'Advertencias', count: warningCount })
      }

      setAlerts(newAlerts)
    } catch {
      // Silent fail - alerts are non-critical
    }
  }

  // Fetch contextual suggestions from API
  const fetchSuggestions = async () => {
    try {
      const page = getPageFromPath(location.pathname)
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
      const response = await fetch(`${apiBase}/ai/suggestions/${page}`)
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions || [])
      }
    } catch (error) {
      // Use default suggestions
      setSuggestions([
        { query: '¿Cómo está la cuenta?', icon: 'chart' },
        { query: '¿Cuáles son los mejores anuncios?', icon: 'trophy' },
        { query: '¿Hay alertas que deba atender?', icon: 'alert' },
        { query: 'Dame recomendaciones', icon: 'lightbulb' }
      ])
    }
  }

  // Voice input
  const toggleVoice = () => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  // Export chart as PNG
  const exportChart = async (messageId: string) => {
    const chartEl = chartRefs.current[messageId]
    if (!chartEl) return

    try {
      const canvas = await html2canvas(chartEl, { backgroundColor: '#ffffff' })
      const link = document.createElement('a')
      link.download = `chart-${new Date().toISOString().split('T')[0]}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch {
      // Silent fail - export is non-critical
    }
  }

  // Helper functions
  const formatMoney = (amount: number) => {
    const safe = safeNumber(amount)
    if (safe >= 1000000) return `$${(safe / 1000000).toFixed(1)}M`
    if (safe >= 1000) return `$${Math.round(safe / 1000)}k`
    return `$${safe.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
  }

  const formatNumber = (num: number) => {
    const safe = safeNumber(num)
    if (safe >= 1000000) return `${(safe / 1000000).toFixed(1)}M`
    if (safe >= 1000) return `${(safe / 1000).toFixed(1)}k`
    return safe.toLocaleString('es-AR', { maximumFractionDigits: 0 })
  }

  // Build data context for Claude AI
  const buildDataContext = async () => {
    try {
      const dashboard = await api.getDashboard({ clientId: selectedClientId || undefined, days: 7 })
      const alertsData = await api.getAlerts({ clientId: selectedClientId || undefined, limit: 5 })

      return {
        metrics: {
          total_spend: dashboard.total_spend,
          total_results: dashboard.total_results,
          total_impressions: dashboard.total_impressions,
          avg_cpr: dashboard.avg_cpr,
          avg_ctr: dashboard.avg_ctr
        },
        top_campaigns: dashboard.top_campaigns?.slice(0, 3) || [],
        alerts: alertsData.filter((a: any) => !a.acknowledged).slice(0, 3).map((a: any) => ({
          message: a.message,
          severity: a.severity
        })),
        patterns: dashboard.patterns?.slice(0, 3) || []
      }
    } catch {
      return {}
    }
  }

  // Call Claude AI via API
  const callClaudeAI = async (query: string): Promise<string> => {
    try {
      const dataContext = await buildDataContext()
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

      const response = await fetch(`${apiBase}/ai/chat/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('metrics_token') || ''}`
        },
        body: JSON.stringify({
          message: query,
          data_context: dataContext,
          chat_history: messages.slice(-4).map(m => ({
            role: m.role,
            content: m.content
          })),
          client_id: selectedClientId
        })
      })

      if (!response.ok) {
        throw new Error('AI service unavailable')
      }

      const data = await response.json()
      return data.response || 'No pude generar una respuesta.'
    } catch (error) {
      throw error
    }
  }

  // Process query - local patterns or Claude AI
  const processQuery = async (query: string): Promise<{
    response: string
    data?: any
    chartType?: Message['chartType']
    action?: Message['action']
    confidence?: 'high' | 'medium' | 'low'
  }> => {
    const q = query.toLowerCase()

    // If smart mode is ON, use Claude AI for everything
    if (smartMode) {
      try {
        const aiResponse = await callClaudeAI(query)
        return {
          response: aiResponse,
          chartType: null,
          confidence: 'high'
        }
      } catch {
        return {
          response: '⚠️ El servicio de IA no está disponible. Por favor intenta de nuevo más tarde.',
          chartType: null,
          confidence: 'low'
        }
      }
    }

    // Pattern matching for common queries (offline mode)
    try {
      // Get real data from API
      const dashboard = await api.getDashboard({ clientId: selectedClientId || undefined, days: 7 })

      // 1. Performance overview
      if (/resumen|overview|dashboard|métricas|performance|rendimiento/i.test(q)) {
        const chartData = [
          { name: 'Gasto', value: dashboard.total_spend, fill: CHART_COLORS[0] },
          { name: 'Resultados', value: dashboard.total_results, fill: CHART_COLORS[1] },
          { name: 'Impresiones', value: dashboard.total_impressions / 1000, fill: CHART_COLORS[2] },
        ]

        return {
          response: `**Resumen de rendimiento** (últimos 7 días)\n\n` +
            `💰 **Gasto**: ${formatMoney(dashboard.total_spend)}\n` +
            `🎯 **Resultados**: ${formatNumber(dashboard.total_results)}\n` +
            `👁️ **Impresiones**: ${formatNumber(dashboard.total_impressions)}\n\n` +
            `**Métricas clave:**\n` +
            `📊 CTR: ${dashboard.avg_ctr?.toFixed(2)}%\n` +
            `💵 CPR: ${formatMoney(dashboard.avg_cpr)}\n\n` +
            `🟢 Confianza: Alta`,
          data: chartData,
          chartType: 'bar',
          action: { label: 'Ver Dashboard', path: '/' },
          confidence: 'high'
        }
      }

      // 2. Top campaigns
      if (/campañas?|campaigns?|mejores?\s+campañas?/i.test(q)) {
        const campaigns = dashboard.top_campaigns || []
        const chartData = campaigns.slice(0, 5).map((c: any, i: number) => ({
          name: c.name?.substring(0, 15) || `Campaign ${i + 1}`,
          results: c.results || 0,
          fill: CHART_COLORS[i % CHART_COLORS.length]
        }))

        return {
          response: `**Top campañas** (por resultados)\n\n` +
            campaigns.slice(0, 5).map((c: any, i: number) =>
              `${i + 1}. **${c.name}**\n   💰 ${formatMoney(c.spend)} | 🎯 ${c.results} resultados | CPR: ${formatMoney(c.cpr)}`
            ).join('\n\n'),
          data: chartData,
          chartType: 'bar',
          action: { label: 'Ver Campañas', path: '/campaigns' },
          confidence: 'high'
        }
      }

      // 3. Alerts
      if (/alertas?|warnings?|problemas?/i.test(q)) {
        const alertsData = await api.getAlerts({ clientId: selectedClientId || undefined })
        const activeAlerts = alertsData.filter((a: any) => !a.acknowledged)

        return {
          response: activeAlerts.length > 0
            ? `**Alertas activas** (${activeAlerts.length})\n\n` +
              activeAlerts.slice(0, 5).map((a: any) =>
                `${a.severity === 'CRITICAL' ? '🔴' : a.severity === 'WARNING' ? '🟡' : '🔵'} **${a.title}**\n   ${a.message}`
              ).join('\n\n') +
              `\n\n💡 Revisa estas alertas para optimizar tu inversión.`
            : `✅ **No hay alertas activas**\n\nTodas las campañas están funcionando dentro de parámetros normales.`,
          chartType: null,
          action: { label: 'Ver Alertas', path: '/alerts' },
          confidence: 'high'
        }
      }

      // 4. Recommendations
      if (/recomendaciones?|sugerencias?|qué\s*(debo|debería|puedo)/i.test(q)) {
        return {
          response: `**Recomendaciones de optimización**\n\n` +
            `📈 **Escalar**: Identifica los anuncios con mejor CPR y aumenta su presupuesto gradualmente.\n\n` +
            `⏸️ **Pausar**: Revisa anuncios con CPR > 2x del promedio o sin resultados en los últimos 3 días.\n\n` +
            `🔄 **Rotar creativos**: Anuncios con frecuencia > 3 necesitan creativos frescos.\n\n` +
            `💡 *Activa el modo IA (⚡) para recomendaciones personalizadas basadas en tus datos.*`,
          chartType: null,
          action: { label: 'Ver Playbook', path: '/playbook' },
          confidence: 'medium'
        }
      }

      // 5. Spend analysis
      if (/gasto|spend|inversión|presupuesto|budget/i.test(q)) {
        const dailyMetrics = dashboard.daily_metrics || []
        const chartData = dailyMetrics.slice(-7).map((d: any) => ({
          date: new Date(d.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }),
          spend: d.spend,
          results: d.results
        }))

        return {
          response: `**Análisis de gasto** (últimos 7 días)\n\n` +
            `💰 **Total invertido**: ${formatMoney(dashboard.total_spend)}\n` +
            `🎯 **Resultados**: ${formatNumber(dashboard.total_results)}\n` +
            `📊 **CPR promedio**: ${formatMoney(dashboard.avg_cpr)}\n\n` +
            `**Distribución diaria:**\n` +
            dailyMetrics.slice(-5).map((d: any) =>
              `- ${new Date(d.date).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' })}: ${formatMoney(d.spend)}`
            ).join('\n'),
          data: chartData,
          chartType: 'line',
          action: { label: 'Ver Métricas', path: '/metrics' },
          confidence: 'high'
        }
      }

      // Default response
      return {
        response: `Puedo ayudarte con análisis de tus métricas. Prueba preguntándome:\n\n` +
          `📊 "Dame un resumen de rendimiento"\n` +
          `🏆 "¿Cuáles son las mejores campañas?"\n` +
          `🔔 "¿Hay alertas activas?"\n` +
          `💡 "Dame recomendaciones"\n` +
          `💰 "Análisis de gasto"\n\n` +
          `💡 *Activa el modo IA (⚡) para consultas más complejas con inteligencia artificial.*`,
        chartType: null,
        confidence: 'medium'
      }

    } catch {
      return {
        response: 'Hubo un error al procesar la consulta. Por favor, intenta de nuevo.',
        chartType: null,
        confidence: 'low'
      }
    }
  }

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date()
    }

    saveToHistory(messageText.trim())
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const result = await processQuery(messageText)

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.response,
        timestamp: new Date(),
        data: result.data,
        chartType: result.chartType,
        action: result.action,
        confidence: result.confidence
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch {
      setMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: 'Error al procesar la consulta.',
        timestamp: new Date()
      }])
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, selectedClientId, smartMode])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const clearChat = () => {
    if (messages.length > 0 && !window.confirm('¿Limpiar todo el historial del chat?')) return
    setMessages([])
  }

  const handleAction = (action: Message['action']) => {
    if (action?.path) {
      navigate(action.path)
      setIsOpen(false)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text.replace(/\*\*/g, ''))
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  // Render chart
  const renderChart = (message: Message) => {
    if (!message.data || !message.chartType) return null

    const isExpanded = expandedChart === message.id
    const chartHeight = isExpanded ? 250 : 120

    return (
      <div
        ref={el => { chartRefs.current[message.id] = el }}
        className="mt-3 bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200/50 dark:border-slate-700/50"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
            {message.chartType === 'bar' && <BarChart3 size={12} />}
            {message.chartType === 'pie' && <PieChart size={12} />}
            {message.chartType === 'line' && <LineChartIcon size={12} />}
            Visualización
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => exportChart(message.id)}
              className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
            >
              <Download size={10} /> PNG
            </button>
            <button
              onClick={() => setExpandedChart(isExpanded ? null : message.id)}
              className="text-[10px] text-slate-400 hover:text-slate-600"
            >
              {isExpanded ? 'Reducir' : 'Expandir'}
            </button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={chartHeight}>
          {message.chartType === 'bar' ? (
            <BarChart data={message.data} layout="vertical" margin={{ left: 50, right: 10 }}>
              <XAxis type="number" tickFormatter={(v) => formatMoney(v)} tick={{ fontSize: 9 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={45} />
              <Tooltip formatter={(v) => formatMoney(Number(v))} />
              <Bar dataKey={message.data[0]?.results !== undefined ? 'results' : message.data[0]?.spend !== undefined ? 'spend' : 'value'} radius={[0, 4, 4, 0]}>
                {message.data.map((entry: any, index: number) => (
                  <Cell key={index} fill={entry.fill || CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          ) : message.chartType === 'pie' ? (
            <RechartsPie>
              <Pie
                data={message.data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={isExpanded ? 80 : 40}
                label={isExpanded}
                labelLine={isExpanded}
              >
                {message.data.map((entry: any, index: number) => (
                  <Cell key={index} fill={entry.fill || CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatMoney(Number(v))} />
              {isExpanded && <Legend />}
            </RechartsPie>
          ) : message.chartType === 'line' ? (
            <RechartsLine data={message.data} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} />
              <YAxis tickFormatter={(v) => formatNumber(v)} tick={{ fontSize: 9 }} />
              <Tooltip />
              <Line type="monotone" dataKey="spend" stroke={palette.primary} strokeWidth={2} dot={{ fill: palette.primary, r: 3 }} name="Gasto" />
              <Line type="monotone" dataKey="results" stroke={CHART_COLORS[1]} strokeWidth={2} dot={{ fill: CHART_COLORS[1], r: 3 }} name="Resultados" />
            </RechartsLine>
          ) : null}
        </ResponsiveContainer>
      </div>
    )
  }

  // Quick suggestions based on current page
  const QUICK_QUERIES = suggestions.length > 0 ? suggestions.slice(0, 4) : [
    { query: 'Dame un resumen de rendimiento', icon: 'chart' },
    { query: '¿Cuáles son las mejores campañas?', icon: 'trophy' },
    { query: '¿Hay alertas activas?', icon: 'alert' },
    { query: 'Análisis de gasto', icon: 'dollar' }
  ]

  const getIconComponent = (icon: string) => {
    switch (icon) {
      case 'chart': return Target
      case 'trophy': return TrendingUp
      case 'alert': return Bell
      case 'dollar': return DollarSign
      case 'lightbulb': return Sparkles
      default: return Target
    }
  }

  if (isFloating) {
    return (
      <>
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110"
            style={{ background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary || palette.primary})` }}
          >
            <MessageCircle className="w-6 h-6 text-white" />
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">
                {alerts.reduce((sum, a) => sum + (a.count || 1), 0)}
              </span>
            )}
          </button>
        )}

        {isOpen && !isExpanded && (
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden" onClick={() => setIsOpen(false)} />
        )}

        {isOpen && (
          <div className={cn(
            'fixed z-50 flex flex-col overflow-hidden transition-all duration-300',
            'bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl',
            'border border-slate-200/50 dark:border-slate-700/50 shadow-2xl',
            isExpanded ? 'inset-4 rounded-2xl' : 'bottom-6 right-6 w-[calc(100vw-3rem)] sm:w-96 h-[80vh] max-h-[700px] rounded-2xl'
          )}>
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b border-slate-200/50 dark:border-slate-700/50"
              style={{ background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary || palette.primary})` }}
            >
              <div className="flex items-center gap-2 text-white">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-sm">Asistente IA</span>
                  {clientName && <span className="text-xs text-white/70 block">{clientName}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleSmartMode}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all',
                    smartMode ? 'bg-white/30 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                  )}
                  title={smartMode ? 'Modo IA activo (Claude)' : 'Activar IA inteligente'}
                >
                  <Zap size={14} className={smartMode ? 'text-yellow-300' : ''} />
                  {smartMode ? 'IA' : 'IA'}
                </button>
                <button onClick={() => setShowHistory(!showHistory)} className="p-2 hover:bg-white/20 rounded-lg transition-colors" aria-label="Ver historial">
                  <Clock className="w-4 h-4 text-white" />
                </button>
                <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 hover:bg-white/20 rounded-lg transition-colors" aria-label={isExpanded ? 'Contraer' : 'Expandir'}>
                  {isExpanded ? <Minimize2 className="w-4 h-4 text-white" /> : <Maximize2 className="w-4 h-4 text-white" />}
                </button>
                <button onClick={clearChat} className="p-2 hover:bg-white/20 rounded-lg transition-colors" aria-label="Limpiar chat">
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors" aria-label="Cerrar">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Proactive Alerts */}
            {alerts.length > 0 && showAlerts && (
              <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell size={14} className="text-amber-600" />
                    <span className="text-xs font-medium text-amber-800 dark:text-amber-200">Alertas activas</span>
                  </div>
                  <button onClick={() => setShowAlerts(false)} className="text-amber-600 hover:text-amber-800">
                    <X size={14} />
                  </button>
                </div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {alerts.map((alert, i) => (
                    <span key={i} className={cn(
                      'text-xs px-2 py-1 rounded-full',
                      alert.type === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                    )}>
                      {alert.message}: {alert.count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* History Dropdown */}
            {showHistory && (history.length > 0 || favorites.length > 0) && (
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 max-h-32 overflow-y-auto">
                {favorites.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] text-slate-400 mb-1">Favoritos</p>
                    <div className="flex flex-wrap gap-1">
                      {favorites.map((f, i) => (
                        <button
                          key={i}
                          onClick={() => { setInput(f); setShowHistory(false) }}
                          className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-full flex items-center gap-1"
                        >
                          <Star size={10} /> {f.slice(0, 25)}...
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {history.length > 0 && (
                  <div>
                    <p className="text-[10px] text-slate-400 mb-1">Recientes</p>
                    <div className="flex flex-wrap gap-1">
                      {history.slice(0, 5).map((h, i) => (
                        <button
                          key={i}
                          onClick={() => { setInput(h); setShowHistory(false) }}
                          className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full"
                        >
                          {h.slice(0, 25)}...
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="space-y-4">
                  <div className="text-center py-6">
                    <div
                      className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3"
                      style={{ background: `linear-gradient(135deg, ${palette.primary}20, ${palette.primary}10)` }}
                    >
                      <Sparkles className="w-7 h-7" style={{ color: palette.primary }} />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Asistente de Métricas</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Analizo tus datos de campañas en tiempo real
                      {!smartMode && <span className="block mt-1 text-purple-500 text-xs">💡 Activa <strong>IA</strong> para análisis avanzado</span>}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_QUERIES.map((q, i) => {
                      const IconComponent = getIconComponent(q.icon)
                      return (
                        <button
                          key={i}
                          onClick={() => sendMessage(q.query)}
                          className="flex items-center gap-2 px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left border border-slate-200/50 dark:border-slate-700/50"
                        >
                          <IconComponent className="w-4 h-4 flex-shrink-0" style={{ color: palette.primary }} />
                          <span className="text-slate-700 dark:text-slate-300 truncate">{q.query.slice(0, 25)}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map(message => (
                    <div key={message.id} className={cn('flex gap-2', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                      {message.role === 'assistant' && (
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: `linear-gradient(135deg, ${palette.primary}20, ${palette.primary}10)` }}
                        >
                          <Bot className="w-4 h-4" style={{ color: palette.primary }} />
                        </div>
                      )}

                      <div className={cn('max-w-[85%]', message.role === 'user' ? 'order-first' : '')}>
                        <div
                          className={cn(
                            'rounded-2xl px-4 py-2.5',
                            message.role === 'user'
                              ? 'text-white rounded-br-md'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-md'
                          )}
                          style={message.role === 'user' ? { background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary || palette.primary})` } : undefined}
                        >
                          <div className="text-sm whitespace-pre-wrap leading-relaxed">
                            {message.content.split('**').map((part, i) =>
                              i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                            )}
                          </div>
                        </div>

                        {message.role === 'assistant' && renderChart(message)}

                        {message.role === 'assistant' && message.action && (
                          <button
                            onClick={() => handleAction(message.action)}
                            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors hover:opacity-80"
                            style={{ backgroundColor: `${palette.primary}15`, color: palette.primary }}
                          >
                            <ExternalLink size={12} />
                            {message.action.label}
                            <ArrowRight size={12} />
                          </button>
                        )}

                        {message.role === 'assistant' && (
                          <div className="mt-1 flex items-center gap-2">
                            <button onClick={() => copyToClipboard(message.content, message.id)} className="p-1 text-slate-400 hover:text-slate-600">
                              {copied === message.id ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                            <button
                              onClick={() => {
                                const prevMessage = messages[messages.indexOf(message) - 1]
                                if (prevMessage) toggleFavorite(prevMessage.content)
                              }}
                              className="p-1 text-slate-400 hover:text-yellow-500"
                            >
                              {favorites.includes(messages[messages.indexOf(message) - 1]?.content || '')
                                ? <Star size={12} className="fill-yellow-500 text-yellow-500" />
                                : <StarOff size={12} />}
                            </button>
                            {message.confidence && (
                              <span className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded',
                                message.confidence === 'high' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                message.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                              )}>
                                {message.confidence === 'high' ? '🟢' : message.confidence === 'medium' ? '🟡' : '🔴'}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              {message.timestamp.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                      </div>

                      {message.role === 'user' && (
                        <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                        </div>
                      )}
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: smartMode ? '#8B5CF615' : `${palette.primary}15` }}>
                        {smartMode ? <Zap className="w-4 h-4 text-purple-500" /> : <Bot className="w-4 h-4" style={{ color: palette.primary }} />}
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-2.5">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <RefreshCw className="w-4 h-4 animate-spin" style={{ color: smartMode ? '#8B5CF6' : palette.primary }} />
                          {smartMode ? 'Consultando IA...' : 'Analizando datos...'}
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                {recognitionRef.current && (
                  <button
                    type="button"
                    onClick={toggleVoice}
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                      isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                    )}
                  >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isListening ? 'Escuchando...' : 'Pregúntame sobre tus métricas...'}
                  disabled={isLoading || isListening}
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary || palette.primary})` }}
                >
                  <Send className="w-5 h-5 text-white" />
                </button>
              </div>
            </form>
          </div>
        )}
      </>
    )
  }

  // Embedded version (simplified)
  return (
    <div className="h-full flex flex-col bg-white/95 dark:bg-slate-900/95 rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary || palette.primary})` }}>
        <div className="flex items-center gap-2 text-white">
          <Bot className="w-5 h-5" />
          <span className="font-medium">Asistente IA</span>
        </div>
        <button onClick={clearChat} className="p-1.5 hover:bg-white/20 rounded-lg"><Trash2 className="w-4 h-4 text-white" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 mx-auto mb-4" style={{ color: palette.primary }} />
            <h3 className="font-semibold">Analizo tus métricas</h3>
            <p className="text-sm text-slate-500 mt-1">Pregúntame sobre rendimiento, anuncios o recomendaciones</p>
          </div>
        ) : (
          messages.map(m => (
            <div key={m.id} className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[80%] rounded-2xl px-4 py-2.5', m.role === 'user' ? 'text-white' : 'bg-slate-100 dark:bg-slate-800')}
                   style={m.role === 'user' ? { background: palette.primary } : undefined}>
                <div className="text-sm whitespace-pre-wrap">{m.content.split('**').map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p)}</div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribe tu pregunta..." disabled={isLoading}
                 className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm focus:outline-none" />
          <button type="submit" disabled={!input.trim() || isLoading} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: palette.primary }}>
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </form>
    </div>
  )
}
