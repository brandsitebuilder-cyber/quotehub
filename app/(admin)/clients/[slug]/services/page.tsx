'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'

interface Service {
  id: string
  name: string
  description: string
  rate: number
  unit: string
  category: string
  sort_order: number
}

export default function ServicesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    rate: '',
    unit: 'each',
    category: '',
  })

  useEffect(() => {
    fetch(`/api/clients/${slug}/services`)
      .then((r) => r.json())
      .then(setServices)
      .finally(() => setLoading(false))
  }, [slug])

  async function addService(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.rate || !form.category) return
    setSaving(true)

    const res = await fetch(`/api/clients/${slug}/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, rate: parseFloat(form.rate), sort_order: services.length + 1 }),
    })

    if (res.ok) {
      const newService = await res.json()
      setServices([...services, newService])
      setForm({ name: '', description: '', rate: '', unit: 'each', category: form.category })
    }
    setSaving(false)
  }

  async function deleteService(id: string) {
    const res = await fetch(`/api/clients/${slug}/services?id=${id}`, { method: 'DELETE' })
    if (res.ok) setServices(services.filter((s) => s.id !== id))
  }

  if (loading) return <div className="text-text-muted">Loading...</div>

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/clients/${slug}`} className="text-text-muted hover:text-text text-sm">← Client</Link>
        <h1 className="text-2xl font-bold">Service Catalog</h1>
      </div>

      {/* Add form */}
      <form onSubmit={addService} className="bg-surface border border-border rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Add Service</h2>
        <div className="grid grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs text-text-muted mb-1">Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. DB Board Installation"
              className="form-input"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Category *</label>
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="e.g. commercial"
              className="form-input"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Rate (R) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.rate}
              onChange={(e) => setForm({ ...form, rate: e.target.value })}
              placeholder="1500"
              className="form-input"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Unit</label>
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="form-input">
              <option value="each">each</option>
              <option value="hour">hour</option>
              <option value="meter">meter</option>
              <option value="per job">per job</option>
            </select>
          </div>
          <button type="submit" disabled={saving} className="btn-primary h-[42px]">
            {saving ? '...' : '+ Add'}
          </button>
        </div>
        <div className="mt-3">
          <label className="block text-xs text-text-muted mb-1">Description</label>
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional description"
            className="form-input"
          />
        </div>
      </form>

      {/* Services table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-muted text-left border-b border-border">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Category</th>
              <th className="p-3 font-medium text-right">Rate</th>
              <th className="p-3 font-medium">Unit</th>
              <th className="p-3 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id} className="border-b border-border hover:bg-bg transition-colors">
                <td className="p-3">
                  <div className="font-medium">{s.name}</div>
                  {s.description && <div className="text-xs text-text-muted">{s.description}</div>}
                </td>
                <td className="p-3 text-text-muted">{s.category}</td>
                <td className="p-3 text-right font-mono">R{s.rate.toLocaleString()}</td>
                <td className="p-3 text-text-muted">{s.unit}</td>
                <td className="p-3">
                  <button onClick={() => deleteService(s.id)} className="text-red-400 hover:text-red-300 text-sm">✕</button>
                </td>
              </tr>
            ))}
            {services.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-text-muted">
                  No services added yet. Add your first service above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
