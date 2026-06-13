import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ClicksPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; action?: string }>
}) {
  const supabase = await createClient()
  const sp = await searchParams

  let query = supabase
    .from('click_events')
    .select('*, brand_clients!inner(company_name, slug)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (sp.client) {
    const { data: c } = await supabase.from('brand_clients').select('id').eq('slug', sp.client).single()
    if (c) query = query.eq('client_id', c.id)
  }
  if (sp.action) query = query.eq('action_type', sp.action)

  const { data: clicks } = await query
  const { data: clients } = await supabase.from('brand_clients').select('slug, company_name').order('company_name')

  // Counts for summary
  const { count: totalCalls } = await supabase
    .from('click_events')
    .select('*', { count: 'exact', head: true })
    .eq('action_type', 'call')
  const { count: totalWhatsapps } = await supabase
    .from('click_events')
    .select('*', { count: 'exact', head: true })
    .eq('action_type', 'whatsapp')

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Click Tracking</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-text-muted text-sm">📞 Call Clicks</div>
          <div className="text-2xl font-bold mt-1">{totalCalls || 0}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-text-muted text-sm">💬 WhatsApp Clicks</div>
          <div className="text-2xl font-bold mt-1">{totalWhatsapps || 0}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <a
          href="/clicks"
          className={`px-3 py-1.5 rounded text-sm border border-border ${!sp.action && !sp.client ? 'bg-surface text-text' : 'text-text-muted hover:text-text'}`}
        >
          All
        </a>
        <a
          href={`/clicks?action=call${sp.client ? `&client=${sp.client}` : ''}`}
          className={`px-3 py-1.5 rounded text-sm border border-border ${sp.action === 'call' ? 'bg-surface text-text' : 'text-text-muted hover:text-text'}`}
        >
          📞 Calls
        </a>
        <a
          href={`/clicks?action=whatsapp${sp.client ? `&client=${sp.client}` : ''}`}
          className={`px-3 py-1.5 rounded text-sm border border-border ${sp.action === 'whatsapp' ? 'bg-surface text-text' : 'text-text-muted hover:text-text'}`}
        >
          💬 WhatsApp
        </a>
        <select
          className="px-3 py-1.5 rounded text-sm border border-border bg-bg text-text"
          onChange={(e) => {
            const v = e.target.value
            const params = new URLSearchParams()
            if (v) params.set('client', v)
            if (sp.action) params.set('action', sp.action)
            window.location.href = '/clicks' + (params.toString() ? '?' + params.toString() : '')
          }}
          defaultValue={sp.client || ''}
        >
          <option value="">All Clients</option>
          {clients?.map((c: any) => (
            <option key={c.slug} value={c.slug}>{c.company_name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-muted text-left border-b border-border">
              <th className="p-3 font-medium">Action</th>
              <th className="p-3 font-medium">Client</th>
              <th className="p-3 font-medium">Page</th>
              <th className="p-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {clicks?.map((c: any) => (
              <tr key={c.id} className="border-b border-border hover:bg-bg transition-colors">
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${c.action_type === 'whatsapp' ? 'bg-green-600/20 text-green-400' : 'bg-blue-600/20 text-blue-400'}`}>
                    {c.action_type === 'whatsapp' ? '💬 WhatsApp' : '📞 Call'}
                  </span>
                </td>
                <td className="p-3">{c.brand_clients?.company_name}</td>
                <td className="p-3 text-text-muted text-xs max-w-[200px] truncate">
                  {c.source_url ? c.source_url.replace(/^https?:\/\//, '') : '—'}
                </td>
                <td className="p-3 text-text-muted text-xs">
                  {new Date(c.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {(!clicks || clicks.length === 0) && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-text-muted">No click events recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
