-- Store Google Calendar event ID on booking rows for reschedule support

ALTER TABLE fj_bookings
ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;

ALTER TABLE precon_factory_bookings
ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;

ALTER TABLE gta_lowrise_bookings
ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;
