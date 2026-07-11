-- Enable the pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop existing triggers and functions if they exist
DROP TRIGGER IF EXISTS notify_new_fj_lead ON fj_leads;
DROP TRIGGER IF EXISTS notify_new_precon_lead ON precon_factory_leads;
DROP FUNCTION IF EXISTS notify_new_lead();

-- Create function to send notification via HTTP
CREATE OR REPLACE FUNCTION notify_new_lead()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  request_id BIGINT;
BEGIN
  -- Build the payload with lead details
  payload := jsonb_build_object(
    'id', NEW.id,
    'firstname', NEW.firstname,
    'lastname', NEW.lastname,
    'email', NEW.email,
    'phone', NEW.phone,
    'project_name', NEW.project_name,
    'project_id', NEW.project_id,
    'redirect_link', NEW.redirect_link,
    'source', NEW.source,
    'isagent', NEW.isagent,
    'notes', NEW.notes,
    'table_name', TG_TABLE_NAME,
    'created_at', NEW.created_at
  );

  -- Make async HTTP POST request to your API
  -- Replace with your actual production URL
  SELECT net.http_post(
    url := 'https://property-dashboard-three.vercel.app/api/leads/notify',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  ) INTO request_id;

  -- Log the notification attempt
  RAISE NOTICE 'Lead notification triggered for % (ID: %, Request ID: %)', 
    NEW.firstname, NEW.id, request_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for fj_leads table
CREATE TRIGGER notify_new_fj_lead
  AFTER INSERT ON fj_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_lead();

-- Create trigger for precon_factory_leads table
CREATE TRIGGER notify_new_precon_lead
  AFTER INSERT ON precon_factory_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_lead();

-- Test the setup by checking if triggers exist
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('notify_new_fj_lead', 'notify_new_precon_lead');

-- Show success message
DO $$
BEGIN
  RAISE NOTICE '✅ Lead notification triggers successfully created!';
  RAISE NOTICE '📱 New leads will automatically send SMS to 6478981739';
  RAISE NOTICE '🔔 Triggers active on: fj_leads, precon_factory_leads';
END $$;

