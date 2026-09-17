-- =============================================================================
-- Appointment nurture (14-touch ISA follow-up after FUB booking outcomes)
-- Safe to re-run. Does not touch booking tables besides reading them.
-- Run in Supabase SQL Editor.
-- =============================================================================

CREATE TABLE IF NOT EXISTS appointment_nurtures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id TEXT NOT NULL,
  booking_table TEXT NOT NULL,
  fub_person_id BIGINT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('appointment_done', 'no_show', 'rescheduled')),
  status TEXT NOT NULL CHECK (status IN ('active', 'stopped', 'pending')),
  assigned_to TEXT NOT NULL,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id, booking_table)
);

CREATE INDEX IF NOT EXISTS appointment_nurtures_person_idx
  ON appointment_nurtures (fub_person_id, status);

CREATE INDEX IF NOT EXISTS appointment_nurtures_booking_idx
  ON appointment_nurtures (booking_table, booking_id);

ALTER TABLE appointment_nurtures ENABLE ROW LEVEL SECURITY;
