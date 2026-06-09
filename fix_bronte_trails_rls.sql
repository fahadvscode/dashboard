-- SAFE: public.bronte_trails only — no column changes, no row deletes

BEGIN;

ALTER TABLE bronte_trails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow dashboard to read bronte_trails" ON bronte_trails;
CREATE POLICY "Allow dashboard to read bronte_trails"
  ON bronte_trails FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert bronte_trails" ON bronte_trails;
CREATE POLICY "Allow insert bronte_trails"
  ON bronte_trails FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow dashboard to delete bronte_trails" ON bronte_trails;
CREATE POLICY "Allow dashboard to delete bronte_trails"
  ON bronte_trails FOR DELETE TO anon, authenticated USING (true);

COMMIT;

SELECT COUNT(*) AS bronte_trails_row_count FROM bronte_trails;
