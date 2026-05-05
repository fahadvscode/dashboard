# 🔍 Debug Booking Notifications - Why SMS Isn't Coming

## Quick Checklist

### 1. ✅ Check if Triggers Exist

Run this in **Supabase SQL Editor**:

```sql
-- Check all booking triggers
SELECT 
  trigger_name,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table IN ('fj_bookings', 'precon_factory_bookings', 'gta_lowrise_bookings')
ORDER BY event_object_table, trigger_name;
```

**Expected Result:**
```
notify_new_fj_booking               | fj_bookings              | ...
notify_new_precon_booking           | precon_factory_bookings  | ...
notify_new_gta_lowrise_booking      | gta_lowrise_bookings     | ...
```

**If empty or missing GTA Lowrise**, run these SQL files:
1. `setup_booking_notifications.sql` (for FJ & Precon)
2. `setup_gta_lowrise_booking_notifications.sql` (for GTA Lowrise)

---

### 2. ✅ Check Twilio Environment Variables

Go to **Vercel Dashboard** → Project Settings → Environment Variables

Required variables:
- `TWILIO_ACCOUNT_SID` = Your Twilio Account SID
- `TWILIO_AUTH_TOKEN` = Your Twilio Auth Token  
- `TWILIO_PHONE_NUMBER` = Your Twilio phone number (format: +16471234567)

**If missing or incorrect:**
1. Get credentials from https://console.twilio.com/
2. Add/update in Vercel
3. Redeploy: `npx vercel --prod --yes`

---

### 3. ✅ Test Manually

Insert a test booking directly in Supabase:

```sql
-- Test FJ Booking
INSERT INTO fj_bookings (
  firstname, 
  lastname, 
  email, 
  phone,
  appointment_date,
  appointment_time,
  appointment_type,
  message,
  status,
  project_name,
  project_id,
  project_url
)
VALUES (
  'Test', 
  'User',
  'test@example.com',
  '4165551234',
  '2025-01-20',
  '2:00 PM',
  'Site Visit',
  'This is a test booking',
  'scheduled',
  'Luxury Condos Downtown',
  '12345',
  'https://example.com/project'
);
```

**Watch for:**
- SMS should arrive within 5 seconds to: 6478981739, 4168296121, 4163994289
- Check Supabase logs: Dashboard → SQL Editor → Query History

---

### 4. ✅ Check Supabase Logs

Go to **Supabase Dashboard** → Logs → Database

Look for:
```
Booking notification triggered for fj_bookings (ID: ..., Request ID: ...)
```

**If you see errors:**
- "net.http_post failed" → Check if `pg_net` extension is enabled
- "timeout" → API endpoint might be slow or down
- "404" → Wrong URL in trigger

---

### 5. ✅ Check Vercel Logs

Run in terminal:
```bash
npx vercel logs https://property-dashboard-three.vercel.app --follow
```

Or go to **Vercel Dashboard** → Deployments → Latest → Logs

Look for:
- POST requests to `/api/bookings/notify`
- "Booking notifications sent" success message
- Twilio errors (if any)

---

### 6. ✅ Test API Endpoint Directly

Use this curl command (replace with your data):

```bash
curl -X POST https://property-dashboard-three.vercel.app/api/bookings/notify \
  -H "Content-Type: application/json" \
  -d '{
    "firstname": "Test",
    "lastname": "User",
    "email": "test@example.com",
    "phone": "4165551234",
    "appointment_date": "2025-01-20",
    "appointment_time": "2:00 PM",
    "appointment_type": "Site Visit",
    "message": "Test message",
    "status": "scheduled",
    "project_name": "Test Project",
    "project_id": "12345",
    "project_url": "https://example.com",
    "table_name": "fj_bookings"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "messageSids": ["SM..."],
  "recipients": ["6478981739", "4168296121", "4163994289"],
  "booking": "Test User",
  "source": "FJ"
}
```

---

## Common Issues & Fixes

### Issue 1: Trigger Not Created
**Symptom:** SQL query shows no triggers

**Fix:**
```sql
-- Run setup_booking_notifications.sql for FJ & Precon
-- Run setup_gta_lowrise_booking_notifications.sql for GTA Lowrise
```

---

### Issue 2: Wrong Vercel URL in Trigger
**Symptom:** Logs show "404 Not Found"

**Fix:** Update URL in trigger function:
```sql
-- Check current URL
SELECT routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'notify_new_booking';

-- Should be: https://property-dashboard-three.vercel.app/api/bookings/notify
```

---

### Issue 3: Missing Twilio Credentials
**Symptom:** API returns "Failed to send notification"

**Fix:**
1. Add environment variables in Vercel
2. Redeploy: `npx vercel --prod --yes`

---

### Issue 4: pg_net Extension Not Enabled
**Symptom:** Trigger fails silently

**Fix:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

---

### Issue 5: Project Fields Not Populated
**Symptom:** SMS missing Project, Project ID, Project URL

**Issue:** These fields exist in the table but might be NULL

**Fix:** Make sure booking form passes these values:
- `project_name`
- `project_id`
- `project_url`
- `project_brand`

---

## Test Each Brand

### Test FJ Bookings:
```sql
INSERT INTO fj_bookings (firstname, lastname, email, phone, appointment_date, appointment_time, appointment_type, project_name, status)
VALUES ('FJ', 'Test', 'test@fj.com', '4165551111', '2025-01-20', '10:00 AM', 'Site Visit', 'FJ Project', 'scheduled');
```

### Test Precon Factory Bookings:
```sql
INSERT INTO precon_factory_bookings (firstname, lastname, email, phone, appointment_date, appointment_time, appointment_type, project_name, status)
VALUES ('Precon', 'Test', 'test@precon.com', '4165552222', '2025-01-20', '11:00 AM', 'Virtual Tour', 'Precon Project', 'scheduled');
```

### Test GTA Lowrise Bookings:
```sql
INSERT INTO gta_lowrise_bookings (firstname, lastname, email, phone, appointment_date, appointment_time, appointment_type, project_name, status)
VALUES ('GTA', 'Test', 'test@gta.com', '4165553333', '2025-01-20', '2:00 PM', 'In-Person', 'GTA Project', 'scheduled');
```

---

## Quick Fix Script

Run this to ensure all triggers are set up:

```sql
-- Enable pg_net
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop and recreate FJ trigger
DROP TRIGGER IF EXISTS notify_new_fj_booking ON fj_bookings;
CREATE TRIGGER notify_new_fj_booking
  AFTER INSERT ON fj_bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_booking();

-- Drop and recreate Precon trigger
DROP TRIGGER IF EXISTS notify_new_precon_booking ON precon_factory_bookings;
CREATE TRIGGER notify_new_precon_booking
  AFTER INSERT ON precon_factory_bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_booking();

-- Drop and recreate GTA Lowrise trigger
DROP TRIGGER IF EXISTS notify_new_gta_lowrise_booking ON gta_lowrise_bookings;
CREATE TRIGGER notify_new_gta_lowrise_booking
  AFTER INSERT ON gta_lowrise_bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_booking();

-- Verify
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('fj_bookings', 'precon_factory_bookings', 'gta_lowrise_bookings');
```

---

## Still Not Working?

1. Check Supabase Database logs
2. Check Vercel function logs
3. Check Twilio logs: https://console.twilio.com/us1/monitor/logs/sms
4. Verify phone numbers are correct format: +16478981739, +14168296121, +14163994289

---

## Contact for Help

If still not working, provide:
1. Screenshot of trigger query results
2. Vercel logs when inserting booking
3. Supabase database logs
4. Twilio account status (is it activated?)

