-- Email, Google Sheet, and Follow Up Boss alerts for new purchaser worksheets.
-- The shared notify_new_lead() function reads firstname/email columns that this
-- table does not have, so worksheets use their own function.
-- Run in the Supabase SQL editor.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION notify_new_worksheet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload JSONB;
  purchaser JSONB;
  request_id BIGINT;
BEGIN
  purchaser := COALESCE(NEW.purchasers -> 0, '{}'::jsonb);

  payload := jsonb_build_object(
    'id', NEW.id,
    'firstname', COALESCE(purchaser->>'first_name', purchaser->>'firstname', ''),
    'lastname', COALESCE(purchaser->>'last_name', purchaser->>'lastname', ''),
    'email', COALESCE(purchaser->>'email', ''),
    'phone', COALESCE(purchaser->>'phone', ''),
    'project_name', NEW.project_name,
    'project_id', NEW.project_id,
    'source', NEW.brand,
    'notes', NEW.notes,
    'brand', NEW.brand,
    'template', NEW.template,
    'parking', NEW.parking,
    'locker', NEW.locker,
    'purchasers', NEW.purchasers,
    'choices', NEW.choices,
    'status', NEW.status,
    'table_name', 'worksheets',
    'created_at', NEW.created_at
  );

  SELECT net.http_post(
    url := 'https://property-dashboard-three.vercel.app/api/leads/notify',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  ) INTO request_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_new_worksheet ON worksheets;
CREATE TRIGGER notify_new_worksheet
  AFTER INSERT ON worksheets
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_worksheet();
