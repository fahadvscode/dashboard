-- Stores each time a meeting is moved, so the Follow Up Boss booking history can show the old time.
-- Run in the Supabase SQL editor.

ALTER TABLE fj_bookings
  ADD COLUMN IF NOT EXISTS reschedule_log JSONB;

ALTER TABLE precon_factory_bookings
  ADD COLUMN IF NOT EXISTS reschedule_log JSONB;

ALTER TABLE gta_lowrise_bookings
  ADD COLUMN IF NOT EXISTS reschedule_log JSONB;
