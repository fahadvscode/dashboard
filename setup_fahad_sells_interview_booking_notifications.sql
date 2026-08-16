-- SAFE: public.fahad_sells_interview_bookings only
-- AFTER INSERT → /api/bookings/notify (admin SMS/email, calendar, candidate confirmations, Interview Bookings sheet tab)
-- Table may use full_name, slot_start, slot_end — the API maps these to firstname / appointment_date / appointment_time.
-- Re-run this file whenever the notify function changes. Current version uses a 60s pg_net timeout.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net;

DROP TRIGGER IF EXISTS notify_new_fahad_sells_interview_booking ON fahad_sells_interview_bookings;
DROP FUNCTION IF EXISTS notify_new_fahad_sells_interview_booking();

CREATE OR REPLACE FUNCTION notify_new_fahad_sells_interview_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  payload JSONB;
  request_id BIGINT;
  dashboard_url TEXT := 'https://property-dashboard-three.vercel.app';
BEGIN
  payload := to_jsonb(NEW) || jsonb_build_object('table_name', 'fahad_sells_interview_bookings');

  -- Default pg_net timeout is 5s; notify sends SMS + Gmail and needs longer.
  SELECT net.http_post(
    url := dashboard_url || '/api/bookings/notify',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload,
    timeout_milliseconds := 60000
  ) INTO request_id;

  RAISE NOTICE 'Fahad Sells interview booking notification sent (request_id: %)', request_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_new_fahad_sells_interview_booking
  AFTER INSERT ON fahad_sells_interview_bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_fahad_sells_interview_booking();

COMMIT;

SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'fahad_sells_interview_bookings'
  AND trigger_name = 'notify_new_fahad_sells_interview_booking';
