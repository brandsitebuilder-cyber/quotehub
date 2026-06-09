import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient()
  const { slug } = await ctx.params

  const { data, error } = await supabase
    .from('brand_clients')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Get quote count for this client
  const { count } = await supabase
    .from('quote_requests')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', data.id)

  return NextResponse.json({ ...data, quote_count: count || 0 })
}
