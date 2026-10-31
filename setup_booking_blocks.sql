-- Closed booking times. Run once in the Supabase SQL editor.
-- A public booking whose time falls inside a block is refused.
-- Office bookings that include booked_by are still allowed.
-- A block stops applying on its own after its end time in Toronto.

CREATE TABLE IF NOT EXISTS public.booking_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_date date NOT NULL,
  start_minutes integer NOT NULL CHECK (start_minutes >= 0 AND start_minutes < 1440),
  end_minutes integer NOT NULL CHECK (end_minutes > start_minutes AND end_minutes <= 1440),
  brand text NOT NULL CHECK (brand IN ('all', 'fj', 'precon', 'gta')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_blocks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.booking_time_minutes(raw text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned text := upper(btrim(coalesce(raw, '')));
  h integer;
  m integer;
  ampm text;
BEGIN
  IF cleaned !~ '^[0-9]{1,2}:[0-9]{2}' THEN
    RETURN NULL;
  END IF;
  h := split_part(cleaned, ':', 1)::integer;
  m := substring(split_part(cleaned, ':', 2) from '^[0-9]{2}')::integer;
  ampm := substring(cleaned from '(AM|PM)');
  IF ampm = 'PM' AND h < 12 THEN
    h := h + 12;
  END IF;
  IF ampm = 'AM' AND h = 12 THEN
    h := 0;
  END IF;
  IF h BETWEEN 0 AND 23 AND m BETWEEN 0 AND 59 THEN
    RETURN h * 60 + m;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_booking_closed_time()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  mins integer;
  brand_id text;
  closed boolean;
BEGIN
  IF NEW.booked_by IS NOT NULL AND btrim(NEW.booked_by) <> '' THEN
    RETURN NEW;
  END IF;

  mins := public.booking_time_minutes(NEW.appointment_time);
  IF mins IS NULL OR NEW.appointment_date IS NULL THEN
    RETURN NEW;
  END IF;

  brand_id := CASE TG_TABLE_NAME
    WHEN 'fj_bookings' THEN 'fj'
    WHEN 'precon_factory_bookings' THEN 'precon'
    WHEN 'gta_lowrise_bookings' THEN 'gta'
    ELSE ''
  END;
  IF brand_id = '' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.booking_blocks b
    WHERE b.block_date = NEW.appointment_date::date
      AND (b.brand = 'all' OR b.brand = brand_id)
      AND mins >= b.start_minutes
      AND mins < b.end_minutes
      AND (b.block_date + make_interval(mins => b.end_minutes))
        > (timezone('America/Toronto', now()))
  ) INTO closed;

  IF closed THEN
    RAISE EXCEPTION 'This time is closed. Please choose another time.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN undefined_table THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reject_closed_fj_booking_time ON public.fj_bookings;
CREATE TRIGGER reject_closed_fj_booking_time
  BEFORE INSERT ON public.fj_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_booking_closed_time();

DROP TRIGGER IF EXISTS reject_closed_precon_booking_time ON public.precon_factory_bookings;
CREATE TRIGGER reject_closed_precon_booking_time
  BEFORE INSERT ON public.precon_factory_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_booking_closed_time();

DROP TRIGGER IF EXISTS reject_closed_gta_booking_time ON public.gta_lowrise_bookings;
CREATE TRIGGER reject_closed_gta_booking_time
  BEFORE INSERT ON public.gta_lowrise_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_booking_closed_time();
