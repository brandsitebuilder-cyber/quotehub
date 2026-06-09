import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'QuoteHub — Centralized Quote Management',
  description: 'Manage quote requests across all your client websites.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bg text-text min-h-screen antialiased">{children}</body>
    </html>
  )
}
