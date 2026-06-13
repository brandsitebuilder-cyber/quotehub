import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { client_slug, action_type, source_url } = body

    if (!client_slug || !action_type) {
      return NextResponse.json(
        { error: 'client_slug and action_type are required' },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      )
    }

    if (!['call', 'whatsapp'].includes(action_type)) {
      return NextResponse.json(
        { error: 'action_type must be "call" or "whatsapp"' },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      )
    }

    const supabase = createAdminClient()

    // Look up client
    const { data: client, error: clientError } = await supabase
      .from('brand_clients')
      .select('id')
      .eq('slug', client_slug)
      .single()

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Invalid client_slug' },
        {
          status: 404,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      )
    }

    // Insert click event
    const { error: insertError } = await supabase
      .from('click_events')
      .insert({
        client_id: client.id,
        action_type,
        source_url: source_url || null,
      })

    if (insertError) {
      console.error('Click event insert error:', insertError)
      throw insertError
    }

    return NextResponse.json(
      { success: true },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    )
  } catch (error) {
    console.error('Track endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
      }
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  )
}
