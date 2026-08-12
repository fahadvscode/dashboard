-- =============================================================================
-- SAFE: public.hawthorne_trafalgar_leads ONLY
-- - Does NOT alter table columns or modify/delete existing rows
-- - Dedicated function notify_new_hawthorne_trafalgar_lead()
-- - AFTER INSERT on new rows only → email + SMS + Google Sheet via /api/leads/notify
-- =============================================================================
-- Requires: deployed /api/leads/notify with Hawthorne Trafalgar support.
-- Run after fix_hawthorne_trafalgar_leads_rls.sql

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net;

DROP TRIGGER IF EXISTS notify_new_hawthorne_trafalgar_lead ON hawthorne_trafalgar_leads;
DROP FUNCTION IF EXISTS notify_new_hawthorne_trafalgar_lead();

CREATE OR REPLACE FUNCTION notify_new_hawthorne_trafalgar_lead()
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
  -- Full row + table_name so firstname/lastname/is_broker/form_location reach notify
  payload := to_jsonb(NEW) || jsonb_build_object('table_name', 'hawthorne_trafalgar_leads');

  SELECT net.http_post(
    url := dashboard_url || '/api/leads/notify',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  ) INTO request_id;

  RAISE NOTICE 'Hawthorne Trafalgar lead notification sent (request_id: %)', request_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_new_hawthorne_trafalgar_lead
  AFTER INSERT ON hawthorne_trafalgar_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_hawthorne_trafalgar_lead();

COMMIT;

SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'hawthorne_trafalgar_leads'
  AND trigger_name = 'notify_new_hawthorne_trafalgar_lead';
