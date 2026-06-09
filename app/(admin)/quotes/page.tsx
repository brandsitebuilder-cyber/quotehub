import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; status?: string }>
}) {
  const supabase = await createClient()
  const sp = await searchParams

  let query = supabase
    .from('quote_requests')
    .select('*, brand_clients!inner(company_name, slug)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (sp.client) {
    const { data: c } = await supabase.from('brand_clients').select('id').eq('slug', sp.client).single()
    if (c) query = query.eq('client_id', c.id)
  }
  if (sp.status) query = query.eq('status', sp.status)

  const { data: quotes } = await query
  const { data: clients } = await supabase.from('brand_clients').select('slug, company_name').order('company_name')

  const statuses = ['new', 'estimated', 'forwarded', 'archived']

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Quotes</h1>

      <div className="flex gap-3 mb-6 flex-wrap">
        <a href="/quotes" className={`px-3 py-1.5 rounded text-sm border border-border ${!sp.status && !sp.client ? 'bg-surface text-text' : 'text-text-muted hover:text-text'}`}>
          All
        </a>
        {statuses.map((s) => (
          <a
            key={s}
            href={`/quotes?status=${s}${sp.client ? `&client=${sp.client}` : ''}`}
            className={`px-3 py-1.5 rounded text-sm border border-border capitalize ${sp.status === s ? 'bg-surface text-text' : 'text-text-muted hover:text-text'}`}
          >
            {s}
          </a>
        ))}

        <select
          className="form-input w-auto ml-auto"
          defaultValue={sp.client || ''}
          onChange={(e) => {
            const url = new URL(window.location.href)
            if (e.target.value) url.searchParams.set('client', e.target.value)
            else url.searchParams.delete('client')
            window.location.href = url.toString()
          }}
        >
          <option value="">All clients</option>
          {clients?.map((c: any) => (
            <option key={c.slug} value={c.slug}>{c.company_name}</option>
          ))}
        </select>
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-muted text-left border-b border-border">
              <th className="p-3 font-medium">Customer</th>
              <th className="p-3 font-medium">Client</th>
              <th className="p-3 font-medium">Service</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium text-right">Amount</th>
              <th className="p-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {quotes?.map((q: any) => (
              <tr key={q.id} className="border-b border-border hover:bg-bg transition-colors">
                <td className="p-3">
                  <Link href={`/quotes/${q.id}`} className="font-medium hover:text-accent">
                    {q.customer_name}
                  </Link>
                  {q.customer_email && <div className="text-text-muted text-xs">{q.customer_email}</div>}
                </td>
                <td className="p-3 text-text-muted">{q.brand_clients?.company_name}</td>
                <td className="p-3">{q.service_type || '—'}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${q.status === 'new' ? 'badge-new' : q.status === 'estimated' ? 'badge-estimated' : q.status === 'forwarded' ? 'badge-forwarded' : 'badge-archived'}`}>
                    {q.status}
                  </span>
                </td>
                <td className="p-3 text-right">
                  {q.estimated_amount ? `R${q.estimated_amount.toLocaleString()}` : '—'}
                </td>
                <td className="p-3 text-text-muted text-xs">
                  {new Date(q.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {(!quotes || quotes.length === 0) && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-text-muted">No quotes found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
