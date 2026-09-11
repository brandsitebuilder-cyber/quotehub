import { createAdminClient } from '@/lib/supabase/admin'

// South Africa is UTC+2 all year (no daylight saving), so period bounds are
// built as explicit +02:00 timestamps rather than derived from server-local time.
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000

export type ActivityPeriod = {
  /** inclusive, e.g. 2026-06-01T00:00:00+02:00 */
  startIso: string
  /** exclusive, e.g. 2026-07-01T00:00:00+02:00 */
  endIso: string
  /** e.g. "June 2026" */
  label: string
  /** e.g. "2026-06" */
  key: string
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** Calendar year/month in SAST for a given instant. */
function sastParts(now: Date) {
  const shifted = new Date(now.getTime() + SAST_OFFSET_MS)
  return { year: shifted.getUTCFullYear(), monthIndex: shifted.getUTCMonth() }
}

export function sastMonthPeriod(year: number, monthIndex: number): ActivityPeriod {
  const normalisedYear = year + Math.floor(monthIndex / 12)
  const normalisedMonth = ((monthIndex % 12) + 12) % 12
  const nextMonth = normalisedMonth === 11 ? 0 : normalisedMonth + 1
  const nextYear = normalisedMonth === 11 ? normalisedYear + 1 : normalisedYear

  return {
    startIso: `${normalisedYear}-${pad(normalisedMonth + 1)}-01T00:00:00+02:00`,
    endIso: `${nextYear}-${pad(nextMonth + 1)}-01T00:00:00+02:00`,
    label: `${MONTHS[normalisedMonth]} ${normalisedYear}`,
    key: `${normalisedYear}-${pad(normalisedMonth + 1)}`,
  }
}

export function currentMonthPeriod(now: Date = new Date()): ActivityPeriod {
  const { year, monthIndex } = sastParts(now)
  return sastMonthPeriod(year, monthIndex)
}

export function previousMonthPeriod(now: Date = new Date()): ActivityPeriod {
  const { year, monthIndex } = sastParts(now)
  return sastMonthPeriod(year, monthIndex - 1)
}

/** Oldest → newest, ending with the current month. */
export function lastMonths(count: number, now: Date = new Date()): ActivityPeriod[] {
  const { year, monthIndex } = sastParts(now)
  const periods: ActivityPeriod[] = []
  for (let i = count - 1; i >= 0; i--) {
    periods.push(sastMonthPeriod(year, monthIndex - i))
  }
  return periods
}

export function periodFromKey(key: string): ActivityPeriod | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key || '')
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) return null
  return sastMonthPeriod(year, month - 1)
}

export type ActivitySummary = {
  period: ActivityPeriod
  leads: number
  calls: number
  whatsapps: number
  /** leads + call taps + WhatsApp taps */
  contacts: number
  byService: { name: string; count: number }[]
  bySource: { name: string; count: number }[]
}

type Row = {
  service_type?: string | null
  source_url?: string | null
  action_type?: string | null
}

function pageLabel(url: string | null | undefined): string {
  if (!url) return 'Not recorded'
  try {
    const u = new URL(url)
    const hash = (u.hash || '').replace('#', '')
    if (hash) return `Contact section (${hash})`
    return u.pathname === '/' || u.pathname === '' ? 'Home page' : u.pathname
  } catch {
    return 'Not recorded'
  }
}

function tally(rows: Row[], pick: (row: Row) => string) {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = pick(row)
    map.set(key, (map.get(key) || 0) + 1)
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Activity for one client in one period. Counts only — no customer names,
 * emails or phone numbers leave this function, so the result is safe to render
 * on a public link.
 */
export async function getClientActivity(clientId: string, period: ActivityPeriod): Promise<ActivitySummary> {
  const admin = createAdminClient()

  const [{ data: leads }, { data: clicks }] = await Promise.all([
    admin
      .from('quote_requests')
      .select('service_type, source_url, created_at')
      .eq('client_id', clientId)
      .gte('created_at', period.startIso)
      .lt('created_at', period.endIso),
    admin
      .from('click_events')
      .select('action_type, source_url, created_at')
      .eq('client_id', clientId)
      .gte('created_at', period.startIso)
      .lt('created_at', period.endIso),
  ])

  const leadRows = (leads || []) as Row[]
  const clickRows = (clicks || []) as Row[]

  const calls = clickRows.filter((c) => c.action_type === 'call').length
  const whatsapps = clickRows.filter((c) => c.action_type === 'whatsapp').length

  return {
    period,
    leads: leadRows.length,
    calls,
    whatsapps,
    contacts: leadRows.length + calls + whatsapps,
    byService: tally(leadRows, (r) => r.service_type || 'Not specified'),
    bySource: tally([...leadRows, ...clickRows], (r) => pageLabel(r.source_url)),
  }
}

/** Oldest → newest series, for the month-on-month view. */
export async function getClientActivitySeries(
  clientId: string,
  months: number,
  now: Date = new Date(),
): Promise<ActivitySummary[]> {
  const periods = lastMonths(months, now)
  return Promise.all(periods.map((p) => getClientActivity(clientId, p)))
}
