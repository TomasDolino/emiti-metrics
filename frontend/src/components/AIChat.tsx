/**
 * AI Chat Component - Floating chat with Claude AI
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send,
  X,
  Sparkles,
  Bot,
  User,
  Loader2,
  Lightbulb,
  Maximize2,
  Minimize2,
  Trash2,
  MessageCircle
} from 'lucide-react'
import { useTheme } from '../lib/theme'
import { cn } from '../lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface SuggestedQuestion {
  category: string
  questions: string[]
}

interface AIChatProps {
  dataContext?: Record<string, unknown>
  clientName?: string
  isFloating?: boolean
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Default suggestions when API is not available
const DEFAULT_SUGGESTIONS: SuggestedQuestion[] = [
  {
    category: 'Analisis',
    questions: [
      'Como esta la cuenta?',
      'Que campanas deberia optimizar?',
      'Cuales son los anuncios ganadores?'
    ]
  },
  {
    category: 'Recomendaciones',
    questions: [
      'Que deberia pausar?',
      'Donde puedo escalar?',
      'Hay alertas importantes?'
    ]
  }
]

export default function AIChat({ dataContext = {}, clientName, isFloating = true }: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [suggestedQuestions, setSuggestedQuestions] = useState<SuggestedQuestion[]>(DEFAULT_SUGGESTIONS)

  const { palette } = useTheme()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch suggested questions on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/ai/suggested-questions`)
      .then(res => res.json())
      .then(data => {
        if (data.categories && data.categories.length > 0) {
          setSuggestedQuestions(data.categories)
        }
      })
      .catch(() => {
        // Keep default suggestions
      })
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen])

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setShowSuggestions(false)

    const assistantId = `assistant-${Date.now()}`
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, assistantMessage])

    try {
      const response = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          data_context: dataContext,
          chat_history: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue

              try {
                const parsed = JSON.parse(data)
                if (parsed.token) {
                  fullContent += parsed.token
                  setMessages(prev => prev.map(m =>
                    m.id === assistantId
                      ? { ...m, content: fullContent }
                      : m
                  ))
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('AI Chat error:', error)
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? {
              ...m,
              content: 'No pude conectar con el servidor. Verifica que el backend este corriendo en ' + API_BASE
            }
          : m
      ))
    } finally {
      setIsLoading(false)
    }
  }, [dataContext, isLoading, messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const clearChat = () => {
    setMessages([])
    setShowSuggestions(true)
  }

  const handleSuggestionClick = (question: string) => {
    sendMessage(question)
  }

  // Floating version
  if (isFloating) {
    return (
      <>
        {/* Floating button */}
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-violet-500/40"
            style={{
              background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary || palette.primary})`
            }}
          >
            <MessageCircle className="w-6 h-6 text-white" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          </button>
        )}

        {/* Backdrop */}
        {isOpen && !isExpanded && (
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}

        {/* Chat window */}
        {isOpen && (
          <div
            className={cn(
              'fixed z-50 flex flex-col overflow-hidden transition-all duration-300',
              'bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl',
              'border border-slate-200/50 dark:border-slate-700/50',
              'shadow-2xl shadow-violet-500/10',
              isExpanded
                ? 'inset-4 rounded-2xl'
                : 'bottom-6 right-6 w-[calc(100vw-3rem)] sm:w-96 h-[70vh] max-h-[600px] rounded-2xl'
            )}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b border-slate-200/50 dark:border-slate-700/50"
              style={{
                background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary || palette.primary})`
              }}
            >
              <div className="flex items-center gap-2 text-white">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-sm">Asistente IA</span>
                  {clientName && (
                    <span className="text-xs text-white/70 block">{clientName}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title={isExpanded ? 'Minimizar' : 'Expandir'}
                >
                  {isExpanded
                    ? <Minimize2 className="w-4 h-4 text-white" />
                    : <Maximize2 className="w-4 h-4 text-white" />
                  }
                </button>
                <button
                  onClick={clearChat}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Limpiar chat"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Cerrar"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Welcome + Suggestions */}
              {messages.length === 0 && showSuggestions && (
                <div className="space-y-4">
                  <div className="text-center py-6">
                    <div
                      className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3"
                      style={{ background: `linear-gradient(135deg, ${palette.primary}20, ${palette.primary}10)` }}
                    >
                      <Sparkles className="w-7 h-7" style={{ color: palette.primary }} />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      En que puedo ayudarte?
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Preguntame sobre campanas, metricas o recomendaciones
                    </p>
                  </div>

                  {/* Suggested questions */}
                  <div className="space-y-3">
                    {suggestedQuestions.map((cat, catIdx) => (
                      <div key={catIdx}>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
                          {cat.category}
                        </p>
                        <div className="space-y-1.5">
                          {cat.questions.slice(0, 3).map((q, qIdx) => (
                            <button
                              key={qIdx}
                              onClick={() => handleSuggestionClick(q)}
                              className="w-full text-left px-3 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 border border-slate-200/50 dark:border-slate-700/50"
                            >
                              <Lightbulb className="w-4 h-4 flex-shrink-0" style={{ color: palette.primary }} />
                              <span className="text-slate-700 dark:text-slate-300">{q}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages list */}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-2',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${palette.primary}20, ${palette.primary}10)` }}
                    >
                      <Bot className="w-4 h-4" style={{ color: palette.primary }} />
                    </div>
                  )}

                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-2.5',
                      message.role === 'user'
                        ? 'text-white rounded-br-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-md'
                    )}
                    style={message.role === 'user' ? {
                      background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary || palette.primary})`
                    } : undefined}
                  >
                    {message.content ? (
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Pensando...
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

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escribe tu pregunta..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-50 transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary || palette.primary})`
                  }}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-2">
                Powered by Claude AI
              </p>
            </form>
          </div>
        )}
      </>
    )
  }

  // Embedded version
  return (
    <div className="h-full flex flex-col bg-white/95 dark:bg-slate-900/95 rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-slate-200/50 dark:border-slate-700/50"
        style={{
          background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary || palette.primary})`
        }}
      >
        <div className="flex items-center gap-2 text-white">
          <Bot className="w-5 h-5" />
          <span className="font-medium">
            Asistente IA {clientName ? `• ${clientName}` : ''}
          </span>
        </div>
        <button
          onClick={clearChat}
          className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          title="Limpiar chat"
        >
          <Trash2 className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && showSuggestions && (
          <div className="text-center py-8">
            <div
              className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
              style={{ background: `linear-gradient(135deg, ${palette.primary}20, ${palette.primary}10)` }}
            >
              <Sparkles className="w-8 h-8" style={{ color: palette.primary }} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              En que puedo ayudarte?
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Soy tu asistente de analisis. Preguntame sobre metricas, optimizaciones o recomendaciones.
            </p>

            <div className="grid grid-cols-2 gap-2 mt-6 max-w-lg mx-auto">
              {suggestedQuestions[0]?.questions.slice(0, 4).map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(q)}
                  className="text-left px-3 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200/50 dark:border-slate-700/50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-2',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {message.role === 'assistant' && (
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${palette.primary}20, ${palette.primary}10)` }}
              >
                <Bot className="w-4 h-4" style={{ color: palette.primary }} />
              </div>
            )}

            <div
              className={cn(
                'max-w-[70%] rounded-2xl px-4 py-2.5',
                message.role === 'user'
                  ? 'text-white rounded-br-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-md'
              )}
              style={message.role === 'user' ? {
                background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary || palette.primary})`
              } : undefined}
            >
              {message.content ? (
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Pensando...
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
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu pregunta..."
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary || palette.primary})`
            }}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Send className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
