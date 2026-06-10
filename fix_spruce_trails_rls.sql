-- SAFE: public.spruce_trails only — no column changes, no row deletes

BEGIN;

ALTER TABLE spruce_trails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow dashboard to read spruce_trails" ON spruce_trails;
CREATE POLICY "Allow dashboard to read spruce_trails"
  ON spruce_trails FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert spruce_trails" ON spruce_trails;
CREATE POLICY "Allow insert spruce_trails"
  ON spruce_trails FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow dashboard to delete spruce_trails" ON spruce_trails;
CREATE POLICY "Allow dashboard to delete spruce_trails"
  ON spruce_trails FOR DELETE TO anon, authenticated USING (true);

COMMIT;

SELECT COUNT(*) AS spruce_trails_row_count FROM spruce_trails;
