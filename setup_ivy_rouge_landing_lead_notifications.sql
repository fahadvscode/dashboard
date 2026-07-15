-- SAFE: public.ivy_rouge_landing_leads only — AFTER INSERT trigger, no schema changes
-- Sends the full row as JSON so all form fields reach /api/leads/notify

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net;

DROP TRIGGER IF EXISTS notify_new_ivy_rouge_landing_lead ON ivy_rouge_landing_leads;
DROP FUNCTION IF EXISTS notify_new_ivy_rouge_landing_lead();

CREATE OR REPLACE FUNCTION notify_new_ivy_rouge_landing_lead()
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
  payload := to_jsonb(NEW) || jsonb_build_object('table_name', 'ivy_rouge_landing_leads');

  SELECT net.http_post(
    url := dashboard_url || '/api/leads/notify',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  ) INTO request_id;

  RAISE NOTICE 'Ivy Rouge landing lead notification sent (request_id: %)', request_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_new_ivy_rouge_landing_lead
  AFTER INSERT ON ivy_rouge_landing_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_ivy_rouge_landing_lead();

COMMIT;

SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'ivy_rouge_landing_leads'
  AND trigger_name = 'notify_new_ivy_rouge_landing_lead';
