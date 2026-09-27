import React, { useState } from 'react'
import { Search, Play, StopCircle, Trash2, RefreshCw, AlertTriangle } from 'lucide-react'
import { useContainers } from '../hooks/useContainers'
import StatusBadge from '../components/StatusBadge'
import { startContainer, stopContainer, removeContainer } from '../services/api'
import toast from 'react-hot-toast'

export default function ContainersPage() {
  const { containers, loading, error, refresh } = useContainers(5000)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ name: string; action: 'stop' | 'remove' } | null>(null)

  const filtered = containers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const perform = async (name: string, fn: () => Promise<any>, label: string) => {
    setBusy(name)
    try {
      await fn()
      toast.success(`${label} successful`)
      refresh()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || `${label} failed`)
    } finally {
      setBusy(null)
      setConfirm(null)
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Containers</h1>
          <p className="text-sm text-gray-500">Manage and inspect container lifecycle</p>
        </div>
        <button onClick={refresh} className="btn-ghost">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9 py-1.5"
              placeholder="Search containers…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="text-xs text-gray-400">{filtered.length} containers</span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-6 space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            No containers found. <a href="/create" className="text-blue-500 hover:underline">Create one</a>.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">PID</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Mem Limit</th>
                <th className="px-4 py-3 text-right">CPU Limit</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => (
                <tr key={c.name} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-gray-800">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono">
                    {c.pid > 0 ? c.pid : '—'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge container={c} /></td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {c.mem_limit > 0 ? `${c.mem_limit} MB` : 'Unlimited'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {c.cpu_limit > 0 ? `${c.cpu_limit}%` : 'Unlimited'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {c.state === 'STOPPED' && (
                        <button
                          disabled={busy === c.name}
                          className="btn bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs px-2.5 py-1"
                          onClick={() => perform(c.name, () => startContainer(c.name), 'Start')}
                        >
                          <Play size={12} /> Start
                        </button>
                      )}
                      {c.state === 'RUNNING' && (
                        <button
                          disabled={busy === c.name}
                          className="btn bg-orange-50 text-orange-700 hover:bg-orange-100 text-xs px-2.5 py-1"
                          onClick={() => setConfirm({ name: c.name, action: 'stop' })}
                        >
                          <StopCircle size={12} /> Stop
                        </button>
                      )}
                      {c.state === 'STOPPED' && (
                        <button
                          disabled={busy === c.name}
                          className="btn bg-red-50 text-red-600 hover:bg-red-100 text-xs px-2.5 py-1"
                          onClick={() => setConfirm({ name: c.name, action: 'remove' })}
                        >
                          <Trash2 size={12} /> Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirmation dialog */}
      {confirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-semibold text-gray-900 mb-1 capitalize">{confirm.action} container?</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to {confirm.action}{' '}
              <span className="font-mono font-medium text-gray-800">{confirm.name}</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <button className="btn-ghost" onClick={() => setConfirm(null)}>Cancel</button>
              <button
                className="btn-danger"
                onClick={() => {
                  if (confirm.action === 'stop') {
                    perform(confirm.name, () => stopContainer(confirm.name), 'Stop')
                  } else {
                    perform(confirm.name, () => removeContainer(confirm.name), 'Remove')
                  }
                }}
              >
                Confirm {confirm.action}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
