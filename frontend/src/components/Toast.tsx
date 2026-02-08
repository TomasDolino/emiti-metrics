/**
 * Toast notification system
 * Provides a global toast context for showing notifications
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '../lib/utils'

// ==================== TYPES ====================

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number // ms, 0 = no auto-dismiss
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

// ==================== CONTEXT ====================

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// ==================== PROVIDER ====================

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 4000
    }
    setToasts(prev => [...prev, newToast])
  }, [])

  const success = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message })
  }, [addToast])

  const error = useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message, duration: 6000 })
  }, [addToast])

  const warning = useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message, duration: 5000 })
  }, [addToast])

  const info = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message })
  }, [addToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

// ==================== TOAST CONTAINER ====================

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

// ==================== TOAST ITEM ====================

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [isLeaving, setIsLeaving] = useState(false)
  const [progress, setProgress] = useState(100)

  const handleRemove = useCallback(() => {
    setIsLeaving(true)
    setTimeout(() => onRemove(toast.id), 200)
  }, [toast.id, onRemove])

  // Auto-dismiss timer
  useEffect(() => {
    if (toast.duration === 0) return

    const startTime = Date.now()
    const duration = toast.duration || 4000

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)

      if (remaining === 0) {
        clearInterval(interval)
        handleRemove()
      }
    }, 50)

    return () => clearInterval(interval)
  }, [toast.duration, handleRemove])

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />
  }

  const colors = {
    success: 'border-l-green-500 bg-green-50 dark:bg-green-900/20',
    error: 'border-l-red-500 bg-red-50 dark:bg-red-900/20',
    warning: 'border-l-amber-500 bg-amber-50 dark:bg-amber-900/20',
    info: 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20'
  }

  const progressColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500'
  }

  return (
    <div
      className={cn(
        'pointer-events-auto w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border-l-4 overflow-hidden transition-all duration-200',
        colors[toast.type],
        isLeaving ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0 animate-fadeIn'
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {icons[toast.type]}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{toast.title}</p>
            {toast.message && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{toast.message}</p>
            )}
          </div>
          <button
            onClick={handleRemove}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {toast.duration !== 0 && (
        <div className="h-1 bg-gray-100 dark:bg-gray-700">
          <div
            className={cn('h-full transition-all duration-100', progressColors[toast.type])}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

export default ToastProvider
