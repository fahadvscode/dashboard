-- =============================================================================
-- Follow Up Boss escalation reminder rows (2 minutes before)
-- Safe to re-run. Does not touch other tables.
-- Run in Supabase SQL Editor.
-- =============================================================================

CREATE TABLE IF NOT EXISTS fub_escalations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  due_at TIMESTAMPTZ NOT NULL,
  staff TEXT NOT NULL,
  escalated_from TEXT NOT NULL,
  lead_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  person_id TEXT,
  date_label TEXT,
  time_label TEXT,
  reminder_sms_sent BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_sms_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fub_escalations_due_reminder_idx
  ON fub_escalations (due_at)
  WHERE reminder_sms_sent = FALSE;

ALTER TABLE fub_escalations ENABLE ROW LEVEL SECURITY;
