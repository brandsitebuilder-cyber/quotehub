import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: quote } = await supabase
    .from('quote_requests')
    .select('*, brand_clients!inner(company_name, slug, contact_email, website_url)')
    .eq('id', id)
    .single()

  if (!quote) notFound()

  const { data: lineItems } = await supabase
    .from('quote_line_items')
    .select('*')
    .eq('quote_id', id)
    .order('sort_order')

  // All clients for reassign
  const { data: allClients } = await supabase
    .from('brand_clients')
    .select('id, slug, company_name')
    .order('company_name')

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/quotes" className="text-text-muted hover:text-text text-sm">← Quotes</Link>
        <h1 className="text-2xl font-bold">Quote Detail</h1>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Customer info */}
        <div className="bg-surface border border-border rounded-lg p-6 space-y-3">
          <h2 className="text-lg font-semibold mb-2">Customer</h2>
          <div><span className="text-text-muted text-sm">Name:</span> <span className="font-medium">{quote.customer_name}</span></div>
          {quote.customer_email && <div><span className="text-text-muted text-sm">Email:</span> <a href={`mailto:${quote.customer_email}`} className="text-accent hover:underline">{quote.customer_email}</a></div>}
          {quote.customer_phone && <div><span className="text-text-muted text-sm">Phone:</span> {quote.customer_phone}</div>}
          <div><span className="text-text-muted text-sm">Service:</span> {quote.service_type || '—'}</div>
          <div>
            <span className="text-text-muted text-sm">Status:</span>
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${quote.status === 'new' ? 'badge-new' : quote.status === 'estimated' ? 'badge-estimated' : quote.status === 'forwarded' ? 'badge-forwarded' : 'badge-archived'}`}>
              {quote.status}
            </span>
          </div>
          {quote.estimated_amount && (
            <div><span className="text-text-muted text-sm">Estimate:</span> <span className="font-bold text-lg">R{quote.estimated_amount.toLocaleString()}</span></div>
          )}
          <div><span className="text-text-muted text-sm">Date:</span> {new Date(quote.created_at).toLocaleString()}</div>
          {quote.source_url && <div><span className="text-text-muted text-sm">Source:</span> <a href={quote.source_url} target="_blank" className="text-accent hover:underline text-sm">{quote.source_url}</a></div>}
        </div>

        {/* Client info */}
        <div className="bg-surface border border-border rounded-lg p-6 space-y-3">
          <h2 className="text-lg font-semibold mb-2">Client</h2>
          <div><span className="text-text-muted text-sm">Business:</span> <span className="font-medium">{quote.brand_clients?.company_name}</span></div>
          <div><span className="text-text-muted text-sm">Contact:</span> {quote.brand_clients?.contact_email}</div>
          <div><span className="text-text-muted text-sm">Website:</span> {quote.brand_clients?.website_url || '—'}</div>
        </div>
      </div>

      {/* Message */}
      {quote.message && (
        <div className="mt-6 bg-surface border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Message</h2>
          <p className="text-text-muted whitespace-pre-wrap">{quote.message}</p>
        </div>
      )}

      {/* Line items */}
      {lineItems && lineItems.length > 0 && (
        <div className="mt-6 bg-surface border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Line Items</h2>
          <div className="space-y-2">
            {lineItems.map((item: any) => (
              <div key={item.id} className="flex justify-between py-2 border-b border-border last:border-0">
                <span>{item.description}</span>
                <span className="text-text-muted text-sm">
                  {item.quantity} × R{item.rate.toLocaleString()} = <span className="text-text font-medium">R{item.amount.toLocaleString()}</span>
                </span>
              </div>
            ))}
            <div className="flex justify-between pt-3 border-t border-border">
              <span className="font-semibold">Total</span>
              <span className="font-bold">
                R{lineItems.reduce((sum: number, li: any) => sum + li.amount, 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {quote.notes && (
        <div className="mt-6 bg-surface border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Internal Notes</h2>
          <p className="text-text-muted whitespace-pre-wrap">{quote.notes}</p>
        </div>
      )}
    </div>
  )
}
