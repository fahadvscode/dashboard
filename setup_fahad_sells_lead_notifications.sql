-- =============================================================================
-- Fahad Sells leads (fahad_sells_leads)
-- Registry + dashboard RLS + AFTER INSERT → email + Google Sheet
-- SAFE: does not drop columns or delete rows. Does not recreate the table.
-- Run once in Supabase SQL Editor. Idempotent re-run OK.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net;

-- ---------------------------------------------------------------------------
-- 1. Registry (so notify + dashboard treat this as a landing page)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.landing_page_lead_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  table_name text NOT NULL,
  display_name text NOT NULL,
  page_name text,
  site_url text NOT NULL DEFAULT '',
  name_style text NOT NULL DEFAULT 'auto'
    CHECK (name_style IN ('auto', 'firstname', 'first_name')),
  enabled boolean NOT NULL DEFAULT true,
  has_crm boolean NOT NULL DEFAULT false,
  notes text,
  CONSTRAINT landing_page_lead_sources_table_name_format
    CHECK (table_name ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT landing_page_lead_sources_table_name_unique UNIQUE (table_name)
);

INSERT INTO public.landing_page_lead_sources
  (table_name, display_name, page_name, site_url, name_style, enabled, has_crm, notes, updated_at)
VALUES
  (
    'fahad_sells_leads',
    'Fahad Sells',
    'Fahad Sells',
    'https://fahadsells.com',
    'first_name',
    true,
    false,
    'Leads from fahadsells.com. Email + Google Sheet via /api/leads/notify.',
    now()
  )
ON CONFLICT (table_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  page_name = EXCLUDED.page_name,
  site_url = EXCLUDED.site_url,
  name_style = EXCLUDED.name_style,
  enabled = EXCLUDED.enabled,
  has_crm = EXCLUDED.has_crm,
  notes = EXCLUDED.notes,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 2. RLS so the dashboard can list / update / delete (form insert already works)
-- ---------------------------------------------------------------------------
GRANT SELECT, UPDATE, DELETE ON TABLE public.fahad_sells_leads TO anon, authenticated;

ALTER TABLE public.fahad_sells_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow dashboard to read fahad_sells_leads" ON public.fahad_sells_leads;
CREATE POLICY "Allow dashboard to read fahad_sells_leads"
  ON public.fahad_sells_leads FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow dashboard to update fahad_sells_leads" ON public.fahad_sells_leads;
CREATE POLICY "Allow dashboard to update fahad_sells_leads"
  ON public.fahad_sells_leads FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert fahad_sells_leads" ON public.fahad_sells_leads;
CREATE POLICY "Allow insert fahad_sells_leads"
  ON public.fahad_sells_leads FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow dashboard to delete fahad_sells_leads" ON public.fahad_sells_leads;
CREATE POLICY "Allow dashboard to delete fahad_sells_leads"
  ON public.fahad_sells_leads FOR DELETE TO anon, authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- 3. AFTER INSERT → /api/leads/notify (email + Google Sheet)
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS notify_new_fahad_sells_lead ON public.fahad_sells_leads;
DROP FUNCTION IF EXISTS public.notify_new_fahad_sells_lead();

CREATE OR REPLACE FUNCTION public.notify_new_fahad_sells_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $notify$
DECLARE
  payload JSONB;
  request_id BIGINT;
  dashboard_url TEXT := 'https://property-dashboard-three.vercel.app';
BEGIN
  payload := to_jsonb(NEW) || jsonb_build_object('table_name', 'fahad_sells_leads');

  SELECT net.http_post(
    url := dashboard_url || '/api/leads/notify',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  ) INTO request_id;

  RAISE NOTICE 'Fahad Sells lead notification sent (request_id: %)', request_id;
  RETURN NEW;
END;
$notify$;

CREATE TRIGGER notify_new_fahad_sells_lead
  AFTER INSERT ON public.fahad_sells_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_fahad_sells_lead();

COMMIT;

SELECT table_name, display_name, enabled, has_crm, site_url
FROM public.landing_page_lead_sources
WHERE table_name = 'fahad_sells_leads';

SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'fahad_sells_leads'
  AND trigger_name = 'notify_new_fahad_sells_lead';
