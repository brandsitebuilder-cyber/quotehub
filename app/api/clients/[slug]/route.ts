import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const EDITABLE = [
  'company_name',
  'contact_email',
  'contact_phone',
  'website_url',
  'auto_calculate',
  'status',
  'monthly_fee',
  'status_note',
] as const

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

  const { count: clickCount } = await supabase
    .from('click_events')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', data.id)

  return NextResponse.json({ ...data, quote_count: count || 0, click_count: clickCount || 0 })
}

// Update client fields — status, monthly fee, note and the contact details.
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  for (const key of EDITABLE) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  if ('monthly_fee' in updates) {
    const raw = updates.monthly_fee
    updates.monthly_fee = raw === '' || raw === null ? null : Number(raw)
    if (updates.monthly_fee !== null && Number.isNaN(updates.monthly_fee)) {
      return NextResponse.json({ error: 'Monthly fee must be a number' }, { status: 400 })
    }
  }

  // Archiving stamps a date; moving out of archived clears it.
  if (updates.status === 'archived') updates.archived_at = new Date().toISOString()
  else if ('status' in updates) updates.archived_at = null

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('brand_clients')
    .update(updates)
    .eq('slug', slug)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  return NextResponse.json({ success: true, client: data })
}

// Permanently delete a client and everything recorded against it.
// The UI requires the client name to be typed before this is reachable.
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const admin = createAdminClient()

  const { data: client, error: findError } = await admin
    .from('brand_clients')
    .select('id, company_name')
    .eq('slug', slug)
    .single()

  if (findError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  // Remove dependent rows first so the delete cannot fail on a foreign key.
  const { data: quotes } = await admin
    .from('quote_requests')
    .select('id')
    .eq('client_id', client.id)

  const quoteIds = (quotes || []).map((q: { id: string }) => q.id)

  if (quoteIds.length) {
    await admin.from('quote_line_items').delete().in('quote_id', quoteIds)
  }

  const { count: leadCount } = await admin
    .from('quote_requests')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', client.id)

  const { count: clickCount } = await admin
    .from('click_events')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', client.id)

  const { count: serviceCount } = await admin
    .from('quote_services')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', client.id)

  await admin.from('quote_requests').delete().eq('client_id', client.id)
  await admin.from('click_events').delete().eq('client_id', client.id)
  await admin.from('quote_services').delete().eq('client_id', client.id)

  const { error } = await admin.from('brand_clients').delete().eq('id', client.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    success: true,
    deleted: {
      company_name: client.company_name,
      leads: leadCount || 0,
      clicks: clickCount || 0,
      services: serviceCount || 0,
    },
  })
}
