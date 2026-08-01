-- Dashboard + website form access for yt_on_fourth_leads
-- Run in Supabase SQL Editor

ALTER TABLE yt_on_fourth_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow dashboard to read yt_on_fourth_leads" ON yt_on_fourth_leads;
CREATE POLICY "Allow dashboard to read yt_on_fourth_leads"
  ON yt_on_fourth_leads FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow dashboard to update yt_on_fourth_leads" ON yt_on_fourth_leads;
CREATE POLICY "Allow dashboard to update yt_on_fourth_leads"
  ON yt_on_fourth_leads FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert yt_on_fourth_leads" ON yt_on_fourth_leads;
CREATE POLICY "Allow insert yt_on_fourth_leads"
  ON yt_on_fourth_leads FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow dashboard to delete yt_on_fourth_leads" ON yt_on_fourth_leads;
CREATE POLICY "Allow dashboard to delete yt_on_fourth_leads"
  ON yt_on_fourth_leads FOR DELETE TO anon, authenticated
  USING (true);
