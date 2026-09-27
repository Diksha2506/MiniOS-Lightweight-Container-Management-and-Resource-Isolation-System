import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createContainer } from '../services/api'
import toast from 'react-hot-toast'
import { CheckCircle, AlertCircle } from 'lucide-react'

const STEPS = ['Basic Config', 'Resources', 'Isolation', 'Review & Launch']

export default function CreatePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    name: '',
    command: '/bin/sh',
    memory_mb: 128,
    cpu_pct: 0,
    pid_ns: true,
    uts_ns: true,
    mnt_ns: true,
  })

  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }))

  const nameValid = /^[a-zA-Z0-9_-]+$/.test(form.name) && form.name.length >= 1

  const submit = async () => {
    setSubmitting(true)
    try {
      await createContainer({
        name: form.name,
        command: form.command,
        memory_mb: form.memory_mb,
        cpu_pct: form.cpu_pct,
      })
      toast.success(`Container "${form.name}" created!`)
      navigate('/containers')
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to create container')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Create Container</h1>
        <p className="text-sm text-gray-500">Guided setup for a new isolated environment</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-1.5 text-xs font-medium ${
              i === step ? 'text-blue-600' : i < step ? 'text-emerald-600' : 'text-gray-400'
            }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                i === step ? 'bg-blue-600 text-white' :
                i < step ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {i < step ? '✓' : i + 1}
              </span>
              <span className="hidden sm:block">{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-200" />}
          </React.Fragment>
        ))}
      </div>

      <div className="card p-6 space-y-5">
        {/* Step 0: Basic */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800">Basic Configuration</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Container Name *</label>
              <input className="input" value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. web-server" />
              {form.name && !nameValid && (
                <p className="text-xs text-red-500 mt-1 flex gap-1">
                  <AlertCircle size={12} className="mt-0.5" />
                  Only letters, digits, hyphens and underscores allowed.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Command / Executable</label>
              <input className="input font-mono" value={form.command}
                onChange={e => set('command', e.target.value)}
                placeholder="/bin/sh" />
              <p className="text-xs text-gray-400 mt-1">The program to run inside the container (full path preferred).</p>
            </div>
          </div>
        )}

        {/* Step 1: Resources */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800">Resource Allocation</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Memory Limit: <span className="text-blue-600 font-bold">{form.memory_mb} MB</span>
              </label>
              <input type="range" min={16} max={2048} step={16}
                value={form.memory_mb} onChange={e => set('memory_mb', +e.target.value)}
                className="w-full accent-blue-600" />
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>16 MB</span><span>2048 MB</span></div>
              <p className="text-xs text-gray-400 mt-2">Enforced via cgroups v2 <code>memory.max</code></p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CPU Limit: <span className="text-orange-600 font-bold">{form.cpu_pct === 0 ? 'Unlimited' : `${form.cpu_pct}%`}</span>
              </label>
              <input type="range" min={0} max={100} step={5}
                value={form.cpu_pct} onChange={e => set('cpu_pct', +e.target.value)}
                className="w-full accent-orange-500" />
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>0 (unlimited)</span><span>100%</span></div>
              <p className="text-xs text-gray-400 mt-2">Enforced via cgroups v2 <code>cpu.max</code></p>
            </div>
          </div>
        )}

        {/* Step 2: Isolation */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800">Isolation Settings</h2>
            <p className="text-sm text-gray-500">These namespaces are implemented in the C engine (Linux only).</p>
            {[
              { key: 'pid_ns',  label: 'PID Namespace',   desc: 'CLONE_NEWPID — isolated process ID tree', impl: true },
              { key: 'uts_ns',  label: 'UTS Namespace',   desc: 'CLONE_NEWUTS — isolated hostname', impl: true },
              { key: 'mnt_ns',  label: 'Mount Namespace', desc: 'CLONE_NEWNS — private /proc mount', impl: true },
            ].map(ns => (
              <label key={ns.key} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="checkbox"
                  checked={form[ns.key as keyof typeof form] as boolean}
                  onChange={e => set(ns.key as keyof typeof form, e.target.checked)}
                  className="mt-0.5 accent-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{ns.label}</p>
                  <p className="text-xs text-gray-400 font-mono">{ns.desc}</p>
                  {ns.impl && <span className="text-[10px] text-emerald-600 font-medium">✓ Implemented</span>}
                </div>
              </label>
            ))}
            <p className="text-xs text-gray-400 bg-amber-50 border border-amber-100 rounded p-2">
              Network namespace isolation is not currently implemented. Full filesystem isolation requires a rootfs image.
            </p>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800">Review & Launch</h2>
            <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm space-y-2">
              <div className="flex gap-2"><span className="text-gray-400 w-28">Name:</span><span className="text-gray-800 font-medium">{form.name}</span></div>
              <div className="flex gap-2"><span className="text-gray-400 w-28">Command:</span><span className="text-gray-800">{form.command}</span></div>
              <div className="flex gap-2"><span className="text-gray-400 w-28">Memory:</span><span className="text-blue-700">{form.memory_mb} MB</span></div>
              <div className="flex gap-2"><span className="text-gray-400 w-28">CPU Limit:</span><span className="text-orange-600">{form.cpu_pct === 0 ? 'Unlimited' : `${form.cpu_pct}%`}</span></div>
              <div className="flex gap-2"><span className="text-gray-400 w-28">Namespaces:</span>
                <span className="text-gray-800">
                  {[form.pid_ns && 'PID', form.uts_ns && 'UTS', form.mnt_ns && 'MNT'].filter(Boolean).join(', ')}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              This will call <code>POST /api/containers</code> → C engine <code>./container create</code>
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button className="btn-ghost" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button
            className="btn-primary"
            disabled={step === 0 && !nameValid}
            onClick={() => setStep(s => s + 1)}
          >
            Next
          </button>
        ) : (
          <button className="btn-primary" disabled={submitting || !nameValid} onClick={submit}>
            {submitting ? 'Creating…' : 'Create Container'}
          </button>
        )}
      </div>
    </div>
  )
}
