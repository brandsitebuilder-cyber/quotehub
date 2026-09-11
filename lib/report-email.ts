import { Resend } from 'resend'
import type { ActivitySummary } from '@/lib/activity'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const BRAND = '#C8963E'
const MUTED = '#8B8F96'
const BORDER = '#232427'

function card(title: string, body: string) {
  return `
    <div style="background:#101113;border:1px solid ${BORDER};border-radius:12px;padding:16px;margin-bottom:14px">
      <div style="font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:${MUTED};margin-bottom:10px">${title}</div>
      ${body}
    </div>`
}

function row(label: string, value: string) {
  return `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid ${BORDER};font-size:14px">
    <span style="color:${MUTED}">${label}</span><span>${value}</span>
  </div>`
}

function stat(value: number, label: string, size = 26) {
  return `<div style="margin:0 0 12px 0">
    <div style="font-size:${size}px;font-weight:700;line-height:1">${value}</div>
    <div style="font-size:12px;color:${MUTED};margin-top:4px">${label}</div>
  </div>`
}

/**
 * Client-facing activity email. Counts only — no customer names, emails or
 * phone numbers are ever included.
 */
export function buildActivityReportEmail({
  companyName,
  summary,
  previous,
  siteUrl,
  publicUrl,
  unsubscribeHint = 'Reply "stop" and we will not send these again.',
}: {
  companyName: string
  summary: ActivitySummary
  previous?: ActivitySummary | null
  siteUrl?: string | null
  publicUrl?: string | null
  unsubscribeHint?: string
}) {
  const { period } = summary
  const subject = `Your website activity — ${period.label}`

  const serviceRows = summary.byService.length
    ? summary.byService.map((s) => row(s.name, String(s.count))).join('')
    : `<div style="font-size:13px;color:${MUTED}">Nothing recorded this month.</div>`

  const sourceRows = summary.bySource.length
    ? summary.bySource.slice(0, 6).map((s) => row(s.name, String(s.count))).join('')
    : `<div style="font-size:13px;color:${MUTED}">Nothing recorded this month.</div>`

  const changeLine =
    previous && previous.contacts > 0
      ? `Previous month (${previous.period.label}): ${previous.contacts} contacts.`
      : `First month on record — comparison starts next month.`

  const html = `
  <div style="background:#08090A;padding:22px 18px;font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;color:#F2F3F5">
    <div style="max-width:520px;margin:0 auto">
      <h1 style="font-size:20px;margin:0 0 4px;color:#F2F3F5">Your website activity</h1>
      <div style="font-size:13px;color:${MUTED};margin-bottom:20px">
        ${companyName} · ${period.label}${siteUrl ? ` · ${siteUrl.replace(/^https?:\/\//, '')}` : ''}
      </div>

      ${card('What came in', `
        ${stat(summary.contacts, 'Total contacts', 36)}
        <div style="display:flex;gap:18px;flex-wrap:wrap">
          <div>${stat(summary.leads, 'Enquiries via your form')}</div>
          <div>${stat(summary.calls, 'Times "Call" was tapped')}</div>
          <div>${stat(summary.whatsapps, 'Times WhatsApp was tapped')}</div>
        </div>
        <div style="font-size:12px;color:${MUTED};margin-top:10px">
          Only what your website can see. Calls made straight from Google, and walk-ins, are not
          counted — so the real number is at least this.
        </div>`)}

      ${card('What people asked about', serviceRows)}
      ${card('Where the interest came from', sourceRows)}

      ${card('Month on month', `
        <div style="font-size:13px;color:${MUTED}">${changeLine}</div>`)}

      <div style="font-size:12px;color:${MUTED};margin-top:8px">
        Estimated figures are not shown here. When they are, they are always labelled as an
        estimate — never as revenue.
      </div>

      ${publicUrl ? `<div style="margin:18px 0">
        <a href="${publicUrl}" style="background:${BRAND};color:#08090A;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:600;font-size:14px;display:inline-block">
          View this live
        </a>
      </div>` : ''}

      <div style="font-size:11px;color:${MUTED};text-align:center;margin-top:20px;line-height:1.6">
        Sent by Brand AI Solutions, who host and maintain your website.<br/>${unsubscribeHint}
      </div>
    </div>
  </div>`

  return { subject, html }
}

export async function sendActivityReport({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  if (!resend || !process.env.RESEND_API_KEY) {
    console.log('[EMAIL STUB] activity report would send to', to, '|', subject)
    return { sent: false, reason: 'no RESEND_API_KEY' as const }
  }
  const result = await resend.emails.send({
    from: 'Brand AI Solutions <reports@brandaisolutions.co.za>',
    to,
    subject,
    html,
  })
  return { sent: true, result }
}
