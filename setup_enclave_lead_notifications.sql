-- =============================================================================
-- SAFE: public.enclave ONLY
-- - Does NOT alter table columns or modify/delete existing rows
-- - Does NOT change notify_new_lead() or triggers on fj_leads / other tables
-- - Uses a dedicated function: notify_new_enclave_lead() (Enclave only)
-- - Trigger runs AFTER INSERT on new rows only (past rows are not re-notified)
-- =============================================================================
-- Requires: deployed /api/leads/notify with Enclave support (dashboard app).
-- Run the whole script in Supabase SQL Editor (executes as one transaction).

BEGIN;

-- Shared extension (no-op if already installed; used by all lead tables)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Replace only Enclave trigger/function (idempotent re-run safe)
DROP TRIGGER IF EXISTS notify_new_enclave_lead ON enclave;
DROP FUNCTION IF EXISTS notify_new_enclave_lead();

CREATE OR REPLACE FUNCTION notify_new_enclave_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload JSONB;
  request_id BIGINT;
  dashboard_url TEXT := 'https://property-dashboard-three.vercel.app';
BEGIN
  payload := jsonb_build_object(
    'id', NEW.id,
    'first_name', NEW.first_name,
    'last_name', NEW.last_name,
    'email', NEW.email,
    'phone', NEW.phone,
    'model', NEW.model,
    'collection', NEW.collection,
    'source', NEW.source,
    'form_name', NEW.form_name,
    'table_name', 'enclave',
    'created_at', NEW.created_at
  );

  SELECT net.http_post(
    url := dashboard_url || '/api/leads/notify',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  ) INTO request_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_new_enclave_lead
  AFTER INSERT ON enclave
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_enclave_lead();

COMMIT;

-- Verify (read-only)
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'enclave'
  AND trigger_name = 'notify_new_enclave_lead';
