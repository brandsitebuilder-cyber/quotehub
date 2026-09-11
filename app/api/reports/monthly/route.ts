import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClientActivity, previousMonthPeriod, periodFromKey } from '@/lib/activity'
import { buildActivityReportEmail, sendActivityReport } from '@/lib/report-email'

export const dynamic = 'force-dynamic'

function authorised(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return (request.headers.get('authorization') || '') === `Bearer ${secret}`
}

/**
 * Monthly activity digest. Vercel cron calls this on the 1st (see vercel.json)
 * and it is refused without the CRON_SECRET bearer token, so it cannot be
 * triggered by anyone who finds the path.
 *
 * Reports only go to clients with report_enabled = true AND an explicit
 * report_recipient_email. Nothing is ever defaulted to contact_email, because
 * several client records carry Brand AI Solutions' own address there.
 *
 * ?dry=1 renders what would be sent without sending or stamping anything.
 */
export async function GET(request: NextRequest) {
  if (!authorised(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = new URL(request.url).searchParams
  const dry = params.get('dry') === '1'
  // ?period=YYYY-MM is for manual testing only (still requires the secret);
  // the scheduled run always reports the previous calendar month.
  const manualPeriod = periodFromKey(params.get('period') || '')
  const period = manualPeriod || previousMonthPeriod()
  const admin = createAdminClient()

  const { data: clients, error } = await admin
    .from('brand_clients')
    .select(
      'id, slug, company_name, website_url, report_token, report_enabled, report_recipient_email, report_last_sent_at',
    )
    .eq('report_enabled', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: Record<string, unknown>[] = []

  for (const client of clients || []) {
    const base = { slug: client.slug, company: client.company_name }

    if (!client.report_recipient_email) {
      results.push({ ...base, skipped: 'no report_recipient_email set' })
      continue
    }

    // Idempotency: a cron retry must not send the same month twice.
    // Skipped for manual test runs (explicit ?period), which never stamp.
    if (
      !manualPeriod &&
      client.report_last_sent_at &&
      new Date(client.report_last_sent_at).getTime() >= new Date(period.startIso).getTime()
    ) {
      results.push({ ...base, skipped: `already sent for ${period.label}` })
      continue
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

    if (dry) {
      results.push({
        ...base,
        wouldSendTo: client.report_recipient_email,
        subject,
        contacts: summary.contacts,
        leads: summary.leads,
        calls: summary.calls,
        whatsapps: summary.whatsapps,
      })
      continue
    }

    const sendResult = await sendActivityReport({
      to: client.report_recipient_email,
      subject,
      html,
    })

    if (sendResult.sent && !manualPeriod) {
      await admin
        .from('brand_clients')
        .update({ report_last_sent_at: new Date().toISOString() })
        .eq('id', client.id)
    }

    results.push({
      ...base,
      sentTo: client.report_recipient_email,
      sent: sendResult.sent,
      reason: sendResult.sent ? undefined : sendResult.reason,
      contacts: summary.contacts,
    })
  }

  return NextResponse.json({
    period: period.label,
    periodStart: period.startIso,
    dryRun: dry,
    candidates: results.length,
    results,
  })
}
