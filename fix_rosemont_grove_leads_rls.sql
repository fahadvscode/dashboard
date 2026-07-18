-- Dashboard + website form access for rosemont_grove_leads
-- Run in Supabase SQL Editor

ALTER TABLE rosemont_grove_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow dashboard to read rosemont_grove_leads" ON rosemont_grove_leads;
CREATE POLICY "Allow dashboard to read rosemont_grove_leads"
  ON rosemont_grove_leads FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow dashboard to update rosemont_grove_leads" ON rosemont_grove_leads;
CREATE POLICY "Allow dashboard to update rosemont_grove_leads"
  ON rosemont_grove_leads FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert rosemont_grove_leads" ON rosemont_grove_leads;
CREATE POLICY "Allow insert rosemont_grove_leads"
  ON rosemont_grove_leads FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow dashboard to delete rosemont_grove_leads" ON rosemont_grove_leads;
CREATE POLICY "Allow dashboard to delete rosemont_grove_leads"
  ON rosemont_grove_leads FOR DELETE TO anon, authenticated
  USING (true);
