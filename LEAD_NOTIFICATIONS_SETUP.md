# 📱 Lead Notification System - Setup Guide

## Overview
Automatically send SMS notifications to `6478981739` whenever a new lead is submitted to FJ Leads or Precon Factory Leads.

## Features
- ✅ **Automatic notifications** for all new leads
- ✅ **Database triggers** - works for leads from any source (forms, API, manual entry)
- ✅ **Detailed SMS** with lead name, email, phone, project
- ✅ **Source identification** (FJ or Precon Factory)
- ✅ **Lead type** (Agent or Buyer)
- ✅ **Direct dashboard link** to view the lead

## SMS Format

```
🔔 New FJ Lead!

👤 John Smith
📧 john@example.com
📱 416-555-1234
🏢 Project: The Residences at X
🎯 Type: Buyer
⏰ Just now

View Dashboard: https://property-dashboard-three.vercel.app/fj-leads
```

## Setup Instructions

### Step 1: Deploy the API Endpoint

The notification API endpoint has been created at:
```
/api/leads/notify
```

Commit and deploy to Vercel:
```bash
git add .
git commit -m "🔔 Add automatic lead notification system"
npx vercel --prod
```

### Step 2: Run the SQL Setup Script

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **"New Query"**
3. Copy and paste the entire contents of `setup_lead_notifications.sql`
4. Click **"Run"** (or press Ctrl/Cmd + Enter)

The script will:
- ✅ Enable the `pg_net` extension (for HTTP requests)
- ✅ Create the notification function
- ✅ Create triggers on both `fj_leads` and `precon_factory_leads` tables
- ✅ Verify setup

### Step 3: Verify Setup

After running the SQL, you should see:
```
✅ Lead notification triggers successfully created!
📱 New leads will automatically send SMS to 6478981739
🔔 Triggers active on: fj_leads, precon_factory_leads
```

### Step 4: Test It!

Test by inserting a new lead (use Supabase dashboard or your forms):
```sql
INSERT INTO fj_leads (firstname, lastname, email, phone, project_name, isagent, status, source)
VALUES ('Test', 'User', 'test@example.com', '416-555-9999', 'Test Project', false, 'new', 'test');
```

You should receive an SMS at `6478981739` within seconds!

## How It Works

```
New Lead Inserted
       ↓
Database Trigger Fires
       ↓
Calls /api/leads/notify
       ↓
Sends SMS via Twilio
       ↓
Notification Delivered ✅
```

## Technical Details

### API Endpoint
**File:** `app/api/leads/notify/route.ts`
- Receives lead data via POST request
- Formats notification message
- Sends SMS via Twilio
- Returns success/failure status

### Database Triggers
**File:** `setup_lead_notifications.sql`
- Uses PostgreSQL triggers (`AFTER INSERT`)
- Calls API via `pg_net` extension
- Fires on both `fj_leads` and `precon_factory_leads`
- Async - doesn't block lead insertion

### Notification Number
**To:** `6478981739` (hardcoded in API endpoint)
**From:** Your Twilio number (from environment variables)

## Troubleshooting

### No SMS Received?

1. **Check Twilio Credentials:**
   - Verify `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` in Vercel

2. **Check pg_net Extension:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```
   If empty, run: `CREATE EXTENSION pg_net;`

3. **Check Trigger Status:**
   ```sql
   SELECT * FROM information_schema.triggers 
   WHERE trigger_name IN ('notify_new_fj_lead', 'notify_new_precon_lead');
   ```

4. **Check API Logs:**
   - Go to Vercel Dashboard → Functions → `/api/leads/notify`
   - Check for errors in logs

5. **Check pg_net Logs:**
   ```sql
   SELECT * FROM net._http_response ORDER BY created DESC LIMIT 10;
   ```

### SMS Not Formatted Correctly?

Edit the message format in `app/api/leads/notify/route.ts`:
```typescript
const message = `🔔 New ${source} Lead!
// ... your custom format here
`
```

## Customization

### Change Notification Number

Edit `app/api/leads/notify/route.ts`:
```typescript
const notificationPhone = '6478981739' // Change this
```

### Add Multiple Recipients

Modify the API to send to multiple numbers:
```typescript
const recipients = ['6478981739', '416-555-0000']
await Promise.all(
  recipients.map(phone => 
    client.messages.create({
      body: message,
      from: twilioPhone,
      to: phone
    })
  )
)
```

### Conditional Notifications

Add filters in the trigger function (in SQL):
```sql
-- Only notify for buyers
IF NEW.isagent = false THEN
  -- send notification
END IF;

-- Only notify for specific projects
IF NEW.project_name ILIKE '%specific project%' THEN
  -- send notification
END IF;
```

## Testing Commands

### Test API Endpoint Directly
```bash
curl -X POST https://property-dashboard-three.vercel.app/api/leads/notify \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-123",
    "firstname": "Test",
    "lastname": "User",
    "email": "test@example.com",
    "phone": "416-555-9999",
    "project_name": "Test Project",
    "source": "test",
    "isagent": false,
    "table_name": "fj_leads"
  }'
```

### Test Trigger
```sql
-- Insert test lead
INSERT INTO fj_leads (firstname, lastname, email, phone, project_name, isagent, status, source)
VALUES ('Test', 'User', 'test@example.com', '416-555-9999', 'Test Project', false, 'new', 'test');

-- Check if HTTP request was made
SELECT * FROM net._http_response ORDER BY created DESC LIMIT 1;
```

## Monitoring

### Check Recent Notifications
```sql
SELECT * FROM net._http_response 
WHERE url LIKE '%/api/leads/notify%'
ORDER BY created DESC 
LIMIT 20;
```

### Disable Notifications Temporarily
```sql
-- Disable triggers
ALTER TABLE fj_leads DISABLE TRIGGER notify_new_fj_lead;
ALTER TABLE precon_factory_leads DISABLE TRIGGER notify_new_precon_lead;

-- Re-enable triggers
ALTER TABLE fj_leads ENABLE TRIGGER notify_new_fj_lead;
ALTER TABLE precon_factory_leads ENABLE TRIGGER notify_new_precon_lead;
```

## Security Notes

- ✅ API endpoint is public but only accepts POST requests
- ✅ Twilio credentials stored securely in Vercel environment variables
- ✅ Trigger runs with SECURITY DEFINER (safe)
- ✅ Notification number hardcoded (not exposed)
- ✅ pg_net requests are async and non-blocking

## Cost Considerations

- **Twilio SMS:** ~$0.0075 per SMS (varies by country)
- **Supabase pg_net:** Free (included in all plans)
- **API calls:** Free (within Vercel limits)

**Estimated cost:** $0.0075 per new lead notification

## Support

If issues persist:
1. Check Vercel Function logs
2. Check Supabase logs
3. Verify Twilio account status
4. Test API endpoint manually

---

**Created:** November 2025
**Version:** 1.0
**Status:** ✅ Ready for Production

