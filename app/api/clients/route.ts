import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('brand_clients')
    .select('*')
    .order('company_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  const { slug, company_name, contact_email, contact_phone, website_url, auto_calculate } = body

  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('brand_clients')
    .insert({
      slug,
      company_name,
      contact_email,
      contact_phone,
      website_url,
      auto_calculate: auto_calculate || false,
      user_id: user?.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
