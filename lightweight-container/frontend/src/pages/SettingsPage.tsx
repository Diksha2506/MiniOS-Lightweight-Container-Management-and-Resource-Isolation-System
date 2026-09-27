import React, { useEffect, useState } from 'react'
import { fetchSystem, fetchHealth } from '../services/api'
import type { SystemInfo } from '../types'
import { CheckCircle, XCircle, AlertTriangle, Server, Cpu, MemoryStick } from 'lucide-react'

export default function SettingsPage() {
  const [info, setInfo] = useState<SystemInfo | null>(null)
  const [apiOk, setApiOk] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        await fetchHealth()
        setApiOk(true)
      } catch { setApiOk(false) }
      try {
        const sys = await fetchSystem()
        setInfo(sys)
      } catch { /* skip */ }
      setLoading(false)
    }
    load()
  }, [])

  const fmt = (bytes?: number) =>
    bytes ? `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB` : 'N/A'

  const Chip = ({ ok, label }: { ok: boolean; label: string }) => (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
      ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
    }`}>
      {ok ? <CheckCircle size={10} /> : <XCircle size={10} />} {label}
    </span>
  )

  if (loading) return (
    <div className="p-6 space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="card p-5 h-20 animate-pulse bg-gray-100" />)}
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">System Information</h1>
        <p className="text-sm text-gray-500">Engine status, kernel capabilities and available namespaces</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* API Status */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Server size={14} /> API Status
          </h2>
          <Chip ok={apiOk === true} label={apiOk === true ? 'Connected' : 'Unreachable'} />
          <p className="text-xs text-gray-400 mt-2">http://localhost:8000</p>
        </div>

        {/* Engine Status */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">C Engine</h2>
          {info ? (
            <div className="space-y-1.5 text-sm">
              <Chip ok={info.engine_exists} label={info.engine_exists ? 'Binary found' : 'Not compiled'} />
              {info.mock_mode && (
                <div className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded p-2 flex gap-1">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                  Mock mode active (non-Linux OS). Namespace/cgroup calls simulated.
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1 font-mono">{info.engine_path}</p>
            </div>
          ) : <p className="text-xs text-gray-400">Unavailable</p>}
        </div>

        {/* System */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Cpu size={14} /> Host System
          </h2>
          {info ? (
            <div className="space-y-1 text-sm text-gray-700">
              <div className="flex gap-2"><span className="text-gray-400 w-24">OS:</span>{info.os}</div>
              <div className="flex gap-2"><span className="text-gray-400 w-24">Kernel:</span>
                <span className="font-mono">{info.kernel}</span>
              </div>
              <div className="flex gap-2"><span className="text-gray-400 w-24">Arch:</span>{info.arch}</div>
            </div>
          ) : <p className="text-xs text-gray-400">Unavailable</p>}
        </div>

        {/* Memory */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <MemoryStick size={14} /> Memory
          </h2>
          {info ? (
            <div className="space-y-1 text-sm text-gray-700">
              <div className="flex gap-2"><span className="text-gray-400 w-24">Total:</span>{fmt(info.mem_total_bytes)}</div>
              <div className="flex gap-2"><span className="text-gray-400 w-24">Available:</span>{fmt(info.mem_available_bytes)}</div>
            </div>
          ) : <p className="text-xs text-gray-400">Unavailable</p>}
        </div>
      </div>

      {/* Capabilities */}
      {info && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Kernel Capabilities</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-2 font-medium">cgroups v2</p>
              <Chip ok={info.cgroups_v2} label={info.cgroups_v2 ? 'Available' : 'Not detected'} />
              {!info.cgroups_v2 && (
                <p className="text-xs text-gray-400 mt-1">
                  CPU and memory limits require cgroups v2 mounted at /sys/fs/cgroup.
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2 font-medium">Namespaces</p>
              <div className="flex flex-wrap gap-1.5">
                {['pid', 'uts', 'mnt', 'net', 'ipc', 'user'].map(ns => (
                  <Chip key={ns} ok={info.namespaces.includes(ns)} label={ns.toUpperCase()} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Implementation notes */}
      <div className="card p-5 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Implementation Notes</h2>
        <ul className="space-y-1 text-xs text-gray-500 list-disc list-inside">
          <li>PID, UTS and Mount namespaces: implemented via <code>clone()</code> with <code>CLONE_NEWPID | CLONE_NEWUTS | CLONE_NEWNS</code></li>
          <li>CPU limits: enforced by writing to <code>cpu.max</code> in the cgroups v2 hierarchy</li>
          <li>Memory limits: enforced by writing to <code>memory.max</code></li>
          <li>Network namespace isolation: not implemented</li>
          <li>Full filesystem isolation (chroot/pivot_root): not implemented</li>
          <li>This is an academic prototype — not a production-grade sandbox</li>
        </ul>
      </div>
    </div>
  )
}
