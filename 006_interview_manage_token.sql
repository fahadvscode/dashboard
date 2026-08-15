-- Interview manage links for fahadsells.com/careers/manage/{manage_token}
-- Run once in Supabase (same DB as fahad_sells_interview_bookings).
-- Mirrors fahadsells/supabase/migrations/006_interview_manage_token.sql

ALTER TABLE fahad_sells_interview_bookings
  ADD COLUMN IF NOT EXISTS manage_token UUID;

UPDATE fahad_sells_interview_bookings
SET manage_token = gen_random_uuid()
WHERE manage_token IS NULL;

ALTER TABLE fahad_sells_interview_bookings
  ALTER COLUMN manage_token SET DEFAULT gen_random_uuid();

ALTER TABLE fahad_sells_interview_bookings
  ALTER COLUMN manage_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS fahad_sells_interview_bookings_manage_token_unique
  ON fahad_sells_interview_bookings (manage_token);
