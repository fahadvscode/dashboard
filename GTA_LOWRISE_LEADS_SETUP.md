# 🏘️ GTA Lowrise Leads - Complete Setup Guide

## Overview

This guide will help you integrate the `gta_lowrise_leads` table into your dashboard with **all the same features** as FJ Leads and Precon Factory Leads.

---

## ✅ Features Added

### 1. Database Enhancements
- ✅ Call tracking (call_count, call_history, last_note)
- ✅ Lead temperature (hot/warm/cold)
- ✅ AI analysis columns (score, confidence, budget, timeline, priorities, buyer type, urgency, reasoning, key points)
- ✅ Performance indexes

### 2. Auto-Triggers
- ✅ SMS notifications to 3 phone numbers (6478981739, 4168296121, 4163994289)
- ✅ AI auto-analysis using DeepSeek AI (3-5 seconds)

### 3. Dashboard Page (`/gta-lowrise-leads`)
- ✅ Full table view with 14 columns
- ✅ Filters: All, Agents, Buyers, New, Hot, Warm, Cold
- ✅ Search by name, email, phone, project
- ✅ Bulk selection & delete
- ✅ Export to CSV
- ✅ **Teal/Cyan branding** (instead of blue/purple)

### 4. Lead Detail Modal
- ✅ Call logging with outcomes & notes
- ✅ AI SMS Generator (searches projects)
- ✅ Send SMS via Twilio
- ✅ Lead temperature selector
- ✅ AI Lead Intelligence section (score, insights, recommendations)
- ✅ Duplicate detection across all 3 tables
- ✅ Call history timeline

### 5. API Integration
- ✅ Updated `/api/leads/notify` for GTA Lowrise
- ✅ Updated `/api/leads/duplicate-history` to include GTA Lowrise
- ✅ All other endpoints work automatically with table parameter

### 6. Navigation
- ✅ Added "GTA Lowrise Leads" to sidebar menu

---

## 🚀 Setup Instructions

### Step 1: Add Missing Columns to Database

**Important:** Run this SQL in your Supabase SQL Editor **first**:

```sql
-- File: setup_gta_lowrise_leads.sql
```

This adds:
- Call tracking columns
- Lead temperature column
- AI analysis columns (10 columns)
- Performance indexes

**Expected output:**
```
✅ gta_lowrise_leads table updated successfully!
📋 Added: call tracking, temperature, and AI analysis columns
🚀 Ready for dashboard integration
```

---

### Step 2: Set Up Database Triggers

**Run this SQL** in your Supabase SQL Editor **after Step 1**:

```sql
-- File: setup_gta_lowrise_triggers.sql
```

This creates:
- SMS notification trigger (fires on INSERT)
- AI auto-analysis trigger (fires on INSERT)

**Expected output:**
```
✅ GTA Lowrise triggers created successfully!
📱 SMS notifications will be sent to: 6478981739, 4168296121, 4163994289
🤖 AI auto-analysis will run on every new lead
🔔 Triggers active on: gta_lowrise_leads
```

---

### Step 3: Deploy Dashboard Updates

The code changes have been made. Now deploy to Vercel:

```bash
cd /Users/fahadjaved/Documents/Python/dashboard/property-dashboard

# Commit changes
git add .
git commit -m "🏘️ Add GTA Lowrise Leads with full feature parity"

# Deploy to Vercel
npx vercel --prod
```

Or push to GitHub if auto-deployment is enabled:

```bash
git push origin main
```

---

## 🎨 Branding

**GTA Lowrise Leads uses teal/cyan colors:**
- Primary: `bg-teal-600` / `text-teal-600`
- Hover: `bg-teal-700` / `hover:bg-teal-700`
- Lighter: `bg-teal-50` / `text-teal-50`

**Compared to:**
- **FJ Leads**: Blue (`bg-blue-600`)
- **Precon Factory**: Purple (`bg-purple-600`)

---

## 🧪 Testing the Setup

### Test 1: Insert a New Lead

```sql
INSERT INTO gta_lowrise_leads (
  firstname, 
  lastname, 
  email, 
  phone, 
  project_name,
  project_id,
  message,
  isagent, 
  status, 
  source
)
VALUES (
  'Test', 
  'User', 
  'test@gtalowrise.com', 
  '416-555-1234',
  'Luxury Townhomes',
  '12345',
  'I am interested in learning more about this project. Looking to buy within 3 months. Budget is around $800k.',
  false, 
  'new', 
  'gta-lowrise-website'
);
```

**Expected results within 5 seconds:**
1. ✅ SMS sent to 3 phone numbers with lead details
2. ✅ AI analysis complete (check `ai_score`, `ai_reasoning`, etc.)
3. ✅ Dashboard shows new lead at `/gta-lowrise-leads`

---

### Test 2: Check Dashboard

1. Navigate to https://property-dashboard-three.vercel.app/gta-lowrise-leads
2. Verify:
   - ✅ Lead appears in table
   - ✅ Teal color scheme active
   - ✅ All filters work
   - ✅ Search works

---

### Test 3: Open Lead Modal

1. Click on the test lead
2. Verify:
   - ✅ AI Lead Intelligence section shows score & insights
   - ✅ Can log calls
   - ✅ Can generate & send SMS
   - ✅ Can update temperature
   - ✅ No duplicate history (first lead)

---

### Test 4: Test Duplicate Detection

Insert another lead with same email:

```sql
INSERT INTO gta_lowrise_leads (
  firstname, lastname, email, phone, message, isagent, status, source
)
VALUES (
  'Test', 'User', 'test@gtalowrise.com', '416-555-1234',
  'Following up on previous inquiry', false, 'new', 'gta-lowrise-email'
);
```

Open the second lead and verify:
- ✅ Shows "Duplicate Lead Detected" section
- ✅ Lists the first lead with all details

---

## 📊 Database Schema Summary

### gta_lowrise_leads table columns:

**Basic Info (Existing):**
- id, firstname, lastname, email, phone
- project_name, project_id, redirect_link
- subject, message, source, user_agent, referrer
- isagent, status, priority, template_type
- created_at, updated_at

**Call Tracking (Added):**
- call_count (INTEGER)
- call_history (JSONB)
- last_note (TEXT)

**Temperature (Added):**
- lead_temperature (TEXT: hot/warm/cold)

**AI Analysis (Added):**
- ai_score (INTEGER 0-100)
- ai_confidence (TEXT: high/medium/low)
- ai_budget (TEXT)
- ai_timeline (TEXT)
- ai_priorities (JSONB array)
- ai_buyer_type (TEXT)
- ai_urgency (TEXT: high/medium/low)
- ai_reasoning (TEXT)
- ai_key_points (JSONB array)
- ai_analyzed_at (TIMESTAMPTZ)

---

## 🔄 How It Works

### When a New Lead Comes In:

```
Lead submitted to gta_lowrise_leads
    ↓
Database INSERT
    ↓
Two triggers fire simultaneously:
    ├─→ SMS Notification Trigger
    │   ├─→ Calls /api/leads/notify
    │   ├─→ Formats message with lead details
    │   └─→ Sends SMS to 3 phones via Twilio
    │
    └─→ AI Auto-Analysis Trigger
        ├─→ Calls /api/leads/auto-analyze
        ├─→ DeepSeek AI analyzes lead (3-5 seconds)
        ├─→ Generates score, insights, buyer type, etc.
        └─→ Stores in database (ai_* columns)
    ↓
Lead appears in dashboard with all data
    ↓
User opens lead → Modal auto-fetches:
    ├─→ Duplicate history from all 3 tables
    └─→ AI project recommendations
```

---

## 🎯 What's Different from FJ/Precon?

| Feature | FJ Leads | Precon Factory | GTA Lowrise |
|---------|----------|----------------|-------------|
| **Table** | fj_leads | precon_factory_leads | gta_lowrise_leads |
| **Route** | /fj-leads | /precon-leads | /gta-lowrise-leads |
| **Brand Color** | Blue | Purple | **Teal** |
| **SMS Brand** | `brand: 'fj'` | `brand: 'precon'` | `brand: 'gta'` |

**Everything else is identical!**

---

## 🛠️ Troubleshooting

### Issue: No SMS notifications
**Solution:** Check:
1. Triggers exist: `SELECT * FROM pg_trigger WHERE tgname LIKE '%gta_lowrise%';`
2. Twilio credentials in Vercel environment variables
3. Check Supabase logs for trigger errors

### Issue: No AI analysis
**Solution:** Check:
1. DeepSeek API key in Vercel environment variables
2. Trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'auto_analyze_new_gta_lowrise_lead';`
3. Check `/api/leads/auto-analyze` endpoint logs

### Issue: Dashboard page not found
**Solution:**
1. Verify deployment: `npx vercel --prod`
2. Check file exists: `/app/gta-lowrise-leads/page.tsx`
3. Clear browser cache

---

## 📝 Files Created/Modified

### New Files:
- ✅ `setup_gta_lowrise_leads.sql` - Database column additions
- ✅ `setup_gta_lowrise_triggers.sql` - Trigger setup
- ✅ `app/gta-lowrise-leads/page.tsx` - Dashboard page
- ✅ `GTA_LOWRISE_LEADS_SETUP.md` - This file

### Modified Files:
- ✅ `components/Sidebar.tsx` - Added navigation link
- ✅ `app/api/leads/notify/route.ts` - Added GTA Lowrise support
- ✅ `app/api/leads/duplicate-history/route.ts` - Added table to search

---

## ✨ Success!

Once all steps are complete, you'll have:

- 🎯 Full-featured GTA Lowrise Leads dashboard
- 📱 Automatic SMS notifications
- 🤖 AI-powered lead analysis & scoring
- 🔍 Duplicate detection across all brands
- 📊 Project recommendations
- 💬 SMS sending capabilities
- 📞 Call tracking & history
- 🌡️ Temperature management
- 📈 Bulk operations & export

**All with the same power as FJ and Precon Factory Leads!**

