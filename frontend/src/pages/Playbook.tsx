import { useSelectedClient } from '../components/Layout'
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
  const client = selectedClientId ? mockClients.find(c => c.id === selectedClientId) : null
  const [copied, setCopied] = useState(false)

  if (!selectedClientId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Playbook</h1>
          <p className="text-gray-500 mt-1">Guía de mejores prácticas por cliente</p>
        </div>
        <div className="bg-white rounded-lg border p-8 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Seleccioná un cliente</h3>
          <p className="text-gray-500 mt-2">
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
          <h1 className="text-2xl font-bold text-gray-900">Playbook</h1>
          <p className="text-gray-500 mt-1">
            Guía personalizada para {client?.name}
          </p>
        </div>
        <button
          onClick={copyPlaybook}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copiado!' : 'Copiar Playbook'}
        </button>
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Award className="w-4 h-4" />
            <span className="text-sm">Quality Score</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{playbook.qualityScore}/100</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Lightbulb className="w-4 h-4" />
            <span className="text-sm">Aprendizajes</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{playbook.learnings.length}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Generado</span>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {new Date(playbook.generatedAt).toLocaleDateString('es-AR')}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">ROI Agencia</span>
          </div>
          <div className="text-lg font-bold text-green-600">{roi.optimizationImpact}</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* DO */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-4 py-3 bg-green-50 border-b border-green-100">
            <h3 className="font-semibold text-green-800 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              HACER
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {playbook.do.length === 0 ? (
              <p className="text-gray-500 text-sm">Sin recomendaciones específicas aún.</p>
            ) : (
              playbook.do.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{item}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* DON'T */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-4 py-3 bg-red-50 border-b border-red-100">
            <h3 className="font-semibold text-red-800 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              NO HACER
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {playbook.dont.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* MONITOR */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
            <h3 className="font-semibold text-blue-800 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              MONITOREAR
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {playbook.monitor.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <Eye className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Learnings */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-primary-600" />
          Aprendizajes Detectados
        </h3>

        {playbook.learnings.length === 0 ? (
          <p className="text-gray-500">No hay suficientes datos para generar aprendizajes.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {playbook.learnings.map((learning, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-l-4 ${
                  learning.type === 'works'
                    ? 'bg-green-50 border-l-green-500'
                    : 'bg-blue-50 border-l-blue-500'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {learning.type === 'works' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Lightbulb className="w-4 h-4 text-blue-600" />
                  )}
                  <span className={`text-xs font-medium uppercase ${
                    learning.type === 'works' ? 'text-green-600' : 'text-blue-600'
                  }`}>
                    {learning.type === 'works' ? 'Funciona' : 'Insight'}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600 capitalize">
                    {learning.category}
                  </span>
                </div>
                <p className="text-gray-800 font-medium">{learning.text}</p>
                <p className="text-sm text-gray-500 mt-1">{learning.evidence}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommended Structure */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Estructura Recomendada</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <div className="text-2xl font-bold text-primary-600">
              {playbook.recommendedStructure.adsPerAdset}
            </div>
            <div className="text-sm text-gray-600">Ads por Ad Set</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <div className="text-2xl font-bold text-primary-600">
              {playbook.recommendedStructure.adsetsPerCampaign}
            </div>
            <div className="text-sm text-gray-600">Ad Sets por Campaign</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <div className="text-2xl font-bold text-primary-600">
              {playbook.recommendedStructure.creativeRotation}
            </div>
            <div className="text-sm text-gray-600">Rotación de Creativos</div>
          </div>
        </div>
      </div>

      {/* Agency ROI */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5" />
          ROI de la Agencia
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-2xl font-bold">
              ${roi.totalSpendManaged.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-sm text-primary-100">Spend Manejado</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{roi.totalResults.toLocaleString()}</div>
            <div className="text-sm text-primary-100">Resultados</div>
          </div>
          <div>
            <div className="text-2xl font-bold">+{roi.extraResultsGenerated.toFixed(0)}</div>
            <div className="text-sm text-primary-100">Resultados Extra</div>
          </div>
          <div>
            <div className="text-2xl font-bold">
              ${roi.estimatedValueGenerated.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-sm text-primary-100">Valor Generado</div>
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
