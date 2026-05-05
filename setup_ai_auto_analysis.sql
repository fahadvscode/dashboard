-- Enable the pg_net extension for HTTP requests (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop existing triggers and functions if they exist
DROP TRIGGER IF EXISTS auto_analyze_new_fj_lead ON fj_leads;
DROP TRIGGER IF EXISTS auto_analyze_new_precon_lead ON precon_factory_leads;
DROP FUNCTION IF EXISTS trigger_ai_analysis();

-- Create function to trigger AI analysis via HTTP
CREATE OR REPLACE FUNCTION trigger_ai_analysis()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  request_id BIGINT;
  dashboard_base_url TEXT := 'https://property-dashboard-three.vercel.app';
BEGIN
  -- Build the payload with lead details
  payload := jsonb_build_object(
    'leadId', NEW.id,
    'tableName', TG_TABLE_NAME,
    'lead', jsonb_build_object(
      'id', NEW.id,
      'firstname', NEW.firstname,
      'lastname', NEW.lastname,
      'email', NEW.email,
      'phone', NEW.phone,
      'message', NEW.message,
      'project_name', NEW.project_name,
      'project_id', NEW.project_id,
      'source', NEW.source,
      'isagent', NEW.isagent,
      'status', NEW.status,
      'created_at', NEW.created_at
    )
  );

  -- Make async HTTP POST request to AI analysis API
  SELECT net.http_post(
    url := dashboard_base_url || '/api/leads/auto-analyze',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  ) INTO request_id;

  -- Log the AI analysis trigger
  RAISE NOTICE '🤖 AI analysis triggered for % lead (ID: %, Request ID: %)', 
    TG_TABLE_NAME, NEW.id, request_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for fj_leads table
CREATE TRIGGER auto_analyze_new_fj_lead
  AFTER INSERT ON fj_leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_ai_analysis();

-- Create trigger for precon_factory_leads table
CREATE TRIGGER auto_analyze_new_precon_lead
  AFTER INSERT ON precon_factory_leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_ai_analysis();

-- Test the setup by checking if triggers exist
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('auto_analyze_new_fj_lead', 'auto_analyze_new_precon_lead');

-- Show success message
DO $$
BEGIN
  RAISE NOTICE '✅ AI auto-analysis triggers successfully created!';
  RAISE NOTICE '🤖 Triggers active on: fj_leads, precon_factory_leads';
  RAISE NOTICE '⚡ New leads will be analyzed automatically within seconds!';
END $$;

