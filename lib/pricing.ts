import { SupabaseClient } from '@supabase/supabase-js'

interface CalculationResult {
  total: number
  lineItems: { service_id: string; description: string; quantity: number; rate: number; amount: number }[]
}

export async function autoCalculate(
  supabase: SupabaseClient,
  clientId: string,
  serviceType: string,
  message?: string
): Promise<CalculationResult | null> {
  const { data: services } = await supabase
    .from('quote_services')
    .select('*')
    .eq('client_id', clientId)
    .eq('category', serviceType)
    .order('sort_order')

  if (!services || services.length === 0) return null

  const lineItems = services.map((s: any, i: number) => ({
    service_id: s.id,
    description: s.name,
    quantity: 1,
    rate: s.rate,
    amount: s.rate,
  }))

  const total = lineItems.reduce((sum: number, li) => sum + li.amount, 0)
  return { total, lineItems }
}
