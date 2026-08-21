-- 4-digit candidate IDs for existing and future interview bookings.
-- Run once in Supabase (same DB as fahad_sells_interview_bookings).

BEGIN;

CREATE SEQUENCE IF NOT EXISTS fahad_sells_interview_candidate_number_seq
  AS INTEGER
  START WITH 1001
  MINVALUE 1001
  MAXVALUE 9999
  INCREMENT BY 1
  NO CYCLE;

ALTER TABLE fahad_sells_interview_bookings
  ADD COLUMN IF NOT EXISTS candidate_number INTEGER;

WITH numbered AS (
  SELECT
    id,
    1000 + ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS n
  FROM fahad_sells_interview_bookings
  WHERE candidate_number IS NULL
)
UPDATE fahad_sells_interview_bookings AS bookings
SET candidate_number = numbered.n
FROM numbered
WHERE bookings.id = numbered.id;

SELECT setval(
  'fahad_sells_interview_candidate_number_seq',
  COALESCE((SELECT MAX(candidate_number) FROM fahad_sells_interview_bookings), 1000)
);

ALTER TABLE fahad_sells_interview_bookings
  ALTER COLUMN candidate_number SET DEFAULT nextval('fahad_sells_interview_candidate_number_seq');

UPDATE fahad_sells_interview_bookings
SET candidate_number = nextval('fahad_sells_interview_candidate_number_seq')
WHERE candidate_number IS NULL;

ALTER TABLE fahad_sells_interview_bookings
  ALTER COLUMN candidate_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS fahad_sells_interview_bookings_candidate_number_unique
  ON fahad_sells_interview_bookings (candidate_number);

CREATE OR REPLACE FUNCTION assign_interview_candidate_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.candidate_number IS NULL THEN
    NEW.candidate_number := nextval('fahad_sells_interview_candidate_number_seq');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_interview_candidate_number ON fahad_sells_interview_bookings;
CREATE TRIGGER assign_interview_candidate_number
  BEFORE INSERT ON fahad_sells_interview_bookings
  FOR EACH ROW
  EXECUTE FUNCTION assign_interview_candidate_number();

COMMIT;

SELECT id, candidate_number, created_at
FROM fahad_sells_interview_bookings
ORDER BY candidate_number
LIMIT 20;
