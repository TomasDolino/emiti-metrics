/**
 * API Client for Emiti Metrics Backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// ==================== Types ====================

export interface Client {
  id: string
  name: string
  industry?: string
  meta_account_id?: string
  is_active: boolean
  created_at: string
}

export interface Alert {
  id: string
  type: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  title: string
  message: string
  ad_name?: string
  campaign_name?: string
  metric?: string
  previous_value?: number
  current_value?: number
  change_percent?: number
  created_at: string
  acknowledged: boolean
}

export interface MetricsData {
  date: string
  campaign_name: string
  ad_set_name: string
  ad_name: string
  spend: number
  impressions: number
  reach: number
  frequency: number
  clicks: number
  link_clicks: number
  ctr: number
  cpc: number
  cpm: number
  results: number
  cost_per_result: number
  result_rate: number
}

export interface PatternMatch {
  pattern: string
  impact: string
  confidence: string
  category: string
  recommendation: string
}

export interface AccountQualityScore {
  score: number
  status: string
  message: string
  issues: Array<{ type: string; message: string }>
  summary: Record<string, unknown>
}

export interface AudienceSaturation {
  saturation_score: number
  status: string
  trends: Record<string, unknown>
  recommendation: string
  estimated_days_left: number
}

export interface AgencyROI {
  total_spend_managed: number
  total_results: number
  optimized_cpr: number
  estimated_unoptimized_cpr: number
  extra_results_generated: number
  estimated_value_generated: number
  optimization_impact: string
  actions_summary: number
}

export interface ClientPlaybook {
  client_name: string
  generated_at: string
  quality_score: number
  learnings: Array<{
    type: string
    text: string
    evidence: string
    category: string
  }>
  recommended_structure: {
    adsPerAdset: string
    adsetsPerCampaign: string
    creativeRotation: string
  }
  do: string[]
  dont: string[]
  monitor: string[]
}

export interface StructureDiagnostic {
  type: string
  severity: string
  title: string
  message: string
  campaign?: string
  ad_set?: string
  recommendation: string
}

export interface BudgetSimulation {
  scenario: string
  current: { spend: number; results: number; cpr: number }
  projected: { spend: number; results: number; cpr: number }
  delta: { spend: number; results: number; cprChange: number }
  confidence: string
  note: string
}

export interface PauseSimulation {
  adContribution: {
    spend: number
    results: number
    percentOfTotal: number
  }
  withRedistribution: {
    results: number
    cpr: number
    extraResults: number
  }
  recommendation: 'pausar' | 'mantener'
}

// ==================== API Client ====================

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // ==================== Clients ====================

  async getClients(isActive?: boolean): Promise<Client[]> {
    const params = isActive !== undefined ? `?is_active=${isActive}` : ''
    return this.request<Client[]>(`/clients${params}`)
  }

  async getClient(clientId: string): Promise<Client> {
    return this.request<Client>(`/clients/${clientId}`)
  }

  async createClient(data: {
    name: string
    industry?: string
    meta_account_id?: string
  }): Promise<Client> {
    const params = new URLSearchParams()
    params.set('name', data.name)
    if (data.industry) params.set('industry', data.industry)
    if (data.meta_account_id) params.set('meta_account_id', data.meta_account_id)

    return this.request<Client>(`/clients?${params}`, { method: 'POST' })
  }

  async updateClient(
    clientId: string,
    data: Partial<Client>
  ): Promise<Client> {
    const params = new URLSearchParams()
    if (data.name) params.set('name', data.name)
    if (data.industry) params.set('industry', data.industry)
    if (data.meta_account_id) params.set('meta_account_id', data.meta_account_id)
    if (data.is_active !== undefined) params.set('is_active', String(data.is_active))

    return this.request<Client>(`/clients/${clientId}?${params}`, { method: 'PUT' })
  }

  async deleteClient(clientId: string): Promise<void> {
    await this.request(`/clients/${clientId}`, { method: 'DELETE' })
  }

  async getClientSummary(clientId: string): Promise<{
    client: Client
    metrics: { total_spend: number; total_results: number; avg_cpr: number; data_points: number }
    active_alerts: number
    campaigns_count: number
  }> {
    return this.request(`/clients/${clientId}/summary`)
  }

  // ==================== Alerts ====================

  async getAlerts(options?: {
    clientId?: string
    acknowledged?: boolean
    severity?: string
    limit?: number
  }): Promise<Alert[]> {
    const params = new URLSearchParams()
    if (options?.clientId) params.set('client_id', options.clientId)
    if (options?.acknowledged !== undefined) params.set('acknowledged', String(options.acknowledged))
    if (options?.severity) params.set('severity', options.severity)
    if (options?.limit) params.set('limit', String(options.limit))

    const query = params.toString() ? `?${params}` : ''
    return this.request<Alert[]>(`/alerts${query}`)
  }

  async getActiveAlerts(clientId?: string): Promise<Alert[]> {
    const params = clientId ? `?client_id=${clientId}` : ''
    return this.request<Alert[]>(`/alerts/active${params}`)
  }

  async getAlertsCount(clientId?: string): Promise<{
    total: number
    active: number
    by_severity: { critical: number; warning: number; info: number }
  }> {
    const params = clientId ? `?client_id=${clientId}` : ''
    return this.request(`/alerts/count${params}`)
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    await this.request(`/alerts/${alertId}/acknowledge`, { method: 'POST' })
  }

  async acknowledgeAllAlerts(clientId?: string): Promise<{ acknowledged_count: number }> {
    const params = clientId ? `?client_id=${clientId}` : ''
    return this.request(`/alerts/acknowledge-all${params}`, { method: 'POST' })
  }

  // ==================== Upload ====================

  async uploadCSV(clientId: string, file: File): Promise<{
    success: boolean
    message: string
    rows: number
    date_range: { start: string; end: string }
    campaigns: number
    ads: number
  }> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${this.baseUrl}/advanced/upload/${clientId}`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || 'Error al subir archivo')
    }

    return response.json()
  }

  async getUploadTemplate(): Promise<{ columns: string[]; example: Record<string, unknown> }> {
    return this.request('/upload/template')
  }

  // ==================== Patterns ====================

  async getPatterns(clientId: string): Promise<PatternMatch[]> {
    return this.request<PatternMatch[]>(`/advanced/patterns/${clientId}`)
  }

  // ==================== Simulations ====================

  async simulateBudget(
    clientId: string,
    changePercent: number,
    targetAds?: string[]
  ): Promise<BudgetSimulation> {
    return this.request<BudgetSimulation>('/advanced/simulate/budget', {
      method: 'POST',
      body: JSON.stringify({
        client_id: clientId,
        change_percent: changePercent,
        target_ads: targetAds,
      }),
    })
  }

  async simulatePause(clientId: string, adName: string): Promise<PauseSimulation> {
    return this.request<PauseSimulation>('/advanced/simulate/pause', {
      method: 'POST',
      body: JSON.stringify({
        client_id: clientId,
        ad_name: adName,
      }),
    })
  }

  // ==================== Diagnostics ====================

  async getStructureDiagnostics(clientId: string): Promise<StructureDiagnostic[]> {
    return this.request<StructureDiagnostic[]>(`/advanced/diagnostics/structure/${clientId}`)
  }

  async getQualityScore(clientId: string): Promise<AccountQualityScore> {
    return this.request<AccountQualityScore>(`/advanced/diagnostics/quality/${clientId}`)
  }

  async getSaturation(clientId: string): Promise<AudienceSaturation> {
    return this.request<AudienceSaturation>(`/advanced/diagnostics/saturation/${clientId}`)
  }

  // ==================== ROI & Playbook ====================

  async getAgencyROI(clientId: string): Promise<AgencyROI> {
    return this.request<AgencyROI>(`/advanced/roi/${clientId}`)
  }

  async getPlaybook(clientId: string, clientName?: string): Promise<ClientPlaybook> {
    const params = clientName ? `?client_name=${encodeURIComponent(clientName)}` : ''
    return this.request<ClientPlaybook>(`/advanced/playbook/${clientId}${params}`)
  }

  // ==================== Full Analysis ====================

  async getFullAnalysis(clientId: string): Promise<{
    quality_score: AccountQualityScore
    patterns: PatternMatch[]
    structure_diagnostics: StructureDiagnostic[]
    saturation: AudienceSaturation
    competition: Record<string, unknown>
    config: Record<string, unknown>
    learnings: Array<Record<string, unknown>>
    recent_actions: Record<string, unknown>
  }> {
    return this.request(`/advanced/full-analysis/${clientId}`)
  }

  // ==================== Health Check ====================

  async healthCheck(): Promise<{ status: string }> {
    const response = await fetch(`${this.baseUrl.replace('/api', '')}/health`)
    return response.json()
  }
}

// Export singleton instance
export const api = new ApiClient()

// Export class for testing
export { ApiClient }
