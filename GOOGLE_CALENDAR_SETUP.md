# 📅 Google Calendar Integration Setup

## Service Account Details

### FJ Service Account
- **Service Account Email**: `scraping-automation@scraping-automation-460219.iam.gserviceaccount.com`
- **File**: `scraping-automation-460219-12e8014ac35c.json`
- **Project ID**: `scraping-automation-460219`
- **Private Key ID**: `12e8014ac35c207bb1ad5352dee0e56efb433d20`

### Precon Factory Service Account
- **Service Account Email**: `master-automation@striped-strata-468422-r2.iam.gserviceaccount.com`
- **Project ID**: `striped-strata-468422-r2`
- **File**: `[PENDING - Need JSON key file]`

### Location
The JSON key file should be stored securely and added to environment variables in production.

---

## Calendar IDs

### FJ Calendar
- **Calendar ID**: `fahad@fahadsold.com`
- **Embed URL**: `https://calendar.google.com/calendar/embed?src=fahad%40fahadsold.com&ctz=America%2FToronto`
- **Timezone**: `America/Toronto`

### Precon Factory Calendar
- **Calendar ID**: `info@preconfactory.com`
- **Embed URL**: `https://calendar.google.com/calendar/embed?src=info%40preconfactory.com&ctz=America%2FToronto`
- **Timezone**: `America/Toronto`
- **Service Account Email**: `master-automation@striped-strata-468422-r2.iam.gserviceaccount.com`

**Note**: If using a separate service account for Precon Factory, you'll need the JSON key file for this account as well.

---

## Setup Status

### ✅ Completed
- [x] Service account created
- [x] Service account JSON key file available
- [x] FJ Calendar ID identified
- [x] Precon Factory Calendar ID identified
- [ ] Service account shared with FJ Calendar
- [ ] Service account shared with Precon Factory Calendar

### ⏳ Pending
- [ ] Create calendar_tokens table in Supabase
- [ ] Authorize FJ calendar via OAuth
- [ ] Authorize Precon Factory calendar via OAuth
- [ ] Set up environment variables in Vercel
- [ ] Test integration with real bookings

### ✅ Implementation Complete
- [x] Install Google Calendar API dependencies (`googleapis` package)
- [x] Create calendar integration API endpoints (`/api/bookings/create-calendar-event`)
- [x] Update booking notification to create calendar events

---

## Next Steps

### 1. Create Calendar Tokens Table in Supabase

Run the SQL script to create the table for storing OAuth tokens:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open `create_calendar_tokens_table.sql`
3. Copy and paste the entire SQL script
4. Click **"Run"**

This creates the `calendar_tokens` table to store OAuth refresh tokens.

### 2. Authorize Calendars via OAuth

**For FJ Calendar:**
1. Visit: `https://property-dashboard-three.vercel.app/api/calendar/oauth?type=fj`
2. Sign in with the Google account that owns `info@fahadsold.com`
3. Click **"Allow"** to grant calendar access
4. You'll be redirected back and see a success message

**For Precon Factory Calendar:**
1. Visit: `https://property-dashboard-three.vercel.app/api/calendar/oauth?type=precon`
2. Sign in with the Google account that owns `info@preconfactory.com`
3. Click **"Allow"** to grant calendar access
4. You'll be redirected back and see a success message

**Note:** You only need to do this authorization **once**. The refresh token will be stored and used automatically for all future bookings.

### 3. Set Up Environment Variables (OLD - Replaced by OAuth)

Add this email to both calendars with **"Make changes to events"** permission:
```
scraping-automation@scraping-automation-460219.iam.gserviceaccount.com
```

**For FJ Calendar:**
1. Open Google Calendar
2. Find "Fahad Javed" calendar in left sidebar
3. Click 3 dots (⋯) → "Settings and sharing"
4. Scroll to "Share with specific people"
5. Add: `scraping-automation@scraping-automation-460219.iam.gserviceaccount.com`
6. Permission: **"Make changes to events"**
7. Click "Send"

**For Precon Factory Calendar:**
- Repeat same steps once calendar ID is provided
- Share with: `master-automation@striped-strata-468422-r2.iam.gserviceaccount.com` (if using separate service account)
- OR share with: `scraping-automation@scraping-automation-460219.iam.gserviceaccount.com` (if using same service account)

### 2. Environment Variables Needed

Add to `.env.local` and Vercel:
```bash
# Google Calendar OAuth Credentials (set in Vercel only; placeholders shown)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://your-deployment.vercel.app/api/calendar/oauth-callback

# Calendar IDs
FJ_CALENDAR_ID=fahad@fahadsold.com
PRECON_FACTORY_CALENDAR_ID=info@preconfactory.com
```

### 3. Implementation Plan

1. **Create API endpoint**: `/api/bookings/create-calendar-event`
   - Accept booking data
   - Create event in appropriate calendar (FJ or Precon Factory)
   - Return calendar event link

2. **Update booking trigger**: 
   - After booking is inserted to database
   - Automatically create Google Calendar event
   - Include: name, email, phone, appointment date/time, project info

3. **Event Details**:
   - **Title**: `Booking: [Firstname] [Lastname] - [Project Name]`
   - **Description**: Contact info, project details, booking message
   - **Location**: Project URL (if available)
   - **Attendees**: Customer email
   - **Reminder**: 24 hours before

---

## Technical Notes

### Google Calendar API
- **Package**: `googleapis` (npm)
- **Scopes**: `https://www.googleapis.com/auth/calendar`
- **Method**: Service Account authentication
- **API Version**: v3

### Integration Points
- Trigger on booking insert (database trigger or API call)
- Support both FJ and Precon Factory bookings
- Handle timezone conversion (America/Toronto)
- Error handling for calendar API failures

---

## File References

- Service Account JSON: `scraping-automation-460219-12e8014ac35c.json`
- This documentation: `GOOGLE_CALENDAR_SETUP.md`
- Implementation: `app/api/bookings/create-calendar-event/route.ts` (to be created)

---

**Last Updated**: December 2025
**Status**: In Progress

