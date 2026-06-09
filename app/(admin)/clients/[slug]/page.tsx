import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function ClientDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient()
  const { slug } = await params

  const { data: client } = await supabase
    .from('brand_clients')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!client) notFound()

  // Quote stats
  const { count: quoteCount } = await supabase
    .from('quote_requests')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', client.id)

  const { count: thisMonth } = await supabase
    .from('quote_requests')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', client.id)
    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

  // Recent quotes
  const { data: recentQuotes } = await supabase
    .from('quote_requests')
    .select('*')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Service count
  const { count: serviceCount } = await supabase
    .from('quote_services')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', client.id)

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/clients" className="text-text-muted hover:text-text text-sm">← Clients</Link>
        <h1 className="text-2xl font-bold">{client.company_name}</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-text-muted text-xs">Total Quotes</div>
          <div className="text-2xl font-bold mt-1">{quoteCount || 0}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-text-muted text-xs">This Month</div>
          <div className="text-2xl font-bold mt-1">{thisMonth || 0}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-text-muted text-xs">Services</div>
          <div className="text-2xl font-bold mt-1">{serviceCount || 0}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-text-muted text-xs">Mode</div>
          <div className="text-2xl font-bold mt-1">{client.auto_calculate ? '⚡ Auto' : '📋 Manual'}</div>
        </div>
      </div>

      {/* Client info */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-surface border border-border rounded-lg p-6 space-y-2">
          <h2 className="text-lg font-semibold mb-2">Details</h2>
          <div><span className="text-text-muted text-sm">Slug:</span> <code className="text-xs bg-bg px-2 py-1 rounded">{client.slug}</code></div>
          <div><span className="text-text-muted text-sm">Email:</span> {client.contact_email}</div>
          <div><span className="text-text-muted text-sm">Phone:</span> {client.contact_phone || '—'}</div>
          <div><span className="text-text-muted text-sm">Website:</span> {client.website_url ? <a href={client.website_url} target="_blank" className="text-accent hover:underline">{client.website_url}</a> : '—'}</div>
          <div><span className="text-text-muted text-sm">Created:</span> {new Date(client.created_at).toLocaleDateString()}</div>
        </div>

        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Service Catalog</h2>
            <Link href={`/clients/${slug}/services`} className="text-sm text-accent hover:underline">
              Manage →
            </Link>
          </div>
          {serviceCount ? (
            <p className="text-text-muted text-sm">{serviceCount} services configured</p>
          ) : (
            <div className="text-center py-4">
              <p className="text-text-muted text-sm mb-2">No services configured</p>
              <Link href={`/clients/${slug}/services`} className="text-sm text-accent hover:underline">
                Add services →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent quotes */}
      <div className="bg-surface border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Quotes</h2>
        {recentQuotes?.length ? (
          <div className="space-y-2">
            {recentQuotes.map((q: any) => (
              <Link
                key={q.id}
                href={`/quotes/${q.id}`}
                className="flex items-center justify-between py-2 px-3 rounded hover:bg-bg transition-colors border-b border-border last:border-0"
              >
                <div>
                  <span className="font-medium">{q.customer_name}</span>
                  <span className="text-text-muted text-sm ml-3">{q.service_type || '—'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${q.status === 'new' ? 'badge-new' : q.status === 'estimated' ? 'badge-estimated' : q.status === 'forwarded' ? 'badge-forwarded' : 'badge-archived'}`}>
                    {q.status}
                  </span>
                  <span className="text-xs text-text-muted">{new Date(q.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-text-muted text-sm py-4">No quotes yet for this client.</p>
        )}
      </div>
    </div>
  )
}
