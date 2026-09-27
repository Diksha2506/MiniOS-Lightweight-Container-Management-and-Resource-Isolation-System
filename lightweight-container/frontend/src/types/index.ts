// All shared TypeScript types for the application

export interface Container {
  name: string
  pid: number
  state: 'RUNNING' | 'STOPPED'
  mem_limit: number   // MB
  cpu_limit: number   // %
}

export interface ContainerStats {
  name: string
  memory_mb: number | null
  cpu_time_ms: number | null
}

export interface SystemInfo {
  os: string
  kernel: string
  arch: string
  engine_path: string
  engine_exists: boolean
  is_linux: boolean
  mock_mode: boolean
  cgroups_v2: boolean
  namespaces: string[]
  mem_total_bytes?: number
  mem_available_bytes?: number
  fs_isolation?: boolean
}

export interface ApiResponse {
  ok: boolean
  message: string
}

export interface CreateContainerPayload {
  name: string
  command: string
  memory_mb: number
  cpu_pct: number
}

// For charts
export interface TimePoint {
  time: string
  value: number
}
