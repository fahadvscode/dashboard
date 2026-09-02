-- Internal "booked by" staff name on property bookings (not shown to customers).
-- Run in the Supabase SQL editor if this was not applied automatically.

ALTER TABLE fj_bookings
  ADD COLUMN IF NOT EXISTS booked_by TEXT;

ALTER TABLE precon_factory_bookings
  ADD COLUMN IF NOT EXISTS booked_by TEXT;

ALTER TABLE gta_lowrise_bookings
  ADD COLUMN IF NOT EXISTS booked_by TEXT;

CREATE OR REPLACE FUNCTION notify_new_booking()
RETURNS TRIGGER AS $$
DECLARE
  request_id bigint;
  url text;
BEGIN
  url := 'https://property-dashboard-three.vercel.app/api/bookings/notify';

  SELECT net.http_post(
    url := url,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'id', NEW.id,
      'firstname', NEW.firstname,
      'lastname', NEW.lastname,
      'email', NEW.email,
      'phone', NEW.phone,
      'appointment_date', NEW.appointment_date,
      'appointment_time', NEW.appointment_time,
      'appointment_type', NEW.appointment_type,
      'message', NEW.message,
      'status', NEW.status,
      'project_name', NEW.project_name,
      'project_id', NEW.project_id,
      'project_url', NEW.project_url,
      'project_brand', NEW.project_brand,
      'booked_by', NEW.booked_by,
      'table_name', TG_TABLE_NAME
    )
  ) INTO request_id;

  RAISE NOTICE 'Booking notification triggered for % (ID: %, Request ID: %)',
    TG_TABLE_NAME, NEW.id, request_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
