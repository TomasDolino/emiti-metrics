/**
 * AI Lab Page
 * Central hub for all AI-powered features
 */

import { useState } from 'react'
import {
  FileText,
  Lightbulb,
  Brain,
  CheckCircle,
  BarChart3
} from 'lucide-react'
import { useTheme } from '../lib/theme'
import { useSelectedClient } from '../components/Layout'
import { mockClients } from '../lib/mockData'
import CreativeComparison from '../components/CreativeComparison'
import AIRecommendations from '../components/AIRecommendations'
import AIReportGenerator from '../components/AIReportGenerator'

type Tab = 'comparison' | 'recommendations' | 'reports'

const tabs = [
  { id: 'comparison' as Tab, name: 'Comparar Creativos', icon: BarChart3, description: 'Compara con tus mejores anuncios' },
  { id: 'recommendations' as Tab, name: 'Recomendaciones AI', icon: Lightbulb, description: 'Sugerencias de optimizacion' },
  { id: 'reports' as Tab, name: 'Reportes Ejecutivos', icon: FileText, description: 'Genera reportes en lenguaje natural' },
]

export default function AILab() {
  const { palette } = useTheme()
  const { selectedClientId } = useSelectedClient()
  const [activeTab, setActiveTab] = useState<Tab>('comparison')

  const selectedClient = selectedClientId ? mockClients.find(c => c.id === selectedClientId) : null

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})` }}
        >
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            AI Lab
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Herramientas potenciadas por Claude AI
          </p>
        </div>

        {/* AI Status Badge */}
        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium text-green-700 dark:text-green-400">
            Claude AI Activo
          </span>
        </div>
      </div>

      {/* Client Context */}
      {selectedClient && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl"
          style={{ backgroundColor: `${selectedClient.color}15`, borderLeft: `4px solid ${selectedClient.color}` }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: selectedClient.color }}
          >
            {selectedClient.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-white">{selectedClient.name}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">El análisis se enfocará en este cliente</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="relative">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'text-white shadow-lg'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
              style={activeTab === tab.id ? { backgroundColor: palette.primary } : undefined}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </div>
        {/* Scroll indicator gradient */}
        <div className="absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white dark:from-slate-900 to-transparent pointer-events-none md:hidden" />
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'comparison' && (
          <CreativeComparison />
        )}

        {activeTab === 'recommendations' && (
          <AIRecommendations
            clientId={selectedClientId}
            clientName={selectedClient?.name}
          />
        )}

        {activeTab === 'reports' && (
          <AIReportGenerator
            clientId={selectedClientId}
            clientName={selectedClient?.name}
          />
        )}
      </div>

      {/* Features Overview */}
      <div className="grid md:grid-cols-3 gap-4 mt-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${palette.primary}20` }}>
              <BarChart3 className="w-5 h-5" style={{ color: palette.primary }} />
            </div>
            <h3 className="font-medium text-slate-900 dark:text-white">Comparacion con Datos Reales</h3>
          </div>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Compara con tus top performers
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              40+ atributos analizados
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Recomendaciones basadas en datos
            </li>
          </ul>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${palette.primary}20` }}>
              <Lightbulb className="w-5 h-5" style={{ color: palette.primary }} />
            </div>
            <h3 className="font-medium text-slate-900 dark:text-white">Smart Recommendations</h3>
          </div>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Optimización de presupuesto
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Sugerencias de audiencia
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Acciones priorizadas
            </li>
          </ul>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${palette.primary}20` }}>
              <FileText className="w-5 h-5" style={{ color: palette.primary }} />
            </div>
            <h3 className="font-medium text-slate-900 dark:text-white">Natural Language Reports</h3>
          </div>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Reportes ejecutivos automáticos
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Lenguaje claro para clientes
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Insights accionables
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
