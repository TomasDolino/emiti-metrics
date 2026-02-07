// ==================== CAMPAIGN DATA ====================

export interface Campaign {
  id: string
  name: string
  objective: CampaignObjective
  status: 'ACTIVE' | 'PAUSED' | 'DELETED'
  budget: number
  startDate: string
  endDate?: string
}

export interface AdSet {
  id: string
  campaignId: string
  name: string
  budget: number
  status: 'ACTIVE' | 'PAUSED' | 'DELETED'
  targeting?: string
}

export interface Ad {
  id: string
  adSetId: string
  campaignId: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED'
  creative?: string
  imageUrl?: string
}

// ==================== METRICS ====================

export interface MetricsData {
  // Identifiers
  date: string
  campaignName: string
  adSetName: string
  adName: string

  // Spend
  spend: number

  // Reach & Impressions
  impressions: number
  reach: number
  frequency: number

  // Engagement
  clicks: number
  linkClicks: number
  ctr: number       // Click-through rate (%)
  cpc: number       // Cost per click
  cpm: number       // Cost per 1000 impressions

  // Conversions (depends on objective)
  results: number   // Main KPI (messages, purchases, leads, etc.)
  costPerResult: number
  resultRate: number

  // For sales campaigns
  purchases?: number
  purchaseValue?: number
  roas?: number     // Return on Ad Spend

  // For message campaigns
  messagingConversations?: number
  messagingFirstReply?: number

  // For lead campaigns
  leads?: number
  costPerLead?: number
}

export interface DailyMetrics extends MetricsData {
  id: string
}

// ==================== ANALYSIS ====================

export type CampaignObjective = 'MESSAGES' | 'SALES' | 'LEADS' | 'TRAFFIC' | 'AWARENESS'

export type AdClassification =
  | 'GANADOR'    // High performance, scale it
  | 'ESCALABLE'  // Good performance, can grow
  | 'TESTING'    // New, needs more data
  | 'FATIGADO'   // High frequency, declining CTR
  | 'PAUSAR'     // Poor performance, pause it

export interface AdAnalysis {
  adName: string
  adSetName: string
  campaignName: string

  // Aggregated metrics
  totalSpend: number
  totalResults: number
  avgCostPerResult: number
  avgCtr: number
  avgFrequency: number

  // Trends (last 7 days vs previous 7 days)
  ctrTrend: number        // % change
  cprTrend: number        // % change (Cost Per Result)
  frequencyTrend: number  // % change

  // Classification
  classification: AdClassification
  classificationReason: string

  // Recommendations
  recommendations: string[]

  // Fatigue indicators
  fatigueScore: number    // 0-100
  daysRunning: number
}

export interface CampaignAnalysis {
  campaignName: string
  objective: CampaignObjective

  totalSpend: number
  totalResults: number
  avgCostPerResult: number

  adsAnalysis: AdAnalysis[]

  topPerformers: string[]
  underperformers: string[]

  insights: string[]
  recommendations: string[]
}

// ==================== ALERTS ====================

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL'
export type AlertType =
  | 'ROAS_DROP'           // ROAS dropped significantly
  | 'CPA_INCREASE'        // Cost per action increased
  | 'CTR_DROP'            // CTR declining
  | 'FATIGUE_DETECTED'    // Ad fatigue detected
  | 'BUDGET_DEPLETED'     // Budget running out
  | 'PERFORMANCE_SPIKE'   // Unusual performance spike
  | 'NEW_WINNER'          // New top performer detected

export interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  adName?: string
  campaignName?: string
  metric?: string
  previousValue?: number
  currentValue?: number
  changePercent?: number
  createdAt: string
  acknowledged: boolean
}

// ==================== CLIENTS & USERS ====================

export type UserRole = 'SUPER_ADMIN' | 'AGENCY' | 'CLIENT' | 'VIEWER'

export interface Client {
  id: string
  name: string
  industry?: string
  metaAccountId?: string
  createdAt: string
  isActive: boolean
}

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  clientId?: string      // For CLIENT/VIEWER roles
  createdAt: string
}

// ==================== REPORTS ====================

export interface Report {
  id: string
  clientId: string
  title: string
  dateRange: {
    start: string
    end: string
  }
  type: 'WEEKLY' | 'MONTHLY' | 'CUSTOM'
  sections: ReportSection[]
  createdAt: string
  generatedBy: string
}

export interface ReportSection {
  title: string
  type: 'METRICS' | 'CHART' | 'TABLE' | 'INSIGHTS'
  data: unknown
}

// ==================== UI STATE ====================

export interface DateRange {
  start: Date
  end: Date
  preset?: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'custom'
}

export interface FilterState {
  dateRange: DateRange
  campaigns: string[]
  adSets: string[]
  status: ('ACTIVE' | 'PAUSED' | 'ALL')[]
}
