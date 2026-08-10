-- Fix status check on fahad_sells_interview_bookings
-- Error: violates check constraint "fahad_sells_interview_bookings_status_check"
-- Allows dashboard cancel ("canceled" / "cancelled"), new bookings ("scheduled"), and common app values.

ALTER TABLE fahad_sells_interview_bookings
  ADD COLUMN IF NOT EXISTS status text;

ALTER TABLE fahad_sells_interview_bookings
  ALTER COLUMN status SET DEFAULT 'scheduled';

UPDATE fahad_sells_interview_bookings
SET status = 'scheduled'
WHERE status IS NULL OR trim(status) = '';

ALTER TABLE fahad_sells_interview_bookings
  DROP CONSTRAINT IF EXISTS fahad_sells_interview_bookings_status_check;

ALTER TABLE fahad_sells_interview_bookings
  ADD CONSTRAINT fahad_sells_interview_bookings_status_check
  CHECK (
    status IN (
      'scheduled',
      'confirmed',
      'pending',
      'new',
      'booked',
      'active',
      'cancelled',
      'canceled',
      'completed'
    )
  );

COMMENT ON COLUMN fahad_sells_interview_bookings.status IS
  'Interview booking lifecycle: scheduled (default), canceled/cancelled, completed, etc.';
