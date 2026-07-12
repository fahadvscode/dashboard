-- Fix lead notification trigger (safe redo)
-- Problem: previous script used NEW.notes, but email lead tables store customer text in `message`.
-- This version works whether the column is `message` or `notes`, and restores all email-lead triggers.
--
-- Run the entire script in Supabase SQL Editor.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION notify_new_lead()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  request_id BIGINT;
  row_data JSONB;
  customer_text TEXT;
BEGIN
  row_data := to_jsonb(NEW);
  customer_text := COALESCE(
    NULLIF(TRIM(row_data->>'notes'), ''),
    NULLIF(TRIM(row_data->>'message'), '')
  );

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
    'message', customer_text,
    'notes', customer_text,
    'table_name', TG_TABLE_NAME,
    'created_at', NEW.created_at
  );

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Lead notification for % %', NEW.firstname, NEW.lastname;
  RAISE NOTICE 'Table: %', TG_TABLE_NAME;
  RAISE NOTICE 'Customer text: %', COALESCE(customer_text, '(empty)');
  RAISE NOTICE 'Payload: %', payload::text;
  RAISE NOTICE '==========================================';

  SELECT net.http_post(
    url := 'https://property-dashboard-three.vercel.app/api/leads/notify',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  ) INTO request_id;

  RAISE NOTICE 'Lead notification sent (request_id: %)', request_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate triggers (do not DROP FUNCTION ... CASCADE — that removes triggers silently)
DROP TRIGGER IF EXISTS notify_new_fj_lead ON fj_leads;
DROP TRIGGER IF EXISTS notify_new_precon_lead ON precon_factory_leads;
DROP TRIGGER IF EXISTS notify_new_gta_lowrise_lead ON gta_lowrise_leads;
DROP TRIGGER IF EXISTS notify_new_precon_website_lead ON precon_factory_website_leads;

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

CREATE TRIGGER notify_new_precon_website_lead
  AFTER INSERT ON precon_factory_website_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_lead();

-- Verify
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name IN (
  'notify_new_fj_lead',
  'notify_new_precon_lead',
  'notify_new_gta_lowrise_lead',
  'notify_new_precon_website_lead'
)
ORDER BY event_object_table;

DO $$
BEGIN
  RAISE NOTICE 'Done. Triggers restored on fj_leads, precon_factory_leads, gta_lowrise_leads, precon_factory_website_leads.';
  RAISE NOTICE 'Customer text is sent as both message and notes in the API payload.';
END $$;
