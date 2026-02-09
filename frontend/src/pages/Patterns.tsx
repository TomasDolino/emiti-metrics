import { useSelectedClient } from '../components/Layout'
import { minePatterns, mockClients } from '../lib/mockData'
import { Lightbulb, TrendingUp, Clock, MessageSquare, Users, Video } from 'lucide-react'

const categoryIcons: Record<string, React.ReactNode> = {
  format: <Video className="w-5 h-5" />,
  creative: <Lightbulb className="w-5 h-5" />,
  timing: <Clock className="w-5 h-5" />,
  messaging: <MessageSquare className="w-5 h-5" />,
  audience: <Users className="w-5 h-5" />,
}

const categoryColors: Record<string, string> = {
  format: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
  creative: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30',
  timing: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30',
  messaging: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30',
  audience: 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-500/30',
}

const confidenceColors: Record<string, string> = {
  high: 'bg-green-500 dark:bg-green-600',
  medium: 'bg-yellow-500 dark:bg-yellow-600',
  low: 'bg-gray-400 dark:bg-gray-600',
}

export default function Patterns() {
  const { selectedClientId } = useSelectedClient()
  const client = selectedClientId ? mockClients.find(c => c.id === selectedClientId) : null
  const patterns = minePatterns(selectedClientId || undefined)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pattern Mining</h1>
        <p className="text-slate-500 mt-1">
          {client ? `Patrones detectados para ${client.name}` : 'Patrones detectados en todos los clientes'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{patterns.length}</div>
          <div className="text-sm text-slate-500">Patrones detectados</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {patterns.filter(p => p.confidence === 'high').length}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Alta confianza</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg border p-4">
          <div className="text-2xl font-bold text-blue-600">
            {[...new Set(patterns.map(p => p.category))].length}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Categorías</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg border p-4">
          <div className="text-2xl font-bold text-purple-600">
            {patterns.filter(p => p.category === 'format').length}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Patrones de formato</div>
        </div>
      </div>

      {/* Patterns Grid */}
      {patterns.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-lg border p-8 text-center">
          <Lightbulb className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">No hay patrones detectados</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Se necesitan más datos para detectar patrones significativos.
            <br />
            Mínimo: 10 registros de métricas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {patterns.map((pattern, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 rounded-lg border p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${categoryColors[pattern.category] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                  {categoryIcons[pattern.category]}
                  <span className="text-sm font-medium capitalize">{pattern.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${confidenceColors[pattern.confidence]}`} />
                  <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{pattern.confidence}</span>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {pattern.pattern}
              </h3>

              <div className="flex items-center gap-2 text-green-600 mb-3">
                <TrendingUp className="w-4 h-4" />
                <span className="font-medium">{pattern.impact}</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Recomendación</div>
                <div className="text-sm text-slate-700 dark:text-slate-300">{pattern.recommendation}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border p-4">
        <h3 className="font-medium text-slate-900 dark:text-white mb-3">Categorías de Patrones</h3>
        <div className="flex flex-wrap gap-4">
          {Object.entries(categoryColors).map(([cat, color]) => (
            <div key={cat} className={`flex items-center gap-2 px-3 py-1 rounded-full border ${color}`}>
              {categoryIcons[cat]}
              <span className="text-sm capitalize">{cat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
