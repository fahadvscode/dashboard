# 🤖 AI Auto-Analysis Setup Guide

## Overview

This guide explains how to set up **automatic AI analysis** for all new leads. When a lead comes in (FJ or Precon Factory), the AI analyzes it within seconds and stores the results in the database.

---

## ⚡ How It Works

```
New Lead Submitted
    ↓
Database INSERT
    ↓
PostgreSQL Trigger Fires
    ↓
Calls /api/leads/auto-analyze
    ↓
DeepSeek AI Analyzes Lead
    ↓
Results Stored in Database
    ↓
Lead Card Shows AI Data Instantly
```

**Time:** 3-5 seconds from submission to AI analysis complete

---

## 🛠️ Setup Instructions

### Step 1: Add AI Columns to Database

Run this SQL in your Supabase SQL Editor:

```sql
-- File: add_ai_columns_to_leads.sql
```

**What it does:**
- Adds AI columns to `fj_leads` table
- Adds AI columns to `precon_factory_leads` table
- Creates indexes for fast queries

**Columns added:**
- `ai_score` (INTEGER) - Lead score 0-100
- `ai_confidence` (TEXT) - high, medium, low
- `ai_budget` (TEXT) - Extracted budget
- `ai_timeline` (TEXT) - Extracted timeline
- `ai_priorities` (JSONB) - Array of priorities
- `ai_buyer_type` (TEXT) - Investor, End-user, etc.
- `ai_urgency` (TEXT) - high, medium, low
- `ai_reasoning` (TEXT) - AI's explanation
- `ai_key_points` (JSONB) - Key insights array
- `ai_analyzed_at` (TIMESTAMPTZ) - When analyzed

---

### Step 2: Set Up Auto-Analysis Triggers

Run this SQL in your Supabase SQL Editor:

```sql
-- File: setup_ai_auto_analysis.sql
```

**What it does:**
- Creates PostgreSQL trigger on `fj_leads` INSERT
- Creates PostgreSQL trigger on `precon_factory_leads` INSERT
- Triggers call `/api/leads/auto-analyze` API endpoint
- Uses `pg_net` extension for async HTTP calls

**Important:** Update the `dashboard_base_url` in the SQL:
```sql
dashboard_base_url TEXT := 'https://property-dashboard-three.vercel.app';
```

---

### Step 3: Verify Setup

After running the SQL, check if triggers exist:

```sql
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('auto_analyze_new_fj_lead', 'auto_analyze_new_precon_lead');
```

You should see 2 triggers.

---

### Step 4: Test the System

**Option A: Submit a Test Lead**
1. Go to your lead form (FJ or Precon Factory)
2. Submit a test lead
3. Wait 5 seconds
4. Check the lead in your dashboard
5. Should see AI score and insights already loaded

**Option B: Manual Test via SQL**
```sql
-- Insert a test lead
INSERT INTO fj_leads (firstname, lastname, email, phone, message, project_name, source, status, isagent)
VALUES ('John', 'Test', 'john@test.com', '1234567890', 'Looking for a 2BR condo in downtown Toronto, budget around $700k, need parking. Looking to move in Q2 2025.', 'Sky Tower', 'Website Form', 'new', false);

-- Wait 5 seconds, then check
SELECT id, firstname, ai_score, ai_urgency, ai_buyer_type, ai_analyzed_at
FROM fj_leads
WHERE email = 'john@test.com'
ORDER BY created_at DESC
LIMIT 1;
```

If `ai_score` is populated, it's working! ✅

---

## 📊 What Gets Stored

For every new lead, AI automatically stores:

```json
{
  "ai_score": 85,
  "ai_confidence": "high",
  "ai_budget": "$650k-$750k",
  "ai_timeline": "Q2 2025 (April-June)",
  "ai_priorities": ["Downtown location", "2 bedrooms", "Parking"],
  "ai_buyer_type": "End-user",
  "ai_urgency": "high",
  "ai_reasoning": "Detailed inquiry with specific budget, timeline, and requirements. Shows clear intent to purchase.",
  "ai_key_points": [
    "Specific budget range mentioned ($700k)",
    "Clear timeline (Q2 2025)",
    "Must-have: parking and downtown location"
  ],
  "ai_analyzed_at": "2025-12-14T10:30:45.123Z"
}
```

---

## 🎯 Frontend Integration

The frontend automatically reads AI data from the database:

### FJ Leads & Precon Leads Pages
```typescript
// Lead cards show AI score badge
{lead.ai_score && (
  <span className={getScoreColor(lead.ai_score)}>
    {lead.ai_score >= 80 ? '🔥 HOT' : 
     lead.ai_score >= 50 ? '⭐ WARM' : '❄️ COLD'}
  </span>
)}
```

### Lead Detail Modal
```typescript
// AI section loads instantly from database
{lead.ai_score && (
  <div>
    <h3>AI Score: {lead.ai_score}/100</h3>
    <p>Budget: {lead.ai_budget}</p>
    <p>Timeline: {lead.ai_timeline}</p>
    <p>Urgency: {lead.ai_urgency}</p>
    ...
  </div>
)}
```

### AI Lead Insights Dashboard
```typescript
// Shows all leads sorted by AI score
const sortedLeads = leads.sort((a, b) => 
  (b.ai_score || 0) - (a.ai_score || 0)
)
```

---

## 🔧 Monitoring & Troubleshooting

### Check if Analysis Ran
```sql
-- See recent AI analyses
SELECT 
  id,
  firstname,
  lastname,
  ai_score,
  ai_urgency,
  ai_analyzed_at,
  created_at,
  EXTRACT(EPOCH FROM (ai_analyzed_at - created_at)) as seconds_to_analyze
FROM fj_leads
WHERE ai_analyzed_at IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

### Find Unanalyzed Leads
```sql
-- Leads that haven't been analyzed yet
SELECT id, firstname, lastname, email, created_at
FROM fj_leads
WHERE ai_analyzed_at IS NULL
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Manually Trigger Analysis
If a lead wasn't analyzed automatically, you can trigger it manually:

```bash
curl -X POST https://property-dashboard-three.vercel.app/api/leads/auto-analyze \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "LEAD_ID_HERE",
    "tableName": "fj_leads",
    "lead": {
      "id": "LEAD_ID_HERE",
      "firstname": "John",
      "lastname": "Doe",
      "email": "john@example.com",
      "phone": "1234567890",
      "message": "Lead message here...",
      "project_name": "Sky Tower",
      "isagent": false,
      "status": "new",
      "source": "Website"
    }
  }'
```

---

## 📈 Performance

### Typical Timeline
- **Lead submitted**: 0 seconds
- **Trigger fires**: <1 second
- **AI analysis**: 3-4 seconds
- **Results stored**: <1 second
- **Total**: ~5 seconds

### Database Impact
- Minimal - Single UPDATE query per lead
- Indexed columns for fast filtering
- No performance degradation

### API Rate Limiting
- DeepSeek AI: No rate limits on current plan
- Can handle 100+ leads per hour
- Queued processing if needed

---

## 🚨 Common Issues

### 1. "AI analysis not running"
**Check:**
- Is `pg_net` extension enabled?
- Are triggers created? (Run verification SQL)
- Is the API URL correct in trigger?
- Check Supabase logs

### 2. "Analysis taking too long"
**Possible causes:**
- DeepSeek API slow (rare)
- Network issues
- Cold start (first request of the day)

**Solution:** Analysis retries automatically

### 3. "Some leads not analyzed"
**Check:**
```sql
SELECT COUNT(*) as total,
       COUNT(ai_analyzed_at) as analyzed,
       COUNT(*) - COUNT(ai_analyzed_at) as not_analyzed
FROM fj_leads
WHERE created_at > NOW() - INTERVAL '7 days';
```

**Fix:** Run batch analysis on missing leads

---

## 🔐 Security

### API Endpoint Protection
- Uses Supabase Service Key
- Only callable by database triggers or authorized requests
- Rate limiting on API routes

### Data Privacy
- Lead data sent to DeepSeek AI for analysis
- No data stored by DeepSeek (per their policy)
- Results stored in your Supabase database

---

## 📝 Environment Variables

Make sure these are set in Vercel:

```bash
DEEPSEEK_API_KEY=your_deepseek_api_key
SUPABASE_SERVICE_KEY=your_service_key_here
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## ✅ Verification Checklist

- [ ] Ran `add_ai_columns_to_leads.sql` in Supabase
- [ ] Ran `setup_ai_auto_analysis.sql` in Supabase
- [ ] Updated `dashboard_base_url` in trigger SQL
- [ ] Verified triggers exist (2 triggers)
- [ ] Tested with a sample lead
- [ ] Confirmed AI data appears in database
- [ ] Checked frontend displays AI score
- [ ] Verified AI Lead Insights dashboard works
- [ ] Monitored first 10 real leads

---

## 🎉 Success Indicators

You'll know it's working when:
- ✅ New leads show AI score within 5 seconds
- ✅ Lead cards display score badges automatically
- ✅ AI Lead Insights dashboard populates
- ✅ Hot leads (80+) appear in priority section
- ✅ No manual analysis needed

---

**Setup Time:** 10 minutes  
**Status:** Production Ready  
**Last Updated:** December 2025

