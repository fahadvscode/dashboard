-- The three-meeting stop used to live in the database. Public booking pages
-- insert straight into Supabase, so this trigger was still rejecting a fourth
-- meeting after the app stopped blocking. The Follow Up Boss panel shows a
-- notice instead. Run this in the Supabase SQL editor to remove the stop.

DROP TRIGGER IF EXISTS enforce_fj_booking_limit ON fj_bookings;
DROP TRIGGER IF EXISTS enforce_precon_booking_limit ON precon_factory_bookings;
DROP TRIGGER IF EXISTS enforce_gta_booking_limit ON gta_lowrise_bookings;
DROP FUNCTION IF EXISTS enforce_public_booking_limit();
