-- Dashboard + website form access for hawthorne_trafalgar_leads
-- Run in Supabase SQL Editor
-- SAFE: does not alter columns or delete rows

ALTER TABLE hawthorne_trafalgar_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon insert Hawthorne Trafalgar leads" ON hawthorne_trafalgar_leads;
DROP POLICY IF EXISTS "Allow authenticated read Hawthorne Trafalgar leads" ON hawthorne_trafalgar_leads;
DROP POLICY IF EXISTS "Allow dashboard to read hawthorne_trafalgar_leads" ON hawthorne_trafalgar_leads;
DROP POLICY IF EXISTS "Allow dashboard to update hawthorne_trafalgar_leads" ON hawthorne_trafalgar_leads;
DROP POLICY IF EXISTS "Allow insert hawthorne_trafalgar_leads" ON hawthorne_trafalgar_leads;
DROP POLICY IF EXISTS "Allow dashboard to delete hawthorne_trafalgar_leads" ON hawthorne_trafalgar_leads;

CREATE POLICY "Allow dashboard to read hawthorne_trafalgar_leads"
  ON hawthorne_trafalgar_leads FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow dashboard to update hawthorne_trafalgar_leads"
  ON hawthorne_trafalgar_leads FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow insert hawthorne_trafalgar_leads"
  ON hawthorne_trafalgar_leads FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow dashboard to delete hawthorne_trafalgar_leads"
  ON hawthorne_trafalgar_leads FOR DELETE TO anon, authenticated
  USING (true);

SELECT COUNT(*) AS hawthorne_trafalgar_row_count FROM hawthorne_trafalgar_leads;

SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'hawthorne_trafalgar_leads'
ORDER BY policyname;
