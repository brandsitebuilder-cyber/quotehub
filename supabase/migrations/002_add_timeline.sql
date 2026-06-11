-- Migration: Add timeline field to quote_requests
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS timeline TEXT;
