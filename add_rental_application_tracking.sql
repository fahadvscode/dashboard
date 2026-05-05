-- Add rental application tracking to rental_leads table

-- Add columns to track rental application history
ALTER TABLE rental_leads 
ADD COLUMN IF NOT EXISTS application_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS application_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS application_sent_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS application_history JSONB DEFAULT '[]'::jsonb;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_rental_leads_application_sent 
ON rental_leads(application_sent, application_sent_at DESC);

-- Verify the columns were added
DO $$
BEGIN
  RAISE NOTICE '✅ Rental application tracking columns added successfully!';
  RAISE NOTICE '📊 Columns added:';
  RAISE NOTICE '   - application_sent (boolean)';
  RAISE NOTICE '   - application_sent_at (timestamp)';
  RAISE NOTICE '   - application_sent_count (integer)';
  RAISE NOTICE '   - application_history (jsonb array)';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Usage:';
  RAISE NOTICE '   - application_sent: TRUE if application was sent at least once';
  RAISE NOTICE '   - application_sent_at: Last time application was sent';
  RAISE NOTICE '   - application_sent_count: Total number of times sent';
  RAISE NOTICE '   - application_history: Array of {sent_at, sent_by} objects';
END $$;

