-- Dashboard + website form access for abacot_hill_leads
-- Run in Supabase SQL Editor

ALTER TABLE abacot_hill_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow dashboard to read abacot_hill_leads" ON abacot_hill_leads;
CREATE POLICY "Allow dashboard to read abacot_hill_leads"
  ON abacot_hill_leads FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow dashboard to update abacot_hill_leads" ON abacot_hill_leads;
CREATE POLICY "Allow dashboard to update abacot_hill_leads"
  ON abacot_hill_leads FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert abacot_hill_leads" ON abacot_hill_leads;
CREATE POLICY "Allow insert abacot_hill_leads"
  ON abacot_hill_leads FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow dashboard to delete abacot_hill_leads" ON abacot_hill_leads;
CREATE POLICY "Allow dashboard to delete abacot_hill_leads"
  ON abacot_hill_leads FOR DELETE TO anon, authenticated
  USING (true);
