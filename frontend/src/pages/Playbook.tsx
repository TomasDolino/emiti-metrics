import { useSelectedClient } from '../components/Layout'
import { useTheme } from '../lib/theme'
import { generatePlaybook, getAgencyROI, mockClients } from '../lib/mockData'
import {
  BookOpen,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  TrendingUp,
  DollarSign,
  Award,
  Lightbulb,
  Copy,
  Check
} from 'lucide-react'
import { useState } from 'react'

export default function Playbook() {
  const { selectedClientId } = useSelectedClient()
  const { palette } = useTheme()
  const client = selectedClientId ? mockClients.find(c => c.id === selectedClientId) : null
  const [copied, setCopied] = useState(false)

  if (!selectedClientId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Playbook</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Guía de mejores prácticas por cliente</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">Seleccioná un cliente</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Elegí un cliente del selector para ver su playbook personalizado.
          </p>
        </div>
      </div>
    )
  }

  const playbook = generatePlaybook(selectedClientId)
  const roi = getAgencyROI(selectedClientId)

  const copyPlaybook = () => {
    const text = `
PLAYBOOK - ${playbook.clientName}
Generado: ${new Date(playbook.generatedAt).toLocaleDateString('es-AR')}
Quality Score: ${playbook.qualityScore}/100

✅ HACER:
${playbook.do.map(d => `• ${d}`).join('\n')}

❌ NO HACER:
${playbook.dont.map(d => `• ${d}`).join('\n')}

👁 MONITOREAR:
${playbook.monitor.map(m => `• ${m}`).join('\n')}

📊 ESTRUCTURA RECOMENDADA:
• Ads por Ad Set: ${playbook.recommendedStructure.adsPerAdset}
• Ad Sets por Campaign: ${playbook.recommendedStructure.adsetsPerCampaign}
• Rotación de Creativos: ${playbook.recommendedStructure.creativeRotation}
    `.trim()

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Playbook</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Guía personalizada para {client?.name}
          </p>
        </div>
        <button
          onClick={copyPlaybook}
          className="flex items-center gap-2 px-4 py-2 min-h-[44px] text-white rounded-lg transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
          style={{ backgroundColor: palette.primary }}
          aria-label={copied ? 'Playbook copiado al portapapeles' : 'Copiar playbook al portapapeles'}
        >
          {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
          {copied ? 'Copiado!' : 'Copiar Playbook'}
        </button>
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
            <Award className="w-4 h-4" aria-hidden="true" />
            <span className="text-sm">Quality Score</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{playbook.qualityScore}/100</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
            <Lightbulb className="w-4 h-4" aria-hidden="true" />
            <span className="text-sm">Aprendizajes</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{playbook.learnings.length}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
            <Calendar className="w-4 h-4" aria-hidden="true" />
            <span className="text-sm">Generado</span>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white">
            {new Date(playbook.generatedAt).toLocaleDateString('es-AR')}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
            <TrendingUp className="w-4 h-4" aria-hidden="true" />
            <span className="text-sm">ROI Agencia</span>
          </div>
          <div className="text-lg font-bold text-green-600 dark:text-green-400">{roi.optimizationImpact}</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* DO */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-800/30">
            <h3 className="font-semibold text-green-800 dark:text-green-400 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" aria-hidden="true" />
              HACER
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {playbook.do.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-sm">Sin recomendaciones específicas aún.</p>
            ) : (
              playbook.do.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-slate-700 dark:text-slate-300">{item}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* DON'T */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800/30">
            <h3 className="font-semibold text-red-800 dark:text-red-400 flex items-center gap-2">
              <XCircle className="w-5 h-5" aria-hidden="true" />
              NO HACER
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {playbook.dont.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span className="text-slate-700 dark:text-slate-300">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* MONITOR */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/30">
            <h3 className="font-semibold text-blue-800 dark:text-blue-400 flex items-center gap-2">
              <Eye className="w-5 h-5" aria-hidden="true" />
              MONITOREAR
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {playbook.monitor.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <Eye className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span className="text-slate-700 dark:text-slate-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Learnings */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5" aria-hidden="true" style={{ color: palette.primary }} />
          Aprendizajes Detectados
        </h3>

        {playbook.learnings.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400">No hay suficientes datos para generar aprendizajes.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {playbook.learnings.map((learning, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-l-4 ${
                  learning.type === 'works'
                    ? 'bg-green-50 dark:bg-green-900/20 border-l-green-500'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-l-blue-500'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {learning.type === 'works' ? (
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" aria-hidden="true" />
                  ) : (
                    <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  )}
                  <span className={`text-xs font-medium uppercase ${
                    learning.type === 'works' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'
                  }`}>
                    {learning.type === 'works' ? 'Funciona' : 'Insight'}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-400 capitalize">
                    {learning.category}
                  </span>
                </div>
                <p className="text-slate-800 dark:text-slate-100 font-medium">{learning.text}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{learning.evidence}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommended Structure */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Estructura Recomendada</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg text-center">
            <div className="text-2xl font-bold" style={{ color: palette.primary }}>
              {playbook.recommendedStructure.adsPerAdset}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Ads por Ad Set</div>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg text-center">
            <div className="text-2xl font-bold" style={{ color: palette.primary }}>
              {playbook.recommendedStructure.adsetsPerCampaign}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Ad Sets por Campaign</div>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg text-center">
            <div className="text-2xl font-bold" style={{ color: palette.primary }}>
              {playbook.recommendedStructure.creativeRotation}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Rotación de Creativos</div>
          </div>
        </div>
      </div>

      {/* Agency ROI */}
      <div
        className="rounded-xl p-6 text-white"
        style={{ background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})` }}
      >
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5" aria-hidden="true" />
          ROI de la Agencia
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-2xl font-bold">
              ${roi.totalSpendManaged.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-sm text-white/70">Spend Manejado</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{roi.totalResults.toLocaleString()}</div>
            <div className="text-sm text-white/70">Resultados</div>
          </div>
          <div>
            <div className="text-2xl font-bold">+{roi.extraResultsGenerated.toFixed(0)}</div>
            <div className="text-sm text-white/70">Resultados Extra</div>
          </div>
          <div>
            <div className="text-2xl font-bold">
              ${roi.estimatedValueGenerated.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-sm text-white/70">Valor Generado</div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-white/10 rounded-lg">
          <p className="text-sm">
            Sin optimización, el CPR sería ~${roi.estimatedUnoptimizedCpr.toFixed(0)} (vs ${roi.optimizedCpr.toFixed(0)} actual).
            La agencia genera <strong>{roi.optimizationImpact}</strong> de los que se obtendrían sin gestión profesional.
          </p>
        </div>
      </div>
    </div>
  )
}
