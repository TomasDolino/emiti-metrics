import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './lib/theme'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Campaigns from './pages/Campaigns'
import Analysis from './pages/Analysis'
import Ads from './pages/Ads'
import Alerts from './pages/Alerts'
import Reports from './pages/Reports'
import Metrics from './pages/Metrics'
import Clients from './pages/Clients'
import Compare from './pages/Compare'
import Agency from './pages/Agency'
import Patterns from './pages/Patterns'
import Simulator from './pages/Simulator'
import Diagnostics from './pages/Diagnostics'
import Playbook from './pages/Playbook'
import Upload from './pages/Upload'
import AILab from './pages/AILab'

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
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
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
