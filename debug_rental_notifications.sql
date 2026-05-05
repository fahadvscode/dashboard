-- 🔍 Rental Lead Notification Diagnostic Script
-- Run this in Supabase SQL Editor to check if everything is set up correctly

-- 1. Check if pg_net extension is enabled
SELECT 
  '1. pg_net Extension Status' AS check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') 
    THEN '✅ ENABLED' 
    ELSE '❌ NOT ENABLED - Run: CREATE EXTENSION pg_net;' 
  END AS status;

-- 2. Check if the trigger function exists
SELECT 
  '2. Trigger Function Status' AS check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'notify_new_rental_lead'
    ) 
    THEN '✅ FUNCTION EXISTS' 
    ELSE '❌ FUNCTION MISSING - Run setup_rental_lead_notifications.sql' 
  END AS status;

-- 3. Check if the trigger is active
SELECT 
  '3. Trigger Status' AS check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE trigger_name = 'notify_new_rental_lead' 
      AND event_object_table = 'rental_leads'
    ) 
    THEN '✅ TRIGGER ACTIVE' 
    ELSE '❌ TRIGGER NOT FOUND - Run setup_rental_lead_notifications.sql' 
  END AS status;

-- 4. Show trigger details if it exists
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'notify_new_rental_lead';

-- 5. Check recent HTTP requests from pg_net (last 10)
SELECT 
  id,
  created,
  url,
  method,
  status_code,
  error_msg,
  response_body::text AS response
FROM net._http_response 
WHERE url LIKE '%/api/leads/notify%'
ORDER BY created DESC 
LIMIT 10;

-- 6. Check if rental_leads table exists and has data
SELECT 
  '6. Rental Leads Table' AS check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'rental_leads'
    ) 
    THEN CONCAT('✅ TABLE EXISTS - ', (SELECT COUNT(*)::text FROM rental_leads), ' leads found') 
    ELSE '❌ TABLE NOT FOUND' 
  END AS status;

-- 7. Show recent rental leads
SELECT 
  id,
  COALESCE(full_name, firstname || ' ' || lastname) AS name,
  email,
  phone,
  created_at
FROM rental_leads
ORDER BY created_at DESC
LIMIT 5;

-- 8. Test notification manually (UNCOMMENT TO TEST)
-- WARNING: This will send a real SMS and email notification!
-- INSERT INTO rental_leads (
--   full_name, 
--   firstname,
--   lastname,
--   email, 
--   phone, 
--   neighbourhood, 
--   property_type, 
--   bedrooms, 
--   budget, 
--   move_in_date, 
--   status, 
--   source,
--   features,
--   credit_score,
--   occupants,
--   has_pets
-- ) VALUES (
--   'Test User', 
--   'Test',
--   'User',
--   'test@example.com', 
--   '4165551234', 
--   'Downtown Toronto', 
--   'Apartment', 
--   '2 Bedroom', 
--   2500, 
--   '2024-03-01', 
--   'new', 
--   'debug_test',
--   ARRAY['In-unit laundry', 'Parking'],
--   '700+',
--   '2 adults',
--   false
-- );

-- Show final summary
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '📊 RENTAL LEAD NOTIFICATION DIAGNOSTIC COMPLETE';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ If all checks pass, uncomment section 8 to test';
  RAISE NOTICE '📱 Expected SMS recipients: 6478981739, 4168296121, 4163994289';
  RAISE NOTICE '📧 Expected email recipients: info@fahadsold.com, info@preconfactory.com';
  RAISE NOTICE '';
  RAISE NOTICE 'If tests fail, check:';
  RAISE NOTICE '1. Vercel environment variables (TWILIO_*, GMAIL_*)';
  RAISE NOTICE '2. API endpoint: https://property-dashboard-three.vercel.app/api/leads/notify';
  RAISE NOTICE '3. Supabase function logs in Dashboard';
  RAISE NOTICE '';
END $$;

