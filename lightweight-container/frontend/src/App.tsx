import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Sidebar from './components/Sidebar'
import DashboardPage from './pages/DashboardPage'
import ContainersPage from './pages/ContainersPage'
import CreatePage from './pages/CreatePage'
import MonitorPage from './pages/MonitorPage'
import LabPage from './pages/LabPage'
import TerminalPage from './pages/TerminalPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/"           element={<DashboardPage />} />
            <Route path="/containers" element={<ContainersPage />} />
            <Route path="/create"     element={<CreatePage />} />
            <Route path="/monitor"    element={<MonitorPage />} />
            <Route path="/lab"        element={<LabPage />} />
            <Route path="/terminal"   element={<TerminalPage />} />
            <Route path="/settings"   element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
