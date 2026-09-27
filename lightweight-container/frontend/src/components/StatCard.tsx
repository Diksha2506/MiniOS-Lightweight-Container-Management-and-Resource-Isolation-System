import React from 'react'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  color: 'blue' | 'emerald' | 'orange' | 'gray' | 'red'
}

const colorMap = {
  blue:    'bg-blue-50 text-blue-600 border-blue-100',
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  orange:  'bg-orange-50 text-orange-600 border-orange-100',
  gray:    'bg-gray-50 text-gray-500 border-gray-100',
  red:     'bg-red-50 text-red-500 border-red-100',
}

export default function StatCard({ label, value, sub, icon, color }: StatCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
