-- Dashboard access + cancel flow for fahad_sells_interview_bookings

ALTER TABLE fahad_sells_interview_bookings
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'scheduled';

ALTER TABLE fahad_sells_interview_bookings
  ADD COLUMN IF NOT EXISTS calendar_event_id text;

ALTER TABLE fahad_sells_interview_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow dashboard to read fahad_sells_interview_bookings" ON fahad_sells_interview_bookings;
CREATE POLICY "Allow dashboard to read fahad_sells_interview_bookings"
  ON fahad_sells_interview_bookings FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow dashboard to update fahad_sells_interview_bookings" ON fahad_sells_interview_bookings;
CREATE POLICY "Allow dashboard to update fahad_sells_interview_bookings"
  ON fahad_sells_interview_bookings FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow dashboard to delete fahad_sells_interview_bookings" ON fahad_sells_interview_bookings;
CREATE POLICY "Allow dashboard to delete fahad_sells_interview_bookings"
  ON fahad_sells_interview_bookings FOR DELETE TO anon, authenticated
  USING (true);
