'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Stats {
  totals: { quotes: number; clients: number; today: number }
  perClient: { name: string; slug: string; count: number }[]
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-text-muted">Loading...</div>
  if (!stats) return <div className="text-text-muted">No data yet.</div>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Analytics</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-6 mb-10">
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="text-text-muted text-sm">Total Quotes</div>
          <div className="text-3xl font-bold mt-1">{stats.totals.quotes}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="text-text-muted text-sm">Active Clients</div>
          <div className="text-3xl font-bold mt-1">{stats.totals.clients}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="text-text-muted text-sm">Quotes Today</div>
          <div className="text-3xl font-bold mt-1">{stats.totals.today}</div>
        </div>
      </div>

      {/* Per-client chart */}
      <div className="bg-surface border border-border rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-6">Quotes Per Client</h2>
        {stats.perClient.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.perClient} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2028" />
              <XAxis dataKey="name" stroke="#888" tick={{ fontSize: 12 }} />
              <YAxis stroke="#888" tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#111318', border: '1px solid #1E2028', borderRadius: '8px', color: '#EDEDED' }}
                formatter={(value: any) => [`${value} quotes`, 'Total']}
              />
              <Bar dataKey="count" fill="#C8963E" radius={[4, 4, 0, 0]} maxBarSize={80} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-text-muted text-center py-12">No quotes recorded yet. Data will appear here once quotes start flowing.</p>
        )}
      </div>

      {/* Client breakdown table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-muted text-left border-b border-border">
              <th className="p-3 font-medium">Client</th>
              <th className="p-3 font-medium text-right">Total Quotes</th>
              <th className="p-3 font-medium text-right">% of Total</th>
            </tr>
          </thead>
          <tbody>
            {stats.perClient.map((c) => (
              <tr key={c.slug} className="border-b border-border hover:bg-bg transition-colors">
                <td className="p-3">{c.name}</td>
                <td className="p-3 text-right font-mono">{c.count}</td>
                <td className="p-3 text-right text-text-muted">
                  {stats.totals.quotes > 0 ? ((c.count / stats.totals.quotes) * 100).toFixed(1) : 0}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
