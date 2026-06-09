import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase.from('brand_clients').select('*').order('company_name')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Clients</h1>
        <Link href="/clients/new" className="btn-primary text-sm">+ New Client</Link>
      </div>

      <div className="grid gap-4">
        {clients?.map((c: any) => (
          <Link
            key={c.id}
            href={`/clients/${c.slug}`}
            className="bg-surface border border-border rounded-lg p-6 hover:border-text-muted transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{c.company_name}</h3>
                <div className="text-sm text-text-muted mt-1 space-x-4">
                  <span>🔗 {c.slug}</span>
                  <span>📧 {c.contact_email}</span>
                  {c.auto_calculate && <span className="text-accent">⚡ Auto-calc enabled</span>}
                </div>
              </div>
              <span className="text-text-muted text-sm">Manage →</span>
            </div>
          </Link>
        ))}

        {(!clients || clients.length === 0) && (
          <div className="bg-surface border border-border rounded-lg p-8 text-center text-text-muted">
            <p className="mb-4">No clients added yet.</p>
            <Link href="/clients/new" className="btn-primary text-sm">Add your first client</Link>
          </div>
        )}
      </div>
    </div>
  )
}
