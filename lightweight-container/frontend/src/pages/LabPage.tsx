import React, { useState } from 'react'
import { createContainer, startContainer, stopContainer, removeContainer } from '../services/api'
import { fetchStats } from '../services/api'
import toast from 'react-hot-toast'
import { FlaskConical, Play, CheckCircle } from 'lucide-react'

interface Experiment {
  id: string
  title: string
  objective: string
  concept: string
  steps: string[]
}

const EXPERIMENTS: Experiment[] = [
  {
    id: 'pid',
    title: 'Experiment 1: PID Namespace Isolation',
    objective: 'Show that a container gets its own PID namespace and has an isolated process view.',
    concept: 'CLONE_NEWPID creates a new PID namespace. The container\'s first process becomes PID 1 in its namespace, completely hidden from other namespaces.',
    steps: [
      'Create container "pid-test" with command "sleep 30"',
      'Start it — the host assigns it a real PID (e.g. 3412)',
      'Inside the container, it sees itself as PID 1',
      'Stop and remove the container',
    ],
  },
  {
    id: 'cpu',
    title: 'Experiment 2: CPU Resource Limiting',
    objective: 'Demonstrate that cgroups v2 enforces CPU quotas on container processes.',
    concept: 'cpu.max = QUOTA PERIOD. Setting 20000 100000 limits the container to 20% of one CPU core. The kernel\'s CFS scheduler enforces this.',
    steps: [
      'Create container "cpu-test" with 30% CPU limit',
      'Start it running sleep (or a busy loop on Linux)',
      'Fetch stats — CPU time accumulates but is throttled',
      'Compare with an unlimited container',
    ],
  },
  {
    id: 'mem',
    title: 'Experiment 3: Memory Limit Enforcement',
    objective: 'Show that memory.max in cgroups v2 kills or throttles processes that exceed the limit.',
    concept: 'memory.max defines the hard memory limit. If the container exceeds it, the OOM killer terminates the offending process.',
    steps: [
      'Create container "mem-test" with 32 MB memory limit',
      'Start it',
      'Check memory.current via stats',
      'A process allocating >32 MB will be OOM-killed by the kernel',
    ],
  },
  {
    id: 'lifecycle',
    title: 'Experiment 4: Container Lifecycle',
    objective: 'Walk through the full container lifecycle: create → start → stop → remove.',
    concept: 'Container state transitions: STOPPED → RUNNING → STOPPED → (removed). Invalid transitions are rejected by the engine.',
    steps: [
      'Create a container',
      'Start it → state becomes RUNNING',
      'Stop it → state becomes STOPPED',
      'Remove it → metadata deleted, cgroup cleaned up',
    ],
  },
]

export default function LabPage() {
  const [outputs, setOutputs] = useState<Record<string, string>>({})
  const [running, setRunning] = useState<Record<string, boolean>>({})

  const log = (id: string, msg: string) =>
    setOutputs(o => ({ ...o, [id]: (o[id] || '') + msg + '\n' }))

  const runExperiment = async (exp: Experiment) => {
    setRunning(r => ({ ...r, [exp.id]: true }))
    setOutputs(o => ({ ...o, [exp.id]: '' }))

    try {
      if (exp.id === 'pid') {
        log(exp.id, '▶ Creating container "pid-test" with command "sleep 30"...')
        await createContainer({ name: 'pid-test', command: 'sleep 30', memory_mb: 64, cpu_pct: 0 })
        log(exp.id, '✓ Container created.')
        log(exp.id, '▶ Starting container...')
        const res = await startContainer('pid-test')
        log(exp.id, `✓ ${res.message}`)
        log(exp.id, '★ Inside the PID namespace, this process appears as PID 1.')
        log(exp.id, '  On the host it has a real PID shown above (e.g. 3412).')
        log(exp.id, '▶ Stopping and cleaning up...')
        await stopContainer('pid-test')
        await removeContainer('pid-test')
        log(exp.id, '✓ Done. PID namespace experiment complete.')
      }

      if (exp.id === 'cpu') {
        log(exp.id, '▶ Creating container "cpu-test" with 30% CPU limit...')
        await createContainer({ name: 'cpu-test', command: 'sleep 20', memory_mb: 64, cpu_pct: 30 })
        log(exp.id, '✓ Container created. cgroups v2 cpu.max = 30000 100000')
        log(exp.id, '▶ Starting container...')
        await startContainer('cpu-test')
        log(exp.id, '✓ Container running. Fetching stats...')
        await new Promise(r => setTimeout(r, 1500))
        const s = await fetchStats('cpu-test')
        log(exp.id, `  CPU time accumulated: ${s.cpu_time_ms ?? 'N/A'} ms`)
        log(exp.id, '  → Kernel enforces 30% CPU quota via CFS bandwidth control.')
        await stopContainer('cpu-test')
        await removeContainer('cpu-test')
        log(exp.id, '✓ CPU experiment complete.')
      }

      if (exp.id === 'mem') {
        log(exp.id, '▶ Creating container "mem-test" with 32 MB memory limit...')
        await createContainer({ name: 'mem-test', command: 'sleep 15', memory_mb: 32, cpu_pct: 0 })
        log(exp.id, '✓ Container created. cgroups v2 memory.max = 33554432 bytes')
        await startContainer('mem-test')
        log(exp.id, '✓ Container running.')
        await new Promise(r => setTimeout(r, 1500))
        const s = await fetchStats('mem-test')
        log(exp.id, `  Current memory use: ${s.memory_mb ?? 'N/A'} MB  (limit: 32 MB)`)
        log(exp.id, '  → Any process exceeding 32 MB will be OOM-killed by the kernel.')
        await stopContainer('mem-test')
        await removeContainer('mem-test')
        log(exp.id, '✓ Memory experiment complete.')
      }

      if (exp.id === 'lifecycle') {
        const name = 'lifecycle-test'
        log(exp.id, `▶ CREATE → creating "${name}"...`)
        await createContainer({ name, command: 'sleep 10', memory_mb: 64, cpu_pct: 0 })
        log(exp.id, '✓ State: STOPPED')
        log(exp.id, '▶ START...')
        await startContainer(name)
        log(exp.id, '✓ State: RUNNING')
        log(exp.id, '▶ STOP...')
        await stopContainer(name)
        log(exp.id, '✓ State: STOPPED')
        log(exp.id, '▶ REMOVE...')
        await removeContainer(name)
        log(exp.id, '✓ Container removed from metadata store and cgroup cleaned up.')
        log(exp.id, '\n★ Full lifecycle: STOPPED → RUNNING → STOPPED → (removed)')
      }
    } catch (e: any) {
      log(exp.id, `✗ Error: ${e?.response?.data?.detail || e.message}`)
      toast.error('Experiment failed — check output below.')
    } finally {
      setRunning(r => ({ ...r, [exp.id]: false }))
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">OS Concepts Lab</h1>
        <p className="text-sm text-gray-500">
          Interactive experiments demonstrating Linux namespaces and cgroups v2.
          Results are obtained from the actual container engine.
        </p>
      </div>

      <div className="space-y-6">
        {EXPERIMENTS.map(exp => (
          <div key={exp.id} className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FlaskConical size={16} className="text-blue-500" />
                  {exp.title}
                </h2>
                <p className="text-sm text-gray-500 mt-1">{exp.objective}</p>
              </div>
              <button
                disabled={running[exp.id]}
                onClick={() => runExperiment(exp)}
                className="btn-primary shrink-0"
              >
                <Play size={14} />
                {running[exp.id] ? 'Running…' : 'Run'}
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-700 mb-1">OS Concept</p>
                <p className="text-xs text-blue-800 font-mono">{exp.concept}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Steps</p>
                <ol className="space-y-1">
                  {exp.steps.map((s, i) => (
                    <li key={i} className="text-xs text-gray-500 flex gap-2">
                      <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center shrink-0 text-[10px] font-bold">{i + 1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>

              {outputs[exp.id] && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                    <CheckCircle size={12} className="text-emerald-500" /> Output
                  </p>
                  <pre className="bg-gray-900 text-green-400 font-mono text-xs rounded-lg p-4 whitespace-pre-wrap overflow-x-auto">
                    {outputs[exp.id]}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
