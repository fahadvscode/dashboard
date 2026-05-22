-- Add CRM columns to landing page lead tables for full lead management
-- Run this in Supabase SQL Editor before using the Landing Pages Leads dashboard

-- cornerstone_leads: add CRM columns
ALTER TABLE cornerstone_leads
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS lead_temperature text DEFAULT 'warm',
  ADD COLUMN IF NOT EXISTS call_history jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS call_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_note text;

-- novella_leads: add CRM columns
ALTER TABLE novella_leads
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS lead_temperature text DEFAULT 'warm',
  ADD COLUMN IF NOT EXISTS call_history jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS call_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_note text;

-- lakeview_village_leads: add CRM columns
ALTER TABLE lakeview_village_leads
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS lead_temperature text DEFAULT 'warm',
  ADD COLUMN IF NOT EXISTS call_history jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS call_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_note text;
