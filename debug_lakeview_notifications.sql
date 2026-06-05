-- Run in Supabase SQL Editor to diagnose Lakeview notifications (read-only checks)

-- 1. Trigger exists?
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'lakeview_village_leads';

-- 2. pg_net enabled?
SELECT extname FROM pg_extension WHERE extname = 'pg_net';

-- 3. Table columns (compare with fix_lakeview_village_lead_notifications.sql)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'lakeview_village_leads'
ORDER BY ordinal_position;

-- 4. Recent pg_net HTTP calls (if net schema available)
SELECT id, status_code, created
FROM net._http_response
ORDER BY created DESC
LIMIT 10;
