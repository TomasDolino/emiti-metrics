import { FileText, Download, Calendar, Plus, Clock, ChevronRight, File } from 'lucide-react'
import { useTheme } from '../lib/theme'
import { formatDateFull } from '../lib/utils'

interface Report {
  id: string
  title: string
  type: 'WEEKLY' | 'MONTHLY' | 'CUSTOM'
  dateRange: { start: string; end: string }
  createdAt: string
  status: 'READY' | 'GENERATING'
}

const mockReports: Report[] = [
  {
    id: '1',
    title: 'Reporte Semanal - Semana 5',
    type: 'WEEKLY',
    dateRange: { start: '2024-02-05', end: '2024-02-11' },
    createdAt: '2024-02-12T10:00:00',
    status: 'READY'
  },
  {
    id: '2',
    title: 'Reporte Semanal - Semana 4',
    type: 'WEEKLY',
    dateRange: { start: '2024-01-29', end: '2024-02-04' },
    createdAt: '2024-02-05T10:00:00',
    status: 'READY'
  },
  {
    id: '3',
    title: 'Reporte Mensual - Enero 2024',
    type: 'MONTHLY',
    dateRange: { start: '2024-01-01', end: '2024-01-31' },
    createdAt: '2024-02-01T10:00:00',
    status: 'READY'
  }
]

// ==================== REPORT ROW (1 línea) ====================

interface ReportRowProps {
  report: Report
  palette: ReturnType<typeof useTheme>['palette']
}

function ReportRow({ report, palette }: ReportRowProps) {
  const typeColors = {
    WEEKLY: palette.primary,
    MONTHLY: palette.secondary,
    CUSTOM: palette.accent
  }

  return (
    <div
      className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border-l-4 hover:shadow-sm transition-shadow"
      style={{ borderLeftColor: typeColors[report.type] }}
    >
      {/* Icon */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${typeColors[report.type]}20` }}
      >
        <FileText className="w-4 h-4" style={{ color: typeColors[report.type] }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-white dark:text-white truncate">{report.title}</p>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Calendar className="w-3 h-3" />
          <span>{formatDateFull(report.dateRange.start)} - {formatDateFull(report.dateRange.end)}</span>
        </div>
      </div>

      {/* Type Badge */}
      <span
        className="px-2 py-0.5 rounded text-xs font-medium text-white flex-shrink-0 hidden sm:block"
        style={{ backgroundColor: typeColors[report.type] }}
      >
        {report.type === 'WEEKLY' ? 'Semanal' : report.type === 'MONTHLY' ? 'Mensual' : 'Custom'}
      </span>

      {/* Created */}
      <div className="text-right hidden md:block">
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Clock className="w-3 h-3" />
          {formatDateFull(report.createdAt)}
        </div>
      </div>

      {/* Download */}
      <button
        className="p-1.5 rounded-lg transition-colors"
        style={{ color: palette.primary, backgroundColor: `${palette.primary}10` }}
      >
        <Download className="w-4 h-4" />
      </button>
    </div>
  )
}

// ==================== REPORTS PAGE ====================

export default function Reports() {
  const { palette } = useTheme()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white dark:text-white">Reportes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Genera y descarga reportes de tus campañas</p>
        </div>

        <button
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-colors"
          style={{ backgroundColor: palette.primary }}
        >
          <Plus className="w-4 h-4" />
          Nuevo Reporte
        </button>
      </div>

      {/* Report Templates */}
      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { type: 'WEEKLY' as const, title: 'Reporte Semanal', desc: 'Últimos 7 días', color: palette.primary },
          { type: 'MONTHLY' as const, title: 'Reporte Mensual', desc: 'Último mes completo', color: palette.secondary },
          { type: 'CUSTOM' as const, title: 'Personalizado', desc: 'Elige el rango', color: palette.accent }
        ].map((template) => (
          <button
            key={template.type}
            className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow text-left group border-l-4"
            style={{ borderLeftColor: template.color }}
          >
            <div className="flex items-start justify-between">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${template.color}15` }}
              >
                <FileText className="w-5 h-5" style={{ color: template.color }} />
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:text-slate-400 transition-colors" />
            </div>
            <h3 className="font-medium text-slate-900 dark:text-white dark:text-white mt-3">{template.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{template.desc}</p>
          </button>
        ))}
      </div>

      {/* Report History */}
      <div>
        <h2 className="font-medium text-slate-900 dark:text-white dark:text-white mb-3">Historial de Reportes</h2>
        <div className="space-y-2">
          {mockReports.map((report) => (
            <ReportRow key={report.id} report={report} palette={palette} />
          ))}
        </div>
      </div>

      {mockReports.length === 0 && (
        <div className="text-center py-12">
          <File className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">No hay reportes generados</p>
        </div>
      )}
    </div>
  )
}
