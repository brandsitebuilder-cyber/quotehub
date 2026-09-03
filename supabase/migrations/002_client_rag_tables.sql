-- Client AI Assistant — RAG Document Store + Group Mapping
-- Test with BrandAISolutions first, then roll out to clients

-- 1. client_documents — extracted text from invoices, business docs, etc.
CREATE TABLE IF NOT EXISTS client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES brand_clients(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL DEFAULT 'other',
  filename TEXT,
  source_date DATE,
  content TEXT NOT NULL,
  content_tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_client_documents_fts ON client_documents USING GIN (content_tsv);
CREATE INDEX IF NOT EXISTS idx_client_documents_client ON client_documents (client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_type ON client_documents (doc_type);

-- 2. client_group_mapping — Telegram group → client lookup
CREATE TABLE IF NOT EXISTS client_group_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES brand_clients(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cgm_client ON client_group_mapping (client_id);

-- 3. RLS: anyone can read documents for their client (we use service_role for queries anyway)
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_group_mapping ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, so no policies needed for our use case
-- (all queries go through Hermes with service_role key)
