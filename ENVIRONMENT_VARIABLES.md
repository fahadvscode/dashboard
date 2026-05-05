# 🔐 Environment Variables Configuration

This document lists all environment variables required for the Property Dashboard application.

---

## 🔑 Dashboard login (required)

```bash
NEXT_PUBLIC_DASHBOARD_PASSWORD=your_long_random_password
```

**Required.** Without this, no password will unlock the app. Set the same value in Vercel for production.

---

## 📦 Supabase Configuration

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

**Where to find these:**
1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the values

**Usage:**
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public anonymous key (safe to expose in browser)
- `SUPABASE_SERVICE_KEY`: Service role key (server-side only, bypasses RLS)

---

## 📱 Twilio Configuration (SMS Notifications)

```bash
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

**Where to find these:**
1. Go to [Twilio Console](https://console.twilio.com/)
2. Dashboard shows Account SID and Auth Token
3. Phone number is from your Twilio phone numbers

**Usage:**
- Sends SMS notifications when new leads come in
- Sends SMS notifications when new bookings are created
- Notifies team members at: `6478981739`, `4168296121`, `4163994289`

---

## 🤖 DeepSeek AI Configuration (Lead Analysis)

```bash
DEEPSEEK_API_KEY=your_deepseek_api_key
```

**Where to get this:**
1. Sign up at [DeepSeek AI](https://www.deepseek.com/)
2. Go to API settings
3. Generate an API key

**Usage:**
- Automatically analyzes new leads
- Generates insights about lead quality
- Provides project recommendations
- Detects duplicate leads

---

## 🗓️ Google Calendar Configuration (Unified OAuth)

### Unified Qikfill Workspace Approach

```bash
# Single OAuth client for all calendars (FJ, Precon Factory, GTA Lowrise)
QIKFILL_GOOGLE_CLIENT_ID=your_google_oauth_client_id
QIKFILL_GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REDIRECT_URI=https://property-dashboard-three.vercel.app/api/calendar/oauth-callback
```

**How to get OAuth credentials:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or select existing)
3. Enable **Google Calendar API**
4. Go to **APIs & Services** → **Credentials**
5. Create **OAuth 2.0 Client ID** (Web application)
6. Add authorized redirect URI: `https://property-dashboard-three.vercel.app/api/calendar/oauth-callback`
7. Copy Client ID and Client Secret

**Usage:**
- Single OAuth authorization for `info@qikfill.com` Google Workspace
- Manages three sub-calendars:
  - **FJ Calendar**: `c_c0a660e131ad53344fa1d41404b0beafcde60bc4ea44e19020ad14eb84bcd46d@group.calendar.google.com`
  - **Precon Factory**: `c_30f7e817768b30f4813c9711b2f66fa238221af7a6ba0fb5d284de514afeb400@group.calendar.google.com`
  - **GTA Lowrise**: `c_c702f7be6ca9312d4fccf118aaff244390379e2b07f3f5ef47b3ee609fa49475@group.calendar.google.com`
- Automatically creates calendar events for new bookings
- Sends calendar invites to customers

**Note:** Calendar IDs are hardcoded in the application code (`app/api/bookings/create-calendar-event/route.ts`), so they don't need to be set as environment variables.

---

## 🚀 Vercel Deployment

### How to Add Environment Variables in Vercel:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable:
   - **Key**: Variable name (e.g., `QIKFILL_GOOGLE_CLIENT_ID`)
   - **Value**: The actual value
   - **Environment**: Select **Production**, **Preview**, and **Development** (or as needed)
5. Click **Save**
6. **Redeploy** your application for changes to take effect

### Environment-Specific Variables:

You can set different values for different environments:
- **Production**: Live production environment
- **Preview**: Preview deployments (branch deployments)
- **Development**: Local development (if using Vercel CLI)

---

## 🔒 Security Best Practices

### ✅ DO:
- Store all sensitive keys as environment variables
- Use `SUPABASE_SERVICE_KEY` only on the server side
- Keep `.env.local` in `.gitignore`
- Rotate keys periodically
- Use different keys for development and production

### ❌ DON'T:
- Commit `.env` files to Git
- Share keys in public repositories
- Expose service keys in client-side code
- Use production keys in development

---

## 📋 Complete Environment Variables Checklist

```bash
# ✅ Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# ✅ Twilio (Required for SMS)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# ✅ DeepSeek AI (Required for lead analysis)
DEEPSEEK_API_KEY=

# ✅ Google Calendar (Required for booking calendar integration)
QIKFILL_GOOGLE_CLIENT_ID=
QIKFILL_GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://property-dashboard-three.vercel.app/api/calendar/oauth-callback
```

---

## 🧪 Local Development

For local development, create a `.env.local` file in the project root:

```bash
# Copy from .env.example
cp .env.example .env.local

# Edit with your values
nano .env.local
```

**Note:** `.env.local` is ignored by Git and won't be committed.

---

## 🔍 Verifying Configuration

### Test Supabase Connection:
```bash
# Run in browser console on your app
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
```

### Test API Endpoints:
- SMS Notifications: Check Twilio logs
- AI Analysis: Check DeepSeek API usage
- Calendar: Visit `/api/calendar/oauth` to authorize

### Check Environment Variables in Vercel:
1. Go to Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Verify all required variables are set

---

## 📞 Support

If you encounter issues with environment variables:
1. Verify all variables are set in Vercel
2. Redeploy after adding/changing variables
3. Check Vercel logs for any errors
4. Ensure no typos in variable names (they're case-sensitive!)

---

## 🎉 Migration from Old Calendar System

If you're migrating from the old multi-OAuth system (separate FJ and Precon calendars):

### Old Variables (DEPRECATED):
```bash
# ❌ No longer needed
FJ_GOOGLE_CLIENT_ID=
FJ_GOOGLE_CLIENT_SECRET=
PRECON_GOOGLE_CLIENT_ID=
PRECON_GOOGLE_CLIENT_SECRET=
FJ_CALENDAR_ID=
PRECON_FACTORY_CALENDAR_ID=
```

### New Variables (USE THESE):
```bash
# ✅ Unified approach
QIKFILL_GOOGLE_CLIENT_ID=
QIKFILL_GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

**Migration Steps:**
1. Remove old calendar environment variables from Vercel
2. Add new unified variables
3. Redeploy application
4. Authorize once at `/api/calendar/oauth` with `info@qikfill.com`
5. All three calendars (FJ, Precon, GTA Lowrise) will work automatically!

See `UNIFIED_GOOGLE_CALENDAR_SETUP.md` for detailed migration guide.

