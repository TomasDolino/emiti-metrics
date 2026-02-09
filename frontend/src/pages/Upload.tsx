import { useState, useCallback } from 'react'
import { useSelectedClient } from '../components/Layout'
import { useTheme } from '../lib/theme'
import { mockClients } from '../lib/mockData'
import { api } from '../lib/api'
import { Upload as UploadIcon, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Download, Info } from 'lucide-react'

interface UploadResult {
  success: boolean
  message: string
  summary?: any
  database?: { rows_added: number; rows_updated: number; campaigns: number }
  alerts_generated?: number
  error?: string
}

export default function Upload() {
  const { selectedClientId } = useSelectedClient()
  const { palette } = useTheme()
  const client = selectedClientId ? mockClients.find(c => c.id === selectedClientId) : null

  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file)
        setResult(null)
      } else {
        setResult({ success: false, message: 'Solo se aceptan archivos CSV' })
      }
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !selectedClientId) return

    setUploading(true)
    setResult(null)

    try {
      const response = await api.uploadCSV(selectedClientId, selectedFile)
      setResult({
        success: true,
        message: response.message,
        summary: response.summary,
        database: response.database,
        alerts_generated: response.alerts_generated
      })
      setSelectedFile(null)
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Error al subir archivo'
      })
    } finally {
      setUploading(false)
    }
  }

  const downloadTemplate = () => {
    const csvContent = `Nombre de la campana,Nombre del conjunto de anuncios,Nombre del anuncio,Dia,Importe gastado (ARS),Impresiones,Alcance,Frecuencia,Clics (todos),Clics en el enlace,CTR (tasa de clics en el enlace),CPC (coste por clic en el enlace),CPM (coste por 1.000 impresiones),Resultados,Coste por resultado
Mensajes - Febrero 2024,Publico Amplio,Video Testimonial,2024-02-01,1500,12000,8000,1.5,180,120,1.0,12.5,125,15,100
Mensajes - Febrero 2024,Publico Amplio,Imagen Producto,2024-02-01,1200,10000,7500,1.33,150,90,0.9,13.33,120,12,100`

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'template_meta_ads.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!selectedClientId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subir Datos</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Importa datos de Meta Ads desde un archivo CSV</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
          <UploadIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">Selecciona un cliente</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Elegi un cliente del selector para subir sus datos.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subir Datos</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Importar datos de Meta Ads para {client?.name}
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border rounded-lg hover:bg-slate-50 dark:bg-slate-800 transition-colors"
        >
          <Download className="w-4 h-4" />
          Descargar Template
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">Como exportar datos de Meta Ads:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>Anda a Meta Ads Manager</li>
              <li>Selecciona el rango de fechas (recomendado: ultimos 30 dias)</li>
              <li>Configura las columnas: Gasto, Impresiones, Alcance, Frecuencia, Clics, CTR, CPM, Resultados, CPR</li>
              <li>Desglose por: Dia, Campana, Conjunto de anuncios, Anuncio</li>
              <li>Exporta como CSV</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-current'
            : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
        }`}
        style={dragActive ? { borderColor: palette.primary, backgroundColor: `${palette.primary}10` } : undefined}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <FileSpreadsheet
          className="w-12 h-12 mx-auto mb-4"
          style={{ color: dragActive ? palette.primary : '#9ca3af' }}
        />

        {selectedFile ? (
          <div>
            <p className="text-lg font-medium text-slate-900 dark:text-white">{selectedFile.name}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <div>
            <p className="text-lg font-medium text-slate-900 dark:text-white">
              Arrastra un archivo CSV o hace clic para seleccionar
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Exporta desde Meta Ads Manager
            </p>
          </div>
        )}
      </div>

      {/* Upload Button */}
      {selectedFile && (
        <div className="flex justify-center">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="flex items-center gap-2 px-6 py-3 text-white rounded-lg transition-colors disabled:opacity-50 hover:opacity-90"
            style={{ backgroundColor: palette.primary }}
          >
            {uploading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <UploadIcon className="w-5 h-5" />
                Subir Archivo
              </>
            )}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div
          className={`rounded-lg border p-6 ${
            result.success
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            )}
            <div className="flex-1">
              <h3 className={`font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                {result.success ? 'Datos cargados exitosamente' : 'Error al cargar'}
              </h3>
              <p className={`mt-1 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                {result.message}
              </p>

              {result.success && result.database && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-green-200">
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{result.database.rows_added}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Filas agregadas</div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-green-200">
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{result.database.rows_updated}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Filas actualizadas</div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-green-200">
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{result.database.campaigns}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Campanas</div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-green-200">
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{result.alerts_generated || 0}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Alertas generadas</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Column Reference */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Columnas Requeridas</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { name: 'Nombre de la campana', desc: 'Campaign name' },
            { name: 'Nombre del conjunto', desc: 'Ad set name' },
            { name: 'Nombre del anuncio', desc: 'Ad name' },
            { name: 'Dia', desc: 'Date' },
            { name: 'Importe gastado', desc: 'Spend' },
            { name: 'Impresiones', desc: 'Impressions' },
            { name: 'Alcance', desc: 'Reach' },
            { name: 'Frecuencia', desc: 'Frequency' },
            { name: 'Clics', desc: 'Clicks' },
            { name: 'CTR', desc: 'Click-through rate' },
            { name: 'CPM', desc: 'Cost per 1000' },
            { name: 'Resultados', desc: 'Results' },
            { name: 'Coste por resultado', desc: 'Cost per result' },
          ].map(col => (
            <div key={col.name} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="text-sm font-medium text-slate-900 dark:text-white">{col.name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{col.desc}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">
              El sistema acepta columnas en espanol (exportacion de Meta Ads Argentina) y las normaliza automaticamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
