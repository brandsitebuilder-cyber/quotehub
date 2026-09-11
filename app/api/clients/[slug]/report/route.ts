import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClientActivity, getClientActivitySeries, previousMonthPeriod, periodFromKey } from '@/lib/activity'
import { buildActivityReportEmail, sendActivityReport } from '@/lib/report-email'

export const dynamic = 'force-dynamic'

const TEST_RECIPIENT = 'marcus@rocketmail.com'

/**
 * Admin-only actions for a client's activity report:
 *   generate  — issue a new private link (the old one stops working)
 *   update    — set enabled / recipient
 *   test      — send the previous month's digest to Marcus, using real numbers
 *   preview   — return the digest HTML for rendering in the admin UI
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await ctx.params
  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const action = String(body.action || '')
  const admin = createAdminClient()

  const { data: client } = await admin
    .from('brand_clients')
    .select('id, slug, company_name, website_url, report_token, report_enabled, report_recipient_email')
    .eq('slug', slug)
    .single()

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  if (action === 'generate') {
    const token = randomBytes(16).toString('hex')
    const { error } = await admin
      .from('brand_clients')
      .update({ report_token: token })
      .eq('id', client.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({
      success: true,
      token,
      url: `https://quotehub-theta.vercel.app/value/${token}`,
    })
  }

  if (action === 'update') {
    const updates: Record<string, unknown> = {}
    if ('enabled' in body) updates.report_enabled = Boolean(body.enabled)
    if ('recipient' in body) {
      const recipient = String(body.recipient || '').trim()
      updates.report_recipient_email = recipient || null
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }
    const { error } = await admin.from('brand_clients').update(updates).eq('id', client.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, updates })
  }

  // test + preview share the same rendering path, from real data.
  // Period: an explicit ?period, else the most recent month that actually has
  // activity (so a test never shows an empty month while data exists), else
  // the previous calendar month.
  const requested = periodFromKey(String(body.period || ''))
  let period = requested || previousMonthPeriod()
  if (!requested) {
    const series = await getClientActivitySeries(client.id, 6)
    const withData = [...series].reverse().find((s) => s.contacts > 0)
    if (withData) period = withData.period
  }
  const summary = await getClientActivity(client.id, period)
  const { subject, html } = buildActivityReportEmail({
    companyName: client.company_name,
    summary,
    previous: null,
    siteUrl: client.website_url,
    publicUrl: client.report_token
      ? `https://quotehub-theta.vercel.app/value/${client.report_token}`
      : null,
  })

  if (action === 'preview') {
    return NextResponse.json({ success: true, period: period.label, subject, html, summary })
  }

  if (action === 'test') {
    const to = String(body.to || TEST_RECIPIENT)
    const result = await sendActivityReport({ to, subject, html })
    return NextResponse.json({
      success: result.sent,
      to,
      period: period.label,
      contacts: summary.contacts,
      reason: result.sent ? undefined : result.reason,
    })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
}
