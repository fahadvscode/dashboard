-- Dashboard + website form access for precon_factory_website_leads
-- Run in Supabase SQL Editor

ALTER TABLE precon_factory_website_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow dashboard to read precon_factory_website_leads" ON precon_factory_website_leads;
CREATE POLICY "Allow dashboard to read precon_factory_website_leads"
  ON precon_factory_website_leads FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow dashboard to update precon_factory_website_leads" ON precon_factory_website_leads;
CREATE POLICY "Allow dashboard to update precon_factory_website_leads"
  ON precon_factory_website_leads FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert precon_factory_website_leads" ON precon_factory_website_leads;
CREATE POLICY "Allow insert precon_factory_website_leads"
  ON precon_factory_website_leads FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow dashboard to delete precon_factory_website_leads" ON precon_factory_website_leads;
CREATE POLICY "Allow dashboard to delete precon_factory_website_leads"
  ON precon_factory_website_leads FOR DELETE TO anon, authenticated
  USING (true);
