-- SAFE: public.fahad_sells_interview_bookings only
-- AFTER UPDATE (slot/time/status) → /api/bookings/interview-updated
-- Table uses slot_start / slot_end (not appointment_date / appointment_time). API derives display times from slot_start.
-- Keeps Google Calendar + candidate SMS/email in sync when candidates reschedule/cancel on fahadsells.com.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net;

DROP TRIGGER IF EXISTS notify_fahad_sells_interview_booking_update ON fahad_sells_interview_bookings;
DROP FUNCTION IF EXISTS notify_fahad_sells_interview_booking_update();

CREATE OR REPLACE FUNCTION notify_fahad_sells_interview_booking_update()
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
    'table_name', 'fahad_sells_interview_bookings',
    'old_record', to_jsonb(OLD),
    'new_record', to_jsonb(NEW)
  );

  SELECT net.http_post(
    url := dashboard_url || '/api/bookings/interview-updated',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  ) INTO request_id;

  RAISE NOTICE 'Fahad Sells interview booking update sync sent (request_id: %)', request_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_fahad_sells_interview_booking_update
  AFTER UPDATE ON fahad_sells_interview_bookings
  FOR EACH ROW
  WHEN (
    OLD.slot_start IS DISTINCT FROM NEW.slot_start
    OR OLD.slot_end IS DISTINCT FROM NEW.slot_end
    OR OLD.status IS DISTINCT FROM NEW.status
  )
  EXECUTE FUNCTION notify_fahad_sells_interview_booking_update();

COMMIT;

SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'fahad_sells_interview_bookings'
  AND trigger_name = 'notify_fahad_sells_interview_booking_update';
