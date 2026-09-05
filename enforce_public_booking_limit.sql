-- Block a 4th public booking for the same email or phone unless staff set booked_by.
-- Run in the Supabase SQL editor.

CREATE OR REPLACE FUNCTION enforce_public_booking_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_count integer;
  phone_key text;
  email_key text;
BEGIN
  IF NEW.booked_by IS NOT NULL AND btrim(NEW.booked_by) <> '' THEN
    RETURN NEW;
  END IF;

  email_key := lower(btrim(coalesce(NEW.email, '')));
  phone_key := right(regexp_replace(coalesce(NEW.phone, ''), '\D', '', 'g'), 10);

  IF email_key = '' AND length(phone_key) < 10 THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO existing_count
  FROM (
    SELECT id FROM fj_bookings b
    WHERE lower(coalesce(b.status, '')) NOT IN ('canceled', 'cancelled')
      AND (
        (email_key <> '' AND lower(btrim(coalesce(b.email, ''))) = email_key)
        OR (length(phone_key) >= 10 AND right(regexp_replace(coalesce(b.phone, ''), '\D', '', 'g'), 10) = phone_key)
      )
    UNION ALL
    SELECT id FROM precon_factory_bookings b
    WHERE lower(coalesce(b.status, '')) NOT IN ('canceled', 'cancelled')
      AND (
        (email_key <> '' AND lower(btrim(coalesce(b.email, ''))) = email_key)
        OR (length(phone_key) >= 10 AND right(regexp_replace(coalesce(b.phone, ''), '\D', '', 'g'), 10) = phone_key)
      )
    UNION ALL
    SELECT id FROM gta_lowrise_bookings b
    WHERE lower(coalesce(b.status, '')) NOT IN ('canceled', 'cancelled')
      AND (
        (email_key <> '' AND lower(btrim(coalesce(b.email, ''))) = email_key)
        OR (length(phone_key) >= 10 AND right(regexp_replace(coalesce(b.phone, ''), '\D', '', 'g'), 10) = phone_key)
      )
  ) matched;

  IF existing_count >= 3 THEN
    RAISE EXCEPTION 'BOOKING_LIMIT Contact +1 4163994289 to book an appointment'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_fj_booking_limit ON fj_bookings;
CREATE TRIGGER enforce_fj_booking_limit
  BEFORE INSERT ON fj_bookings
  FOR EACH ROW
  EXECUTE FUNCTION enforce_public_booking_limit();

DROP TRIGGER IF EXISTS enforce_precon_booking_limit ON precon_factory_bookings;
CREATE TRIGGER enforce_precon_booking_limit
  BEFORE INSERT ON precon_factory_bookings
  FOR EACH ROW
  EXECUTE FUNCTION enforce_public_booking_limit();

DROP TRIGGER IF EXISTS enforce_gta_booking_limit ON gta_lowrise_bookings;
CREATE TRIGGER enforce_gta_booking_limit
  BEFORE INSERT ON gta_lowrise_bookings
  FOR EACH ROW
  EXECUTE FUNCTION enforce_public_booking_limit();
