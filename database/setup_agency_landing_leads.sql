-- =============================================================================
-- Agency landing pages — one shared table + email/Sheets notify
-- Run once in Supabase SQL Editor. Safe to re-run.
-- Agency sites POST to /api/leads/ingest (service role). Anon cannot insert.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net;

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
    'agency_landing_leads',
    'Agency Pages',
    'Agency Pages',
    '',
    'first_name',
    true,
    true,
    'Shared table for agency-built HTML landing pages. Identify projects with project_name + source URL.',
    now()
  )
ON CONFLICT (table_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  page_name = EXCLUDED.page_name,
  name_style = EXCLUDED.name_style,
  enabled = EXCLUDED.enabled,
  has_crm = EXCLUDED.has_crm,
  notes = EXCLUDED.notes,
  updated_at = now();

CREATE TABLE IF NOT EXISTS public.agency_landing_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  first_name text,
  last_name text,
  email text,
  phone text,
  is_broker boolean,
  is_realtor boolean,
  project_name text,
  source text,
  form_location text,
  form_type text,
  page_path text,
  notes text,
  status text DEFAULT 'new',
  priority text,
  utm_source text,
  utm_campaign text,
  call_count integer DEFAULT 0,
  lead_temperature text DEFAULT 'warm',
  call_history jsonb DEFAULT '[]'::jsonb,
  last_note text
);

ALTER TABLE public.agency_landing_leads ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.agency_landing_leads ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.agency_landing_leads ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.agency_landing_leads ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.agency_landing_leads ADD COLUMN IF NOT EXISTS is_broker boolean;
ALTER TABLE public.agency_landing_leads ADD COLUMN IF NOT EXISTS project_name text;
ALTER TABLE public.agency_landing_leads ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.agency_landing_leads ADD COLUMN IF NOT EXISTS page_path text;
ALTER TABLE public.agency_landing_leads ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.agency_landing_leads ADD COLUMN IF NOT EXISTS status text DEFAULT 'new';
ALTER TABLE public.agency_landing_leads ADD COLUMN IF NOT EXISTS utm_source text;
ALTER TABLE public.agency_landing_leads ADD COLUMN IF NOT EXISTS utm_campaign text;
ALTER TABLE public.agency_landing_leads ADD COLUMN IF NOT EXISTS call_count integer DEFAULT 0;
ALTER TABLE public.agency_landing_leads ADD COLUMN IF NOT EXISTS lead_temperature text DEFAULT 'warm';
ALTER TABLE public.agency_landing_leads ADD COLUMN IF NOT EXISTS call_history jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.agency_landing_leads ADD COLUMN IF NOT EXISTS last_note text;

CREATE INDEX IF NOT EXISTS idx_agency_landing_leads_email
  ON public.agency_landing_leads (email);
CREATE INDEX IF NOT EXISTS idx_agency_landing_leads_created
  ON public.agency_landing_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agency_landing_leads_project
  ON public.agency_landing_leads (project_name);

GRANT SELECT, UPDATE, DELETE ON TABLE public.agency_landing_leads TO anon, authenticated;

ALTER TABLE public.agency_landing_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow dashboard to read agency_landing_leads" ON public.agency_landing_leads;
CREATE POLICY "Allow dashboard to read agency_landing_leads"
  ON public.agency_landing_leads FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow dashboard to update agency_landing_leads" ON public.agency_landing_leads;
CREATE POLICY "Allow dashboard to update agency_landing_leads"
  ON public.agency_landing_leads FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow dashboard to delete agency_landing_leads" ON public.agency_landing_leads;
CREATE POLICY "Allow dashboard to delete agency_landing_leads"
  ON public.agency_landing_leads FOR DELETE TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow insert agency_landing_leads" ON public.agency_landing_leads;

DROP TRIGGER IF EXISTS notify_new_agency_landing_leads_lead ON public.agency_landing_leads;
DROP FUNCTION IF EXISTS public.notify_new_agency_landing_leads_lead();

CREATE OR REPLACE FUNCTION public.notify_new_agency_landing_leads_lead()
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
  payload := to_jsonb(NEW) || jsonb_build_object('table_name', 'agency_landing_leads');

  SELECT net.http_post(
    url := dashboard_url || '/api/leads/notify',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  ) INTO request_id;

  RAISE NOTICE 'Agency Pages lead notification sent (request_id: %)', request_id;
  RETURN NEW;
END;
$notify$;

CREATE TRIGGER notify_new_agency_landing_leads_lead
  AFTER INSERT ON public.agency_landing_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_agency_landing_leads_lead();

COMMIT;

SELECT table_name, display_name, enabled, has_crm
FROM public.landing_page_lead_sources
WHERE table_name = 'agency_landing_leads';
