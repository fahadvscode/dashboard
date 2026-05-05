# Booking Reminder Troubleshooting

## Important: Bookings vs Leads

- **Bookings** = People who scheduled a meeting (fj_bookings, precon_factory_bookings)
- **Leads** = People who filled a contact form (fj_leads, precon_factory_leads)

**Reminders only exist for BOOKINGS**, not leads. There is no automated reminder system for leads.

---

## Why Reminders Might Not Be Sending

### 1. Vercel Cron Not Running (Most Common)

**Vercel Hobby (free) plan limit:** Cron jobs can only run **once per day**. Your `vercel.json` uses `*/10 * * * *` (every 10 minutes), which **fails on Hobby**.

**Fix:** Use an external cron service to hit your endpoint every 10 minutes:
- [cron-job.org](https://cron-job.org) (free)
- [EasyCron](https://www.easycron.com)
- Create a job: `GET https://property-dashboard-three.vercel.app/api/bookings/send-reminders` every 10 minutes

**Or** upgrade to Vercel Pro for frequent cron.

### 2. CRON_SECRET Blocking Requests

If `CRON_SECRET` is set in Vercel but the auth header isn’t passed correctly, the endpoint returns 401.

**Fix:** Temporarily remove `CRON_SECRET` from Vercel env vars to test. Or use the `x-vercel-cron: 1` header (recent code accepts this as a fallback).

### 3. Missing Reminder Columns in Database

Run `setup_booking_reminders.sql` in Supabase if you haven’t. It adds:

- `reminder_24h_sent`, `reminder_1h_sent`, `reminder_5m_sent`
- `reminder_admin_1h_sent`, `reminder_admin_15m_sent`

### 4. Booking Status Filter

Reminders only run for bookings with status `pending`, `confirmed`, `new`, or `null`. `cancelled` and `completed` are excluded.

### 5. Customer Phone Missing

Customer SMS reminders are skipped if `phone` is empty. Admin reminders still send.

---

## Manual Test

```bash
curl "https://property-dashboard-three.vercel.app/api/bookings/send-reminders"
```

Check the JSON response and Vercel function logs for errors.

---

## What Was Fixed (Latest Changes)

- Admin email reminders added (1h and 15m)
- Status filter widened to include `null`
- Customer reminders skip when phone is missing
- Cron auth relaxed to accept `x-vercel-cron` header
- Improved error handling
