-- Update calendar_tokens table for unified Qikfill OAuth approach
-- This migration consolidates multiple OAuth tokens into a single unified token

-- Step 1: Add comment to explain the new structure
COMMENT ON TABLE calendar_tokens IS 'Stores Google Calendar OAuth tokens. Uses unified "qikfill" token for info@qikfill.com workspace that manages all brand calendars (FJ, Precon Factory, GTA Lowrise).';

-- Step 2: Optional - Clean up old tokens if they exist (CAREFUL: Only run if you're switching from old system)
-- DELETE FROM calendar_tokens WHERE calendar_type IN ('fj_calendar', 'precon_calendar');

-- Step 3: Verify table structure is correct
-- The existing table should work fine, just with calendar_type = 'qikfill' instead of multiple types

-- Step 4: Check current tokens
SELECT 
  calendar_type,
  token_type,
  scope,
  CASE 
    WHEN expiry_date > EXTRACT(EPOCH FROM NOW()) * 1000 THEN 'Valid'
    ELSE 'Expired'
  END as token_status,
  created_at,
  updated_at
FROM calendar_tokens;

-- Note: After running this migration, you need to:
-- 1. Set environment variables: QIKFILL_GOOGLE_CLIENT_ID and QIKFILL_GOOGLE_CLIENT_SECRET
-- 2. Visit /api/calendar/oauth to authorize with info@qikfill.com account
-- 3. This single authorization will enable all three calendars (FJ, Precon Factory, GTA Lowrise)

