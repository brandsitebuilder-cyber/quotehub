import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { count: totalQuotes } = await supabase.from('quote_requests').select('*', { count: 'exact', head: true })
  const { count: totalClients } = await supabase.from('brand_clients').select('*', { count: 'exact', head: true })
  const { count: newToday } = await supabase
    .from('quote_requests')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date().toISOString().split('T')[0])

  const { data: recent } = await supabase
    .from('quote_requests')
    .select('*, brand_clients!inner(company_name, slug)')
    .order('created_at', { ascending: false })
    .limit(8)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-3 gap-6 mb-10">
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="text-text-muted text-sm">Total Quotes</div>
          <div className="text-3xl font-bold mt-1">{totalQuotes || 0}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="text-text-muted text-sm">Active Clients</div>
          <div className="text-3xl font-bold mt-1">{totalClients || 0}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="text-text-muted text-sm">Today</div>
          <div className="text-3xl font-bold mt-1">{newToday || 0}</div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Quotes</h2>
          <Link href="/quotes" className="text-sm text-accent hover:underline">View all →</Link>
        </div>
        {recent?.length ? (
          <div className="space-y-2">
            {recent.map((q: any) => (
              <Link
                key={q.id}
                href={`/quotes/${q.id}`}
                className="flex items-center justify-between py-3 px-3 rounded hover:bg-bg transition-colors border-b border-border last:border-0"
              >
                <div>
                  <div className="font-medium">{q.customer_name}</div>
                  <div className="text-sm text-text-muted">
                    {q.brand_clients?.company_name} · {q.service_type || 'No service'}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${q.status === 'new' ? 'badge-new' : q.status === 'estimated' ? 'badge-estimated' : q.status === 'forwarded' ? 'badge-forwarded' : 'badge-archived'}`}>
                    {q.status}
                  </span>
                  <span className="text-sm text-text-muted">
                    {new Date(q.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-text-muted py-4">No quotes yet.</p>
        )}
      </div>
    </div>
  )
}
