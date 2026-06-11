-- Setup SMS/Email notifications for landing page lead tables
-- Run this in Supabase SQL Editor
-- Same notification numbers as other leads: 6478981739, 4168296121, 4163994289

CREATE EXTENSION IF NOT EXISTS pg_net;

-- ========== novella_leads trigger ==========
DROP TRIGGER IF EXISTS notify_new_novella_lead ON novella_leads;
DROP FUNCTION IF EXISTS notify_new_novella_lead();

CREATE OR REPLACE FUNCTION notify_new_novella_lead()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  request_id BIGINT;
  dashboard_url TEXT := 'https://property-dashboard-three.vercel.app';
BEGIN
  payload := jsonb_build_object(
    'id', NEW.id,
    'first_name', NEW.first_name,
    'last_name', NEW.last_name,
    'email', NEW.email,
    'phone', NEW.phone,
    'buyer_type', NEW.buyer_type,
    'home_interest', NEW.home_interest,
    'consent', NEW.consent,
    'table_name', 'novella_leads',
    'created_at', NEW.created_at
  );

  SELECT net.http_post(
    url := dashboard_url || '/api/leads/notify',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  ) INTO request_id;

  RAISE NOTICE '📱 Novella lead notification triggered for % % (ID: %)', NEW.first_name, NEW.last_name, NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER notify_new_novella_lead
  AFTER INSERT ON novella_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_novella_lead();

-- ========== cornerstone_leads trigger ==========
DROP TRIGGER IF EXISTS notify_new_cornerstone_lead ON cornerstone_leads;
DROP FUNCTION IF EXISTS notify_new_cornerstone_lead();

CREATE OR REPLACE FUNCTION notify_new_cornerstone_lead()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  request_id BIGINT;
  dashboard_url TEXT := 'https://property-dashboard-three.vercel.app';
BEGIN
  payload := jsonb_build_object(
    'id', NEW.id,
    'first_name', NEW.first_name,
    'last_name', NEW.last_name,
    'email', NEW.email,
    'phone', NEW.phone,
    'is_realtor', NEW.is_realtor,
    'is_broker', NEW.is_broker,
    'interest', NEW.interest,
    'buyer_type', NEW.buyer_type,
    'source', NEW.source,
    'table_name', 'cornerstone_leads',
    'created_at', NEW.created_at
  );

  SELECT net.http_post(
    url := dashboard_url || '/api/leads/notify',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  ) INTO request_id;

  RAISE NOTICE '📱 Cornerstone lead notification triggered for % % (ID: %)', NEW.first_name, NEW.last_name, NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER notify_new_cornerstone_lead
  AFTER INSERT ON cornerstone_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_cornerstone_lead();

-- ========== lakeview_village_leads trigger ==========
DROP TRIGGER IF EXISTS notify_new_lakeview_village_lead ON lakeview_village_leads;
DROP FUNCTION IF EXISTS notify_new_lakeview_village_lead();

CREATE OR REPLACE FUNCTION notify_new_lakeview_village_lead()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  request_id BIGINT;
  dashboard_url TEXT := 'https://property-dashboard-three.vercel.app';
BEGIN
  payload := jsonb_build_object(
    'id', NEW.id,
    'first_name', NEW.first_name,
    'last_name', NEW.last_name,
    'email', NEW.email,
    'phone', NEW.phone,
    'buyer_type', NEW.buyer_type,
    'project', NEW.project,
    'consent', NEW.consent,
    'status', NEW.status,
    'table_name', 'lakeview_village_leads',
    'created_at', NEW.created_at
  );

  SELECT net.http_post(
    url := dashboard_url || '/api/leads/notify',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  ) INTO request_id;

  RAISE NOTICE '📱 Lakeview Village lead notification triggered for % % (ID: %)', NEW.first_name, NEW.last_name, NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER notify_new_lakeview_village_lead
  AFTER INSERT ON lakeview_village_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_lakeview_village_lead();

-- ========== rollingwood_leads trigger ==========
DROP TRIGGER IF EXISTS notify_new_rollingwood_lead ON rollingwood_leads;
DROP FUNCTION IF EXISTS notify_new_rollingwood_lead();

CREATE OR REPLACE FUNCTION notify_new_rollingwood_lead()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  request_id BIGINT;
  dashboard_url TEXT := 'https://property-dashboard-three.vercel.app';
BEGIN
  payload := jsonb_build_object(
    'id', NEW.id,
    'first_name', NEW.first_name,
    'last_name', NEW.last_name,
    'email', NEW.email,
    'phone', NEW.phone,
    'buyer_type', NEW.buyer_type,
    'home_interest', NEW.home_interest,
    'interest', NEW.interest,
    'is_realtor', NEW.is_realtor,
    'consent', NEW.consent,
    'table_name', 'rollingwood_leads',
    'created_at', NEW.created_at
  );

  SELECT net.http_post(
    url := dashboard_url || '/api/leads/notify',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  ) INTO request_id;

  RAISE NOTICE '📱 Rollingwood lead notification triggered for % % (ID: %)', NEW.first_name, NEW.last_name, NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER notify_new_rollingwood_lead
  AFTER INSERT ON rollingwood_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_rollingwood_lead();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Landing page lead notification triggers created!';
  RAISE NOTICE '📱 New landing page leads will send SMS to: 6478981739, 4168296121, 4163994289';
  RAISE NOTICE '📧 Email notifications to: fahad@fahadsold.com, info@preconfactory.com';
  RAISE NOTICE '🔔 Triggers active on: novella_leads, cornerstone_leads, lakeview_village_leads, rollingwood_leads';
END $$;
