'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active — paying / ongoing work' },
  { value: 'one-off', label: 'One-off — built once, no retainer' },
  { value: 'demo', label: 'Demo / prospect — not a client' },
  { value: 'review', label: 'Needs review — decide later' },
  { value: 'archived', label: 'Archived — hidden from reports' },
]

export default function ClientStatusPanel({
  slug,
  companyName,
  status,
  monthlyFee,
  statusNote,
  leadCount,
  clickCount,
}: {
  slug: string
  companyName: string
  status: string
  monthlyFee: number | null
  statusNote: string | null
  leadCount: number
  clickCount: number
}) {
  const router = useRouter()
  const [form, setForm] = useState({
    status: status || 'review',
    monthly_fee: monthlyFee === null || monthlyFee === undefined ? '' : String(monthlyFee),
    status_note: statusNote || '',
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function save() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/clients/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Save failed')
      setMsg({ kind: 'ok', text: 'Saved' })
      router.refresh()
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  async function archive() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/clients/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Archive failed')
      setForm((f) => ({ ...f, status: 'archived' }))
      setMsg({ kind: 'ok', text: 'Archived — hidden from client pickers and reports' })
      router.refresh()
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Archive failed' })
    } finally {
      setSaving(false)
    }
  }

  async function destroy() {
    setDeleting(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/clients/${slug}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Delete failed')
      router.push('/clients?deleted=' + encodeURIComponent(companyName))
      router.refresh()
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Delete failed' })
      setDeleting(false)
    }
  }

  const nameMatches = confirmText.trim().toLowerCase() === companyName.trim().toLowerCase()

  return (
    <div className="bg-surface border border-border rounded-lg p-6 mb-8">
      <h2 className="text-lg font-semibold mb-1">Client status</h2>
      <p className="text-text-muted text-sm mb-4">
        Controls whether this client appears in client pickers and, later, whether monthly reports are
        sent. Nothing is deleted by changing status.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <label className="block">
          <span className="text-text-muted text-xs block mb-1">Status</span>
          <select
            className="w-full bg-bg border border-border rounded px-3 py-2 text-sm"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-text-muted text-xs block mb-1">Monthly fee (R, excl. VAT)</span>
          <input
            className="w-full bg-bg border border-border rounded px-3 py-2 text-sm"
            inputMode="decimal"
            placeholder="e.g. 1250"
            value={form.monthly_fee}
            onChange={(e) => setForm((f) => ({ ...f, monthly_fee: e.target.value }))}
          />
        </label>

        <label className="block md:col-span-1">
          <span className="text-text-muted text-xs block mb-1">Note (why this status)</span>
          <input
            className="w-full bg-bg border border-border rounded px-3 py-2 text-sm"
            placeholder="e.g. live site + GBP management"
            value={form.status_note}
            onChange={(e) => setForm((f) => ({ ...f, status_note: e.target.value }))}
          />
        </label>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button className="btn-primary text-sm" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          className="btn-ghost text-sm"
          onClick={archive}
          disabled={saving || form.status === 'archived'}
        >
          Archive
        </button>
        {msg && (
          <span className={`text-sm ${msg.kind === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
            {msg.text}
          </span>
        )}
      </div>

      {/* Danger zone */}
      <div className="mt-6 pt-5 border-t border-border">
        <h3 className="text-sm font-semibold text-red-400 mb-1">Delete this client</h3>
        <p className="text-text-muted text-xs mb-3">
          Permanently removes {companyName} and everything recorded against it: {leadCount} lead
          {leadCount === 1 ? '' : 's'}, {clickCount} click event{clickCount === 1 ? '' : 's'} and its
          service catalogue. Use Archive instead if you only want it off the lists — archive keeps the
          history.
        </p>

        {!showDelete ? (
          <button className="btn-ghost text-sm text-red-400" onClick={() => setShowDelete(true)}>
            I want to delete this client
          </button>
        ) : (
          <div className="space-y-3">
            <label className="block">
              <span className="text-text-muted text-xs block mb-1">
                Type <strong>{companyName}</strong> to confirm
              </span>
              <input
                className="w-full bg-bg border border-border rounded px-3 py-2 text-sm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={companyName}
              />
            </label>
            <div className="flex items-center gap-3">
              <button
                className="text-sm px-4 py-2 rounded bg-red-600 text-white disabled:opacity-50"
                disabled={!nameMatches || deleting}
                onClick={destroy}
              >
                {deleting ? 'Deleting…' : 'Delete permanently'}
              </button>
              <button
                className="btn-ghost text-sm"
                onClick={() => {
                  setShowDelete(false)
                  setConfirmText('')
                }}
                disabled={deleting}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
