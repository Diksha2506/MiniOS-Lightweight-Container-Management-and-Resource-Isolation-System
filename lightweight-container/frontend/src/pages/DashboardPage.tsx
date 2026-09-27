import React, { useEffect, useState } from 'react'
import { Box, Play, StopCircle, Cpu, MemoryStick, Activity } from 'lucide-react'
import { useContainers } from '../hooks/useContainers'
import StatCard from '../components/StatCard'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { TimePoint } from '../types'

function buildHistory(prev: TimePoint[], newVal: number): TimePoint[] {
  const now = new Date().toLocaleTimeString('en', { hour12: false })
  const next = [...prev, { time: now, value: newVal }]
  return next.slice(-12)   // keep last 12 data points
}

export default function DashboardPage() {
  const { containers, loading, error } = useContainers(4000)
  const [runHistory, setRunHistory] = useState<TimePoint[]>([])

  const running = containers.filter(c => c.state === 'RUNNING').length
  const stopped = containers.filter(c => c.state === 'STOPPED').length

  useEffect(() => {
    setRunHistory(h => buildHistory(h, running))
  }, [running])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Live container and system overview</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse h-24 bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Containers" value={containers.length}
            icon={<Box size={18} />} color="blue" />
          <StatCard label="Running" value={running}
            icon={<Play size={18} />} color="emerald" sub="active processes" />
          <StatCard label="Stopped" value={stopped}
            icon={<StopCircle size={18} />} color="gray" />
          <StatCard label="CPU Limits Set" value={containers.filter(c => c.cpu_limit > 0).length}
            icon={<Cpu size={18} />} color="orange"
            sub={`of ${containers.length} containers`} />
        </div>
      )}

      {/* Running containers over time chart */}
      <div className="grid grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Running Containers (Live)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={runHistory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#grad)"
                strokeWidth={2} name="Running" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Container table preview */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Container Status</h2>
          {containers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm gap-2">
              <Box size={32} className="text-gray-300" />
              <p>No containers yet. Create one to get started.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase">
                  <th className="text-left pb-2">Name</th>
                  <th className="text-left pb-2">State</th>
                  <th className="text-right pb-2">Mem (MB)</th>
                  <th className="text-right pb-2">CPU %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {containers.map(c => (
                  <tr key={c.name}>
                    <td className="py-2 font-mono text-xs text-gray-800">{c.name}</td>
                    <td className="py-2">
                      <span className={c.state === 'RUNNING' ? 'badge-running' : 'badge-stopped'}>
                        {c.state}
                      </span>
                    </td>
                    <td className="py-2 text-right text-gray-600">{c.mem_limit || '—'}</td>
                    <td className="py-2 text-right text-gray-600">{c.cpu_limit || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
