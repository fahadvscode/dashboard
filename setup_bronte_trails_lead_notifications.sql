-- SAFE: public.bronte_trails only — AFTER INSERT trigger, no schema changes

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net;

DROP TRIGGER IF EXISTS notify_new_bronte_trails_lead ON bronte_trails;
DROP FUNCTION IF EXISTS notify_new_bronte_trails_lead();

CREATE OR REPLACE FUNCTION notify_new_bronte_trails_lead()
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
    'is_broker', NEW.is_broker,
    'form_type', NEW.form_type,
    'page_path', NEW.page_path,
    'project_tag', NEW.project_tag,
    'source', NEW.source,
    'utm_source', NEW.utm_source,
    'utm_medium', NEW.utm_medium,
    'utm_campaign', NEW.utm_campaign,
    'utm_content', NEW.utm_content,
    'utm_term', NEW.utm_term,
    'table_name', 'bronte_trails',
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

CREATE TRIGGER notify_new_bronte_trails_lead
  AFTER INSERT ON bronte_trails
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_bronte_trails_lead();

COMMIT;

SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'bronte_trails'
  AND trigger_name = 'notify_new_bronte_trails_lead';
