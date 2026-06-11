-- SAFE: public.cornerstone_leads only — updates notify trigger payload to include is_broker

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net;

DROP TRIGGER IF EXISTS notify_new_cornerstone_lead ON cornerstone_leads;
DROP FUNCTION IF EXISTS notify_new_cornerstone_lead();

CREATE OR REPLACE FUNCTION notify_new_cornerstone_lead()
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
    'is_realtor', NEW.is_realtor,
    'is_broker', NEW.is_broker,
    'interest', NEW.interest,
    'buyer_type', NEW.buyer_type,
    'source', NEW.source,
    'table_name', 'cornerstone_leads',
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

CREATE TRIGGER notify_new_cornerstone_lead
  AFTER INSERT ON cornerstone_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_cornerstone_lead();

COMMIT;

SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'cornerstone_leads'
  AND trigger_name = 'notify_new_cornerstone_lead';
