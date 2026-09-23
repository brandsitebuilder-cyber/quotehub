import { experimental_evaluate as evaluate } from 'ai'

/**
 * Lead scoring for QuoteHub leads, using Jev (TypeSafe) as a decision layer.
 *
 * Jev is a classifier, not a language model: it returns typed answers with
 * probabilities and generates no prose. We use it to answer three questions
 * about an inbound enquiry:
 *
 *   1. real_lead  — genuine potential client, or spam/test/vendor pitch
 *   2. service    — which of our services is this actually about
 *   3. urgency    — how soon do they need us
 *
 * Design rules (deliberate, do not relax without a decision from Marcus):
 *   - NEVER send customer_name / customer_email / customer_phone. Scoring needs
 *     the enquiry text, not the person. Anything we do not send cannot leak.
 *   - Failure is silent and harmless: scoring returns null, the lead is captured
 *     as normal, and the columns stay empty. Lead capture must never fail
 *     because a classifier was slow or down.
 *   - Hard timeout so a slow classifier cannot stall a visitor's form submit.
 *   - Off unless JEV_LEAD_SCORING=1, so a deploy cannot switch it on by accident.
 */

export const SCORING_ENABLED = process.env.JEV_LEAD_SCORING === '1'

const MODEL = 'typesafe-ai/jev'
const TIMEOUT_MS = 2500

const SERVICES: Record<string, string> = {
  website: 'a new or rebuilt website, or a fix to an existing one',
  reviews: 'Google reviews or reputation management',
  seo: 'search visibility, rankings or Google Business Profile',
  automation: 'automation, integrations or software that does a job for them',
  other: 'something else, or too vague to tell',
}

const URGENCY = [
  'low: no rush, just researching or planning ahead',
  'medium: wants it done within a few weeks',
  'high: urgent, a deadline, a problem that is costing them now',
]

export type LeadScore = {
  isLead: boolean
  confidence: number
  service: string | null
  serviceScores: Record<string, number> | null
  urgency: 'low' | 'medium' | 'high' | null
  urgencyScore: number | null
  ms: number
}

export type LeadScoreInput = {
  serviceType?: string | null
  message?: string | null
  timeline?: string | null
  sourceUrl?: string | null
  customFields?: Record<string, string> | null
}

/** Build the text Jev sees — enquiry content only, no personal identifiers. */
function buildState(input: LeadScoreInput): string {
  const parts: string[] = []
  if (input.serviceType) parts.push(`Service requested in form: ${input.serviceType}`)
  if (input.timeline) parts.push(`Timeline they selected: ${input.timeline}`)
  if (input.message) parts.push(`Their message: ${input.message}`)
  if (input.customFields) {
    for (const [k, v] of Object.entries(input.customFields)) {
      if (v) parts.push(`${k.replace(/_/g, ' ')}: ${v}`)
    }
  }
  if (input.sourceUrl) {
    try {
      parts.push(`Came from: ${new URL(input.sourceUrl).hostname}`)
    } catch {
      /* a malformed source_url is not worth failing over */
    }
  }
  return parts.join('\n')
}

export async function scoreLead(input: LeadScoreInput): Promise<LeadScore | null> {
  if (!SCORING_ENABLED) return null

  const state = buildState(input)
  // Nothing to judge — do not spend a call on an empty enquiry.
  if (state.trim().length < 10) return null

  const started = Date.now()
  try {
    const result = (await Promise.race([
      evaluate({
        model: MODEL,
        state,
        questions: {
          real_lead: {
            type: 'boolean',
            instructions: 'Is this a genuine potential client enquiry from a real business?',
            criteria: {
              true: 'a real business asking about our services, or asking us to contact them',
              false: 'spam, mass solicitation, a vendor pitching to us, or an obvious test message',
            },
          },
          service: {
            type: 'choice',
            instructions: 'Which of our services is this enquiry actually about?',
            criteria: SERVICES,
          },
          urgency: {
            type: 'score',
            instructions: 'How soon does this enquiry need a response or a quote?',
            criteria: URGENCY,
          },
        },
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`lead scoring timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
      ),
    ])) as Awaited<ReturnType<typeof evaluate>>

    const answers = (result as { answers?: Record<string, Record<string, unknown>> }).answers
    const probability = answers?.real_lead?.probability
    const urgencyScore = answers?.urgency?.score

    const urgencyLabel: LeadScore['urgency'] =
      typeof urgencyScore === 'number' && urgencyScore >= 0
        ? (['low', 'medium', 'high'] as const)[Math.min(2, Math.max(0, Math.round(urgencyScore)))]
        : null

    return {
      isLead: typeof probability === 'number' ? probability >= 0.5 : false,
      confidence: typeof probability === 'number' ? probability : 0,
      service: (answers?.service?.choice as string) ?? null,
      serviceScores: (answers?.service?.probabilities as Record<string, number>) ?? null,
      urgency: urgencyLabel,
      urgencyScore: typeof urgencyScore === 'number' ? urgencyScore : null,
      ms: Date.now() - started,
    }
  } catch (error) {
    // A scoring failure must never break lead capture. Log it and move on.
    console.error('Lead scoring failed (lead was still captured):', error)
    return null
  }
}

/** Map a score onto the quote_requests columns added for this feature. */
export function scoreToColumns(score: LeadScore) {
  return {
    ai_is_lead: score.isLead,
    ai_confidence: Number(score.confidence.toFixed(4)),
    ai_service: score.service,
    ai_urgency: score.urgency,
    ai_scored_at: new Date().toISOString(),
  }
}
