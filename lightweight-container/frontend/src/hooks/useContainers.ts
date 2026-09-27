import { useState, useEffect, useCallback } from 'react'
import { fetchContainers } from '../services/api'
import type { Container } from '../types'

export function useContainers(pollMs = 4000) {
  const [containers, setContainers] = useState<Container[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const data = await fetchContainers()
      setContainers(data)
      setError(null)
    } catch {
      setError('Backend unavailable – is the FastAPI server running?')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, pollMs)
    return () => clearInterval(id)
  }, [refresh, pollMs])

  return { containers, loading, error, refresh }
}
