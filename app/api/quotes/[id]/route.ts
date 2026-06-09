import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await ctx.params

  const { data: quote, error } = await supabase
    .from('quote_requests')
    .select('*, brand_clients(company_name, slug, contact_email, website_url)')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  const { data: lineItems } = await supabase
    .from('quote_line_items')
    .select('*')
    .eq('quote_id', id)
    .order('sort_order')

  return NextResponse.json({ ...quote, line_items: lineItems || [] })
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await ctx.params
  const body = await request.json()

  const { error } = await supabase.from('quote_requests').update(body).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
