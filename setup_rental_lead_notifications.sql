-- Setup Rental Lead Notifications
-- This script creates a database trigger to automatically notify you when new rental leads come in

-- Enable the pg_net extension for HTTP requests (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS notify_new_rental_lead ON rental_leads;
DROP FUNCTION IF EXISTS notify_new_rental_lead();

-- Create function to send notification via HTTP for rental leads
CREATE OR REPLACE FUNCTION notify_new_rental_lead()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  request_id BIGINT;
  dashboard_url TEXT := 'https://property-dashboard-three.vercel.app';
BEGIN
  -- Build the payload with rental lead details
  payload := jsonb_build_object(
    'id', NEW.id,
    'full_name', NEW.full_name,
    'firstname', NEW.firstname,
    'lastname', NEW.lastname,
    'email', NEW.email,
    'phone', NEW.phone,
    'neighbourhood', NEW.neighbourhood,
    'property_type', NEW.property_type,
    'bedrooms', NEW.bedrooms,
    'budget', NEW.budget,
    'move_in_date', NEW.move_in_date,
    'features', NEW.features,
    'credit_score', NEW.credit_score,
    'occupants', NEW.occupants,
    'has_pets', NEW.has_pets,
    'pet_details', NEW.pet_details,
    'notes', NEW.notes,
    'source', NEW.source,
    'status', NEW.status,
    'table_name', 'rental_leads',
    'created_at', NEW.created_at
  );

  -- Make async HTTP POST request to your notification API
  SELECT net.http_post(
    url := dashboard_url || '/api/leads/notify',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  ) INTO request_id;

  -- Log the notification attempt
  RAISE NOTICE '🏠 Rental lead notification triggered for % (ID: %, Request ID: %)', 
    COALESCE(NEW.full_name, NEW.firstname || ' ' || NEW.lastname), NEW.id, request_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for rental_leads table
CREATE TRIGGER notify_new_rental_lead
  AFTER INSERT ON rental_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_rental_lead();

-- Verify the trigger was created
SELECT 
  trigger_name,
  event_object_table,
  action_statement,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'notify_new_rental_lead';

-- Show success message
DO $$
BEGIN
  RAISE NOTICE '✅ Rental lead notification trigger successfully created!';
  RAISE NOTICE '📱 New rental leads will automatically send SMS to: 6478981739, 4168296121, 4163994289, 4168395020';
  RAISE NOTICE '📧 Email notifications will be sent to: info@fahadsold.com, info@preconfactory.com, harjit@hminhas.ca';
  RAISE NOTICE '🔔 Trigger active on: rental_leads table';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Test it by inserting a rental lead:';
  RAISE NOTICE 'INSERT INTO rental_leads (full_name, email, phone, neighbourhood, property_type, bedrooms, budget, move_in_date, status, source)';
  RAISE NOTICE 'VALUES (''Test User'', ''test@example.com'', ''4165551234'', ''Toronto'', ''apartment'', ''2'', 2500, ''2024-02-01'', ''new'', ''test'');';
END $$;

