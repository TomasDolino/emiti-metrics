/**
 * Data Provider - Switches between Mock Data and API
 *
 * Set USE_API=true in .env to use real backend
 * Default: uses mockData for development
 */

import { api } from './api'
import * as mockData from './mockData'

// Check if we should use API or mock data
const USE_API = import.meta.env.VITE_USE_API === 'true'

// ==================== Clients ====================

export async function getClients() {
  if (USE_API) {
    try {
      return await api.getClients()
    } catch {
      console.warn('API unavailable, falling back to mock data')
      return mockData.mockClients.map(c => ({
        id: c.id,
        name: c.name,
        industry: c.industry,
        meta_account_id: c.metaAccountId,
        is_active: c.isActive,
        created_at: c.createdAt
      }))
    }
  }
  return mockData.mockClients.map(c => ({
    id: c.id,
    name: c.name,
    industry: c.industry,
    meta_account_id: c.metaAccountId,
    is_active: c.isActive,
    created_at: c.createdAt
  }))
}

// ==================== Alerts ====================

export async function getAlerts(clientId?: string) {
  if (USE_API) {
    try {
      return await api.getAlerts({ clientId })
    } catch {
      console.warn('API unavailable, falling back to mock data')
      return mockData.mockAlerts
    }
  }
  return mockData.mockAlerts.filter(a => !clientId || a.clientId === clientId)
}

export async function acknowledgeAlert(alertId: string) {
  if (USE_API) {
    await api.acknowledgeAlert(alertId)
    return
  }
  // Mock: find and update in memory
  const alert = mockData.mockAlerts.find(a => a.id === alertId)
  if (alert) {
    alert.acknowledged = true
  }
}

export async function acknowledgeAllAlerts(clientId?: string) {
  if (USE_API) {
    return await api.acknowledgeAllAlerts(clientId)
  }
  // Mock: update all
  const alerts = clientId
    ? mockData.mockAlerts.filter(a => a.clientId === clientId)
    : mockData.mockAlerts
  alerts.forEach(a => {
    a.acknowledged = true
  })
  return { acknowledged_count: alerts.length }
}

// ==================== Patterns ====================

export async function getPatterns(clientId?: string) {
  if (USE_API && clientId) {
    try {
      return await api.getPatterns(clientId)
    } catch {
      console.warn('API unavailable, falling back to mock data')
      return mockData.minePatterns(clientId)
    }
  }
  return mockData.minePatterns(clientId)
}

// ==================== Simulations ====================

export async function simulateBudget(clientId: string, changePercent: number) {
  if (USE_API) {
    try {
      return await api.simulateBudget(clientId, changePercent)
    } catch {
      console.warn('API unavailable, falling back to mock data')
      return mockData.simulateBudgetChange(clientId, changePercent)
    }
  }
  return mockData.simulateBudgetChange(clientId, changePercent)
}

export async function simulatePause(clientId: string, adName: string) {
  if (USE_API) {
    try {
      return await api.simulatePause(clientId, adName)
    } catch {
      console.warn('API unavailable, falling back to mock data')
      return mockData.simulatePauseAd(clientId, adName)
    }
  }
  return mockData.simulatePauseAd(clientId, adName)
}

// ==================== Diagnostics ====================

export async function getQualityScore(clientId?: string) {
  if (USE_API && clientId) {
    try {
      return await api.getQualityScore(clientId)
    } catch {
      console.warn('API unavailable, falling back to mock data')
      return mockData.getAccountQualityScore(clientId)
    }
  }
  return mockData.getAccountQualityScore(clientId)
}

export async function getSaturation(clientId?: string) {
  if (USE_API && clientId) {
    try {
      return await api.getSaturation(clientId)
    } catch {
      console.warn('API unavailable, falling back to mock data')
      return mockData.getAudienceSaturation(clientId)
    }
  }
  return mockData.getAudienceSaturation(clientId)
}

export async function getStructureDiagnostics(clientId?: string) {
  if (USE_API && clientId) {
    try {
      return await api.getStructureDiagnostics(clientId)
    } catch {
      console.warn('API unavailable, falling back to mock data')
      return mockData.getStructureDiagnostics(clientId)
    }
  }
  return mockData.getStructureDiagnostics(clientId)
}

// ==================== ROI & Playbook ====================

export async function getAgencyROI(clientId?: string) {
  if (USE_API && clientId) {
    try {
      return await api.getAgencyROI(clientId)
    } catch {
      console.warn('API unavailable, falling back to mock data')
      return mockData.getAgencyROI(clientId)
    }
  }
  return mockData.getAgencyROI(clientId)
}

export async function getPlaybook(clientId: string) {
  if (USE_API) {
    try {
      const client = mockData.mockClients.find(c => c.id === clientId)
      return await api.getPlaybook(clientId, client?.name)
    } catch {
      console.warn('API unavailable, falling back to mock data')
      return mockData.generatePlaybook(clientId)
    }
  }
  return mockData.generatePlaybook(clientId)
}

// ==================== Upload ====================

export async function uploadCSV(clientId: string, file: File) {
  // Always use API for uploads
  return await api.uploadCSV(clientId, file)
}

// ==================== Metrics & Analysis ====================

export function getMetricsByClient(clientId?: string) {
  // Always use mock data for now (no API endpoint for raw metrics)
  return mockData.getMetricsByClient(clientId)
}

export function getMetricsByDate(metrics: mockData.DailyMetric[]) {
  return mockData.getMetricsByDate(metrics)
}

export function getAdsAnalysis(clientId?: string) {
  return mockData.getAdsAnalysis(clientId)
}

export function getDiagnostic(clientId: string) {
  return mockData.getDiagnostic(clientId)
}

export function getExecutiveSummary(clientId: string) {
  return mockData.getExecutiveSummary(clientId)
}

export function getMorningBrief() {
  return mockData.getMorningBrief()
}

export function getBudgetPacing(clientId: string) {
  return mockData.getBudgetPacing(clientId)
}

export function getAssetDependency(clientId: string) {
  return mockData.getAssetDependency(clientId)
}

export function compareClients(clientIds: string[]) {
  return mockData.compareClients(clientIds)
}

export function getKnowledgeBase(clientId: string) {
  return mockData.getKnowledgeBase(clientId)
}

// ==================== Export Mock Data ====================

export {
  mockClients,
  mockCampaigns,
  mockAlerts,
  mockMetrics,
  mockAdsAnalysis
} from './mockData'
