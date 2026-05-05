-- 📱 Booking Notification System Setup
-- Automatically sends SMS notifications to admins when new bookings are created

-- Enable pg_net extension if not already enabled (for HTTP requests)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop existing triggers and functions if they exist
DROP TRIGGER IF EXISTS notify_new_fj_booking ON fj_bookings;
DROP TRIGGER IF EXISTS notify_new_precon_booking ON precon_factory_bookings;
DROP FUNCTION IF EXISTS notify_new_booking();

-- Create function to send notification via HTTP
CREATE OR REPLACE FUNCTION notify_new_booking()
RETURNS TRIGGER AS $$
DECLARE
  request_id bigint;
  url text;
BEGIN
  -- Build the notification URL
  url := 'https://property-dashboard-three.vercel.app/api/bookings/notify';
  
  -- Make async HTTP request to notification API
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
      'table_name', TG_TABLE_NAME
    )
  ) INTO request_id;
  
  -- Log the notification attempt
  RAISE NOTICE 'Booking notification triggered for % (ID: %, Request ID: %)', 
    TG_TABLE_NAME, NEW.id, request_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for fj_bookings table
CREATE TRIGGER notify_new_fj_booking
  AFTER INSERT ON fj_bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_booking();

-- Create trigger for precon_factory_bookings table
CREATE TRIGGER notify_new_precon_booking
  AFTER INSERT ON precon_factory_bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_booking();

-- Test the setup by checking if triggers exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.triggers
    WHERE trigger_name IN ('notify_new_fj_booking', 'notify_new_precon_booking')
  ) THEN
    RAISE NOTICE '✅ Booking notification triggers successfully created!';
    RAISE NOTICE '📱 New bookings will automatically send SMS to admins';
    RAISE NOTICE '🔔 Triggers active on: fj_bookings, precon_factory_bookings';
  ELSE
    RAISE WARNING '⚠️ Triggers not found. Please check the setup.';
  END IF;
END $$;

