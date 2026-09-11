import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getClientActivity,
  getClientActivitySeries,
  periodFromKey,
  currentMonthPeriod,
  type ActivitySummary,
} from '@/lib/activity'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Website activity',
  robots: { index: false, follow: false },
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 mb-3">
      <div className="text-[11px] tracking-wider uppercase text-text-muted font-semibold mb-3">
        {title}
      </div>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline py-2 border-b border-border last:border-0 text-sm">
      <span className="text-text-muted">{label}</span>
      <span>{value}</span>
    </div>
  )
}

export default async function ValueReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ m?: string }>
}) {
  const { token } = await params
  const { m } = await searchParams

  if (!token || token.length < 16) notFound()

  const admin = createAdminClient()
  const { data: client } = await admin
    .from('brand_clients')
    .select('id, company_name, website_url, report_token')
    .eq('report_token', token)
    .single()

  if (!client) notFound()

  const selected = periodFromKey(m || '') || currentMonthPeriod()
  const [summary, series] = await Promise.all([
    getClientActivity(client.id, selected),
    getClientActivitySeries(client.id, 6),
  ])

  const index = series.findIndex((s) => s.period.key === summary.period.key)
  const previous: ActivitySummary | null = index > 0 ? series[index - 1] : null

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-[520px] mx-auto px-4 py-7">
        <h1 className="text-xl font-bold mb-1">Your website activity</h1>
        <div className="text-text-muted text-sm mb-5">
          {client.company_name} · {summary.period.label}
          {client.website_url
            ? ` · ${client.website_url.replace(/^https?:\/\//, '')}`
            : ''}
        </div>

        <Card title="What came in">
          <div className="mb-3">
            <div className="text-4xl font-bold leading-none">{summary.contacts}</div>
            <div className="text-text-muted text-xs mt-1">Total contacts</div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-2xl font-bold leading-none">{summary.leads}</div>
              <div className="text-text-muted text-xs mt-1">Form enquiries</div>
            </div>
            <div>
              <div className="text-2xl font-bold leading-none">{summary.calls}</div>
              <div className="text-text-muted text-xs mt-1">Call taps</div>
            </div>
            <div>
              <div className="text-2xl font-bold leading-none">{summary.whatsapps}</div>
              <div className="text-text-muted text-xs mt-1">WhatsApp taps</div>
            </div>
          </div>
          <p className="text-text-muted text-xs mt-3">
            Only what your website can see. Calls made straight from Google, and walk-ins, are not
            counted — so the real number is at least this.
          </p>
        </Card>

        <Card title="What people asked about">
          {summary.byService.length ? (
            summary.byService.map((s) => <Row key={s.name} label={s.name} value={String(s.count)} />)
          ) : (
            <p className="text-text-muted text-sm">Nothing recorded this month.</p>
          )}
        </Card>

        <Card title="Where the interest came from">
          {summary.bySource.length ? (
            summary.bySource
              .slice(0, 6)
              .map((s) => <Row key={s.name} label={s.name} value={String(s.count)} />)
          ) : (
            <p className="text-text-muted text-sm">Nothing recorded this month.</p>
          )}
        </Card>

        <Card title="Month on month">
          {series.map((s) => (
            <Row
              key={s.period.key}
              label={s.period.label}
              value={s.period.key === summary.period.key ? `${s.contacts} (shown)` : String(s.contacts)}
            />
          ))}
          {!previous && (
            <p className="text-text-muted text-xs mt-2">
              First month on record — comparison builds from here.
            </p>
          )}
        </Card>

        <Card title="Estimated value">
          <p className="text-text-muted text-sm">
            Not shown yet. The rand figure is calculated from the starting price of the services
            people asked for, and only appears once your service prices are set up. It is always
            labelled as an estimate, never as revenue.
          </p>
        </Card>

        <div className="flex flex-wrap gap-2 mt-5">
          {series.map((s) => (
            <Link
              key={s.period.key}
              href={`/value/${token}?m=${s.period.key}`}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                s.period.key === summary.period.key
                  ? 'border-accent text-accent'
                  : 'border-border text-text-muted hover:text-text'
              }`}
            >
              {s.period.label}
            </Link>
          ))}
        </div>

        <p className="text-text-muted text-[11px] text-center mt-6 leading-relaxed">
          Sent by Brand AI Solutions, who host and maintain your website.
          <br />
          Ask us to stop and we will switch these off.
        </p>
      </div>
    </div>
  )
}
