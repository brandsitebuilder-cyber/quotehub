import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient()
  const { slug } = await ctx.params

  // Get client ID first
  const { data: client } = await supabase.from('brand_clients').select('id').eq('slug', slug).single()
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('quote_services')
    .select('*')
    .eq('client_id', client.id)
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient()
  const { slug } = await ctx.params
  const body = await request.json()

  const { data: client } = await supabase.from('brand_clients').select('id').eq('slug', slug).single()
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('quote_services')
    .insert({ ...body, client_id: client.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient()
  const body = await request.json()
  const { id, ...updates } = body

  const { error } = await supabase.from('quote_services').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await supabase.from('quote_services').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
