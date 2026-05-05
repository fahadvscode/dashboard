-- =====================================================
-- GTA LOWRISE LEADS - Complete Setup
-- =====================================================
-- This script adds all missing columns to match FJ and Precon Factory functionality
-- Run this in Supabase SQL Editor

-- Step 1: Add Call Tracking Columns
-- =====================================================
ALTER TABLE gta_lowrise_leads 
ADD COLUMN IF NOT EXISTS call_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS call_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS last_note TEXT;

-- Step 2: Add Lead Temperature Column
-- =====================================================
ALTER TABLE gta_lowrise_leads 
ADD COLUMN IF NOT EXISTS lead_temperature TEXT DEFAULT 'warm' CHECK (lead_temperature IN ('hot', 'warm', 'cold'));

-- Step 3: Add AI Analysis Columns
-- =====================================================
ALTER TABLE gta_lowrise_leads 
ADD COLUMN IF NOT EXISTS ai_score INTEGER,
ADD COLUMN IF NOT EXISTS ai_confidence TEXT CHECK (ai_confidence IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS ai_budget TEXT,
ADD COLUMN IF NOT EXISTS ai_timeline TEXT,
ADD COLUMN IF NOT EXISTS ai_priorities JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_buyer_type TEXT,
ADD COLUMN IF NOT EXISTS ai_urgency TEXT CHECK (ai_urgency IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,
ADD COLUMN IF NOT EXISTS ai_key_points JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;

-- Step 4: Create Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_gta_lowrise_leads_email ON gta_lowrise_leads(email);
CREATE INDEX IF NOT EXISTS idx_gta_lowrise_leads_phone ON gta_lowrise_leads(phone);
CREATE INDEX IF NOT EXISTS idx_gta_lowrise_leads_status ON gta_lowrise_leads(status);
CREATE INDEX IF NOT EXISTS idx_gta_lowrise_leads_temperature ON gta_lowrise_leads(lead_temperature);
CREATE INDEX IF NOT EXISTS idx_gta_lowrise_leads_created_at ON gta_lowrise_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gta_lowrise_leads_ai_score ON gta_lowrise_leads(ai_score DESC);

-- Step 5: Verify the new columns
-- =====================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'gta_lowrise_leads'
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ gta_lowrise_leads table updated successfully!';
  RAISE NOTICE '📋 Added: call tracking, temperature, and AI analysis columns';
  RAISE NOTICE '🚀 Ready for dashboard integration';
END $$;

