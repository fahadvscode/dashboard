# 🔐 Google Calendar OAuth Authorization Guide

## 📋 Configuration Details

### OAuth Credentials

**FJ Calendar:**
- Client ID: (set `FJ_GOOGLE_CLIENT_ID` or `QIKFILL_GOOGLE_CLIENT_ID` in Vercel — never commit real values)
- Client Secret: (set `FJ_GOOGLE_CLIENT_SECRET` / `QIKFILL_GOOGLE_CLIENT_SECRET` in Vercel only)
- Calendar ID: `fahad@fahadsold.com`

**Precon Factory Calendar:**
- Client ID: (use a separate OAuth client in Google Cloud if needed; store in env only)
- Client Secret: (env only)
- Calendar ID: `info@preconfactory.com`

**Common Settings:**
- Redirect URI: `https://property-dashboard-three.vercel.app/api/calendar/oauth-callback`
- Timezone: `America/Toronto`
- Event Duration: 30 minutes (default)

---

## 🔗 Quick Authorization Links

After deploying and setting up environment variables:

### Authorize FJ Calendar
**Click this link after deployment:**
```
https://property-dashboard-three.vercel.app/api/calendar/oauth?type=fj
```

### Authorize Precon Factory Calendar
**Click this link after deployment:**
```
https://property-dashboard-three.vercel.app/api/calendar/oauth?type=precon
```

---

## What Happens When You Authorize

1. **You'll be redirected to Google** - Sign in with the account that owns the calendar
2. **Grant permissions** - Click "Allow" to give the app access to your calendar
3. **Redirected back** - You'll see a success message
4. **Tokens stored** - Refresh tokens are saved in Supabase automatically
5. **Done!** - All future bookings will automatically create calendar events

---

## Authorization Requirements

- Must sign in with the Google account that **owns** the calendar:
  - FJ Calendar: Use account for `fahad@fahadsold.com`
  - Precon Factory Calendar: Use account for `info@preconfactory.com`

---

## Troubleshooting

### "Authorization failed"
- Make sure you're signed in to the correct Google account
- Check that the calendar exists and you have access to it

### "No refresh token received"
- Try revoking access and authorizing again
- Make sure the OAuth consent screen is properly configured
- Check that you're not already authorized (try revoking first)

### Revoke and Re-authorize
If you need to re-authorize:
1. Go to [Google Account Permissions](https://myaccount.google.com/permissions)
2. Find "Property Dashboard" or your app
3. Click "Remove Access"
4. Authorize again using the links above

---

## 📝 Environment Variables (Vercel)

Add these to your Vercel project environment variables:

```bash
# Google OAuth (example names — paste real values only in Vercel / .env.local, not in git)
QIKFILL_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
QIKFILL_GOOGLE_CLIENT_SECRET=your-client-secret
FJ_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
FJ_GOOGLE_CLIENT_SECRET=your-client-secret
PRECON_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
PRECON_GOOGLE_CLIENT_SECRET=your-client-secret

# OAuth Redirect URI
GOOGLE_REDIRECT_URI=https://your-deployment.vercel.app/api/calendar/oauth-callback

# Calendar IDs
FJ_CALENDAR_ID=fahad@fahadsold.com
PRECON_FACTORY_CALENDAR_ID=info@preconfactory.com
```

---

## 📅 Calendar Event Details

When a booking is created, the calendar event includes:

- **Title**: `Booking: [Firstname] [Lastname] - [Project Name]`
- **Date/Time**: Appointment date and time (Toronto timezone)
- **Duration**: 30 minutes
- **Attendee**: Customer email (receives calendar invite)
- **Location**: Project URL (if available)
- **Description**: 
  - Customer contact info (name, email, phone)
  - Appointment type
  - Project details (name, ID, URL)
  - Booking message
- **Reminders**: 
  - Email: 24 hours before
  - Popup: 1 hour before

---

## 🔧 Setup Checklist

- [x] OAuth clients created in Google Cloud Console
- [x] Redirect URIs configured for both OAuth clients
- [x] Environment variables added to Vercel
- [x] `calendar_tokens` table created in Supabase
- [x] FJ Calendar authorized (fahad@fahadsold.com)
- [x] Precon Factory Calendar authorized (info@preconfactory.com)
- [x] Database triggers setup for both booking tables
- [x] Timezone set to America/Toronto
- [x] Calendar integration tested and working ✅

---

## ✅ Current Status

**FJ Calendar:**
- Calendar ID: `fahad@fahadsold.com`
- Status: ✅ Authorized and Working
- Events created automatically for FJ bookings

**Precon Factory Calendar:**
- Calendar ID: `info@preconfactory.com`
- Status: ✅ Authorized and Working
- Events created automatically for Precon Factory bookings

**Integration:**
- ✅ All bookings automatically create Google Calendar events
- ✅ Timezone correctly set to America/Toronto
- ✅ Customers receive calendar invites
- ✅ Events include all booking details (project, contact info, etc.)
- ✅ Reminders set (24 hours email, 1 hour popup)

---

**Last Updated**: December 11, 2025
**Status**: ✅ Fully Configured and Working - Production Ready

