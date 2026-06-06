-- =============================================================================
-- SAFE: public.hawthorne_east_village ONLY
-- - Does NOT alter table columns or modify/delete existing rows
-- - Dedicated function notify_new_hawthorne_east_village_lead()
-- - AFTER INSERT on new rows only
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net;

DROP TRIGGER IF EXISTS notify_new_hawthorne_east_village_lead ON hawthorne_east_village;
DROP FUNCTION IF EXISTS notify_new_hawthorne_east_village_lead();

CREATE OR REPLACE FUNCTION notify_new_hawthorne_east_village_lead()
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
    'interest', NEW.interest,
    'budget', NEW.budget,
    'timeline', NEW.timeline,
    'form_type', NEW.form_type,
    'page_path', NEW.page_path,
    'source', NEW.source,
    'utm_source', NEW.utm_source,
    'utm_medium', NEW.utm_medium,
    'utm_campaign', NEW.utm_campaign,
    'utm_content', NEW.utm_content,
    'utm_term', NEW.utm_term,
    'table_name', 'hawthorne_east_village',
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

CREATE TRIGGER notify_new_hawthorne_east_village_lead
  AFTER INSERT ON hawthorne_east_village
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_hawthorne_east_village_lead();

COMMIT;

SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'hawthorne_east_village'
  AND trigger_name = 'notify_new_hawthorne_east_village_lead';
