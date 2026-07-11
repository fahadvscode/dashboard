-- Fix the notification trigger to include better logging
-- This will help us see what's actually being sent

-- Drop and recreate the function with enhanced logging
DROP FUNCTION IF EXISTS notify_new_lead() CASCADE;

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

  -- Log what we're about to send (for debugging)
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Lead Notification Payload for %:', NEW.firstname;
  RAISE NOTICE 'Project Name: %', NEW.project_name;
  RAISE NOTICE 'Project ID: %', NEW.project_id;
  RAISE NOTICE 'Redirect Link: %', NEW.redirect_link;
  RAISE NOTICE 'Full Payload: %', payload::text;
  RAISE NOTICE '==========================================';

  -- Make async HTTP POST request to your API
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

-- Recreate triggers for all lead tables
CREATE TRIGGER notify_new_fj_lead
  AFTER INSERT ON fj_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_lead();

CREATE TRIGGER notify_new_precon_lead
  AFTER INSERT ON precon_factory_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_lead();

CREATE TRIGGER notify_new_gta_lowrise_lead
  AFTER INSERT ON gta_lowrise_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_lead();

-- Verify triggers were created
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('notify_new_fj_lead', 'notify_new_precon_lead', 'notify_new_gta_lowrise_lead')
ORDER BY event_object_table;

-- Show success message
DO $$
BEGIN
  RAISE NOTICE '✅ Lead notification triggers updated with enhanced logging!';
  RAISE NOTICE '📱 New leads will automatically send notifications';
  RAISE NOTICE '🔍 Check Supabase logs to see the full payload being sent';
  RAISE NOTICE '🔔 Triggers active on: fj_leads, precon_factory_leads, gta_lowrise_leads';
END $$;
