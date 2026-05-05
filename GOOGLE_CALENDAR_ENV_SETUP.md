# 🔐 Google Calendar Environment Variables Setup

## Required Environment Variables

Add these to your **Vercel project** under Settings → Environment Variables:

```bash
# OAuth — use real values only in Vercel / .env.local (never commit secrets)
FJ_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
FJ_GOOGLE_CLIENT_SECRET=your-client-secret
PRECON_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
PRECON_GOOGLE_CLIENT_SECRET=your-client-secret
QIKFILL_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
QIKFILL_GOOGLE_CLIENT_SECRET=your-client-secret

# OAuth Redirect URI (same for both)
GOOGLE_REDIRECT_URI=https://your-deployment.vercel.app/api/calendar/oauth-callback

# Calendar IDs
FJ_CALENDAR_ID=fahad@fahadsold.com
PRECON_FACTORY_CALENDAR_ID=info@preconfactory.com
```

## Setup Steps

### Step 1: Add Environment Variables to Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable from the list above
3. Make sure to add them to **Production**, **Preview**, and **Development** environments
4. Redeploy your project after adding variables

### Step 2: Create Calendar Tokens Table in Supabase

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the contents of `create_calendar_tokens_table.sql`
3. Click **"Run"**
4. Verify the table was created

### Step 3: Authorize Calendars (One-Time Setup)

**Authorize FJ Calendar:**
1. Visit: `https://property-dashboard-three.vercel.app/api/calendar/oauth?type=fj`
2. Sign in with Google account that owns `info@fahadsold.com`
3. Click **"Allow"** to grant access
4. You'll see a success message

**Authorize Precon Factory Calendar:**
1. Visit: `https://property-dashboard-three.vercel.app/api/calendar/oauth?type=precon`
2. Sign in with Google account that owns `info@preconfactory.com`
3. Click **"Allow"** to grant access
4. You'll see a success message

**Note:** This is a one-time authorization. Refresh tokens are stored securely in Supabase and will be used automatically for all future bookings.

---

## Important Notes

✅ **Security**: 
- OAuth tokens are stored securely in Supabase
- Access tokens automatically refresh when expired
- No service account JSON files needed

✅ **Verification Steps**:
1. After adding environment variables, redeploy your Vercel project
2. Authorize both calendars (Step 3)
3. Submit a test booking
4. Check Google Calendar - event should appear automatically
5. Check Vercel function logs for any errors

---

## Testing

After setup, test by:
1. Submitting a new booking through your booking form
2. Check Google Calendar - event should appear automatically
3. Check Vercel logs for any errors

---

**Last Updated**: December 2025

