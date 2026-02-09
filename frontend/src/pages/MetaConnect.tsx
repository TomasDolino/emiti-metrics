import { useState, useEffect } from 'react'
import {
  Facebook,
  Link2,
  Unlink,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  Image as ImageIcon,
  Play,
  Pause,
  TrendingUp,
  ExternalLink
} from 'lucide-react'
import { useTheme } from '../lib/theme'
import { useSelectedClient } from '../components/Layout'
import { cn } from '../lib/utils'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

interface MetaStatus {
  configured: boolean
  app_id_set: boolean
  app_secret_set: boolean
  redirect_uri_set: boolean
  redirect_uri: string | null
  setup_instructions?: Record<string, string>
}

interface TokenStatus {
  connected: boolean
  ad_account_id?: string
  expires_at?: string
  status?: string
  needs_renewal?: boolean
  scopes?: string[]
  message?: string
}

interface MetaAd {
  id: string
  name: string
  status: string
  effective_status: string
  campaign_id: string
  adset_id: string
  creative_id: string
  creative_name: string
  title: string
  body: string
  thumbnail_url: string | null
  image_url: string | null
}

export default function MetaConnect() {
  const { palette } = useTheme()
  const { selectedClientId } = useSelectedClient()

  const [metaStatus, setMetaStatus] = useState<MetaStatus | null>(null)
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null)
  const [ads, setAds] = useState<MetaAd[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingAds, setIsLoadingAds] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const token = localStorage.getItem('metrics_token')

  const fetchMetaStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/meta/status`)
      const data = await response.json()
      setMetaStatus(data)
    } catch (err) {
      console.error('Error fetching Meta status:', err)
    }
  }

  const fetchTokenStatus = async () => {
    if (!selectedClientId) return

    try {
      const response = await fetch(`${API_BASE}/meta/token/${selectedClientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      setTokenStatus(data)
    } catch (err) {
      console.error('Error fetching token status:', err)
    }
  }

  const fetchAds = async () => {
    if (!selectedClientId || !tokenStatus?.connected) return

    setIsLoadingAds(true)
    try {
      const response = await fetch(`${API_BASE}/meta/ads/${selectedClientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch ads')
      }

      const data = await response.json()
      setAds(data.ads || [])
    } catch (err) {
      console.error('Error fetching ads:', err)
    } finally {
      setIsLoadingAds(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      await fetchMetaStatus()
      await fetchTokenStatus()
      setIsLoading(false)
    }
    load()
  }, [selectedClientId])

  useEffect(() => {
    if (tokenStatus?.connected) {
      fetchAds()
    }
  }, [tokenStatus?.connected])

  const handleConnect = async () => {
    if (!metaStatus?.configured) {
      setError('Meta API is not configured. Contact the administrator.')
      return
    }

    try {
      const response = await fetch(`${API_BASE}/meta/auth/url?state=${selectedClientId}`)
      const data = await response.json()

      if (data.auth_url) {
        // Open in popup or redirect
        window.open(data.auth_url, '_blank', 'width=600,height=700')
      }
    } catch (err) {
      setError('Error getting authorization URL')
    }
  }

  const handleDisconnect = async () => {
    if (!selectedClientId) return

    try {
      await fetch(`${API_BASE}/meta/token/${selectedClientId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      setTokenStatus({ connected: false, message: 'Disconnected' })
      setAds([])
    } catch (err) {
      setError('Error disconnecting account')
    }
  }

  const handlePauseAd = async (adName: string) => {
    if (!selectedClientId) return

    setActionLoading(adName)
    try {
      const response = await fetch(`${API_BASE}/meta/action/${selectedClientId}/pause-ad?ad_name=${encodeURIComponent(adName)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to pause ad')
      }

      // Refresh ads
      await fetchAds()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error pausing ad')
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return 'text-green-500'
      case 'PAUSED': return 'text-amber-500'
      default: return 'text-slate-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return <Play className="w-4 h-4" />
      case 'PAUSED': return <Pause className="w-4 h-4" />
      default: return <XCircle className="w-4 h-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!selectedClientId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Meta Integration</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Connect your Meta Ads account</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg border p-8 text-center">
          <Facebook className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">Select a client to connect their Meta account</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Meta Integration</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Connect and manage Meta Ads directly from Emiti
          </p>
        </div>
        <button
          onClick={() => { fetchTokenStatus(); fetchAds(); }}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <RefreshCw className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Connection Status */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'p-3 rounded-full',
                tokenStatus?.connected
                  ? 'bg-blue-100 dark:bg-blue-900/30'
                  : 'bg-slate-100 dark:bg-slate-800'
              )}
            >
              <Facebook
                className={cn(
                  'w-6 h-6',
                  tokenStatus?.connected ? 'text-blue-600' : 'text-slate-400'
                )}
              />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Meta Business Account
              </h3>
              {tokenStatus?.connected ? (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-green-600 dark:text-green-400">Connected</span>
                  {tokenStatus.ad_account_id && (
                    <span className="text-slate-400">
                      · {tokenStatus.ad_account_id}
                    </span>
                  )}
                  {tokenStatus.needs_renewal && (
                    <span className="text-amber-500 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Token expiring soon
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Not connected
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {tokenStatus?.connected ? (
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30"
              >
                <Unlink className="w-4 h-4" />
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={!metaStatus?.configured}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                style={{ backgroundColor: palette.primary }}
              >
                <Link2 className="w-4 h-4" />
                Connect Meta Account
              </button>
            )}
          </div>
        </div>

        {!metaStatus?.configured && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <p className="text-sm text-amber-700 dark:text-amber-400 font-medium mb-2">
              Meta API not configured
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500">
              Contact the administrator to set up META_APP_ID, META_APP_SECRET, and META_REDIRECT_URI
            </p>
          </div>
        )}
      </div>

      {/* Ads with Images */}
      {tokenStatus?.connected && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Active Ads ({ads.length})
              </h3>
              <button
                onClick={fetchAds}
                disabled={isLoadingAds}
                className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                {isLoadingAds ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoadingAds ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
              </div>
            ) : ads.length === 0 ? (
              <div className="p-8 text-center">
                <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 dark:text-slate-400">No ads found</p>
              </div>
            ) : (
              ads.map((ad) => (
                <div key={ad.id} className="p-4 flex items-center gap-4">
                  {/* Ad Image */}
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex-shrink-0">
                    {ad.thumbnail_url || ad.image_url ? (
                      <img
                        src={ad.thumbnail_url || ad.image_url || ''}
                        alt={ad.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                  </div>

                  {/* Ad Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white truncate">
                      {ad.name}
                    </p>
                    {ad.title && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                        {ad.title}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn('flex items-center gap-1 text-xs', getStatusColor(ad.effective_status))}>
                        {getStatusIcon(ad.effective_status)}
                        {ad.effective_status}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {ad.effective_status === 'ACTIVE' && (
                      <button
                        onClick={() => handlePauseAd(ad.name)}
                        disabled={actionLoading === ad.name}
                        className="px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 flex items-center gap-1"
                      >
                        {actionLoading === ad.name ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Pause className="w-3 h-3" />
                        )}
                        Pause
                      </button>
                    )}
                    <a
                      href={`https://www.facebook.com/adsmanager/manage/ads?act=${tokenStatus.ad_account_id?.replace('act_', '')}&selected_ad_ids=${ad.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {tokenStatus?.connected && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              className="p-4 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 text-center"
              onClick={() => window.open(`https://business.facebook.com/adsmanager/manage/campaigns?act=${tokenStatus.ad_account_id?.replace('act_', '')}`, '_blank')}
            >
              <Facebook className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <p className="text-sm font-medium text-slate-900 dark:text-white">Ads Manager</p>
            </button>
            <button
              className="p-4 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 text-center"
              onClick={() => window.open('https://business.facebook.com/creativetools/text-overlay', '_blank')}
            >
              <ImageIcon className="w-6 h-6 mx-auto mb-2 text-purple-600" />
              <p className="text-sm font-medium text-slate-900 dark:text-white">Creative Hub</p>
            </button>
            <button
              className="p-4 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 text-center"
              onClick={() => window.open('https://business.facebook.com/insights', '_blank')}
            >
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <p className="text-sm font-medium text-slate-900 dark:text-white">Insights</p>
            </button>
            <button
              className="p-4 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 text-center"
              onClick={() => fetchAds()}
            >
              <RefreshCw className="w-6 h-6 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-medium text-slate-900 dark:text-white">Sync Ads</p>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
