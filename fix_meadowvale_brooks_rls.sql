-- SAFE: public.meadowvale_brooks only — no column changes, no row deletes

BEGIN;

ALTER TABLE meadowvale_brooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow dashboard to read meadowvale_brooks" ON meadowvale_brooks;
CREATE POLICY "Allow dashboard to read meadowvale_brooks"
  ON meadowvale_brooks FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert meadowvale_brooks" ON meadowvale_brooks;
CREATE POLICY "Allow insert meadowvale_brooks"
  ON meadowvale_brooks FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow dashboard to delete meadowvale_brooks" ON meadowvale_brooks;
CREATE POLICY "Allow dashboard to delete meadowvale_brooks"
  ON meadowvale_brooks FOR DELETE TO anon, authenticated USING (true);

COMMIT;

SELECT COUNT(*) AS meadowvale_brooks_row_count FROM meadowvale_brooks;
