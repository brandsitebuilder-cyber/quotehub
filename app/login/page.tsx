'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/browser'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Invalid email or password')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="bg-surface border border-border rounded-lg p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-2">
          Quote<span className="text-accent">Hub</span>
        </h1>
        <p className="text-text-muted text-sm mb-6">Sign in to manage quotes</p>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-900/20 border border-red-700 text-red-400 rounded p-3 text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm text-text-muted mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-bg border border-border rounded px-3 py-2 text-text focus:outline-none focus:border-accent"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-bg border border-border rounded px-3 py-2 text-text focus:outline-none focus:border-accent"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-bg font-medium rounded px-4 py-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
