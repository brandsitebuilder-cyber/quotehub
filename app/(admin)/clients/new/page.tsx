'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    slug: '',
    company_name: '',
    contact_email: '',
    contact_phone: '',
    website_url: '',
    auto_calculate: false,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to create client')
      setLoading(false)
    } else {
      router.push('/clients')
      router.refresh()
    }
  }

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New Client</h1>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        {error && <div className="bg-red-900/20 border border-red-700 text-red-400 rounded p-3 text-sm">{error}</div>}

        <div>
          <label className="block text-sm text-text-muted mb-1">Slug *</label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => update('slug', e.target.value)}
            placeholder="eltec-electrical"
            className="form-input"
            required
          />
          <p className="text-xs text-text-muted mt-1">Unique identifier used in form submissions</p>
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1">Company Name *</label>
          <input
            type="text"
            value={form.company_name}
            onChange={(e) => update('company_name', e.target.value)}
            placeholder="Eltec Electrical"
            className="form-input"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1">Contact Email *</label>
          <input
            type="email"
            value={form.contact_email}
            onChange={(e) => update('contact_email', e.target.value)}
            placeholder="info@eltec.co.za"
            className="form-input"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1">Contact Phone</label>
          <input
            type="text"
            value={form.contact_phone}
            onChange={(e) => update('contact_phone', e.target.value)}
            placeholder="081 391 7733"
            className="form-input"
          />
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1">Website URL</label>
          <input
            type="url"
            value={form.website_url}
            onChange={(e) => update('website_url', e.target.value)}
            placeholder="https://eltec-electrical.vercel.app"
            className="form-input"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="auto_calc"
            checked={form.auto_calculate}
            onChange={(e) => update('auto_calculate', e.target.checked)}
            className="w-4 h-4 accent-accent"
          />
          <label htmlFor="auto_calc" className="text-sm text-text-muted">
            Enable auto-calculation (generate estimates from service catalog)
          </label>
        </div>

        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating...' : 'Create Client'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-ghost">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
