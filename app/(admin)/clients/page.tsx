import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const STATUS_ORDER = ['active', 'review', 'demo', 'one-off', 'archived'] as const

const STATUS_META: Record<string, { label: string; badge: string }> = {
  active: { label: 'Active', badge: 'badge-active' },
  'one-off': { label: 'One-off', badge: 'badge-one-off' },
  demo: { label: 'Demo / prospect', badge: 'badge-demo' },
  review: { label: 'Needs review', badge: 'badge-review' },
  archived: { label: 'Archived', badge: 'badge-archived' },
}

const FILTERS = [
  { value: '', label: 'Current' },
  { value: 'active', label: 'Active' },
  { value: 'review', label: 'Needs review' },
  { value: 'demo', label: 'Demo / prospect' },
  { value: 'one-off', label: 'One-off' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
]

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; deleted?: string }>
}) {
  const supabase = await createClient()
  const { status: statusFilter = '', deleted } = await searchParams

  const { data: clients } = await supabase
    .from('brand_clients')
    .select('*')
    .order('company_name')

  // Aggregate recorded activity in two queries rather than one per client.
  const { data: leads } = await supabase.from('quote_requests').select('id, client_id')
  const { data: clicks } = await supabase.from('click_events').select('client_id')

  const leadCounts: Record<string, number> = {}
  const clickCounts: Record<string, number> = {}
  for (const row of leads || []) {
    leadCounts[row.client_id] = (leadCounts[row.client_id] || 0) + 1
  }
  for (const row of clicks || []) {
    clickCounts[row.client_id] = (clickCounts[row.client_id] || 0) + 1
  }

  const all = clients || []

  const counts: Record<string, number> = {}
  for (const c of all) {
    const s = c.status || 'review'
    counts[s] = (counts[s] || 0) + 1
  }

  const shown =
    statusFilter === 'all'
      ? all
      : statusFilter
        ? all.filter((c: any) => (c.status || 'review') === statusFilter)
        : all.filter((c: any) => (c.status || 'review') !== 'archived')

  // Recurring revenue, only counting clients flagged active with a fee set.
  const activeWithFee = all.filter((c: any) => c.status === 'active' && c.monthly_fee)
  const monthlyTotal = activeWithFee.reduce((sum: number, c: any) => sum + Number(c.monthly_fee), 0)

  const sorted = [...shown].sort((a: any, b: any) => {
    const ai = STATUS_ORDER.indexOf((a.status || 'review') as any)
    const bi = STATUS_ORDER.indexOf((b.status || 'review') as any)
    if (ai !== bi) return ai - bi
    return (a.company_name || '').localeCompare(b.company_name || '')
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Clients</h1>
        <Link href="/clients/new" className="btn-primary text-sm">+ New Client</Link>
      </div>

      {deleted && (
        <div className="bg-surface border border-border rounded-lg p-4 mb-6 text-sm">
          Deleted <strong>{deleted}</strong> and its recorded data.
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-text-muted text-xs">Active</div>
          <div className="text-2xl font-bold mt-1">{counts['active'] || 0}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-text-muted text-xs">Needs review</div>
          <div className="text-2xl font-bold mt-1">{counts['review'] || 0}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-text-muted text-xs">Demo / prospect</div>
          <div className="text-2xl font-bold mt-1">{counts['demo'] || 0}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-text-muted text-xs">One-off</div>
          <div className="text-2xl font-bold mt-1">{counts['one-off'] || 0}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-text-muted text-xs">Monthly recurring</div>
          <div className="text-2xl font-bold mt-1">
            {monthlyTotal > 0 ? `R${monthlyTotal.toLocaleString('en-ZA')}` : '—'}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map((f) => {
          const activeFilter = statusFilter === f.value
          const href = f.value ? `/clients?status=${f.value}` : '/clients'
          return (
            <Link
              key={f.label}
              href={href}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                activeFilter
                  ? 'border-accent text-accent'
                  : 'border-border text-text-muted hover:text-text'
              }`}
            >
              {f.label}
              {f.value && counts[f.value] ? ` (${counts[f.value]})` : ''}
            </Link>
          )
        })}
      </div>

      {!statusFilter && monthlyTotal === 0 && (
        <p className="text-text-muted text-sm mb-5">
          No monthly fees set yet. Open a client and set the fee so the recurring total means
          something.
        </p>
      )}

      <div className="grid gap-4">
        {sorted.map((c: any) => {
          const meta = STATUS_META[c.status || 'review'] || STATUS_META.review
          return (
            <Link
              key={c.id}
              href={`/clients/${c.slug}`}
              className="bg-surface border border-border rounded-lg p-6 hover:border-text-muted transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold text-lg">{c.company_name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${meta.badge}`}>{meta.label}</span>
                    {c.monthly_fee ? (
                      <span className="text-xs text-text-muted">
                        R{Number(c.monthly_fee).toLocaleString('en-ZA')}/mo
                      </span>
                    ) : null}
                  </div>
                  <div className="text-sm text-text-muted mt-1 space-x-4">
                    <span>{c.slug}</span>
                    <span>{c.contact_email}</span>
                    <span>{leadCounts[c.id] || 0} leads</span>
                    <span>{clickCounts[c.id] || 0} clicks</span>
                    {c.auto_calculate && <span className="text-accent">Auto-calc on</span>}
                  </div>
                  {c.status_note && (
                    <p className="text-xs text-text-muted mt-2">{c.status_note}</p>
                  )}
                </div>
                <span className="text-text-muted text-sm whitespace-nowrap">Manage →</span>
              </div>
            </Link>
          )
        })}

        {sorted.length === 0 && (
          <div className="bg-surface border border-border rounded-lg p-8 text-center text-text-muted">
            <p className="mb-4">Nothing in this filter.</p>
            <Link href="/clients" className="btn-ghost text-sm">Show current clients</Link>
          </div>
        )}
      </div>
    </div>
  )
}
