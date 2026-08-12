-- =============================================================================
-- Landing page lead sources registry
-- Add a row here → dashboard lists leads + notify/sheets treat it as a landing page
-- Still run the generated trigger/RLS SQL once per table (copy from dashboard UI)
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.landing_page_lead_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Must match public.<table_name> exactly
  table_name text NOT NULL,
  display_name text NOT NULL,
  page_name text,
  site_url text NOT NULL DEFAULT '',

  -- firstname/lastname vs first_name/last_name
  name_style text NOT NULL DEFAULT 'auto'
    CHECK (name_style IN ('auto', 'firstname', 'first_name')),

  enabled boolean NOT NULL DEFAULT true,
  has_crm boolean NOT NULL DEFAULT false,
  notes text,

  CONSTRAINT landing_page_lead_sources_table_name_format
    CHECK (table_name ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT landing_page_lead_sources_table_name_unique UNIQUE (table_name)
);

CREATE INDEX IF NOT EXISTS landing_page_lead_sources_enabled_idx
  ON public.landing_page_lead_sources (enabled)
  WHERE enabled = true;

ALTER TABLE public.landing_page_lead_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read landing_page_lead_sources" ON public.landing_page_lead_sources;
CREATE POLICY "Allow read landing_page_lead_sources"
  ON public.landing_page_lead_sources FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow write landing_page_lead_sources" ON public.landing_page_lead_sources;
CREATE POLICY "Allow write landing_page_lead_sources"
  ON public.landing_page_lead_sources FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- Seed known landing pages (idempotent)
INSERT INTO public.landing_page_lead_sources
  (table_name, display_name, page_name, site_url, name_style, enabled, has_crm)
VALUES
  ('cornerstone_leads', 'Cornerstone', 'Cornerstone', 'https://www.newcornerstonehomes.ca', 'first_name', true, true),
  ('novella_leads', 'Novella', 'Novella', 'https://www.newnovellahomes.ca', 'first_name', true, true),
  ('lakeview_village_leads', 'Lakeview Village', 'Lakeview Village', 'https://lakeviewvillagetownhome.ca', 'first_name', true, true),
  ('rollingwood_leads', 'Rollingwood', 'Rollingwood', 'https://www.rollingwoodtowns.ca', 'first_name', true, true),
  ('enclave', 'Enclave', 'Enclave', 'https://enclave1.vercel.app', 'first_name', true, false),
  ('hawthorne_east_village', 'Hawthorne East Village', 'Hawthorne East Village', 'https://hawthorneeast-village.com', 'first_name', true, false),
  ('bronte_trails', 'Bronte Trails', 'Bronte Trails', 'https://www.brontetrails.ca', 'first_name', true, false),
  ('spruce_trails', 'Spruce Trails', 'Spruce Trails', 'https://sprucetrails.ca', 'first_name', true, false),
  ('meadowvale_brooks', 'Meadowvale Brooks', 'Meadowvale Brooks', 'https://meadowvalebrooks.ca', 'first_name', true, false),
  ('the_legacy', 'The Legacy', 'The Legacy', 'https://thelegacyburlington.ca', 'first_name', true, false),
  ('ivy_rouge_landing_leads', 'Ivy Rouge', 'Ivy Rouge', 'https://ivyrouge.ca', 'first_name', true, false),
  ('abacot_hill_leads', 'Abacot Hill', 'Abacot Hill', 'https://abacothill.com', 'first_name', true, false),
  ('og_urban_towns_leads', 'OG Urban Towns', 'OG Urban Towns', 'https://brightstone.ca/communities/og-urban-towns', 'first_name', true, false),
  ('rosemont_grove_leads', 'Rosemont Grove', 'Rosemont Grove', 'https://rosemontgrove.ca', 'first_name', true, false),
  ('yt_on_fourth_leads', 'YT on Fourth', 'YT on Fourth', 'https://ytonfourth.ca', 'first_name', true, false),
  ('hawthorne_trafalgar_leads', 'Hawthorne on Trafalgar', 'Hawthorne on Trafalgar', 'https://hawthornetrafalgar.com', 'firstname', true, false)
ON CONFLICT (table_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  page_name = EXCLUDED.page_name,
  site_url = EXCLUDED.site_url,
  name_style = EXCLUDED.name_style,
  has_crm = EXCLUDED.has_crm,
  updated_at = now();

COMMIT;

SELECT table_name, display_name, name_style, enabled
FROM public.landing_page_lead_sources
ORDER BY display_name;
