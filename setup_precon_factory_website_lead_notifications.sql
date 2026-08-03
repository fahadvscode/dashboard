-- SAFE: public.precon_factory_website_leads only
-- Uses to_jsonb(NEW) so first_name/last_name, interested_in, budget, timeline reach the API
-- (shared notify_new_lead() expects firstname/lastname and omits website fields)

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net;

DROP TRIGGER IF EXISTS notify_new_precon_website_lead ON precon_factory_website_leads;
DROP FUNCTION IF EXISTS notify_new_precon_factory_website_lead();

CREATE OR REPLACE FUNCTION notify_new_precon_factory_website_lead()
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
  payload := to_jsonb(NEW) || jsonb_build_object('table_name', 'precon_factory_website_leads');

  SELECT net.http_post(
    url := dashboard_url || '/api/leads/notify',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  ) INTO request_id;

  RAISE NOTICE 'Precon Factory Website lead notification sent (request_id: %)', request_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_new_precon_website_lead
  AFTER INSERT ON precon_factory_website_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_precon_factory_website_lead();

COMMIT;

SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'precon_factory_website_leads'
  AND trigger_name = 'notify_new_precon_website_lead';
