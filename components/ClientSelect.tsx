'use client'

import { useRouter } from 'next/navigation'

export default function ClientSelect({ clients, currentClient, currentStatus }: { clients: any[], currentClient: string, currentStatus: string }) {
  const router = useRouter()

  return (
    <select
      className="bg-bg border border-border rounded px-3 py-1.5 text-sm text-text-muted w-auto ml-auto"
      value={currentClient}
      onChange={(e) => {
        const params = new URLSearchParams()
        if (e.target.value) params.set('client', e.target.value)
        if (currentStatus) params.set('status', currentStatus)
        router.push(`/quotes${params.toString() ? '?' + params.toString() : ''}`)
      }}
    >
      <option value="">All clients</option>
      {clients?.map((c: any) => (
        <option key={c.slug} value={c.slug}>{c.company_name}</option>
      ))}
    </select>
  )
}
