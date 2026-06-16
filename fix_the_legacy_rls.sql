-- SAFE: public.the_legacy only — no column changes, no row deletes

BEGIN;

ALTER TABLE the_legacy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow dashboard to read the_legacy" ON the_legacy;
CREATE POLICY "Allow dashboard to read the_legacy"
  ON the_legacy FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert the_legacy" ON the_legacy;
CREATE POLICY "Allow insert the_legacy"
  ON the_legacy FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow dashboard to delete the_legacy" ON the_legacy;
CREATE POLICY "Allow dashboard to delete the_legacy"
  ON the_legacy FOR DELETE TO anon, authenticated USING (true);

COMMIT;

SELECT COUNT(*) AS the_legacy_row_count FROM the_legacy;
