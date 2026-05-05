-- =====================================================
-- GTA LOWRISE BOOKINGS - SMS Notification Setup
-- =====================================================
-- This script adds SMS notification trigger for gta_lowrise_bookings
-- Run this in Supabase SQL Editor

-- Enable pg_net extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS notify_new_gta_lowrise_booking ON gta_lowrise_bookings;

-- Create trigger for gta_lowrise_bookings table
-- Note: The notify_new_booking() function should already exist from FJ/Precon setup
CREATE TRIGGER notify_new_gta_lowrise_booking
  AFTER INSERT ON gta_lowrise_bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_booking();

-- Verify the trigger was created
SELECT 
  trigger_name,
  event_object_table,
  action_statement,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'gta_lowrise_bookings'
ORDER BY trigger_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ GTA Lowrise booking notification trigger created!';
  RAISE NOTICE '📱 SMS notifications will be sent to: 6478981739, 4168296121, 4163994289';
  RAISE NOTICE '🔔 Trigger active on: gta_lowrise_bookings';
  RAISE NOTICE '📆 Google Calendar events will be auto-created';
END $$;

