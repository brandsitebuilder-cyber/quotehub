import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const clientSlug = searchParams.get('client')
  const status = searchParams.get('status')

  let query = supabase
    .from('quote_requests')
    .select('*, brand_clients!inner(company_name, slug)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (clientSlug) {
    const { data: c } = await supabase.from('brand_clients').select('id').eq('slug', clientSlug).single()
    if (c) query = query.eq('client_id', c.id)
  }
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
