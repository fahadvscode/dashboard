-- Dashboard + website form access for ivy_rouge_landing_leads
-- Run in Supabase SQL Editor

ALTER TABLE ivy_rouge_landing_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow dashboard to read ivy_rouge_landing_leads" ON ivy_rouge_landing_leads;
CREATE POLICY "Allow dashboard to read ivy_rouge_landing_leads"
  ON ivy_rouge_landing_leads FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow dashboard to update ivy_rouge_landing_leads" ON ivy_rouge_landing_leads;
CREATE POLICY "Allow dashboard to update ivy_rouge_landing_leads"
  ON ivy_rouge_landing_leads FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert ivy_rouge_landing_leads" ON ivy_rouge_landing_leads;
CREATE POLICY "Allow insert ivy_rouge_landing_leads"
  ON ivy_rouge_landing_leads FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow dashboard to delete ivy_rouge_landing_leads" ON ivy_rouge_landing_leads;
CREATE POLICY "Allow dashboard to delete ivy_rouge_landing_leads"
  ON ivy_rouge_landing_leads FOR DELETE TO anon, authenticated
  USING (true);
