'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Quotes', href: '/quotes' },
  { label: 'Clients', href: '/clients' },
  { label: 'Stats', href: '/stats' },
]

export default function AdminSidebar({ email }: { email: string }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded bg-surface border border-border"
        onClick={() => setOpen(!open)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d={open ? "M6 6l12 12M18 6L6 18" : "M4 6h16M4 12h16M4 18h16"} />
        </svg>
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-surface border-r border-border p-6 flex flex-col transition-transform md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Link href="/dashboard" className="text-xl font-bold tracking-tight mb-8" onClick={() => setOpen(false)}>
          Quote<span className="text-accent">Hub</span>
        </Link>
        <nav className="space-y-1 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded transition-colors text-sm ${
                pathname === item.href
                  ? 'bg-bg text-text font-medium'
                  : 'text-text-muted hover:text-text hover:bg-bg'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="pt-4 border-t border-border">
          <div className="text-xs text-text-muted truncate">{email}</div>
          <form action="/api/auth/signout" method="post">
            <button className="text-xs text-text-muted hover:text-text mt-1 transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
