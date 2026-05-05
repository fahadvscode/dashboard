-- 🧪 Test Drip Campaign
-- Creates test bookings to trigger each reminder type
-- Send to: getmecleaners@gmail.com and 4168296121

-- First, ensure reminder columns exist (run setup_booking_reminders.sql first if not)

-- Calculate test appointment times
DO $$
DECLARE
  test_date_3d DATE;
  test_date_1d DATE;
  test_date_3h DATE;
  test_time TEXT := '14:00';
BEGIN
  -- 3 days from now (will trigger 3-day reminder)
  test_date_3d := CURRENT_DATE + INTERVAL '3 days';
  
  -- 1 day from now (will trigger 1-day reminder)
  test_date_1d := CURRENT_DATE + INTERVAL '1 day';
  
  -- 3 hours from now (will trigger 3-hour reminder)
  test_date_3h := CURRENT_DATE;
  
  -- Insert test booking for 3-DAY REMINDER
  INSERT INTO fj_bookings (
    firstname,
    lastname,
    email,
    phone,
    appointment_date,
    appointment_time,
    appointment_type,
    project_name,
    project_url,
    message,
    status,
    reminder_3d_sent,
    reminder_1d_sent,
    reminder_3h_sent,
    reminder_admin_1d_sent,
    reminder_admin_30m_sent
  ) VALUES (
    'Test',
    'User 3D',
    'getmecleaners@gmail.com',
    '4168296121',
    test_date_3d,
    test_time,
    'Phone Call',
    'The Residences Test Project',
    'https://www.example.com/project',
    'This is a test booking to verify 3-day reminder',
    'confirmed',
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    FALSE
  );
  
  -- Insert test booking for 1-DAY REMINDER
  INSERT INTO fj_bookings (
    firstname,
    lastname,
    email,
    phone,
    appointment_date,
    appointment_time,
    appointment_type,
    project_name,
    project_url,
    message,
    status,
    reminder_3d_sent,
    reminder_1d_sent,
    reminder_3h_sent,
    reminder_admin_1d_sent,
    reminder_admin_30m_sent
  ) VALUES (
    'Test',
    'User 1D',
    'getmecleaners@gmail.com',
    '4168296121',
    test_date_1d,
    test_time,
    'Phone Call',
    'The Residences Test Project',
    'https://www.example.com/project',
    'This is a test booking to verify 1-day reminder',
    'confirmed',
    TRUE,  -- Already sent (skip this one)
    FALSE,
    FALSE,
    FALSE,
    FALSE
  );
  
  -- Insert test booking for 3-HOUR REMINDER
  -- Set time to 3 hours from now
  INSERT INTO fj_bookings (
    firstname,
    lastname,
    email,
    phone,
    appointment_date,
    appointment_time,
    appointment_type,
    project_name,
    project_url,
    message,
    status,
    reminder_3d_sent,
    reminder_1d_sent,
    reminder_3h_sent,
    reminder_admin_1d_sent,
    reminder_admin_30m_sent
  ) VALUES (
    'Test',
    'User 3H',
    'getmecleaners@gmail.com',
    '4168296121',
    test_date_3h,
    TO_CHAR(NOW() + INTERVAL '3 hours', 'HH24:MI'),
    'Phone Call',
    'The Residences Test Project',
    'https://www.example.com/project',
    'This is a test booking to verify 3-hour reminder',
    'confirmed',
    TRUE,  -- Skip 3-day
    TRUE,  -- Skip 1-day
    FALSE, -- Will trigger 3-hour
    TRUE,  -- Skip admin 1-day
    FALSE
  );

  RAISE NOTICE '✅ Test bookings created!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Test Schedule:';
  RAISE NOTICE '  • 3-Day Reminder: Appointment on %', test_date_3d;
  RAISE NOTICE '  • 1-Day Reminder: Appointment on %', test_date_1d;
  RAISE NOTICE '  • 3-Hour Reminder: Appointment today at %', TO_CHAR(NOW() + INTERVAL '3 hours', 'HH:MI AM');
  RAISE NOTICE '';
  RAISE NOTICE '📧 Test recipient: getmecleaners@gmail.com';
  RAISE NOTICE '📱 Test phone: 4168296121';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next step: Manually trigger the reminder cron:';
  RAISE NOTICE '   curl https://property-dashboard-three.vercel.app/api/bookings/send-reminders';
  RAISE NOTICE '';
  RAISE NOTICE '⏰ Or wait up to 30 minutes for automatic cron to run';
END $$;

-- View the test bookings
SELECT 
  id,
  firstname,
  lastname,
  email,
  phone,
  appointment_date,
  appointment_time,
  project_name,
  status,
  reminder_3d_sent,
  reminder_1d_sent,
  reminder_3h_sent,
  created_at
FROM fj_bookings
WHERE email = 'getmecleaners@gmail.com'
ORDER BY created_at DESC;

