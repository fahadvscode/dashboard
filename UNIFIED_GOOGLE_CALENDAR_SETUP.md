# 🔐 Unified Google Calendar Setup Guide (Qikfill Workspace)

## 📋 Overview

This system uses a **single Google Workspace account** (`info@qikfill.com`) with **multiple sub-calendars** to manage bookings for all brands:
- **Fahad Javed Calendar** (FJ bookings)
- **Precon Factory** (Precon Factory bookings)
- **GTA Lowrise calendar** (GTA Lowrise bookings)

### ✅ Benefits of This Approach:
1. **Single OAuth Authorization** - Authorize once instead of 3 times
2. **One Set of Tokens** - Simpler token management
3. **Centralized Management** - All calendars under one Google Workspace account
4. **Easier Maintenance** - No need to manage multiple OAuth clients
5. **Automatic Token Refresh** - System handles expired tokens automatically

---

## 🔧 Step 1: Google Cloud Console Setup

### Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
5. Select **Application type**: Web application
6. **Name**: Qikfill Calendar Integration
7. **Authorized redirect URIs**: Add:
   ```
   https://property-dashboard-three.vercel.app/api/calendar/oauth-callback
   ```
   (Add localhost for testing if needed):
   ```
   http://localhost:3000/api/calendar/oauth-callback
   ```
8. Click **CREATE**
9. **Copy** the Client ID and Client Secret

### Enable Google Calendar API

1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for **Google Calendar API**
3. Click **ENABLE**

---

## 🗓️ Step 2: Get Calendar IDs

Each calendar under your Google Workspace has a unique Calendar ID.

### How to Find Calendar IDs:

1. Go to [Google Calendar](https://calendar.google.com/)
2. Sign in with `info@qikfill.com`
3. For each calendar (FJ, Precon Factory, GTA Lowrise):
   - Click on the calendar name in the left sidebar
   - Click the **3 dots (⋮)** → **Settings and sharing**
   - Scroll to **"Integrate calendar"** section
   - Copy the **Calendar ID** (looks like: `c_abc123...@group.calendar.google.com`)

### Current Calendar IDs:

```
FJ Calendar:
c_c0a660e131ad53344fa1d41404b0beafcde60bc4ea44e19020ad14eb84bcd46d@group.calendar.google.com

Precon Factory:
c_30f7e817768b30f4813c9711b2f66fa238221af7a6ba0fb5d284de514afeb400@group.calendar.google.com

GTA Lowrise:
c_c702f7be6ca9312d4fccf118aaff244390379e2b07f3f5ef47b3ee609fa49475@group.calendar.google.com
```

---

## 🔐 Step 3: Set Environment Variables

Add these to your **Vercel** project environment variables:

```bash
# Unified Qikfill OAuth Credentials
QIKFILL_GOOGLE_CLIENT_ID=your_client_id_here
QIKFILL_GOOGLE_CLIENT_SECRET=your_client_secret_here

# OAuth Redirect URI
GOOGLE_REDIRECT_URI=https://property-dashboard-three.vercel.app/api/calendar/oauth-callback
```

**Note**: Calendar IDs are hardcoded in the application (`app/api/bookings/create-calendar-event/route.ts`), so no need to add them as environment variables.

### How to Add in Vercel:

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable above
5. Click **Save**
6. **Redeploy** your application for changes to take effect

---

## 🗄️ Step 4: Database Setup

Run the migration to prepare the database for unified token storage:

```bash
# In Supabase SQL Editor, run:
```

```sql
-- Verify calendar_tokens table exists (should already exist)
SELECT * FROM calendar_tokens;

-- Optional: Clean up old tokens if migrating from multi-OAuth system
-- DELETE FROM calendar_tokens WHERE calendar_type IN ('fj_calendar', 'precon_calendar');
```

The existing `calendar_tokens` table will work fine. It will store a single row with `calendar_type = 'qikfill'`.

---

## 🔗 Step 5: Authorize Google Calendar

### One-Time Authorization

After deploying with the new environment variables:

1. **Visit the authorization URL**:
   ```
   https://property-dashboard-three.vercel.app/api/calendar/oauth
   ```

2. **Sign in with Google**:
   - Use the `info@qikfill.com` account
   - This account must have access to all three calendars

3. **Grant Permissions**:
   - Click **Allow** to give the app access to your calendars
   - The app requests:
     - View and edit events on all calendars
     - Create, read, update, and delete calendar events

4. **Success**:
   - You'll be redirected back with a success message
   - The refresh token is automatically stored in Supabase
   - All three calendars (FJ, Precon Factory, GTA Lowrise) are now connected!

### What Gets Stored:

The system stores in the `calendar_tokens` table:
- `calendar_type`: `'qikfill'`
- `access_token`: Short-lived token (auto-refreshed)
- `refresh_token`: Long-lived token (used to get new access tokens)
- `expiry_date`: When the access token expires
- `scope`: Permissions granted
- `updated_at`: Last token refresh time

---

## 🚀 Step 6: How It Works

### Automatic Booking → Calendar Event Flow:

```
New Booking → Database INSERT → PostgreSQL Trigger
  ↓
/api/bookings/notify (sends SMS)
  ↓
/api/bookings/create-calendar-event
  ↓
Determines which calendar based on booking source:
  - fj_bookings → FJ Calendar
  - precon_factory_bookings → Precon Factory Calendar
  - gta_lowrise_bookings → GTA Lowrise Calendar
  ↓
Retrieves unified OAuth token from database
  ↓
Checks if access_token is expired
  ↓
If expired: Auto-refreshes using refresh_token
  ↓
Creates event on the appropriate calendar
  ↓
Sends calendar invite to customer
```

### Calendar Event Details:

- **Title**: `Booking: [Name] - [Project Name]`
- **Date/Time**: From booking appointment fields (Toronto timezone)
- **Duration**: 30 minutes
- **Attendee**: Customer email (receives invite)
- **Location**: Project URL
- **Description**: Full booking details
- **Reminders**: 
  - Email: 24 hours before
  - Popup: 1 hour before

---

## 🔍 Step 7: Testing

### Test the Integration:

1. **Create a test booking** in any of the three systems:
   - FJ bookings form
   - Precon Factory bookings form
   - GTA Lowrise bookings form

2. **Check SMS notifications**:
   - Team should receive SMS immediately

3. **Check Google Calendar**:
   - Sign in to `info@qikfill.com`
   - Look at the appropriate calendar (FJ, Precon, or GTA Lowrise)
   - Event should appear with all booking details

4. **Check customer email**:
   - Customer should receive a calendar invite from Google

### Verify Token Status:

Run this in Supabase SQL Editor:

```sql
SELECT 
  calendar_type,
  token_type,
  scope,
  CASE 
    WHEN expiry_date > EXTRACT(EPOCH FROM NOW()) * 1000 THEN 'Valid'
    ELSE 'Expired'
  END as token_status,
  created_at,
  updated_at
FROM calendar_tokens
WHERE calendar_type = 'qikfill';
```

---

## 🛠️ Troubleshooting

### "Calendar not authorized" Error

**Cause**: No OAuth token found in database.

**Fix**:
1. Visit `/api/calendar/oauth` to authorize
2. Sign in with `info@qikfill.com`
3. Grant permissions

### "No refresh token received" Error

**Cause**: Google didn't provide a refresh token (usually happens if already authorized).

**Fix**:
1. Go to [Google Account Permissions](https://myaccount.google.com/permissions)
2. Find your app and click **Remove Access**
3. Visit `/api/calendar/oauth` again
4. The `prompt: 'consent'` parameter forces Google to show the consent screen

### Calendar Event Not Created

**Check these**:

1. **Trigger exists**:
   ```sql
   SELECT trigger_name, event_object_table 
   FROM information_schema.triggers 
   WHERE trigger_name LIKE '%booking%';
   ```

2. **Token is valid**:
   ```sql
   SELECT * FROM calendar_tokens WHERE calendar_type = 'qikfill';
   ```

3. **API logs** (in Vercel):
   - Go to Vercel Dashboard → Your Project → Logs
   - Look for errors in `/api/bookings/create-calendar-event`

4. **Calendar ID is correct**:
   - Verify in `app/api/bookings/create-calendar-event/route.ts`
   - Make sure the Calendar IDs match your actual calendars

### Token Expired

**Don't worry!** The system automatically refreshes expired tokens. If you see this error:
- It means the refresh failed
- Try re-authorizing at `/api/calendar/oauth`

---

## 🔄 Re-Authorization (If Needed)

If you ever need to re-authorize:

1. **Revoke current access**:
   - Go to [Google Account Permissions](https://myaccount.google.com/permissions)
   - Find your app
   - Click **Remove Access**

2. **Delete old token** (optional):
   ```sql
   DELETE FROM calendar_tokens WHERE calendar_type = 'qikfill';
   ```

3. **Authorize again**:
   - Visit `/api/calendar/oauth`
   - Sign in with `info@qikfill.com`
   - Grant permissions

---

## 📝 Code Files Modified

The following files were updated for unified OAuth:

1. **`app/api/bookings/create-calendar-event/route.ts`**
   - Uses single OAuth client
   - Routes to correct calendar based on booking source
   - Hardcoded Calendar IDs for all three brands

2. **`app/api/calendar/oauth/route.ts`**
   - Simplified to single OAuth flow
   - No more `type` parameter needed

3. **`app/api/calendar/oauth-callback/route.ts`**
   - Stores single unified token with `calendar_type = 'qikfill'`
   - Success message indicates all calendars are connected

4. **`update_calendar_tokens_unified.sql`**
   - Migration script for database (informational only)

---

## ✅ Setup Checklist

- [ ] OAuth client created in Google Cloud Console
- [ ] Google Calendar API enabled
- [ ] Calendar IDs obtained for all three calendars
- [ ] Environment variables added to Vercel (`QIKFILL_GOOGLE_CLIENT_ID`, `QIKFILL_GOOGLE_CLIENT_SECRET`)
- [ ] Application redeployed
- [ ] Authorized at `/api/calendar/oauth` with `info@qikfill.com`
- [ ] Token stored in `calendar_tokens` table (verify with SQL query)
- [ ] Test booking created and calendar event appears
- [ ] Customer receives calendar invite

---

## 🎉 Summary

You now have a **unified Google Calendar integration** that:
- Uses **one OAuth authorization** for all brands
- Automatically creates events in the **correct calendar** based on booking source
- **Auto-refreshes tokens** when they expire
- Sends **calendar invites** to customers
- Is **easy to maintain** with centralized token management

All three brands (FJ, Precon Factory, GTA Lowrise) are managed under the single `info@qikfill.com` Google Workspace account! 🚀

