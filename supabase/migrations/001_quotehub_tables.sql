-- QuoteHub Database Schema
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/wqvumyzwuisrgsqkostt/sql/new

-- 1. brand_clients — Marcus's client businesses
CREATE TABLE IF NOT EXISTS brand_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  website_url TEXT,
  auto_calculate BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id)
);

-- 2. quote_requests — incoming form submissions
CREATE TABLE IF NOT EXISTS quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES brand_clients(id) NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  service_type TEXT,
  message TEXT,
  source_url TEXT,
  status TEXT DEFAULT 'new',
  estimated_amount NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. quote_services — per-client service catalog
CREATE TABLE IF NOT EXISTS quote_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES brand_clients(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  rate NUMERIC NOT NULL,
  unit TEXT DEFAULT 'each',
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. quote_line_items — auto-calculated line items
CREATE TABLE IF NOT EXISTS quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quote_requests(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES quote_services(id),
  description TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  rate NUMERIC NOT NULL,
  amount NUMERIC NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- RLS Policies

-- brand_clients: only the owner (Marcus) can read/write
ALTER TABLE brand_clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_access" ON brand_clients;
CREATE POLICY "owner_access" ON brand_clients FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- quote_requests: public can insert (via admin API), owner can select
ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_insert" ON quote_requests;
CREATE POLICY "public_insert" ON quote_requests FOR INSERT TO anon
  WITH CHECK (true);
DROP POLICY IF EXISTS "owner_select" ON quote_requests;
CREATE POLICY "owner_select" ON quote_requests FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM brand_clients WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "owner_update" ON quote_requests;
CREATE POLICY "owner_update" ON quote_requests FOR UPDATE TO authenticated
  USING (client_id IN (SELECT id FROM brand_clients WHERE user_id = auth.uid()));

-- quote_services: owner manages
ALTER TABLE quote_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON quote_services;
CREATE POLICY "owner_all" ON quote_services FOR ALL TO authenticated
  USING (client_id IN (SELECT id FROM brand_clients WHERE user_id = auth.uid()));

-- quote_line_items: owner reads
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_select" ON quote_line_items;
CREATE POLICY "owner_select" ON quote_line_items FOR SELECT TO authenticated
  USING (quote_id IN (SELECT id FROM quote_requests WHERE client_id IN (
    SELECT id FROM brand_clients WHERE user_id = auth.uid()
  )));

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_quote_requests_client_id ON quote_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_created_at ON quote_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_services_client_id ON quote_services(client_id);
CREATE INDEX IF NOT EXISTS idx_quote_line_items_quote_id ON quote_line_items(quote_id);
