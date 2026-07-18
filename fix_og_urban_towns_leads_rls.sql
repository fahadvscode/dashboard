-- Dashboard + website form access for og_urban_towns_leads
-- Run in Supabase SQL Editor

ALTER TABLE og_urban_towns_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow dashboard to read og_urban_towns_leads" ON og_urban_towns_leads;
CREATE POLICY "Allow dashboard to read og_urban_towns_leads"
  ON og_urban_towns_leads FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow dashboard to update og_urban_towns_leads" ON og_urban_towns_leads;
CREATE POLICY "Allow dashboard to update og_urban_towns_leads"
  ON og_urban_towns_leads FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert og_urban_towns_leads" ON og_urban_towns_leads;
CREATE POLICY "Allow insert og_urban_towns_leads"
  ON og_urban_towns_leads FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow dashboard to delete og_urban_towns_leads" ON og_urban_towns_leads;
CREATE POLICY "Allow dashboard to delete og_urban_towns_leads"
  ON og_urban_towns_leads FOR DELETE TO anon, authenticated
  USING (true);
