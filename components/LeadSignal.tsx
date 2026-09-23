type Props = {
  isLead?: boolean | null
  confidence?: number | null
  service?: string | null
  urgency?: string | null
  scoredAt?: string | null
  /** true = full panel for the detail page, false = compact pill for table rows */
  detail?: boolean
}

const URGENCY_LABEL: Record<string, string> = {
  low: 'no rush',
  medium: 'within weeks',
  high: 'urgent',
}

/**
 * Displays the Jev classifier's read on an inbound enquiry.
 * Deliberately advisory: it never changes a lead's status by itself.
 */
export default function LeadSignal({ isLead, confidence, service, urgency, scoredAt, detail = false }: Props) {
  if (!scoredAt) {
    return <span className="text-text-muted text-xs">not scored</span>
  }

  const pct = Math.round((confidence ?? 0) * 100)
  const real = isLead === true
  const pill = real ? 'badge-forwarded' : 'badge-archived'
  const label = real ? `real lead ${pct}%` : `suspect ${pct}%`
  const tooltip = [service && `service: ${service}`, urgency && `urgency: ${URGENCY_LABEL[urgency] ?? urgency}`]
    .filter(Boolean)
    .join(' · ')

  if (!detail) {
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${pill}`} title={tooltip || undefined}>
        {label}
      </span>
    )
  }

  return (
    <div className="space-y-2 text-sm">
      <div>
        <span className="text-text-muted text-sm">Verdict:</span>{' '}
        <span className={`px-2 py-0.5 rounded-full text-xs ${pill}`}>{label}</span>
      </div>
      {service && (
        <div>
          <span className="text-text-muted text-sm">Looks like:</span> {service}
        </div>
      )}
      {urgency && (
        <div>
          <span className="text-text-muted text-sm">Urgency:</span> {urgency}
          {URGENCY_LABEL[urgency] ? ` (${URGENCY_LABEL[urgency]})` : ''}
        </div>
      )}
      <div className="text-text-muted text-xs">
        Scored {new Date(scoredAt).toLocaleString()} by Jev, a classifier — it returns probabilities, not opinions.
        Advisory only: your judgement stands.
      </div>
    </div>
  )
}
