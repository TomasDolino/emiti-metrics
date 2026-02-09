import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './lib/theme'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'

// Lazy load pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Campaigns = lazy(() => import('./pages/Campaigns'))
const Analysis = lazy(() => import('./pages/Analysis'))
const Ads = lazy(() => import('./pages/Ads'))
const Alerts = lazy(() => import('./pages/Alerts'))
const Reports = lazy(() => import('./pages/Reports'))
const Metrics = lazy(() => import('./pages/Metrics'))
const Clients = lazy(() => import('./pages/Clients'))
const Compare = lazy(() => import('./pages/Compare'))
const Agency = lazy(() => import('./pages/Agency'))
const Patterns = lazy(() => import('./pages/Patterns'))
const Simulator = lazy(() => import('./pages/Simulator'))
const Diagnostics = lazy(() => import('./pages/Diagnostics'))
const Playbook = lazy(() => import('./pages/Playbook'))
const Upload = lazy(() => import('./pages/Upload'))
const AILab = lazy(() => import('./pages/AILab'))
const MetaConnect = lazy(() => import('./pages/MetaConnect'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="agency" element={<Agency />} />
          <Route path="upload" element={<Upload />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="analysis" element={<Analysis />} />
          <Route path="ads" element={<Ads />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="patterns" element={<Patterns />} />
          <Route path="simulator" element={<Simulator />} />
          <Route path="diagnostics" element={<Diagnostics />} />
          <Route path="playbook" element={<Playbook />} />
          <Route path="reports" element={<Reports />} />
          <Route path="metrics" element={<Metrics />} />
          <Route path="clients" element={<Clients />} />
          <Route path="compare" element={<Compare />} />
          <Route path="ai-lab" element={<AILab />} />
          <Route path="meta" element={<MetaConnect />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
