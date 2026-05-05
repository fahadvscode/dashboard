# 🏠 Rental Lead Notification System - Setup Guide

## ✅ Deployment Complete!

The notification system has been deployed to production and is ready to be activated.

---

## 📱 What Gets Sent When a New Rental Lead Comes In

### **SMS Notifications** sent to:
- `6478981739`
- `4168296121`
- `4163994289`

### **Email Notifications** sent to:
- `info@fahadsold.com`
- `info@preconfactory.com`

---

## 📋 SMS Format

```
🏠 New Rental Lead!

👤 John Smith
📧 john@example.com
📱 416-555-1234
📍 Toronto Downtown
🏘️ apartment
🛏️ 2 bedrooms
💰 Budget: $2,500
📅 Move-in: 2024-03-01
✨ Features: furnished, parking
🐾 Has pets: small dog
👥 Occupants: 2
💳 Credit: good
📝 Notes: Looking for pet-friendly building
⏰ Just now

👉 View in Dashboard: https://property-dashboard-three.vercel.app/rental-leads?leadId=xxx
```

---

## 📧 Email Format

Beautiful HTML email with:
- Professional Qikfill branding
- All rental lead details in an easy-to-read table
- Direct "View Lead in Dashboard" button
- Mobile-responsive design

---

## 🚀 Final Step: Activate Database Trigger

**You need to run ONE SQL script in your Supabase dashboard to activate the notifications:**

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **+ New Query**

### Step 2: Run the Setup Script

Copy and paste the entire contents of `setup_rental_lead_notifications.sql` and click **Run** (or press Ctrl/Cmd + Enter)

The script is located at:
```
property-dashboard/setup_rental_lead_notifications.sql
```

### Step 3: Verify Success

You should see these messages:
```
✅ Rental lead notification trigger successfully created!
📱 New rental leads will automatically send SMS to: 6478981739, 4168296121, 4163994289
📧 Email notifications will be sent to: info@fahadsold.com, info@preconfactory.com
🔔 Trigger active on: rental_leads table
```

---

## 🧪 Test the Notifications

After running the SQL script, test it by inserting a rental lead:

```sql
INSERT INTO rental_leads (
  full_name, 
  email, 
  phone, 
  neighbourhood, 
  property_type, 
  bedrooms, 
  budget, 
  move_in_date, 
  status, 
  source
)
VALUES (
  'Test User', 
  'test@example.com', 
  '4165551234', 
  'Toronto', 
  'apartment', 
  '2', 
  2500, 
  '2024-02-01', 
  'new', 
  'test'
);
```

**Within seconds, you should receive:**
- ✅ SMS on all 3 phone numbers
- ✅ Email to both addresses

---

## 🔧 How It Works

```
New Rental Lead Submitted (from form/API/manual entry)
                ↓
Database Trigger Fires Automatically
                ↓
Calls /api/leads/notify with lead data
                ↓
API Sends SMS via Twilio + Email via Gmail
                ↓
You Get Notified Instantly! ✅
```

**Technical Details:**
- Uses PostgreSQL `AFTER INSERT` trigger
- Calls your deployed API via `pg_net` extension
- Async - doesn't slow down lead insertion
- Works for ALL rental leads, regardless of source

---

## ⚙️ Environment Variables (Already Set)

These are already configured in your Vercel deployment:
- ✅ `TWILIO_ACCOUNT_SID`
- ✅ `TWILIO_AUTH_TOKEN`
- ✅ `TWILIO_PHONE_NUMBER`
- ✅ `GMAIL_USER`
- ✅ `GMAIL_APP_PASSWORD`

---

## 🛠 Troubleshooting

### No notifications received?

1. **Check if trigger was created:**
```sql
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'notify_new_rental_lead';
```

2. **Check pg_net extension:**
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_net';
```
If empty, run: `CREATE EXTENSION pg_net;`

3. **Check pg_net logs:**
```sql
SELECT * FROM net._http_response 
ORDER BY created DESC 
LIMIT 10;
```

4. **Check Vercel Function Logs:**
- Go to Vercel Dashboard
- Select your project
- Click "Functions"
- Find `/api/leads/notify`
- Check for errors

---

## 🎯 Summary

**What's Done:**
- ✅ API endpoint updated to handle rental leads
- ✅ SMS notification format customized for rental inquiries  
- ✅ Email template with all rental-specific fields
- ✅ Deployed to production
- ✅ SQL trigger script created

**What You Need to Do:**
- 🔲 Run `setup_rental_lead_notifications.sql` in Supabase SQL Editor
- 🔲 Test with a sample insert (optional but recommended)

**That's it!** Once you run the SQL script, notifications will automatically work for all new rental leads.

---

## 📞 Notification Recipients

**SMS:**
1. 6478981739
2. 4168296121
3. 4163994289

**Email:**
1. info@fahadsold.com
2. info@preconfactory.com

**To change recipients:** Edit `app/api/leads/notify/route.ts` lines 8-9, then redeploy.

---

Need help? Check the Vercel logs or Supabase SQL editor for any errors.

