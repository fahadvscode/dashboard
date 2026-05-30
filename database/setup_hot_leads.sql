-- =============================================================================
-- Hot Leads — SAFE setup script (additive only)
-- =============================================================================
--
-- This script ONLY creates objects for the new hot_leads feature.
--
-- It does NOT:
--   - DROP, ALTER, or TRUNCATE any existing tables (fj_leads, precon_factory_leads, etc.)
--   - DELETE or UPDATE rows in any existing table
--   - Modify application code
--
-- It ONLY:
--   - Creates the new table hot_leads (IF NOT EXISTS)
--   - Adds indexes on hot_leads
--   - Enables RLS and a read/write policy on hot_leads
--   - Adds a trigger on hot_leads to refresh updated_at
--
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS / CREATE OR REPLACE where needed.
-- Re-running may briefly drop and recreate the policy and trigger on hot_leads only
-- (no row data is removed).
--
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- =============================================================================

-- New table only — never touches other tables
CREATE TABLE IF NOT EXISTS hot_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  display_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  project_name TEXT,
  notes TEXT,
  priority TEXT NOT NULL DEFAULT 'new'
    CHECK (priority IN ('urgent', 'active', 'new')),
  source_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (source_type IN ('manual', 'linked')),
  source_table TEXT,
  source_id TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes on hot_leads only
CREATE UNIQUE INDEX IF NOT EXISTS idx_hot_leads_linked_unique
  ON hot_leads (source_table, source_id)
  WHERE source_type = 'linked';

CREATE INDEX IF NOT EXISTS idx_hot_leads_sort ON hot_leads (sort_order ASC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hot_leads_priority ON hot_leads (priority);

-- RLS on hot_leads only (does not change RLS on other tables)
ALTER TABLE hot_leads ENABLE ROW LEVEL SECURITY;

-- Idempotent policy: replaces policy definition only, does not delete table rows
DROP POLICY IF EXISTS "Allow all for hot_leads" ON hot_leads;
CREATE POLICY "Allow all for hot_leads" ON hot_leads
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger function scoped to hot_leads feature (name avoids clashing with other functions)
CREATE OR REPLACE FUNCTION hot_leads_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace trigger on hot_leads only (no effect on other tables)
DROP TRIGGER IF EXISTS hot_leads_updated_at ON hot_leads;
CREATE TRIGGER hot_leads_updated_at
  BEFORE UPDATE ON hot_leads
  FOR EACH ROW EXECUTE FUNCTION hot_leads_set_updated_at();
