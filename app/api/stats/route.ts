import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest) {
  const supabase = await createClient()

  // Totals
  const { count: totalQuotes } = await supabase.from('quote_requests').select('*', { count: 'exact', head: true })
  const { count: totalClients } = await supabase.from('brand_clients').select('*', { count: 'exact', head: true })
  const { count: newToday } = await supabase
    .from('quote_requests')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date().toISOString().split('T')[0])

  // Per-client breakdown
  const { data: perClient } = await supabase
    .from('quote_requests')
    .select('client_id, brand_clients!inner(company_name, slug)')
  const clientCounts: Record<string, { name: string; slug: string; count: number }> = {}
  perClient?.forEach((q: any) => {
    const slug = q.brand_clients?.slug
    if (!slug) return
    if (!clientCounts[slug]) {
      clientCounts[slug] = { name: q.brand_clients?.company_name || slug, slug, count: 0 }
    }
    clientCounts[slug].count++
  })

  return NextResponse.json({
    totals: { quotes: totalQuotes || 0, clients: totalClients || 0, today: newToday || 0 },
    perClient: Object.values(clientCounts).sort((a, b) => b.count - a.count),
  })
}
