'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ClientReportPanel({
  slug,
  companyName,
  token,
  enabled,
  recipient,
}: {
  slug: string
  companyName: string
  token: string | null
  enabled: boolean
  recipient: string | null
}) {
  const router = useRouter()
  const [reportToken, setReportToken] = useState(token)
  const [form, setForm] = useState({
    enabled: Boolean(enabled),
    recipient: recipient || '',
  })
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const url = reportToken ? `https://quotehub-theta.vercel.app/value/${reportToken}` : null

  async function call(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action)
    setMsg(null)
    try {
      const res = await fetch(`/api/clients/${slug}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `${action} failed`)
      return data
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : `${action} failed` })
      return null
    } finally {
      setBusy(null)
    }
  }

  async function saveSettings() {
    const data = await call('update', { enabled: form.enabled, recipient: form.recipient })
    if (data) {
      setMsg({ kind: 'ok', text: 'Report settings saved' })
      router.refresh()
    }
  }

  async function generate() {
    const data = await call('generate')
    if (data) {
      setReportToken(data.token)
      setMsg({ kind: 'ok', text: 'New link generated — any previous link no longer works' })
      router.refresh()
    }
  }

  async function sendTest() {
    const data = await call('test', { to: 'marcus@brandaisolutions.co.za' })
    if (data) {
      setMsg({
        kind: data.success ? 'ok' : 'err',
        text: data.success
          ? `Test sent to marcus@brandaisolutions.co.za — ${data.period}, ${data.contacts} contacts`
          : `Not sent: ${data.reason || 'unknown reason'}`,
      })
    }
  }

  async function copyLink() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setMsg({ kind: 'ok', text: 'Link copied' })
    } catch {
      setMsg({ kind: 'err', text: 'Copy failed — select the link manually' })
    }
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-6 mb-8">
      <h2 className="text-lg font-semibold mb-1">Monthly activity report</h2>
      <p className="text-text-muted text-sm mb-4">
        What {companyName}&apos;s website produced this month: enquiries, call taps and WhatsApp taps.
        Counts only — no customer details. Nothing sends until you switch it on and set a recipient.
      </p>

      <div className="flex items-center gap-3 flex-wrap mb-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
          />
          Send this client a monthly report
        </label>
        <input
          className="bg-bg border border-border rounded px-3 py-2 text-sm min-w-[240px]"
          placeholder="recipient email (required to send)"
          value={form.recipient}
          onChange={(e) => setForm((f) => ({ ...f, recipient: e.target.value }))}
        />
        <button className="btn-primary text-sm" onClick={saveSettings} disabled={busy !== null}>
          {busy === 'update' ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="text-sm mb-3">
        {url ? (
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-xs bg-bg px-2 py-1 rounded break-all">{url}</code>
            <button className="btn-ghost text-xs" onClick={copyLink}>
              Copy link
            </button>
            <a className="btn-ghost text-xs" href={url} target="_blank" rel="noreferrer">
              Open
            </a>
          </div>
        ) : (
          <span className="text-text-muted">No private link yet — generate one to give this client.</span>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button className="btn-ghost text-sm" onClick={generate} disabled={busy !== null}>
          {reportToken ? 'Regenerate link' : 'Generate link'}
        </button>
        <button className="btn-ghost text-sm" onClick={sendTest} disabled={busy !== null}>
          {busy === 'test' ? 'Sending…' : 'Send test to me'}
        </button>
        <button
          className="btn-ghost text-sm"
          onClick={() => setShowPreview((v) => !v)}
          disabled={!url}
        >
          {showPreview ? 'Hide preview' : 'Preview'}
        </button>
        {msg && (
          <span className={`text-sm ${msg.kind === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
            {msg.text}
          </span>
        )}
      </div>

      {showPreview && url && (
        <div className="mt-4 border border-border rounded overflow-hidden bg-bg">
          <iframe src={url} title="Report preview" className="w-full h-[560px]" />
        </div>
      )}
    </div>
  )
}
