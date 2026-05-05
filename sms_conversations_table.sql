-- Create SMS conversations table for tracking two-way SMS communication
CREATE TABLE IF NOT EXISTS sms_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_sid TEXT UNIQUE,
  from_phone TEXT NOT NULL,
  to_phone TEXT NOT NULL,
  message_body TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  status TEXT DEFAULT 'sent',
  lead_name TEXT,
  lead_id TEXT,
  lead_table TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_sms_conversations_from_phone ON sms_conversations(from_phone);
CREATE INDEX IF NOT EXISTS idx_sms_conversations_to_phone ON sms_conversations(to_phone);
CREATE INDEX IF NOT EXISTS idx_sms_conversations_created_at ON sms_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_conversations_direction ON sms_conversations(direction);

-- Enable Row Level Security (RLS)
ALTER TABLE sms_conversations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your auth requirements)
CREATE POLICY "Allow all operations on sms_conversations" 
  ON sms_conversations 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to auto-update updated_at
CREATE TRIGGER update_sms_conversations_updated_at 
  BEFORE UPDATE ON sms_conversations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Comment on table
COMMENT ON TABLE sms_conversations IS 'Stores all SMS conversations (incoming and outgoing) for lead communication tracking';

