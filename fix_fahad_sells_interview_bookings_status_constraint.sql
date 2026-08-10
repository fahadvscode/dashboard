-- Same rules as fahadsells/supabase/migrations/005_interview_booking_status.sql
-- Careers site schedules with status = 'scheduled'; cancel (site or dashboard) must use 'cancelled'.
-- Partial unique indexes only count scheduled rows — cancelled frees interview slots.

ALTER TABLE fahad_sells_interview_bookings
  ADD COLUMN IF NOT EXISTS status TEXT;

UPDATE fahad_sells_interview_bookings
SET status = 'scheduled'
WHERE status IS NULL OR trim(status) = '' OR status = 'booked';

UPDATE fahad_sells_interview_bookings
SET status = 'cancelled'
WHERE status = 'canceled';

ALTER TABLE fahad_sells_interview_bookings
  ALTER COLUMN status SET DEFAULT 'scheduled';

ALTER TABLE fahad_sells_interview_bookings
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE fahad_sells_interview_bookings
  DROP CONSTRAINT IF EXISTS fahad_sells_interview_bookings_status_check;

ALTER TABLE fahad_sells_interview_bookings
  ADD CONSTRAINT fahad_sells_interview_bookings_status_check
  CHECK (status IN ('scheduled', 'cancelled'));

ALTER TABLE fahad_sells_interview_bookings
  DROP CONSTRAINT IF EXISTS fahad_sells_interview_bookings_slot_start_unique;

ALTER TABLE fahad_sells_interview_bookings
  DROP CONSTRAINT IF EXISTS fahad_sells_interview_bookings_application_id_unique;

DROP INDEX IF EXISTS fahad_sells_interview_bookings_active_slot_unique;
DROP INDEX IF EXISTS fahad_sells_interview_bookings_active_application_unique;

CREATE UNIQUE INDEX IF NOT EXISTS fahad_sells_interview_bookings_active_slot_unique
  ON fahad_sells_interview_bookings (slot_start)
  WHERE status = 'scheduled';

CREATE UNIQUE INDEX IF NOT EXISTS fahad_sells_interview_bookings_active_application_unique
  ON fahad_sells_interview_bookings (application_id)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_fahad_sells_interview_bookings_status
  ON fahad_sells_interview_bookings (status);
