-- Fix: Dashboard can't see leads in landing page lead tables
-- Cause: RLS blocks SELECT for the anon key used by the dashboard
-- Run this in Supabase SQL Editor

-- ========== novella_leads ==========
ALTER TABLE novella_leads ENABLE ROW LEVEL SECURITY;

-- SELECT: Dashboard needs to read leads
DROP POLICY IF EXISTS "Allow dashboard to read novella_leads" ON novella_leads;
CREATE POLICY "Allow dashboard to read novella_leads"
  ON novella_leads FOR SELECT TO anon, authenticated
  USING (true);

-- UPDATE: For temperature, call logging
DROP POLICY IF EXISTS "Allow dashboard to update novella_leads" ON novella_leads;
CREATE POLICY "Allow dashboard to update novella_leads"
  ON novella_leads FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

-- INSERT: Keep form submissions working (if form uses anon key)
DROP POLICY IF EXISTS "Allow insert novella_leads" ON novella_leads;
CREATE POLICY "Allow insert novella_leads"
  ON novella_leads FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- ========== cornerstone_leads ==========
ALTER TABLE cornerstone_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow dashboard to read cornerstone_leads" ON cornerstone_leads;
CREATE POLICY "Allow dashboard to read cornerstone_leads"
  ON cornerstone_leads FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow dashboard to update cornerstone_leads" ON cornerstone_leads;
CREATE POLICY "Allow dashboard to update cornerstone_leads"
  ON cornerstone_leads FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert cornerstone_leads" ON cornerstone_leads;
CREATE POLICY "Allow insert cornerstone_leads"
  ON cornerstone_leads FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- ========== lakeview_village_leads ==========
ALTER TABLE lakeview_village_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow dashboard to read lakeview_village_leads" ON lakeview_village_leads;
CREATE POLICY "Allow dashboard to read lakeview_village_leads"
  ON lakeview_village_leads FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow dashboard to update lakeview_village_leads" ON lakeview_village_leads;
CREATE POLICY "Allow dashboard to update lakeview_village_leads"
  ON lakeview_village_leads FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert lakeview_village_leads" ON lakeview_village_leads;
CREATE POLICY "Allow insert lakeview_village_leads"
  ON lakeview_village_leads FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- ========== rollingwood_leads ==========
ALTER TABLE rollingwood_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow dashboard to read rollingwood_leads" ON rollingwood_leads;
CREATE POLICY "Allow dashboard to read rollingwood_leads"
  ON rollingwood_leads FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow dashboard to update rollingwood_leads" ON rollingwood_leads;
CREATE POLICY "Allow dashboard to update rollingwood_leads"
  ON rollingwood_leads FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert rollingwood_leads" ON rollingwood_leads;
CREATE POLICY "Allow insert rollingwood_leads"
  ON rollingwood_leads FOR INSERT TO anon, authenticated
  WITH CHECK (true);
