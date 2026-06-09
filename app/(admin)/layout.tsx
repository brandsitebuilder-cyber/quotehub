import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const navItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Quotes', href: '/quotes' },
  { label: 'Clients', href: '/clients' },
  { label: 'Stats', href: '/stats' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-surface border-r border-border p-6 flex flex-col">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight mb-8">
          Quote<span className="text-accent">Hub</span>
        </Link>
        <nav className="space-y-1 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded text-text-muted hover:text-text hover:bg-bg transition-colors text-sm"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="pt-4 border-t border-border">
          <div className="text-xs text-text-muted truncate">{user.email}</div>
          <form action="/api/auth/signout" method="post">
            <button className="text-xs text-text-muted hover:text-text mt-1 transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
