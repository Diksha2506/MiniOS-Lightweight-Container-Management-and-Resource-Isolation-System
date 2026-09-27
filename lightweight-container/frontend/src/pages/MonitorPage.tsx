import React, { useEffect, useState } from 'react'
import { useContainers } from '../hooks/useContainers'
import { fetchStats } from '../services/api'
import type { ContainerStats, TimePoint } from '../types'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line,
} from 'recharts'

export default function MonitorPage() {
  const { containers } = useContainers(5000)
  const [stats, setStats] = useState<Record<string, ContainerStats>>({})
  const [history, setHistory] = useState<{ time: string; [key: string]: any }[]>([])

  useEffect(() => {
    const running = containers.filter(c => c.state === 'RUNNING')
    if (running.length === 0) return

    const loadStats = async () => {
      const results: Record<string, ContainerStats> = {}
      for (const c of running) {
        try { results[c.name] = await fetchStats(c.name) } catch { /* skip */ }
      }
      setStats(results)

      const now = new Date().toLocaleTimeString('en', { hour12: false })
      const point: { time: string; [key: string]: any } = { time: now }
      for (const [name, s] of Object.entries(results)) {
        point[name] = s.memory_mb ?? 0
      }
      setHistory(h => [...h.slice(-15), point])
    }

    loadStats()
    const id = setInterval(loadStats, 5000)
    return () => clearInterval(id)
  }, [containers])

  const running = containers.filter(c => c.state === 'RUNNING')

  const barData = containers.map(c => ({
    name: c.name,
    'Mem Limit (MB)': c.mem_limit,
    'CPU Limit (%)': c.cpu_limit,
    'Mem Used (MB)': stats[c.name]?.memory_mb ?? 0,
  }))

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Resource Monitoring</h1>
        <p className="text-sm text-gray-500">
          Actual measurements via cgroups v2. Refreshes every 5 seconds.
        </p>
      </div>

      {running.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm">
          No containers are currently running. Start a container to see live metrics.
        </div>
      )}

      {/* Live stats cards */}
      {Object.entries(stats).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(stats).map(([name, s]) => {
            const c = containers.find(x => x.name === name)
            const pct = c?.mem_limit && s.memory_mb
              ? Math.round((s.memory_mb / c.mem_limit) * 100)
              : null
            return (
              <div key={name} className="card p-4">
                <p className="font-mono font-medium text-gray-800 mb-3">{name}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Memory Used</span>
                    <span className="font-semibold">{s.memory_mb ?? 'N/A'} MB</span>
                  </div>
                  {c?.mem_limit && (
                    <>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            (pct ?? 0) > 80 ? 'bg-red-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(pct ?? 0, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400">{pct}% of {c.mem_limit} MB limit</p>
                    </>
                  )}
                  <div className="flex justify-between pt-1">
                    <span className="text-gray-500">CPU Time</span>
                    <span className="font-semibold">{s.cpu_time_ms ?? 'N/A'} ms</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Memory usage history chart */}
      {history.length > 1 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Memory Usage Over Time (MB)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={history} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              {running.map((c, i) => (
                <Line key={c.name} type="monotone" dataKey={c.name}
                  stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bar comparison */}
      {barData.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Resource Limits vs Usage (All Containers)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Mem Limit (MB)" fill="#dbeafe" stroke="#3b82f6" strokeWidth={1} />
              <Bar dataKey="Mem Used (MB)" fill="#3b82f6" />
              <Bar dataKey="CPU Limit (%)" fill="#fed7aa" stroke="#f97316" strokeWidth={1} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
