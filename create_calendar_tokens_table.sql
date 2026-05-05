-- Create table to store Google Calendar OAuth tokens
CREATE TABLE IF NOT EXISTS calendar_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_type TEXT UNIQUE NOT NULL, -- 'fj_calendar' or 'precon_calendar'
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expiry_date BIGINT, -- Unix timestamp
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_calendar_tokens_type ON calendar_tokens(calendar_type);

-- Enable Row Level Security (optional, adjust as needed)
ALTER TABLE calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to read/write (adjust based on your needs)
CREATE POLICY "Service role can manage calendar tokens" ON calendar_tokens
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_calendar_tokens_updated_at ON calendar_tokens;
CREATE TRIGGER update_calendar_tokens_updated_at
  BEFORE UPDATE ON calendar_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verify table creation
SELECT '✅ calendar_tokens table created successfully!' AS status;

