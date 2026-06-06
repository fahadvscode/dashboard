-- =============================================================================
-- SAFE: public.hawthorne_east_village ONLY
-- - Does NOT alter columns or delete/truncate any rows
-- - Does NOT touch other tables or shared notify functions
-- =============================================================================

BEGIN;

ALTER TABLE hawthorne_east_village ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow dashboard to read hawthorne_east_village" ON hawthorne_east_village;
CREATE POLICY "Allow dashboard to read hawthorne_east_village"
  ON hawthorne_east_village FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow insert hawthorne_east_village" ON hawthorne_east_village;
CREATE POLICY "Allow insert hawthorne_east_village"
  ON hawthorne_east_village FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow dashboard to delete hawthorne_east_village" ON hawthorne_east_village;
CREATE POLICY "Allow dashboard to delete hawthorne_east_village"
  ON hawthorne_east_village FOR DELETE
  TO anon, authenticated
  USING (true);

COMMIT;

SELECT COUNT(*) AS hawthorne_row_count FROM hawthorne_east_village;

SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'hawthorne_east_village'
ORDER BY policyname;
