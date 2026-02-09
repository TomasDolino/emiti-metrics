/**
 * API Client for Emiti Metrics Backend
 * WITH AUTH AND REAL DATA ENDPOINTS
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// ==================== Auth ====================

const getToken = () => localStorage.getItem('metrics_token')

// ==================== Types ====================

export interface Client {
  id: string
  name: string
  industry?: string
  meta_account_id?: string
  color?: string
  is_active: boolean
  metrics_count?: number
  campaigns_count?: number
  created_at: string
}

export interface Alert {
  id: string
  client_id: string
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

export interface AdAnalysis {
  ad_name: string
  campaign_name: string
  ad_set_name: string
  spend: number
  results: number
  impressions: number
  cpr: number
  ctr: number
  frequency: number
  classification: 'GANADOR' | 'ESCALABLE' | 'TESTING' | 'FATIGADO' | 'PAUSAR'
  days_running: number
  client_id: string
}

export interface DashboardData {
  total_spend: number
  total_impressions: number
  total_results: number
  total_reach: number
  avg_cpr: number
  avg_ctr: number
  avg_cpm: number
  avg_frequency: number
  classification_counts: Record<string, number>
  daily_metrics: Array<{ date: string; spend: number; results: number; impressions: number }>
  top_ads: AdAnalysis[]
  top_campaigns?: Array<{ name: string; spend: number; results: number; cpr: number }>
  patterns?: Array<{ pattern: string; impact: string }>
  period_days: number
}

export interface Campaign {
  id: string
  client_id: string
  name: string
  objective: string
  status: string
  daily_budget: number
  spend: number
  results: number
  impressions: number
  cpr: number
  ads_count: number
  created_at: string
}

export interface PeriodComparison {
  current_period: { spend: number; results: number; impressions: number; cpr: number }
  previous_period: { spend: number; results: number; impressions: number; cpr: number }
  changes: { spend: number; results: number; impressions: number; cpr: number }
  period_days: number
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

export interface User {
  id: number
  email: string
  name: string
  role: string
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
    const token = getToken()

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('metrics_token')
        window.location.href = '/login'
      }
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // ==================== Auth ====================

  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const result = await this.request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    localStorage.setItem('metrics_token', result.access_token)
    return result
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me')
  }

  logout(): void {
    localStorage.removeItem('metrics_token')
    window.location.href = '/login'
  }

  // ==================== Dashboard & Analysis ====================

  async getDashboard(options?: {
    clientId?: string
    brandId?: string
    days?: number
    startDate?: string
    endDate?: string
  }): Promise<DashboardData> {
    const params = new URLSearchParams()
    if (options?.clientId) params.set('client_id', options.clientId)
    if (options?.brandId) params.set('brand_id', options.brandId)
    if (options?.startDate && options?.endDate) {
      params.set('start_date', options.startDate)
      params.set('end_date', options.endDate)
    } else if (options?.days) {
      params.set('days', String(options.days))
    } else {
      params.set('days', '30')
    }
    return this.request<DashboardData>(`/analysis/dashboard?${params}`)
  }

  async getBrands(clientId?: string): Promise<Array<{ id: string; name: string; color?: string }>> {
    const params = clientId ? `?client_id=${clientId}` : ''
    return this.request(`/clients/brands${params}`)
  }

  async getAdsAnalysis(clientId?: string, days: number = 30): Promise<AdAnalysis[]> {
    const params = new URLSearchParams()
    if (clientId) params.set('client_id', clientId)
    params.set('days', String(days))
    return this.request<AdAnalysis[]>(`/analysis/ads?${params}`)
  }

  async getAdDetail(adName: string, clientId?: string): Promise<AdAnalysis & { daily_breakdown: any[] }> {
    const params = clientId ? `?client_id=${clientId}` : ''
    return this.request(`/analysis/ads/${encodeURIComponent(adName)}${params}`)
  }

  async getCampaignsAnalysis(clientId?: string, days: number = 30): Promise<any[]> {
    const params = new URLSearchParams()
    if (clientId) params.set('client_id', clientId)
    params.set('days', String(days))
    return this.request(`/analysis/campaigns?${params}`)
  }

  async getPeriodComparison(options?: {
    clientId?: string
    brandId?: string
    days?: number
    startDate?: string
    endDate?: string
  }): Promise<PeriodComparison> {
    const params = new URLSearchParams()
    if (options?.clientId) params.set('client_id', options.clientId)
    if (options?.brandId) params.set('brand_id', options.brandId)
    if (options?.startDate && options?.endDate) {
      params.set('start_date', options.startDate)
      params.set('end_date', options.endDate)
    } else {
      params.set('days', String(options?.days || 7))
    }
    return this.request<PeriodComparison>(`/analysis/comparison?${params}`)
  }

  // ==================== Clients ====================

  async getClients(): Promise<Client[]> {
    return this.request<Client[]>('/clients/')
  }

  async getClient(clientId: string): Promise<Client> {
    return this.request<Client>(`/clients/${clientId}`)
  }

  async createClient(data: { id: string; name: string; industry?: string; color?: string }): Promise<Client> {
    return this.request<Client>('/clients/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateClient(clientId: string, data: Partial<Client>): Promise<{ message: string }> {
    return this.request(`/clients/${clientId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteClient(clientId: string): Promise<{ message: string }> {
    return this.request(`/clients/${clientId}`, { method: 'DELETE' })
  }

  // ==================== Campaigns ====================

  async getCampaigns(clientId?: string, status?: string): Promise<Campaign[]> {
    const params = new URLSearchParams()
    if (clientId) params.set('client_id', clientId)
    if (status) params.set('status', status)
    return this.request<Campaign[]>(`/campaigns/?${params}`)
  }

  async getCampaign(campaignId: string): Promise<Campaign> {
    return this.request<Campaign>(`/campaigns/${campaignId}`)
  }

  async getCampaignMetrics(campaignId: string, days: number = 30): Promise<any> {
    return this.request(`/campaigns/${campaignId}/metrics?days=${days}`)
  }

  async getCampaignAds(campaignId: string): Promise<any[]> {
    return this.request(`/campaigns/${campaignId}/ads`)
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

    return this.request<Alert[]>(`/alerts/?${params}`)
  }

  async getAlertsCount(clientId?: string): Promise<{ total: number; critical: number; warning: number; info: number }> {
    const params = clientId ? `?client_id=${clientId}` : ''
    return this.request(`/alerts/count${params}`)
  }

  async acknowledgeAlert(alertId: string): Promise<{ message: string }> {
    return this.request(`/alerts/${alertId}/acknowledge`, { method: 'PATCH' })
  }

  async acknowledgeAllAlerts(clientId?: string): Promise<{ message: string }> {
    const params = clientId ? `?client_id=${clientId}` : ''
    return this.request(`/alerts/acknowledge-all${params}`, { method: 'PATCH' })
  }

  async deleteAlert(alertId: string): Promise<{ message: string }> {
    return this.request(`/alerts/${alertId}`, { method: 'DELETE' })
  }

  // ==================== Upload ====================

  async uploadCSV(clientId: string, file: File, objective: string = 'MESSAGES'): Promise<{
    success: boolean
    message: string
    summary: any
    database: { rows_added: number; rows_updated: number; campaigns: number }
    alerts_generated: number
  }> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('client_id', clientId)
    formData.append('objective', objective)

    const token = getToken()
    const response = await fetch(`${this.baseUrl}/upload/csv`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || 'Error al subir archivo')
    }

    return response.json()
  }

  async getUploadTemplate(): Promise<{ required_columns: string[]; optional_columns: string[]; notes: string[] }> {
    return this.request('/upload/template')
  }

  // ==================== Advanced / Patterns ====================

  async getPatterns(clientId: string): Promise<PatternMatch[]> {
    return this.request<PatternMatch[]>(`/advanced/patterns/${clientId}`)
  }

  async getQualityScore(clientId: string): Promise<AccountQualityScore> {
    return this.request<AccountQualityScore>(`/advanced/diagnostics/quality/${clientId}`)
  }

  async getSaturation(clientId: string): Promise<AudienceSaturation> {
    return this.request<AudienceSaturation>(`/advanced/diagnostics/saturation/${clientId}`)
  }

  async getAgencyROI(clientId: string): Promise<AgencyROI> {
    return this.request<AgencyROI>(`/advanced/roi/${clientId}`)
  }

  async getStructureDiagnostics(clientId: string): Promise<any> {
    return this.request(`/advanced/diagnostics/structure/${clientId}`)
  }

  async getPlaybook(clientId: string, clientName?: string): Promise<any> {
    const params = clientName ? `?client_name=${encodeURIComponent(clientName)}` : ''
    return this.request(`/advanced/playbook/${clientId}${params}`)
  }

  // ==================== Simulations ====================

  async simulateBudget(clientId: string, changePercent: number): Promise<any> {
    return this.request(`/simulations/budget/${clientId}?change_percent=${changePercent}`)
  }

  async simulatePause(clientId: string, adName: string): Promise<any> {
    return this.request(`/simulations/pause/${clientId}?ad_name=${encodeURIComponent(adName)}`)
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
