import { useState } from 'react'
import { useSelectedClient } from '../components/Layout'
import { useTheme } from '../lib/theme'
import { simulateBudgetChange, simulatePauseAd, getAdsAnalysis, mockClients } from '../lib/mockData'
import { Calculator, TrendingUp, Pause, DollarSign, Target, AlertCircle } from 'lucide-react'
import { safeNumber } from '../lib/utils'

export default function Simulator() {
  const { selectedClientId } = useSelectedClient()
  const { palette } = useTheme()
  const client = selectedClientId ? mockClients.find(c => c.id === selectedClientId) : null
  const [budgetChange, setBudgetChange] = useState(20)
  const [selectedAd, setSelectedAd] = useState('')
  const [activeTab, setActiveTab] = useState<'budget' | 'pause'>('budget')

  const ads = selectedClientId ? getAdsAnalysis(selectedClientId) : []
  const budgetResult = selectedClientId ? simulateBudgetChange(selectedClientId, budgetChange) : null
  const pauseResult = selectedClientId && selectedAd ? simulatePauseAd(selectedClientId, selectedAd) : null

  if (!selectedClientId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Simulador de Escenarios</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Proyecta el impacto de cambios antes de hacerlos</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg border p-8 text-center">
          <Calculator className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">Seleccioná un cliente</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Elegí un cliente del selector para simular escenarios.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Simulador de Escenarios</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Simulaciones para {client?.name}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('budget')}
          className={`min-h-[44px] px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
            activeTab === 'budget'
              ? 'text-white focus:ring-blue-500'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 focus:ring-slate-500'
          }`}
          style={activeTab === 'budget' ? { backgroundColor: palette.primary } : undefined}
        >
          <DollarSign className="w-4 h-4 inline mr-2" aria-hidden="true" />
          Cambio de Budget
        </button>
        <button
          onClick={() => setActiveTab('pause')}
          className={`min-h-[44px] px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
            activeTab === 'pause'
              ? 'text-white focus:ring-blue-500'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 focus:ring-slate-500'
          }`}
          style={activeTab === 'pause' ? { backgroundColor: palette.primary } : undefined}
        >
          <Pause className="w-4 h-4 inline mr-2" aria-hidden="true" />
          Pausar Anuncio
        </button>
      </div>

      {/* Budget Simulator */}
      {activeTab === 'budget' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border p-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Simular Cambio de Budget</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Cambio de presupuesto: {budgetChange > 0 ? '+' : ''}{budgetChange}%
                </label>
                <input
                  type="range"
                  min="-50"
                  max="100"
                  value={budgetChange}
                  onChange={(e) => setBudgetChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span>-50%</span>
                  <span>0%</span>
                  <span>+100%</span>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {[-30, -10, 10, 20, 50].map(val => (
                  <button
                    key={val}
                    onClick={() => setBudgetChange(val)}
                    className={`min-w-[44px] min-h-[44px] px-3 py-2 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 focus:ring-blue-500 ${
                      budgetChange === val
                        ? 'border-current'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                    style={budgetChange === val ? {
                      backgroundColor: `${palette.primary}15`,
                      borderColor: palette.primary,
                      color: palette.primary
                    } : undefined}
                  >
                    {val > 0 ? '+' : ''}{val}%
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Rendimientos decrecientes:</strong> Al aumentar budget,
                  cada peso adicional rinde ~80% de lo esperado.
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          {budgetResult && (
            <div className="bg-white dark:bg-slate-900 rounded-lg border p-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Proyección</h3>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="text-sm text-slate-500 dark:text-slate-400">Métrica</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Actual</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Proyectado</div>
                </div>

                <div className="grid grid-cols-3 gap-4 items-center py-3 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-slate-400" aria-hidden="true" />
                    <span className="font-medium text-slate-900 dark:text-white">Gasto</span>
                  </div>
                  <div className="text-center">
                    ${budgetResult.current.spend.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-center font-medium">
                    ${budgetResult.projected.spend.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                    <span className={`ml-2 text-sm ${budgetResult.delta.spend >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {budgetResult.delta.spend >= 0 ? '+' : ''}
                      ${budgetResult.delta.spend.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 items-center py-3 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-slate-400" aria-hidden="true" />
                    <span className="font-medium text-slate-900 dark:text-white">Resultados</span>
                  </div>
                  <div className="text-center">
                    {budgetResult.current.results.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-center font-medium">
                    {budgetResult.projected.results.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                    <span className={`ml-2 text-sm ${budgetResult.delta.results >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {budgetResult.delta.results >= 0 ? '+' : ''}
                      {budgetResult.delta.results.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 items-center py-3 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-slate-400" aria-hidden="true" />
                    <span className="font-medium text-slate-900 dark:text-white">CPR</span>
                  </div>
                  <div className="text-center">
                    ${safeNumber(budgetResult.current.cpr).toFixed(0)}
                  </div>
                  <div className="text-center font-medium">
                    ${safeNumber(budgetResult.projected.cpr).toFixed(0)}
                    <span className={`ml-2 text-sm ${safeNumber(budgetResult.delta.cprChange) <= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {safeNumber(budgetResult.delta.cprChange) >= 0 ? '+' : ''}
                      {safeNumber(budgetResult.delta.cprChange).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Confianza</div>
                <div className="text-sm text-slate-700 dark:text-slate-300 capitalize">{budgetResult.confidence}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{budgetResult.note}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pause Ad Simulator */}
      {activeTab === 'pause' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border p-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Simular Pausar Anuncio</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Seleccionar anuncio
                </label>
                <select
                  value={selectedAd}
                  onChange={(e) => setSelectedAd(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Elegir anuncio --</option>
                  {ads.map(ad => (
                    <option key={ad.adName} value={ad.adName}>
                      {ad.adName} (CPR: ${safeNumber(ad.avgCostPerResult).toFixed(0)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results */}
          {pauseResult && (
            <div className="bg-white dark:bg-slate-900 rounded-lg border p-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Impacto de Pausar</h3>

              <div className="space-y-4">
                {/* Current Contribution */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-2">Contribucion Actual</div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                        ${pauseResult.adContribution.spend.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">Gasto</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                        {pauseResult.adContribution.results}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">Resultados</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                        {safeNumber(pauseResult.adContribution.percentOfTotal).toFixed(1)}%
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">Del total</div>
                    </div>
                  </div>
                </div>

                {/* With Redistribution */}
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-sm text-green-600 dark:text-green-400 font-medium mb-2">Con Redistribucion de Budget</div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-green-700 dark:text-green-300">
                        {safeNumber(pauseResult.withRedistribution.results).toFixed(0)}
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400">Resultados</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-green-700 dark:text-green-300">
                        ${safeNumber(pauseResult.withRedistribution.cpr).toFixed(0)}
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400">CPR</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-green-700 dark:text-green-300">
                        +{safeNumber(pauseResult.withRedistribution.extraResults).toFixed(0)}
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400">Extra</div>
                    </div>
                  </div>
                </div>

                {/* Recommendation */}
                <div className={`p-4 rounded-lg border ${
                  pauseResult.recommendation === 'pausar'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                }`}>
                  <div className="flex items-center gap-2">
                    {pauseResult.recommendation === 'pausar' ? (
                      <>
                        <Pause className="w-5 h-5 text-red-600 dark:text-red-400" aria-hidden="true" />
                        <span className="font-medium text-red-700 dark:text-red-300">Recomendacion: Pausar</span>
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-yellow-400" aria-hidden="true" />
                        <span className="font-medium text-yellow-700 dark:text-yellow-300">Recomendacion: Mantener</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm mt-2 text-slate-600 dark:text-slate-400">
                    {pauseResult.recommendation === 'pausar'
                      ? 'Redistribuir el budget a otros anuncios generaria mejores resultados.'
                      : 'Este anuncio tiene buen rendimiento, pausarlo empeoraria los resultados.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
