-- SAFE: public.og_urban_towns_leads only — AFTER INSERT trigger, no schema changes
-- Sends the full row as JSON so all form fields reach /api/leads/notify

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net;

DROP TRIGGER IF EXISTS notify_new_og_urban_towns_lead ON og_urban_towns_leads;
DROP FUNCTION IF EXISTS notify_new_og_urban_towns_lead();

CREATE OR REPLACE FUNCTION notify_new_og_urban_towns_lead()
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
  payload := to_jsonb(NEW) || jsonb_build_object('table_name', 'og_urban_towns_leads');

  SELECT net.http_post(
    url := dashboard_url || '/api/leads/notify',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  ) INTO request_id;

  RAISE NOTICE 'OG Urban Towns lead notification sent (request_id: %)', request_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_new_og_urban_towns_lead
  AFTER INSERT ON og_urban_towns_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_og_urban_towns_lead();

COMMIT;

SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'og_urban_towns_leads'
  AND trigger_name = 'notify_new_og_urban_towns_lead';
