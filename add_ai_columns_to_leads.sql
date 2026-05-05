-- Add AI analysis columns to FJ Leads table
ALTER TABLE fj_leads
ADD COLUMN IF NOT EXISTS ai_score INTEGER,
ADD COLUMN IF NOT EXISTS ai_confidence TEXT,
ADD COLUMN IF NOT EXISTS ai_budget TEXT,
ADD COLUMN IF NOT EXISTS ai_timeline TEXT,
ADD COLUMN IF NOT EXISTS ai_priorities JSONB,
ADD COLUMN IF NOT EXISTS ai_buyer_type TEXT,
ADD COLUMN IF NOT EXISTS ai_urgency TEXT,
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,
ADD COLUMN IF NOT EXISTS ai_key_points JSONB,
ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;

-- Add AI analysis columns to Precon Factory Leads table
ALTER TABLE precon_factory_leads
ADD COLUMN IF NOT EXISTS ai_score INTEGER,
ADD COLUMN IF NOT EXISTS ai_confidence TEXT,
ADD COLUMN IF NOT EXISTS ai_budget TEXT,
ADD COLUMN IF NOT EXISTS ai_timeline TEXT,
ADD COLUMN IF NOT EXISTS ai_priorities JSONB,
ADD COLUMN IF NOT EXISTS ai_buyer_type TEXT,
ADD COLUMN IF NOT EXISTS ai_urgency TEXT,
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,
ADD COLUMN IF NOT EXISTS ai_key_points JSONB,
ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_fj_leads_ai_score ON fj_leads(ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_precon_leads_ai_score ON precon_factory_leads(ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_fj_leads_ai_urgency ON fj_leads(ai_urgency);
CREATE INDEX IF NOT EXISTS idx_precon_leads_ai_urgency ON precon_factory_leads(ai_urgency);

-- Show success message
DO $$
BEGIN
  RAISE NOTICE '✅ AI columns added to leads tables successfully!';
  RAISE NOTICE '📊 Columns: ai_score, ai_confidence, ai_budget, ai_timeline, ai_priorities, ai_buyer_type, ai_urgency, ai_reasoning, ai_key_points, ai_analyzed_at';
  RAISE NOTICE '🚀 Ready for automatic AI analysis on new leads!';
END $$;

