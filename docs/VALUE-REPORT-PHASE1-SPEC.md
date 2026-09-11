# Value Report — Phase 1 Spec (rev 2, post-review)

**Project:** QuoteHub (`~/projects/quotehub/`, `quotehub-theta.vercel.app`)
**Supabase:** `lxteyhbdkzfldfnnzsyz` · **Next.js:** 16.2.9 (auth file is `proxy.ts`, not `middleware.ts`)
**Date:** 2026-09-11 · **Status:** SPEC — awaiting scope decision, no code written
**Rev 2** incorporates the GLM 5.2 orchestrator review (session `20260911_073616_0988a6`, 2026-09-11) with every finding independently re-verified against the live database and code.

---

## 1. Goal

Answer the client's retention question — *"is this worth what I pay?"* — with evidence, not adjectives. Delivery: a private no-login link plus a monthly email, computed from data QuoteHub already collects.

---

## 2. Verified state of the system (re-measured 2026-09-11)

| Piece | Reality |
|---|---|
| `quote_requests` | 9 rows total, all clients, since 2026-06-10. **All 9 are test entries** ("Test User", "John Tester", "Live API Test", "Test Marcus", "CustomFieldTest2"). `service_type` values: `residential`, `electrical`, `DB Board Replacement`, `Web Development`, `AI Automation`, `Google Business Profile` |
| `quote_requests.estimated_amount` | Exists. Populated on 2 rows, both `5500` |
| `quote_line_items` | Exists. Holds **per-lead rate snapshots** (e.g. `DB Board Installation` 3500, `Plug Point Installation` 450, `Light Installation` 350, `Geyser Timer Installation` 1200 = 5500) |
| `click_events` | 16 rows. **Columns are `id, client_id, action_type, source_url, created_at`.** There is **no `client_slug` and no `metadata` column** — `client_slug` is only the API *request* param; `/api/track` and `/api/r` resolve it to `client_id` at write time (`app/api/track/route.ts:35`, `app/api/r/route.ts:53`) |
| `quote_services` | Per-client catalogue: `id, client_id, name, description, rate, unit, category, sort_order, created_at`. Eltec has 7 rows |
| `lib/pricing.ts` | Matches incoming `service_type` against `quote_services.category` and **sums every service in that category** — hence `residential` → 5,500 |
| `lib/supabase/proxy.ts` | `isPublic` allowlist = `/login`, `/api/quote`, `/api/track`, `/api/r` only (lines 25–29). Anything else without a session redirects to `/login` |
| Vercel cron | No `vercel.json`. Hobby plan: up to 100 cron jobs, **minimum interval once per day** (Vercel docs, cron jobs usage & pricing) |
| Resend | Live via `lib/email.ts`, sending domain verified |

**Consequence:** the tracking and pricing infrastructure is real and working, but there is **no real lead data yet**. That drives the scope question in §4.

---

## 3. The number, defined precisely

Two hard problems surfaced in review, both verified:

**3.1 "Starting price" is ambiguous — 13× spread on the same lead.** For a `residential` lead the three candidate readings are: lowest rate in category = **R350** · first by `sort_order` = **R3,500** · category sum = **R5,500** (what the live system already computes). Undefined, the headline figure is indefensible the first time a client asks how it was derived.

**3.2 Recomputing prices rewrites history.** Resolving value from `quote_services.rate` at report time means next year's price change alters last June's reported value. The database already solves this: `quote_line_items.amount` and `quote_requests.estimated_amount` are snapshots taken at lead time.

**Agreed definition (pending §4 decision):**
```
value of a PRICED lead   = its snapshotted estimated_amount (fallback: Σ quote_line_items.amount)
value of an UNPRICED lead = re-resolve at report time via form_values → name → category,
                            and if that yields multiple services, sum them (matching existing behaviour)
estimated_value           = Σ of the above, priced leads only
reported alongside        = leads · priced_leads · unpriced_leads · call_clicks · whatsapp_clicks
```
Rules: conservative by construction · clicks counted but never monetised · unpriced leads always visible, never dropped · deterministic arithmetic, no AI commentary · every presentation carries *"Estimated value — based on your published starting prices."*

---

## 4. Scope decision (needs Marcus)

### Option 1A — Activity digest only *(reviewer's recommendation; endorsed)*
Monthly email + private link showing **activity, no rand figure**: enquiries received, calls tapped, WhatsApps tapped, month-on-month trend, per-service breakdown of what was asked for. ~1 day. Never shows a paying client "R0".

### Option 1B — Full value report *(original spec, now fixable)*
Everything in 1A **plus** the estimated rand value. ~2 days, and only meaningful once clients have service catalogues + standardised dropdowns + actual traffic.

**Recommendation: build 1A now, ship 1B when a client's monthly enquiry count makes a rand figure worth defending.** The number's job is retention; a stale R0 does the opposite.

---

## 5. Phase 1A — build detail

1. **Migration:** `brand_clients`: `report_token text UNIQUE`, `report_enabled boolean DEFAULT false`, `report_recipient_email text`, `report_last_sent_at timestamptz`.
2. **`lib/activity.ts`** — pure calculation over `quote_requests` (filtered by `client_id`) + `click_events` (`client_id`, `action_type`), period **half-open `[1st 00:00 SAST, 1st of next month 00:00 SAST)`** as `created_at >= '2026-09-01T00:00:00+02:00' AND < '2026-10-01T00:00:00+02:00'`. Never `toISOString().split('T')[0]` (that's the existing UTC bug in `app/api/stats/route.ts:13`).
3. **Public page `/value/<token>`** — aggregates only, **no PII**, `noindex`, 6-month view, token = 32-byte hex, rotation kills the old link, 404 on unknown token.
4. **Digest** — `vercel.json` cron `0 4 1 * *` (06:00 SAST, 1st of month) → `GET /api/reports/monthly`, previous calendar month, Resend.
   - **Auth: reject any caller without `Authorization: Bearer $CRON_SECRET`.** Without it the endpoint is a public client-email-spam vector.
   - **Idempotency: `report_last_sent_at` set per client on success** so a cron retry cannot double-send.
   - **Recipient: `report_recipient_email` only.** Never `contact_email` — several client rows carry Marcus's own address as a placeholder.
   - **Footer: reply "stop" to opt out.** One line, removes the complaint risk.
5. **Add `/value` and `/api/reports/monthly` to `proxy.ts`'s `isPublic` allowlist** — otherwise both routes 302 to `/login` and are dead on arrival. Do this before anything else.
6. **Admin section** on the client page: this month's activity, copy link, preview digest, send test to me, enable/disable toggle, regenerate link.
7. **Canary:** BrandAISolutions slug first (it holds 6 of the 9 leads and 6 of the 16 clicks), then one real client.

**Dedupe rule:** every `quote_requests` row counts as one enquiry; repeats are counted, not merged, and the page says so ("3 enquiries received, including repeats"). Honest and simple.

---

## 6. Phase 1B — additional work on top of 1A

- Mapping column `form_values text[]` **or** a `service_form_mappings(service_id, form_value)` table *(prefer the table — normalised, easier admin UI; array accepted only with explicit NULL/`{}`/`{""}` handling)*
- Matching: trim + lowercase both sides, explicit "no mapping" handling, no fuzzy matching — `DB Board Replacement` correctly falls to `unpriced_leads` until mapped
- Value calc per §3, using snapshots; never recompute priced leads
- Admin mapping editor + unpriced-leads list
- Per-service breakdown showing which services drove the number

---

## 7. Out of scope (both options)

Client logins / Supabase Auth · raw lead lists shown to clients · invoice data · Google Analytics · custom subdomain · WhatsApp delivery · per-page attribution · AI commentary · anything sending client PII to a third-party model.

---

## 8. Review record — GLM 5.2 gate, 2026-09-11

Every finding re-verified by me against the live DB / repo files before acceptance.

| # | Finding | Verified how | Disposition |
|---|---|---|---|
| F1 | Spec misdescribed `click_events` (no `client_slug`, no `metadata`) | `select=client_slug` → `42703 does not exist`; `select=*` shows `client_id` | **ACCEPTED** — §2 corrected. My error, inherited from a stale skill reference (now fixed) |
| F2 | Snapshot infrastructure (`estimated_amount`, `quote_line_items`) exists and was ignored → price drift | Rows confirmed; `pricing.ts:22-32` writes rate/amount | **ACCEPTED** — §3.2/§3 adopted |
| F3 | `/api/reports/monthly` unauthenticated = client-spam vector | No code exists; spec was silent; Vercel injects `Bearer $CRON_SECRET` | **ACCEPTED** — §5.4 |
| F4 | `proxy.ts` `isPublic` allowlist omits new routes → both 302 to `/login` | Read `lib/supabase/proxy.ts:25-29` | **ACCEPTED** — §5.5, step 1 of build |
| F5 | "Starting price" undefined; category sum makes it 13× ambiguous | `pricing.ts` sums category; 4 residential services = 5,500 = live `estimated_amount` | **ACCEPTED** — §3.1 |
| F6 | No idempotency on digest | Spec silent; no such column | **ACCEPTED** — `report_last_sent_at` |
| F7 | No token rotation / revocation | Spec silent | **ACCEPTED** — regenerate action, old link 404s |
| F8 | No unsubscribe footer | Spec silent | **ACCEPTED** — reply-stop line |
| F9 | Duplicate submissions double-count | Two `residential` rows, same client, 8 days apart | **ACCEPTED** — dedupe rule in §5 |
| F10 | `form_values` array has silent failure modes | Live `DB Board Replacement` vs `DB Board Installation` — no exact match under any step | **ACCEPTED** — mapping table preferred, §6 |
| F12 | `app/api/stats/route.ts:13` computes "today" in UTC | Read the file | **ACCEPTED** — do not copy; §5.2 |
| F13 | Period should be half-open | Arithmetic convention | **ACCEPTED** — §5.2 |
| F11 | "Hobby allows 2 cron jobs" | Vercel docs: Hobby = up to 100 cron jobs, min interval once per day | **REJECTED** — reviewer's figure was stale; doesn't change the plan |
| R1 | Shrink Phase 1 to an activity digest | All 9 leads are test rows; most clients would see R0 | **ACCEPTED (for Marcus to confirm)** — §4 Option 1A |

---

## 9. Open decisions

1. **1A or 1B?** *(Recommendation: 1A now, 1B when the data justifies it.)*
2. **Service dropdown standardisation** — map-first and fix each site on next touch, or standardise all up front?
3. **Send digest in a thin month** — yes, with activity counts? *(Recommendation: yes.)*
4. **Sender address** — `reports@brandaisolutions.co.za` via Resend, domain already verified?

---

## 10. Build order (on approval)

| # | Step | Verify |
|---|---|---|
| 1 | `proxy.ts` allowlist + migration | `/value/<token>` loads logged out; cron route not redirected |
| 2 | `lib/activity.ts` | Hand-checked month totals against SQL |
| 3 | `/value/<token>` page | Mobile render; zero PII in page source; unknown token 404s |
| 4 | Cron + `CRON_SECRET` + idempotency | Call without the header → 401; call twice → one email |
| 5 | Admin section | Toggle off ⇒ cron skips that client |
| 6 | Canary: BrandAISolutions, then a real client | Form → link → digest end-to-end |
