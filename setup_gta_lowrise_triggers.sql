-- =====================================================
-- GTA LOWRISE LEADS - Database Triggers Setup
-- =====================================================
-- This script sets up automatic SMS notifications and AI analysis
-- Run AFTER setup_gta_lowrise_leads.sql

-- Enable pg_net extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =====================================================
-- SMS NOTIFICATION TRIGGER
-- =====================================================
-- Add GTA Lowrise to existing notification function
-- The notify_new_lead() function already exists, we just need to add a trigger

-- Drop trigger if it exists (PostgreSQL doesn't support IF NOT EXISTS for triggers)
DROP TRIGGER IF EXISTS notify_new_gta_lowrise_lead ON gta_lowrise_leads;

CREATE TRIGGER notify_new_gta_lowrise_lead
  AFTER INSERT ON gta_lowrise_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_lead();

-- =====================================================
-- AI AUTO-ANALYSIS TRIGGER
-- =====================================================
-- Add GTA Lowrise to existing AI analysis function
-- The trigger_ai_analysis() function already exists, we just need to add a trigger

-- Drop trigger if it exists (PostgreSQL doesn't support IF NOT EXISTS for triggers)
DROP TRIGGER IF EXISTS auto_analyze_new_gta_lowrise_lead ON gta_lowrise_leads;

CREATE TRIGGER auto_analyze_new_gta_lowrise_lead
  AFTER INSERT ON gta_lowrise_leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_ai_analysis();

-- =====================================================
-- Verify Triggers
-- =====================================================
SELECT 
  trigger_name,
  event_object_table,
  action_statement,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'gta_lowrise_leads'
ORDER BY trigger_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ GTA Lowrise triggers created successfully!';
  RAISE NOTICE '📱 SMS notifications will be sent to: 6478981739, 4168296121, 4163994289';
  RAISE NOTICE '🤖 AI auto-analysis will run on every new lead';
  RAISE NOTICE '🔔 Triggers active on: gta_lowrise_leads';
END $$;

