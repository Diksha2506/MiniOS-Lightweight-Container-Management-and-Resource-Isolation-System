import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Box, Plus, Activity, FlaskConical, Settings, Terminal, Cpu,
} from 'lucide-react'

const links = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard'     },
  { to: '/containers',icon: Box,             label: 'Containers'    },
  { to: '/create',    icon: Plus,            label: 'Create'        },
  { to: '/monitor',   icon: Activity,        label: 'Monitoring'    },
  { to: '/lab',       icon: FlaskConical,    label: 'OS Lab'        },
  { to: '/terminal',  icon: Terminal,        label: 'Terminal'      },
  { to: '/settings',  icon: Settings,        label: 'System Info'   },
]

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 flex flex-col bg-navy-900 min-h-screen px-3 py-6">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 mb-8">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <Cpu size={18} className="text-white" />
        </div>
        <div>
          <p className="text-white text-sm font-bold leading-tight">MiniDocker</p>
          <p className="text-gray-500 text-[10px] leading-tight">OS Project</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-navy-700 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-navy-700'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-3 py-2 rounded-lg bg-navy-800 border border-navy-600">
        <p className="text-[10px] text-gray-500 font-mono">Academic Project</p>
        <p className="text-[10px] text-gray-500">cgroups v2 · Namespaces</p>
      </div>
    </aside>
  )
}
