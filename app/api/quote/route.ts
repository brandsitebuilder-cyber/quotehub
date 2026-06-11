import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendQuoteNotification } from '@/lib/email'
import { autoCalculate } from '@/lib/pricing'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const KNOWN = new Set(['client_slug','customer_name','customer_email','customer_phone','service_type','message','source_url','timeline'])
    const { client_slug, customer_name, customer_email, customer_phone, service_type, message, source_url, timeline } = body

    // Capture any extra fields as custom_fields
    const custom_fields: Record<string,string> = {}
    for (const [k,v] of Object.entries(body)) {
      if (!KNOWN.has(k) && typeof v === 'string' && v) {
        custom_fields[k] = v
      }
    }

    if (!client_slug || !customer_name) {
      return NextResponse.json(
        { error: 'client_slug and customer_name are required' },
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
      .select('*')
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

    // Insert quote
    const { data: quote, error: insertError } = await supabase
      .from('quote_requests')
      .insert({
        client_id: client.id,
        customer_name,
        customer_email: customer_email || null,
        customer_phone: customer_phone || null,
        service_type: service_type || null,
        message: message || null,
        source_url: source_url || null,
        timeline: timeline || null,
        custom_fields: Object.keys(custom_fields).length > 0 ? custom_fields : null,
        status: 'new',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      throw insertError
    }

    // Auto-calculate if enabled
    let estimatedAmount: number | null = null
    if (client.auto_calculate && service_type) {
      const result = await autoCalculate(supabase, client.id, service_type, message)
      if (result) {
        estimatedAmount = result.total
        await supabase
          .from('quote_requests')
          .update({ estimated_amount: estimatedAmount })
          .eq('id', quote.id)

        // Insert line items
        await supabase.from('quote_line_items').insert(
          result.lineItems.map((li, i) => ({
            quote_id: quote.id,
            service_id: li.service_id,
            description: li.description,
            quantity: li.quantity,
            rate: li.rate,
            amount: li.amount,
            sort_order: i + 1,
          }))
        )
      }
    }

    // Send notification email
    await sendQuoteNotification({
      to: client.contact_email,
      companyName: client.company_name,
      customerName: customer_name,
      customerEmail: customer_email,
      customerPhone: customer_phone,
      serviceType: service_type,
      message,
      estimatedAmount,
      sourceUrl: source_url,
      timeline,
      customFields: Object.keys(custom_fields).length > 0 ? custom_fields : undefined,
    })

    // Update status
    await supabase
      .from('quote_requests')
      .update({ status: estimatedAmount ? 'estimated' : 'forwarded' })
      .eq('id', quote.id)

    const redirectUrl = source_url
      ? `${source_url}?sent=true`
      : '/?sent=true'

    return NextResponse.json(
      { success: true, id: quote.id, redirect_url: redirectUrl },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    )
  } catch (error) {
    console.error('Quote submission error:', error)
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
