# 🏢 How to Add a New Company/Brand to the System

## Overview

This guide shows you **exactly** how to add a new company (like we did with GTA Lowrise) with full lead and booking management.

When you add a new company, you get:
- ✅ Lead management with SMS notifications + AI analysis
- ✅ Booking management with SMS notifications + Google Calendar
- ✅ Dashboard pages for leads and bookings
- ✅ Duplicate detection across all brands
- ✅ SMS conversations
- ✅ Export to CSV
- ✅ All the same features as FJ, Precon Factory, and GTA Lowrise

---

## 📋 Complete Checklist for Adding a New Company

Let's say you want to add **"Urban Living"** as a new brand.

### Phase 1: Database Setup for Leads

#### Step 1.1: Check if Leads Table Exists

```python
# Run this Python script to check
from supabase import create_client

SUPABASE_URL = 'https://cfzuypbljirmibmxpabi.supabase.co'
SUPABASE_KEY = 'YOUR_SERVICE_ROLE_KEY'

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

try:
    response = supabase.table('urban_living_leads').select('*').limit(1).execute()
    print('✅ urban_living_leads table exists!')
    print('Columns:', list(response.data[0].keys()) if response.data else 'Empty table')
except Exception as e:
    print(f'❌ Table does not exist: {e}')
```

#### Step 1.2: Add Missing Columns to Leads Table

**File: `setup_urban_living_leads.sql`**

```sql
-- =====================================================
-- URBAN LIVING LEADS - Complete Setup
-- =====================================================

-- Step 1: Add Call Tracking Columns
ALTER TABLE urban_living_leads 
ADD COLUMN IF NOT EXISTS call_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS call_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS last_note TEXT;

-- Step 2: Add Lead Temperature Column
ALTER TABLE urban_living_leads 
ADD COLUMN IF NOT EXISTS lead_temperature TEXT DEFAULT 'warm' CHECK (lead_temperature IN ('hot', 'warm', 'cold'));

-- Step 3: Add AI Analysis Columns
ALTER TABLE urban_living_leads 
ADD COLUMN IF NOT EXISTS ai_score INTEGER,
ADD COLUMN IF NOT EXISTS ai_confidence TEXT CHECK (ai_confidence IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS ai_budget TEXT,
ADD COLUMN IF NOT EXISTS ai_timeline TEXT,
ADD COLUMN IF NOT EXISTS ai_priorities JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_buyer_type TEXT,
ADD COLUMN IF NOT EXISTS ai_urgency TEXT CHECK (ai_urgency IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,
ADD COLUMN IF NOT EXISTS ai_key_points JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;

-- Step 4: Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_urban_living_leads_email ON urban_living_leads(email);
CREATE INDEX IF NOT EXISTS idx_urban_living_leads_phone ON urban_living_leads(phone);
CREATE INDEX IF NOT EXISTS idx_urban_living_leads_status ON urban_living_leads(status);
CREATE INDEX IF NOT EXISTS idx_urban_living_leads_temperature ON urban_living_leads(lead_temperature);
CREATE INDEX IF NOT EXISTS idx_urban_living_leads_created_at ON urban_living_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_urban_living_leads_ai_score ON urban_living_leads(ai_score DESC);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ urban_living_leads table updated successfully!';
END $$;
```

#### Step 1.3: Create Database Triggers for Leads

**File: `setup_urban_living_lead_triggers.sql`**

```sql
-- =====================================================
-- URBAN LIVING LEADS - Database Triggers Setup
-- =====================================================

-- Enable pg_net extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- SMS NOTIFICATION TRIGGER
DROP TRIGGER IF EXISTS notify_new_urban_living_lead ON urban_living_leads;

CREATE TRIGGER notify_new_urban_living_lead
  AFTER INSERT ON urban_living_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_lead();

-- AI AUTO-ANALYSIS TRIGGER
DROP TRIGGER IF EXISTS auto_analyze_new_urban_living_lead ON urban_living_leads;

CREATE TRIGGER auto_analyze_new_urban_living_lead
  AFTER INSERT ON urban_living_leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_ai_analysis();

-- Verify Triggers
SELECT 
  trigger_name,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'urban_living_leads';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Urban Living lead triggers created successfully!';
  RAISE NOTICE '📱 SMS notifications active';
  RAISE NOTICE '🤖 AI auto-analysis active';
END $$;
```

---

### Phase 2: Create Leads Dashboard Page

#### Step 2.1: Copy Existing Page

```bash
cd /path/to/property-dashboard
cp -r app/gta-lowrise-leads app/urban-living-leads
```

#### Step 2.2: Update All References

**File: `app/urban-living-leads/page.tsx`**

Search and replace these values:

| Find | Replace |
|------|---------|
| `export default function GTALowriseLeads()` | `export default function UrbanLivingLeads()` |
| `gta_lowrise_leads` | `urban_living_leads` |
| `/gta-lowrise-leads` | `/urban-living-leads` |
| `GTA Lowrise Leads` | `Urban Living Leads` |
| `brand: 'gta'` | `brand: 'urban'` |
| `bg-teal-600` | `bg-indigo-600` (choose your brand color) |
| `bg-teal-700` | `bg-indigo-700` |
| `bg-teal-50` | `bg-indigo-50` |
| `text-teal-600` | `text-indigo-600` |
| `hover:bg-teal-700` | `hover:bg-indigo-700` |

**Key files to update:**
- Table name in `fetchLeads()` function
- Table name in `handleLogCall()` 
- Table name in `handleUpdateTemperature()`
- Table name in `handleSendSms()`
- Table name in `handleDeleteLeads()`
- Table name in `fetchDuplicateHistory()`
- URL in `useEffect` (line ~118)
- CSV filename in `exportToCSV()`

---

### Phase 3: Update API Endpoints

#### Step 3.1: Update Duplicate History API

**File: `app/api/leads/duplicate-history/route.ts`**

Add to the tables array:

```typescript
const tablesToCheck = [
  'fj_leads', 
  'precon_factory_leads', 
  'gta_lowrise_leads',
  'urban_living_leads'  // ADD THIS
]
```

And update the display name logic:

```typescript
const displayName = 
  tableName === 'fj_leads' ? 'FJ Leads' :
  tableName === 'precon_factory_leads' ? 'Precon Factory Leads' :
  tableName === 'gta_lowrise_leads' ? 'GTA Lowrise Leads' :
  'Urban Living Leads'  // ADD THIS
```

#### Step 3.2: Update Lead Notifications API

**File: `app/api/leads/notify/route.ts`**

Update the source determination:

```typescript
const source = 
  lead.table_name === 'fj_leads' ? 'FJ' :
  lead.table_name === 'precon_factory_leads' ? 'Precon Factory' :
  lead.table_name === 'gta_lowrise_leads' ? 'GTA Lowrise' :
  'Urban Living'  // ADD THIS

const leadPath = 
  lead.table_name === 'fj_leads' ? 'fj-leads' :
  lead.table_name === 'precon_factory_leads' ? 'precon-leads' :
  lead.table_name === 'gta_lowrise_leads' ? 'gta-lowrise-leads' :
  'urban-living-leads'  // ADD THIS
```

---

### Phase 4: Database Setup for Bookings

#### Step 4.1: Check if Bookings Table Exists

Same Python script as Step 1.1, but use `urban_living_bookings`

#### Step 4.2: Create Booking Notification Trigger

**File: `setup_urban_living_booking_notifications.sql`**

```sql
-- =====================================================
-- URBAN LIVING BOOKINGS - SMS Notification Setup
-- =====================================================

-- Enable pg_net extension
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS notify_new_urban_living_booking ON urban_living_bookings;

-- Create trigger for urban_living_bookings table
CREATE TRIGGER notify_new_urban_living_booking
  AFTER INSERT ON urban_living_bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_booking();

-- Verify the trigger
SELECT 
  trigger_name,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'urban_living_bookings';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Urban Living booking notification trigger created!';
  RAISE NOTICE '📱 SMS notifications active';
  RAISE NOTICE '📆 Google Calendar integration active';
END $$;
```

---

### Phase 5: Create Bookings Dashboard Page

#### Step 5.1: Copy Existing Bookings Page

```bash
cp -r app/gta-lowrise-bookings app/urban-living-bookings
```

#### Step 5.2: Update All References

**File: `app/urban-living-bookings/page.tsx`**

Search and replace:

| Find | Replace |
|------|---------|
| `export default function GTALowriseBookings()` | `export default function UrbanLivingBookings()` |
| `gta_lowrise_bookings` | `urban_living_bookings` |
| `/gta-lowrise-bookings` | `/urban-living-bookings` |
| `GTA Lowrise Bookings` | `Urban Living Bookings` |
| `bg-teal-600` | `bg-indigo-600` |
| `bg-teal-700` | `bg-indigo-700` |

---

### Phase 6: Update Booking Notifications API

**File: `app/api/bookings/notify/route.ts`**

Update the source determination:

```typescript
const source = 
  booking.table_name === 'fj_bookings' ? 'FJ' :
  booking.table_name === 'precon_factory_bookings' ? 'Precon Factory' :
  booking.table_name === 'gta_lowrise_bookings' ? 'GTA Lowrise' :
  'Urban Living'  // ADD THIS

const bookingPath = 
  booking.table_name === 'fj_bookings' ? 'fj-bookings' :
  booking.table_name === 'precon_factory_bookings' ? 'precon-bookings' :
  booking.table_name === 'gta_lowrise_bookings' ? 'gta-lowrise-bookings' :
  'urban-living-bookings'  // ADD THIS
```

And in the calendar event creation:

```typescript
table_name: booking.table_name || (
  source === 'FJ' ? 'fj_bookings' :
  source === 'Precon Factory' ? 'precon_factory_bookings' :
  source === 'GTA Lowrise' ? 'gta_lowrise_bookings' :
  'urban_living_bookings'  // ADD THIS
)
```

---

### Phase 7: Update Sidebar Navigation

**File: `components/Sidebar.tsx`**

Add to the navigation array:

```typescript
const navigation = [
  { name: 'Canada Properties', href: '/', icon: Building2 },
  { name: 'AI Lead Insights', href: '/ai-insights', icon: Brain },
  { name: 'SMS Conversations', href: '/conversations', icon: MessageSquare },
  { name: 'FJ Bookings', href: '/fj-bookings', icon: Calendar },
  { name: 'FJ Leads', href: '/fj-leads', icon: Mail },
  { name: 'Precon Factory Bookings', href: '/precon-bookings', icon: Calendar },
  { name: 'Precon Factory Leads', href: '/precon-leads', icon: Mail },
  { name: 'GTA Lowrise Bookings', href: '/gta-lowrise-bookings', icon: Calendar },
  { name: 'GTA Lowrise Leads', href: '/gta-lowrise-leads', icon: Mail },
  { name: 'Urban Living Bookings', href: '/urban-living-bookings', icon: Calendar },  // ADD THIS
  { name: 'Urban Living Leads', href: '/urban-living-leads', icon: Mail },  // ADD THIS
]
```

---

### Phase 8: Deploy to Production

#### Step 8.1: Commit Changes

```bash
cd /path/to/property-dashboard

git add .
git commit -m "🏢 Add Urban Living with full lead and booking management

- Created /urban-living-leads dashboard page
- Created /urban-living-bookings dashboard page
- Added SMS notification triggers
- Updated API endpoints
- Added navigation links
- SQL scripts for database setup"
```

#### Step 8.2: Deploy to Vercel

```bash
npx vercel --prod --yes
```

#### Step 8.3: Run SQL Scripts in Supabase

In order:
1. `setup_urban_living_leads.sql`
2. `setup_urban_living_lead_triggers.sql`
3. `setup_urban_living_booking_notifications.sql`

---

## 🎨 Choosing Brand Colors

Choose a unique color for each brand (avoid conflicts):

| Brand | Primary Color | Hex Code |
|-------|---------------|----------|
| **FJ** | Blue | `bg-blue-600` #2563EB |
| **Precon Factory** | Purple | `bg-purple-600` #9333EA |
| **GTA Lowrise** | Teal | `bg-teal-600` #0D9488 |
| **Urban Living** | Indigo | `bg-indigo-600` #4F46E5 |
| **Next Brand?** | Pink | `bg-pink-600` #DB2777 |
| **Next Brand?** | Emerald | `bg-emerald-600` #059669 |
| **Next Brand?** | Orange | `bg-orange-600` #EA580C |
| **Next Brand?** | Cyan | `bg-cyan-600` #0891B2 |

---

## 📝 Quick Reference: Files to Modify

### SQL Files (Create New)
1. `setup_{brand}_leads.sql`
2. `setup_{brand}_lead_triggers.sql`
3. `setup_{brand}_booking_notifications.sql`

### Dashboard Pages (Create New)
1. `app/{brand}-leads/page.tsx`
2. `app/{brand}-bookings/page.tsx`

### API Files (Update Existing)
1. `app/api/leads/notify/route.ts`
2. `app/api/leads/duplicate-history/route.ts`
3. `app/api/bookings/notify/route.ts`

### Component Files (Update Existing)
1. `components/Sidebar.tsx`

---

## ✅ Testing Checklist

After adding a new company, test:

### Lead System:
- [ ] Insert test lead in Supabase
- [ ] SMS notification received (3 phones)
- [ ] AI analysis completed (check ai_score column)
- [ ] Lead appears in `/urban-living-leads` dashboard
- [ ] Can log calls and add notes
- [ ] Can send SMS from lead modal
- [ ] Can update temperature (hot/warm/cold)
- [ ] Duplicate detection works
- [ ] AI insights and recommendations show
- [ ] Export to CSV works

### Booking System:
- [ ] Insert test booking in Supabase
- [ ] SMS notification received (3 phones)
- [ ] Google Calendar event created
- [ ] Booking appears in `/urban-living-bookings` dashboard
- [ ] Can send SMS from booking modal
- [ ] Can delete bookings
- [ ] Export to CSV works

---

## 🎯 Summary: What You Added

When you complete all phases, the new company will have:

✅ **Lead Management:**
- Lead table with call tracking, temperature, AI analysis
- SMS notifications on new leads (3 phones)
- AI auto-analysis (score, insights, buyer type)
- Dashboard page for viewing/managing leads
- Duplicate detection across all brands
- Call logging with history
- SMS sending capability
- AI project recommendations
- Temperature management
- CSV export

✅ **Booking Management:**
- Booking table (uses existing structure)
- SMS notifications on new bookings (3 phones)
- Google Calendar integration
- Dashboard page for viewing/managing bookings
- SMS sending capability
- Bulk operations
- CSV export

✅ **Navigation:**
- Added to sidebar menu
- Proper routing

✅ **Branding:**
- Unique color scheme
- Brand-specific SMS messages

---

## 🚀 Time Estimate

- **Phase 1-3** (Leads): ~30 minutes
- **Phase 4-6** (Bookings): ~20 minutes
- **Phase 7-8** (Navigation & Deploy): ~10 minutes

**Total: ~1 hour** to add a complete new company with full feature parity! 🎉

---

## 💡 Pro Tips

1. **Use Find & Replace** - Most changes are just search/replace
2. **Test SQL First** - Run SQL scripts in Supabase before deploying
3. **One Phase at a Time** - Don't skip ahead, test each phase
4. **Copy GTA Lowrise** - It's the most recent and complete template
5. **Check Triggers** - Always verify triggers exist after running SQL
6. **Use Same Colors** - Don't duplicate existing brand colors
7. **Keep Naming Consistent** - Use underscores for tables, hyphens for routes

---

## 📞 Common Issues

### Issue: SMS Not Coming
- Check triggers exist in Supabase
- Verify Twilio credentials in Vercel
- Check Supabase logs for errors

### Issue: AI Analysis Not Running
- Check `auto_analyze_new_{brand}_lead` trigger exists
- Verify DeepSeek API key in Vercel
- Check `/api/leads/auto-analyze` endpoint

### Issue: Page Not Found
- Clear browser cache
- Verify folder name matches route
- Check if deployment completed

### Issue: Duplicate Detection Not Working
- Verify table added to `tablesToCheck` array
- Check `duplicate-history` API endpoint

---

## 🎉 Done!

You now have a complete template for adding unlimited companies to your system!

Each new company takes ~1 hour and gets full feature parity with FJ, Precon Factory, and GTA Lowrise. 🚀

