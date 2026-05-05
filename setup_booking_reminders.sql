-- 📅 Booking Reminder System - Database Setup
-- Adds tracking columns to booking tables for reminder management

-- Add reminder tracking columns to fj_bookings
ALTER TABLE fj_bookings 
ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reminder_1h_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_1h_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reminder_5m_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_5m_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reminder_admin_1h_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_admin_1h_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reminder_admin_15m_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_admin_15m_sent_at TIMESTAMP WITH TIME ZONE;

-- Add reminder tracking columns to precon_factory_bookings
ALTER TABLE precon_factory_bookings 
ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reminder_1h_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_1h_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reminder_5m_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_5m_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reminder_admin_1h_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_admin_1h_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reminder_admin_15m_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_admin_15m_sent_at TIMESTAMP WITH TIME ZONE;

-- Add reminder tracking columns to gta_lowrise_bookings
ALTER TABLE gta_lowrise_bookings 
ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reminder_1h_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_1h_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reminder_5m_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_5m_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reminder_admin_1h_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_admin_1h_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reminder_admin_15m_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_admin_15m_sent_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for faster reminder queries
CREATE INDEX IF NOT EXISTS idx_fj_bookings_reminders 
ON fj_bookings(appointment_date, appointment_time, status) 
WHERE status NOT IN ('cancelled', 'completed');

CREATE INDEX IF NOT EXISTS idx_precon_bookings_reminders 
ON precon_factory_bookings(appointment_date, appointment_time, status) 
WHERE status NOT IN ('cancelled', 'completed');

CREATE INDEX IF NOT EXISTS idx_gta_bookings_reminders 
ON gta_lowrise_bookings(appointment_date, appointment_time, status) 
WHERE status NOT IN ('cancelled', 'completed');

-- Verify setup
DO $$
BEGIN
  RAISE NOTICE '✅ Booking reminder tracking columns added successfully!';
  RAISE NOTICE '📊 Tables updated: fj_bookings, precon_factory_bookings, gta_lowrise_bookings';
  RAISE NOTICE '🔔 Reminder types: 24-hour, 1-hour, 5-min (customers) + 1-hour, 15-min (admins)';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Simplified Schedule:';
  RAISE NOTICE '  Customer: 24h SMS → 1h SMS → 5min SMS';
  RAISE NOTICE '  Admin: 1h SMS → 15min SMS';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next Steps:';
  RAISE NOTICE '1. Deploy the reminder API endpoint to Vercel';
  RAISE NOTICE '2. The Vercel cron job will automatically check for bookings every 10 minutes';
  RAISE NOTICE '3. Reminders will be sent at the appropriate times';
END $$;

