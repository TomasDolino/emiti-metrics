import { X, Sparkles, Code, Shield, Bot, BarChart3, Target, TrendingUp, AlertTriangle, Settings, Layers, Zap, PieChart, LineChart } from 'lucide-react'
import { useTheme } from '../lib/theme'

interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const { palette } = useTheme()

  if (!isOpen) return null

  const features = [
    { icon: BarChart3, title: 'Dashboard Centralizado', desc: 'Vista unificada de métricas de todos los clientes y campañas' },
    { icon: TrendingUp, title: 'Análisis de Rendimiento', desc: 'CTR, CPC, CPM, ROAS, conversiones y frecuencia detallados' },
    { icon: Target, title: 'Gestión de Campañas', desc: 'Tracking de presupuesto, inversión y resultados por campaña' },
    { icon: Bot, title: 'AI Lab', desc: 'Análisis avanzado con IA, predicciones y recomendaciones' },
    { icon: AlertTriangle, title: 'Alertas Inteligentes', desc: 'Notificaciones por bajo rendimiento o anomalías' },
    { icon: PieChart, title: 'Reportes Automatizados', desc: 'Generación de informes personalizables para clientes' },
  ]

  const techStack = [
    { name: 'React 18', color: '#61DAFB' },
    { name: 'TypeScript', color: '#3178C6' },
    { name: 'Vite', color: '#646CFF' },
    { name: 'Tailwind CSS', color: '#06B6D4' },
    { name: 'FastAPI', color: '#009688' },
    { name: 'Python', color: '#3776AB' },
    { name: 'PostgreSQL', color: '#4169E1' },
    { name: 'Recharts', color: '#FF6B6B' },
    { name: 'Meta API', color: '#0866FF' },
    { name: 'PWA', color: '#5A0FC8' },
  ]

  const platforms = [
    { name: 'Meta Ads', icon: '📘', desc: 'Facebook & Instagram' },
    { name: 'Google Ads', icon: '🔍', desc: 'Search, Display & YouTube' },
    { name: 'TikTok Ads', icon: '🎵', desc: 'Campañas en TikTok' },
  ]

  const aiCapabilities = [
    '"¿Cuáles son mis mejores anuncios por CTR?"',
    '"Mostrá el gasto por cliente este mes"',
    '"Compará el rendimiento de campañas"',
    '"¿Qué anuncios debería pausar?"',
    '"Dame recomendaciones de optimización"',
    '"Mostrá la tendencia de CTR"',
  ]

  const metrics = [
    { name: 'CTR', full: 'Click-Through Rate' },
    { name: 'CPC', full: 'Cost per Click' },
    { name: 'CPM', full: 'Cost per Mille' },
    { name: 'ROAS', full: 'Return on Ad Spend' },
    { name: 'CPA', full: 'Cost per Acquisition' },
    { name: 'Freq', full: 'Frecuencia' },
  ]

  const modules = [
    'Dashboard', 'Metrics', 'Analysis', 'Campaigns', 'Ads', 'Simulator', 'Reports', 'Playbook', 'AI Lab', 'Alerts'
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div
          className="relative px-8 py-10 text-white overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary || '#00c6ff'})` }}
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-4 w-32 h-32 border border-white/30 rounded-full" />
            <div className="absolute bottom-4 left-4 w-24 h-24 border border-white/20 rounded-full" />
          </div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm">
                📊
              </div>
              <div>
                <h1 className="text-3xl font-bold">Emiti Metrics</h1>
                <p className="text-white/80 mt-1">Plataforma de análisis y optimización de campañas publicitarias</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-8 space-y-8">
          {/* Description */}
          <div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Emiti Metrics es una plataforma SaaS diseñada para agencias de marketing digital que necesitan
              centralizar, analizar y optimizar las métricas de campañas publicitarias de múltiples clientes.
              Conecta con las principales plataformas de ads y proporciona insights accionables para mejorar
              el rendimiento de las inversiones publicitarias.
            </p>
          </div>

          {/* Platforms */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Layers size={20} style={{ color: palette.primary }} />
              Plataformas Soportadas
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {platforms.map((platform, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 text-center"
                >
                  <div className="text-4xl mb-2">{platform.icon}</div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{platform.name}</h3>
                  <p className="text-xs text-slate-500">{platform.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Features Grid */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Sparkles size={20} style={{ color: palette.primary }} />
              Funcionalidades Principales
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((feature, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ backgroundColor: `${palette.primary}15` }}
                  >
                    <feature.icon size={20} style={{ color: palette.primary }} />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{feature.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Metrics */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <LineChart size={20} style={{ color: palette.primary }} />
              Métricas Disponibles
            </h2>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {metrics.map((metric, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
                  <div className="text-xl font-bold" style={{ color: palette.primary }}>{metric.name}</div>
                  <div className="text-[10px] text-slate-500 uppercase">{metric.full}</div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Section */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Bot size={20} className="text-cyan-400" />
              Asistente de IA para Performance
            </h2>
            <p className="text-slate-300 mb-4">
              El chat de IA permite consultas en lenguaje natural sobre el rendimiento de campañas:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {aiCapabilities.map((cap, i) => (
                <div key={i} className="px-3 py-2 bg-white/10 rounded-lg text-sm text-slate-200">
                  {cap}
                </div>
              ))}
            </div>
          </div>

          {/* Modules */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Settings size={20} style={{ color: palette.primary }} />
              Módulos del Sistema
            </h2>
            <div className="flex flex-wrap gap-2">
              {modules.map((module, i) => (
                <span
                  key={i}
                  className="px-4 py-2 rounded-full text-sm font-medium"
                  style={{ backgroundColor: `${palette.primary}15`, color: palette.primary }}
                >
                  {module}
                </span>
              ))}
            </div>
          </div>

          {/* Tech Stack */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Code size={20} style={{ color: palette.primary }} />
              Stack Tecnológico
            </h2>
            <div className="flex flex-wrap gap-2">
              {techStack.map((tech, i) => (
                <span
                  key={i}
                  className="px-4 py-2 rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: tech.color }}
                >
                  {tech.name}
                </span>
              ))}
            </div>
          </div>

          {/* Enterprise Features */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-5">
            <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
              <Zap size={18} />
              Características Enterprise
            </h3>
            <p className="text-green-700 dark:text-green-400 text-sm">
              Multi-tenancy • API REST completa • Integración OAuth con Meta •
              Exportación a CSV/Excel • Modo oscuro • Responsive design •
              Roles y permisos • Auditoría de acciones • Backups automáticos
            </p>
          </div>

          {/* Security */}
          <div className="flex items-start gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Shield size={24} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Seguridad</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Autenticación JWT, encriptación de datos sensibles, conexiones HTTPS obligatorias
                y políticas de acceso basadas en roles. Las integraciones con plataformas de ads
                utilizan OAuth 2.0 para máxima seguridad.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Desarrollado por <span className="font-semibold" style={{ color: palette.primary }}>Emiti</span> • 2024
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Potenciá el rendimiento de tus campañas con datos inteligentes
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
