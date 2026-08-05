-- SAFE: public.cleaning_leads only — AFTER INSERT, sheets only (no email/SMS)
-- Appends full row to Google Sheet tab "Cleaning Leads" in GOOGLE_SHEETS_SPREADSHEET_ID

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net;

DROP TRIGGER IF EXISTS notify_new_cleaning_lead ON cleaning_leads;
DROP FUNCTION IF EXISTS notify_new_cleaning_lead();

CREATE OR REPLACE FUNCTION notify_new_cleaning_lead()
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
  payload := to_jsonb(NEW) || jsonb_build_object('table_name', 'cleaning_leads');

  SELECT net.http_post(
    url := dashboard_url || '/api/leads/cleaning-sheets',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  ) INTO request_id;

  RAISE NOTICE 'Cleaning lead sheet sync sent (request_id: %)', request_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_new_cleaning_lead
  AFTER INSERT ON cleaning_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_cleaning_lead();

COMMIT;

SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'cleaning_leads'
  AND trigger_name = 'notify_new_cleaning_lead';
