# 📅 Booking Reminder Drip Campaign - Setup Guide

## Overview

Automated, natural reminder system for booking appointments. Sends friendly reminders to customers and admins at the right times.

---

## ✅ What's Deployed

### 1. **Natural Reminder Schedule**

**For Customers:**
- ✅ **3 days before** → Email with helpful prep tips (skipped for last-minute bookings)
- ✅ **1 day before** → Friendly email + SMS reminder
- ✅ **3 hours before** → Quick SMS heads-up

**For Admins:**
- ✅ **1 day before** → Email with customer context
- ✅ **30 minutes before** → SMS with call details

### 2. **Calendar Event Improvements**

✅ Location now shows: **"📞 Phone Call - (647) 898-1739"**
✅ Event title includes brand name
✅ Description clearly states it's a phone call
✅ Conference notes with call details

### 3. **Booking Email Notifications**

✅ Admin emails when booking is made
✅ Customer confirmation email
✅ Customer confirmation SMS

---

## 🚀 Setup Instructions

### Step 1: Run SQL Script in Supabase

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **"New Query"**
3. Copy and paste the entire contents of `setup_booking_reminders.sql`
4. Click **"Run"** (or press Ctrl/Cmd + Enter)

**What it does:**
- Adds reminder tracking columns to all booking tables
- Creates indexes for faster queries
- Prevents duplicate reminders

### Step 2: Enable Vercel Cron Jobs

1. Go to **Vercel Dashboard** → Your Project → **Settings**
2. Click **"Cron Jobs"** in the left sidebar
3. You should see:
   - **Path:** `/api/bookings/send-reminders`
   - **Schedule:** `*/30 * * * *` (every 30 minutes)
   - **Status:** Active

If not visible, it will appear after the deployment completes.

### Step 3: (Optional) Add Cron Secret

For extra security, add a cron secret:

1. Go to **Vercel** → **Settings** → **Environment Variables**
2. Add new variable:
   - **Key:** `CRON_SECRET`
   - **Value:** (generate a random string like `your_random_secret_key_123`)
   - **Environments:** All (Production, Preview, Development)

---

## 🔔 How It Works

```
Every 30 minutes:
  ↓
Cron job checks all upcoming bookings
  ↓
Calculates time until appointment
  ↓
Sends appropriate reminders
  ↓
Marks reminder as sent (prevents duplicates)
  ↓
Logs results
```

---

## 📱 Message Examples

### Customer - 3 Days Before Email

**Subject:** Looking forward to our call on [Day]

> Hi [Name],
>
> Just a quick note - we're looking forward to chatting with you about [Project Name] on [Date] at [Time].
>
> A few things that might be helpful to think about before we talk:
> • What features are most important to you?
> • Your ideal move-in timeline
> • Any questions about the area or building
>
> No pressure though - we can cover everything on the call!
>
> Talk soon,
> [Team Name]
>
> P.S. If the time doesn't work anymore, just let us know. We're flexible!

### Customer - 1 Day Before

**Email:** Quick reminder - we'll call you tomorrow
**SMS:** Hey [Name]! Quick reminder - we'll call you tomorrow at [Time] to chat about [Project]. Looking forward to it! 😊

### Customer - 3 Hours Before

**SMS:** Hi [Name], we'll give you a call in about 3 hours ([Time]). Talk soon! 📞

### Admin - 30 Minutes Before

**SMS:** 📞 [Time] - Call [Name] at [Phone] about [Project]

---

## 🎯 Features

✅ **Smart Timing** - Only sends 3-day reminder for bookings made well in advance
✅ **No Duplicates** - Each reminder sent only once
✅ **Fail-Safe** - If a reminder fails, others still send
✅ **Natural Tone** - Conversational, not pushy
✅ **Timezone Aware** - Based on Toronto time (America/Toronto)
✅ **Auto-Skip Cancelled** - Won't send reminders for cancelled/completed bookings

---

## 🔍 Testing

### Test the Reminder System

1. Create a test booking in Supabase (set appointment for tomorrow)
2. Wait up to 30 minutes for cron to run
3. Check Vercel logs: **Deployments** → **Functions** → `/api/bookings/send-reminders`
4. Verify reminders were sent

### Manual Test (Without Waiting)

You can manually trigger the reminder check:

```bash
curl https://property-dashboard-three.vercel.app/api/bookings/send-reminders
```

---

## 📊 Monitoring

### Check Reminder Status

Go to **Vercel Dashboard** → **Deployments** → **Functions** → `/api/bookings/send-reminders`

You'll see logs like:
```
✅ Reminder check complete: {
  checked: 15,
  sent: 3,
  errors: 0,
  details: [...]
}
```

### Check Booking Reminder Status in Database

```sql
SELECT 
  id, 
  firstname, 
  lastname, 
  appointment_date, 
  appointment_time,
  reminder_3d_sent,
  reminder_1d_sent,
  reminder_3h_sent
FROM fj_bookings
WHERE appointment_date >= CURRENT_DATE
ORDER BY appointment_date, appointment_time;
```

---

## 🛠️ Troubleshooting

### Reminders Not Sending?

1. **Check environment variables** in Vercel:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
   - `GMAIL_USER`
   - `GMAIL_APP_PASSWORD`

2. **Check cron job is running:**
   - Vercel Dashboard → Cron Jobs → Should show recent executions

3. **Check database columns exist:**
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'fj_bookings' 
   AND column_name LIKE 'reminder%';
   ```

4. **Check Vercel function logs** for errors

### Reminders Sending Twice?

This shouldn't happen due to tracking columns, but if it does:
- Check that the SQL script ran successfully
- Verify `reminder_*_sent` columns exist and are being updated

---

## 📧 Email Recipients

**Admin Notifications:**
- info@fahadsold.com
- info@preconfactory.com

**Admin SMS:**
- 6478981739
- 4168296121
- 4163994289

**Customer:**
- Their email from booking form
- Their phone from booking form

---

## 🎨 Customization

### Change Reminder Timing

Edit `/app/api/bookings/send-reminders/route.ts`:

```typescript
// 3-DAY REMINDER
if (!booking.reminder_3d_sent && hoursUntil <= 72 && hoursUntil > 24) {
  // Change 72 to different hours
}
```

### Change Message Content

Edit the message functions in the same file:
- `send3DayCustomerReminder()`
- `send1DayCustomerReminder()`
- `send3HourCustomerReminder()`
- `send1DayAdminReminder()`
- `send30MinAdminReminder()`

---

## ✅ Complete Setup Checklist

- [ ] Run `setup_booking_reminders.sql` in Supabase
- [ ] Verify cron job is active in Vercel
- [ ] (Optional) Add `CRON_SECRET` environment variable
- [ ] Test with a sample booking
- [ ] Monitor first few reminders in logs
- [ ] Update Google Calendar names (for "unknown sender" fix)

---

## 🎉 You're All Set!

The reminder system will now automatically:
- Check for upcoming bookings every 30 minutes
- Send natural, friendly reminders at the right times
- Keep your team prepared for calls
- Keep customers informed without being pushy

**No manual work required - it just runs!** 🚀

---

*Questions? Check Vercel logs or test with a dummy booking.*

