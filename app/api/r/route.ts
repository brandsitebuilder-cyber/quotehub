import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/r — Redirect tracker
 * Logs a click event to click_events and 302 redirects the visitor to the destination.
 *
 * Query params:
 *   client  — brand_clients.slug (required)
 *   action  — "call" or "whatsapp" (required)
 *   to      — phone number in international format, no "+" prefix (required)
 *
 * Example:
 *   /api/r?client=rkconstructions&action=whatsapp&to=27765626175
 *   → logs a whatsapp click for RK Constructions, then 302 → https://wa.me/27765626175
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const client_slug = searchParams.get('client')
  const action_type = searchParams.get('action')
  const to = searchParams.get('to')

  // Validate required params
  if (!client_slug || !action_type || !to) {
    return NextResponse.json(
      { error: 'client, action, and to are required' },
      { status: 400 }
    )
  }

  if (!['call', 'whatsapp'].includes(action_type)) {
    return NextResponse.json(
      { error: 'action must be "call" or "whatsapp"' },
      { status: 400 }
    )
  }

  // Build the redirect URL based on action type
  let redirectUrl: string
  if (action_type === 'whatsapp') {
    redirectUrl = `https://wa.me/${to}`
  } else {
    redirectUrl = `tel:+${to}`
  }

  try {
    const supabase = createAdminClient()

    // Look up client
    const { data: client, error: clientError } = await supabase
      .from('brand_clients')
      .select('id')
      .eq('slug', client_slug)
      .single()

    if (clientError || !client) {
      // Still redirect — don't block the user — but don't log the click
      return NextResponse.redirect(redirectUrl)
    }

    // Log click event (fire-and-forget — don't block the redirect on DB write)
    supabase
      .from('click_events')
      .insert({
        client_id: client.id,
        action_type,
        source_url: request.headers.get('referer') || `https://quotehub-theta.vercel.app/api/r?client=${client_slug}`,
      })
      .then(({ error }) => {
        if (error) console.error('Click event insert error:', error)
      })

    return NextResponse.redirect(redirectUrl)
  } catch {
    // On any error, still redirect — never leave the visitor hanging
    return NextResponse.redirect(redirectUrl)
  }
}
