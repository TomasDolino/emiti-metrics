/**
 * PDF Report Generator for Emiti Metrics
 * Generates professional client reports using jsPDF
 */

import jsPDF from 'jspdf'
import { formatMoney, formatNumber, formatPercent } from './utils'

interface ReportData {
  clientName: string
  clientIndustry: string
  dateRange: {
    start: string
    end: string
  }
  metrics: {
    totalSpend: number
    totalResults: number
    avgCPR: number
    avgCTR: number
    totalImpressions: number
    totalClicks: number
  }
  topAds: Array<{
    name: string
    results: number
    cpr: number
    classification: string
  }>
  alerts: Array<{
    type: string
    message: string
  }>
  patterns: Array<{
    pattern: string
    impact: string
  }>
  recommendations: string[]
}

interface ReportOptions {
  includeTopAds?: boolean
  includeAlerts?: boolean
  includePatterns?: boolean
  includeRecommendations?: boolean
  agencyName?: string
  agencyColor?: string
}

const DEFAULT_OPTIONS: ReportOptions = {
  includeTopAds: true,
  includeAlerts: true,
  includePatterns: true,
  includeRecommendations: true,
  agencyName: 'Emiti',
  agencyColor: '#A8B5A0'
}

export function generateClientReport(
  data: ReportData,
  options: ReportOptions = {}
): jsPDF {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const doc = new jsPDF()

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // Colors
  const primaryColor = opts.agencyColor || '#A8B5A0'
  const textColor = '#1f2937'
  const mutedColor = '#6b7280'

  // Helper function to add a new page if needed
  const checkPageBreak = (neededSpace: number) => {
    const pageHeight = doc.internal.pageSize.getHeight()
    if (y + neededSpace > pageHeight - margin) {
      doc.addPage()
      y = margin
      return true
    }
    return false
  }

  // ==================== HEADER ====================

  // Background bar
  doc.setFillColor(primaryColor)
  doc.rect(0, 0, pageWidth, 40, 'F')

  // Agency name
  doc.setTextColor('#ffffff')
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text(opts.agencyName || 'Emiti', margin, 28)

  // Report title
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('Reporte de Performance', pageWidth - margin, 28, { align: 'right' })

  y = 55

  // ==================== CLIENT INFO ====================

  doc.setTextColor(textColor)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(data.clientName, margin, y)
  y += 8

  doc.setFontSize(10)
  doc.setTextColor(mutedColor)
  doc.setFont('helvetica', 'normal')
  doc.text(data.clientIndustry, margin, y)
  y += 5

  doc.text(`Período: ${data.dateRange.start} - ${data.dateRange.end}`, margin, y)
  y += 15

  // ==================== KEY METRICS ====================

  doc.setTextColor(textColor)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Métricas Clave', margin, y)
  y += 10

  // Metrics grid
  const metricsData = [
    { label: 'Inversión Total', value: formatMoney(data.metrics.totalSpend) },
    { label: 'Resultados', value: formatNumber(data.metrics.totalResults) },
    { label: 'CPR Promedio', value: formatMoney(data.metrics.avgCPR) },
    { label: 'CTR Promedio', value: formatPercent(data.metrics.avgCTR) },
  ]

  const boxWidth = (contentWidth - 10) / 2
  const boxHeight = 30

  metricsData.forEach((metric, i) => {
    const x = margin + (i % 2) * (boxWidth + 10)
    const boxY = y + Math.floor(i / 2) * (boxHeight + 5)

    // Box
    doc.setFillColor('#f3f4f6')
    doc.roundedRect(x, boxY, boxWidth, boxHeight, 3, 3, 'F')

    // Label
    doc.setFontSize(9)
    doc.setTextColor(mutedColor)
    doc.setFont('helvetica', 'normal')
    doc.text(metric.label, x + 8, boxY + 12)

    // Value
    doc.setFontSize(16)
    doc.setTextColor(textColor)
    doc.setFont('helvetica', 'bold')
    doc.text(metric.value, x + 8, boxY + 24)
  })

  y += (boxHeight + 5) * 2 + 15

  // ==================== TOP ADS ====================

  if (opts.includeTopAds && data.topAds.length > 0) {
    checkPageBreak(60)

    doc.setTextColor(textColor)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Top Anuncios', margin, y)
    y += 10

    // Table header
    doc.setFillColor('#f9fafb')
    doc.rect(margin, y, contentWidth, 8, 'F')

    doc.setFontSize(8)
    doc.setTextColor(mutedColor)
    doc.setFont('helvetica', 'bold')
    doc.text('ANUNCIO', margin + 3, y + 6)
    doc.text('RESULTADOS', margin + 100, y + 6)
    doc.text('CPR', margin + 135, y + 6)
    doc.text('ESTADO', margin + 155, y + 6)
    y += 12

    // Table rows
    doc.setFont('helvetica', 'normal')
    data.topAds.slice(0, 5).forEach((ad) => {
      checkPageBreak(10)

      doc.setTextColor(textColor)
      doc.setFontSize(9)

      // Truncate name if too long
      const maxNameLength = 40
      const displayName = ad.name.length > maxNameLength
        ? ad.name.substring(0, maxNameLength) + '...'
        : ad.name

      doc.text(displayName, margin + 3, y)
      doc.text(formatNumber(ad.results), margin + 100, y)
      doc.text(formatMoney(ad.cpr), margin + 135, y)

      // Classification badge color
      const classColors: Record<string, string> = {
        'GANADOR': '#22c55e',
        'ESCALABLE': '#3b82f6',
        'TESTING': '#eab308',
        'FATIGADO': '#f97316',
        'PAUSAR': '#ef4444'
      }
      doc.setTextColor(classColors[ad.classification] || mutedColor)
      doc.text(ad.classification, margin + 155, y)

      y += 8
    })

    y += 10
  }

  // ==================== PATTERNS ====================

  if (opts.includePatterns && data.patterns.length > 0) {
    checkPageBreak(40)

    doc.setTextColor(textColor)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Patrones Detectados', margin, y)
    y += 10

    data.patterns.slice(0, 4).forEach((pattern) => {
      checkPageBreak(15)

      // Green dot
      doc.setFillColor('#22c55e')
      doc.circle(margin + 3, y - 2, 2, 'F')

      doc.setFontSize(10)
      doc.setTextColor(textColor)
      doc.setFont('helvetica', 'normal')
      doc.text(pattern.pattern, margin + 10, y)
      y += 5

      doc.setFontSize(9)
      doc.setTextColor('#22c55e')
      doc.text(pattern.impact, margin + 10, y)
      y += 10
    })

    y += 5
  }

  // ==================== ALERTS ====================

  if (opts.includeAlerts && data.alerts.length > 0) {
    checkPageBreak(40)

    doc.setTextColor(textColor)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Alertas', margin, y)
    y += 10

    data.alerts.slice(0, 3).forEach((alert) => {
      checkPageBreak(12)

      // Warning dot
      const alertColor = alert.type === 'critical' ? '#ef4444' : '#f59e0b'
      doc.setFillColor(alertColor)
      doc.circle(margin + 3, y - 2, 2, 'F')

      doc.setFontSize(9)
      doc.setTextColor(textColor)
      doc.setFont('helvetica', 'normal')
      doc.text(alert.message, margin + 10, y, { maxWidth: contentWidth - 15 })
      y += 12
    })

    y += 5
  }

  // ==================== RECOMMENDATIONS ====================

  if (opts.includeRecommendations && data.recommendations.length > 0) {
    checkPageBreak(50)

    doc.setTextColor(textColor)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Recomendaciones', margin, y)
    y += 10

    data.recommendations.slice(0, 5).forEach((rec, i) => {
      checkPageBreak(12)

      // Number circle
      doc.setFillColor(primaryColor)
      doc.circle(margin + 4, y - 2, 4, 'F')
      doc.setFontSize(8)
      doc.setTextColor('#ffffff')
      doc.setFont('helvetica', 'bold')
      doc.text(String(i + 1), margin + 2.5, y)

      doc.setFontSize(9)
      doc.setTextColor(textColor)
      doc.setFont('helvetica', 'normal')
      doc.text(rec, margin + 12, y, { maxWidth: contentWidth - 20 })
      y += 12
    })
  }

  // ==================== FOOTER ====================

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const pageHeight = doc.internal.pageSize.getHeight()

    // Footer line
    doc.setDrawColor('#e5e7eb')
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15)

    // Footer text
    doc.setFontSize(8)
    doc.setTextColor(mutedColor)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Generado por ${opts.agencyName} • ${new Date().toLocaleDateString('es-AR')}`,
      margin,
      pageHeight - 8
    )
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' }
    )
  }

  return doc
}

export function downloadReport(data: ReportData, options?: ReportOptions) {
  const doc = generateClientReport(data, options)
  const fileName = `reporte_${data.clientName.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

export function getReportBlob(data: ReportData, options?: ReportOptions): Blob {
  const doc = generateClientReport(data, options)
  return doc.output('blob')
}

export default { generateClientReport, downloadReport, getReportBlob }
