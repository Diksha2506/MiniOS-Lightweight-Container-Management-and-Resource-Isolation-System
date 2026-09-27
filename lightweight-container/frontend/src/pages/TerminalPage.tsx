import React, { useEffect, useRef, useState } from 'react'
import axios from 'axios'

const ALLOWED_CMDS = ['list', 'create', 'start', 'stop', 'remove', 'stats', 'help']

const HELP = `Available commands:
  list                          – list all containers
  create <name> [--memory N] [--cpu N] [--command CMD]
  start <name>                  – start a stopped container
  stop <name>                   – stop a running container
  remove <name>                 – remove a stopped container
  stats <name>                  – show resource usage
  help                          – show this help

Commands map directly to the C engine binary via the REST API.
`

export default function TerminalPage() {
  const [lines, setLines] = useState<{ text: string; type: 'input' | 'output' | 'error' }[]>([
    { text: 'Mini Container Terminal — type "help" for commands', type: 'output' },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  const print = (text: string, type: 'output' | 'error' = 'output') =>
    setLines(l => [...l, { text, type }])

  const run = async (raw: string) => {
    const cmd = raw.trim()
    if (!cmd) return
    setLines(l => [...l, { text: `$ ${cmd}`, type: 'input' }])
    setHistory(h => [cmd, ...h.slice(0, 49)])
    setHistIdx(-1)

    if (cmd === 'help') { print(HELP); return }

    const parts = cmd.split(/\s+/)
    const sub = parts[0]

    if (!ALLOWED_CMDS.includes(sub)) {
      print(`Error: unknown command "${sub}". Type "help" for usage.`, 'error')
      return
    }

    setBusy(true)
    try {
      // Map terminal commands to REST API
      let res: any
      if (sub === 'list') {
        const r = await axios.get('http://localhost:8000/api/containers')
        const containers = r.data as any[]
        if (containers.length === 0) {
          print('No containers found.')
        } else {
          print(`${'NAME'.padEnd(20)} ${'PID'.padEnd(10)} ${'STATE'.padEnd(10)} ${'MEM(MB)'.padEnd(10)} CPU%`)
          containers.forEach(c => {
            print(`${c.name.padEnd(20)} ${String(c.pid).padEnd(10)} ${c.state.padEnd(10)} ${String(c.mem_limit).padEnd(10)} ${c.cpu_limit}`)
          })
        }
      } else if (sub === 'create') {
        const payload: any = { name: parts[1] || '', command: '/bin/sh', memory_mb: 0, cpu_pct: 0 }
        for (let i = 2; i < parts.length; i++) {
          if (parts[i] === '--memory') payload.memory_mb = parseInt(parts[++i])
          else if (parts[i] === '--cpu') payload.cpu_pct = parseInt(parts[++i])
          else if (parts[i] === '--command') payload.command = parts[++i]
        }
        res = await axios.post('http://localhost:8000/api/containers', payload)
        print(res.data.message)
      } else if (sub === 'start') {
        res = await axios.post(`http://localhost:8000/api/containers/${parts[1]}/start`)
        print(res.data.message)
      } else if (sub === 'stop') {
        res = await axios.post(`http://localhost:8000/api/containers/${parts[1]}/stop`)
        print(res.data.message)
      } else if (sub === 'remove') {
        res = await axios.delete(`http://localhost:8000/api/containers/${parts[1]}`)
        print(res.data.message)
      } else if (sub === 'stats') {
        res = await axios.get(`http://localhost:8000/api/containers/${parts[1]}/stats`)
        const s = res.data
        print(`Stats for: ${s.name}`)
        print(`  Memory:  ${s.memory_mb ?? 'N/A'} MB`)
        print(`  CPU time: ${s.cpu_time_ms ?? 'N/A'} ms`)
      }
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e.message
      print(`Error: ${msg}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      run(input)
      setInput('')
    } else if (e.key === 'ArrowUp') {
      const idx = Math.min(histIdx + 1, history.length - 1)
      setHistIdx(idx)
      setInput(history[idx] ?? '')
    } else if (e.key === 'ArrowDown') {
      const idx = Math.max(histIdx - 1, -1)
      setHistIdx(idx)
      setInput(idx === -1 ? '' : history[idx] ?? '')
    }
  }

  return (
    <div className="p-6 h-full flex flex-col space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Container Terminal</h1>
        <p className="text-sm text-gray-500">Commands route to the C engine via REST API. Use ↑↓ for history.</p>
      </div>

      <div
        className="flex-1 bg-gray-950 rounded-xl overflow-hidden flex flex-col cursor-text min-h-[500px]"
        onClick={() => inputRef.current?.focus()}
      >
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 border-b border-gray-800">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="ml-2 text-xs text-gray-500 font-mono">container-terminal</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1">
          {lines.map((l, i) => (
            <div key={i} className={
              l.type === 'input' ? 'text-gray-300' :
              l.type === 'error' ? 'text-red-400' : 'text-green-400'
            }>
              <pre className="whitespace-pre-wrap">{l.text}</pre>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-800">
          <span className="text-green-400 font-mono text-sm">$</span>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={busy}
            placeholder={busy ? 'Running…' : 'Type a command…'}
            className="flex-1 bg-transparent text-gray-200 font-mono text-sm focus:outline-none placeholder-gray-600"
            autoFocus
          />
        </div>
      </div>
    </div>
  )
}
