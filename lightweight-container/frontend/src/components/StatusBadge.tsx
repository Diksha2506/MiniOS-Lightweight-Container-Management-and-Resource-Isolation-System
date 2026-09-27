import React from 'react'
import { Circle } from 'lucide-react'
import type { Container } from '../types'

interface Props { container: Container }

export default function StatusBadge({ container }: Props) {
  const running = container.state === 'RUNNING'
  return (
    <span className={running ? 'badge-running' : 'badge-stopped'}>
      <Circle size={6} fill="currentColor" />
      {container.state}
    </span>
  )
}
