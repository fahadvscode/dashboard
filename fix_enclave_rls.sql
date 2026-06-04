-- =============================================================================
-- SAFE: public.enclave ONLY
-- - Does NOT alter columns or delete/truncate any rows
-- - Does NOT touch fj_leads, notify_new_lead(), or any other table
-- - Only replaces policies named below (DROP POLICY IF EXISTS on those names)
-- =============================================================================
-- Run the whole script in Supabase SQL Editor (executes as one transaction).

BEGIN;

-- Turn on RLS for enclave only (existing rows stay; nothing is deleted)
ALTER TABLE enclave ENABLE ROW LEVEL SECURITY;

-- Dashboard + anon client: read leads (required for Landing Pages Leads page)
DROP POLICY IF EXISTS "Allow dashboard to read enclave" ON enclave;
CREATE POLICY "Allow dashboard to read enclave"
  ON enclave FOR SELECT
  TO anon, authenticated
  USING (true);

-- Website form + dashboard: new rows only (INSERT does not change existing rows)
DROP POLICY IF EXISTS "Allow insert enclave" ON enclave;
CREATE POLICY "Allow insert enclave"
  ON enclave FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Dashboard delete button only (optional; remove this block if you never delete from UI)
DROP POLICY IF EXISTS "Allow dashboard to delete enclave" ON enclave;
CREATE POLICY "Allow dashboard to delete enclave"
  ON enclave FOR DELETE
  TO anon, authenticated
  USING (true);

-- No UPDATE policy: Enclave has no CRM columns yet; avoids accidental row overwrites via anon key.

COMMIT;

-- Verify (read-only checks; should not error)
SELECT COUNT(*) AS enclave_row_count FROM enclave;

SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'enclave'
ORDER BY policyname;
