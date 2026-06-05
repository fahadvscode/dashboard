-- =============================================================================
-- Fix Lakeview Village lead notifications (lakeview_village_leads only)
--
-- Problem: setup_landing_pages_lead_notifications.sql referenced columns that
-- do not exist on lakeview_village_leads (home_interest, interest, is_realtor).
-- Actual columns include: project, buyer_type, consent, status, phone, email, etc.
--
-- SAFE: No DELETE/TRUNCATE. No column changes. Does not touch other tables.
-- Past rows are NOT re-notified (trigger is AFTER INSERT on new rows only).
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net;

DROP TRIGGER IF EXISTS notify_new_lakeview_village_lead ON lakeview_village_leads;
DROP FUNCTION IF EXISTS notify_new_lakeview_village_lead();

CREATE OR REPLACE FUNCTION notify_new_lakeview_village_lead()
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
    'buyer_type', NEW.buyer_type,
    'project', NEW.project,
    'consent', NEW.consent,
    'status', NEW.status,
    'table_name', 'lakeview_village_leads',
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

CREATE TRIGGER notify_new_lakeview_village_lead
  AFTER INSERT ON lakeview_village_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_lakeview_village_lead();

COMMIT;

SELECT trigger_name, event_object_table, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'lakeview_village_leads'
  AND trigger_name = 'notify_new_lakeview_village_lead';
