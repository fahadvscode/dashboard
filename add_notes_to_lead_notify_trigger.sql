-- Add customer notes to lead notification payload (fj_leads, precon_factory_leads, gta_lowrise_leads)
-- Run in Supabase SQL Editor if new leads are not showing notes in Sheets/SMS/email.

DROP FUNCTION IF EXISTS notify_new_lead() CASCADE;

CREATE OR REPLACE FUNCTION notify_new_lead()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  request_id BIGINT;
BEGIN
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

  SELECT net.http_post(
    url := 'https://property-dashboard-three.vercel.app/api/leads/notify',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  ) INTO request_id;

  RAISE NOTICE 'Lead notification triggered for % (ID: %, Request ID: %)',
    NEW.firstname, NEW.id, request_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
