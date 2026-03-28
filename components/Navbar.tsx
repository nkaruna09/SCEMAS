'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Role } from '@/lib/types/roles'

const NAV_LINKS: Record<Role, { label: string; href: string }[]> = {
  city_operator: [
    { label: 'Dashboard', href: '/city-operator' },
    { label: 'Alerts', href: '/city-operator/alerts' },
    { label: 'Alert Rules', href: '/city-operator/alert-rules' },
  ],
  system_admin: [
    { label: 'Dashboard', href: '/system-admin' },
    { label: 'Users', href: '/system-admin/users' },
    { label: 'Sensors', href: '/system-admin/sensors' },
    { label: 'Audit Log', href: '/system-admin/audit-log' },
    { label: 'Alerts', href: '/city-operator/alerts' },
    { label: 'Alert Rules', href: '/city-operator/alert-rules' },
  ],
  government_official: [
    { label: 'Overview', href: '/government' },
    { label: 'Reports', href: '/government/reports' },
  ],
  emergency_services: [
    { label: 'Active Alerts', href: '/emergency' },
  ],
}

const ROLE_LABELS: Record<Role, string> = {
  city_operator: 'City Operator',
  system_admin: 'System Admin',
  government_official: 'Government Official',
  emergency_services: 'Emergency Services',
}

interface NavbarProps {
  role: Role
  email: string
}

export default function Navbar({ role, email }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const links = NAV_LINKS[role]

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
      <span className="font-bold text-gray-900 shrink-0">SCEMAS</span>

      <div className="flex items-center gap-1 flex-1">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              pathname === link.href
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
          {ROLE_LABELS[role]}
        </span>
        <span className="text-sm text-gray-500 hidden sm:block">{email}</span>
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
