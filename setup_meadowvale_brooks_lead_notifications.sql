-- SAFE: public.meadowvale_brooks only — AFTER INSERT trigger, no schema changes

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net;

DROP TRIGGER IF EXISTS notify_new_meadowvale_brooks_lead ON meadowvale_brooks;
DROP FUNCTION IF EXISTS notify_new_meadowvale_brooks_lead();

CREATE OR REPLACE FUNCTION notify_new_meadowvale_brooks_lead()
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
    'timeline', NEW.timeline,
    'realtor', NEW.realtor,
    'project', NEW.project,
    'source_page', NEW.source_page,
    'utm_source', NEW.utm_source,
    'utm_medium', NEW.utm_medium,
    'utm_campaign', NEW.utm_campaign,
    'utm_content', NEW.utm_content,
    'utm_term', NEW.utm_term,
    'table_name', 'meadowvale_brooks',
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

CREATE TRIGGER notify_new_meadowvale_brooks_lead
  AFTER INSERT ON meadowvale_brooks
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_meadowvale_brooks_lead();

COMMIT;

SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'meadowvale_brooks'
  AND trigger_name = 'notify_new_meadowvale_brooks_lead';
