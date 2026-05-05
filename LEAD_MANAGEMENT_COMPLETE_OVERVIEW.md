# 📋 Complete Lead Management System - What We Do

## Overview

This document explains **everything** we do when leads come into the FJ Leads, Precon Factory Leads, and GTA Lowrise Leads systems.

---

## 🎯 The Three Lead Systems

| System | Table | Route | Color | SMS Brand |
|--------|-------|-------|-------|-----------|
| **FJ Leads** | `fj_leads` | `/fj-leads` | Blue | `fj` |
| **Precon Factory** | `precon_factory_leads` | `/precon-leads` | Purple | `precon` |
| **GTA Lowrise** | `gta_lowrise_leads` | `/gta-lowrise-leads` | Teal | `gta` |

**All three systems have identical functionality with different branding!**

---

## 🔄 Complete Workflow: When a Lead Comes In

### Automatic Actions (Database Triggers)

```
New Lead Inserted into Database
    ↓
Two Triggers Fire Simultaneously:
    │
    ├─→ 📱 SMS NOTIFICATION TRIGGER
    │   ├─→ Calls: /api/leads/notify
    │   ├─→ Formats: Lead details + dashboard link
    │   ├─→ Sends SMS to: 6478981739, 4168296121, 4163994289
    │   └─→ Time: < 1 second
    │
    └─→ 🤖 AI AUTO-ANALYSIS TRIGGER
        ├─→ Calls: /api/leads/auto-analyze
        ├─→ AI analyzes with DeepSeek
        ├─→ Generates: Score, insights, buyer type
        ├─→ Stores: ai_score, ai_confidence, ai_budget, etc.
        └─→ Time: 3-5 seconds
    ↓
Lead appears in dashboard with all data ready
```

---

## 📊 Database Structure

### Core Columns (All Tables)

**Lead Information:**
- `id` - UUID primary key
- `firstname`, `lastname` - Contact name
- `email`, `phone` - Contact details
- `project_name` - Interested project
- `project_id` - Project database ID
- `redirect_link` - Landing page URL
- `message` - Lead inquiry message
- `subject` - Email subject
- `source` - Lead origin (e.g., "fj-email", "precon-form")
- `isagent` - Boolean (Agent vs Buyer)
- `status` - Lead status (new, contacted, etc.)
- `priority` - Priority level
- `template_type` - Form template used
- `user_agent`, `referrer` - Browser info
- `created_at`, `updated_at` - Timestamps

**Call Tracking:**
- `call_count` - Total calls logged (INTEGER)
- `call_history` - Array of call records (JSONB)
  ```json
  [
    {
      "outcome": "Spoke – Interested",
      "note": "Will visit next week",
      "timestamp": "2025-01-04T10:30:00Z"
    }
  ]
  ```
- `last_note` - Most recent call note (TEXT)

**Lead Temperature:**
- `lead_temperature` - hot | warm | cold

**AI Analysis (10 columns):**
- `ai_score` - Lead quality score 0-100 (INTEGER)
- `ai_confidence` - high | medium | low
- `ai_budget` - Extracted budget range (TEXT)
- `ai_timeline` - Extracted timeline (TEXT)
- `ai_priorities` - Array of priorities (JSONB)
- `ai_buyer_type` - Investor | End-user | First-time buyer | etc.
- `ai_urgency` - high | medium | low
- `ai_reasoning` - Why this score? (TEXT)
- `ai_key_points` - Array of insights (JSONB)
- `ai_analyzed_at` - When analyzed (TIMESTAMPTZ)

---

## 🖥️ Dashboard Features

### 1. Main Table View

**Displays 14 columns:**
1. ☑️ Checkbox (bulk selection)
2. First Name
3. Last Name
4. Email (clickable mailto)
5. Phone (clickable tel)
6. Project Name
7. Project ID
8. Landing Page (clickable link)
9. Calls (badge with count)
10. Temperature (dropdown: hot/warm/cold)
11. Type (Agent/Buyer badge)
12. Status (new/contacted badge)
13. Received (time ago)
14. Actions (delete button)

**Features:**
- ✅ Click any row → Opens detail modal
- ✅ Sortable columns
- ✅ Hover effects
- ✅ Responsive design

---

### 2. Filter & Search Bar

**Filter Buttons:**
- **All** - Shows all leads with count
- **Agents** - Only agent leads with count
- **Buyers** - Only buyer leads with count
- **New** - Status = 'new' with count
- **Hot** 🔴 - Temperature = 'hot' with count
- **Warm** 🟢 - Temperature = 'warm' with count
- **Cold** 🟠 - Temperature = 'cold' with count

**Search:**
- Searches: Name, email, phone, project name
- Real-time filtering
- Case-insensitive

---

### 3. Bulk Actions

**Bulk Selection:**
- ☑️ Select individual leads with checkboxes
- ☑️ "Select All" checkbox in header
- Shows count: "Delete (5)" when leads selected

**Bulk Delete:**
- Confirmation dialog
- Deletes multiple leads at once
- Updates table in real-time

---

### 4. Export to CSV

**Export Button:**
- Exports **filtered** leads (respects search & filters)
- Columns: Name, Email, Phone, Project, Status, Type, Date
- Filename: `{brand}-leads-2025-01-04.csv`

---

## 📝 Lead Detail Modal (Opens on Click)

### Left Side - Lead Information

**Contact Details:**
- 👤 Full name
- 📧 Email (clickable mailto link)
- 📱 Phone (clickable tel link)
- 📍 Project name
- 🆔 Project ID (if available)
- 🌐 Landing page link (if available)

**Lead Meta:**
- Type: Agent or Buyer badge
- Received: Time ago (e.g., "2 hours ago")

**Message:**
- Full inquiry message (if provided)
- Subject line (if provided)

---

### Right Side - Actions & Tools

#### 1. **Log Call Section**

**Dropdown with 6 outcomes:**
- "Called – Left Voicemail"
- "Called – No Answer"
- "Spoke – Interested"
- "Spoke – Follow Up Needed"
- "Spoke – Not Ready"
- "Other"

**Note textarea:**
- Optional quick note
- Stored in call history

**Button:**
- "Log Call" → Increments call_count
- Adds entry to call_history JSONB
- Updates last_note
- Shows success/error feedback

---

#### 2. **AI SMS Generator**

**Search input:**
- Searches `canada_properties` table
- Searches by: project_name, city, builder, id
- Shows dropdown with 5 suggestions

**Auto-generates SMS:**
- Personalized with lead's first name
- Includes project details
- Brand-specific messaging (FJ/Precon/GTA)
- Fills into "Send SMS" textarea

**Example:**
```
Hi John! 👋

I noticed you're interested in Luxury Residences at King West.

This stunning project offers:
• Prime downtown location
• 1-3 bedroom suites
• Starting from $599,900
• VIP Platinum Access available!

Can I share the full brochure with you?

- FJ Team
```

---

#### 3. **Send SMS Section**

**Textarea:**
- Type or paste message
- 160+ character support
- Real-time character count (optional)

**Send Button:**
- Uses Twilio API
- Sends from branded number
- Logs conversation in `sms_conversations` table
- Shows success/error feedback

**Conditions:**
- Disabled if no phone number
- Disabled if textarea empty
- Shows "Sending…" while in progress

---

#### 4. **Lead Temperature Selector**

**Dropdown:**
- 🔴 Hot Lead
- 🟢 Warm Lead (default)
- 🟠 Cold Lead

**Actions:**
- Updates `lead_temperature` column
- Updates in real-time (no page refresh)
- Syncs with table view badge

---

#### 5. **Status & Priority Display**

- Status badge (new, contacted, etc.)
- Priority (high, medium, low)
- Read-only display

---

### AI Lead Intelligence Section

#### **Lead Score Card**

**Displays:**
- Large score: **75**/100
- Badge: 🔥 HOT | ⭐ WARM | ❄️ COLD
  - 80-100 = Hot (red)
  - 50-79 = Warm (green)
  - 0-49 = Cold (orange)
- Reasoning: 2-3 sentence explanation
- Confidence: HIGH | MEDIUM | LOW badge

**Example:**
```
Score: 82/100 🔥 HOT
Confidence: HIGH

"This lead shows strong buying intent with specific 
budget ($800k) and timeline (3 months). Detailed 
inquiry suggests serious buyer ready to move forward."
```

---

#### **Key Insights Panel**

**Extracted Information:**
- 💰 **Budget:** "$700k - $900k"
- ⏰ **Timeline:** "3-6 months"
- 🏠 **Buyer Type:** "First-time buyer"
- 🚨 **Urgency:** HIGH | MEDIUM | LOW badge
- 🎯 **Priorities:** Chips showing ["Location", "Amenities", "Parking"]

**Key Points (Bullets):**
- • Mentioned family size (2 kids)
- • Prefers ground floor units
- • Interested in builder incentives

---

#### **Project Recommendations**

**Shows top 3-5 matching projects:**

Each recommendation includes:
- Project name & builder
- **Match Score:** "92% Match" badge
- Location, bedrooms, price preview
- **Why this matches:** AI reasoning
- **Pitch:** Suggested talking point
- **Key Differentiators:** Feature chips
  - ✓ Pet-friendly
  - ✓ South-facing units
  - ✓ Walk to transit

**Example:**
```
The Residences at Queen & Spadina
Builder: Phantom Developments
92% Match

📍 Downtown Toronto • Phantom Developments
🏠 1-3 Bedrooms
💰 $599,900 - $1,299,900

Why this matches: Perfect for this buyer's $800k 
budget and downtown location preference. 3-month 
timeline aligns with spring 2025 occupancy.

💡 Pitch: "This project offers VIP incentives and 
the location you're looking for, right in the heart 
of downtown with TTC at your doorstep."

✓ Transit-adjacent
✓ Builder incentives available  
✓ Pet-friendly building
```

**Re-analyze Button:**
- Runs AI analysis again (on-demand)
- Updates score, insights, recommendations
- Shows loading spinner

---

### Duplicate Detection Section

**Checks all 3 lead tables:**
- `fj_leads`
- `precon_factory_leads`
- `gta_lowrise_leads`

**Matches by:**
- Exact email match
- Phone number match (normalized)
- Name + (email OR phone) match

**Shows for each duplicate:**
- 🔖 Table badge (FJ / Precon Factory / GTA Lowrise)
- 🌡️ Temperature badge
- 📍 Project name & ID
- 📊 Status & Type
- 📞 Calls logged count
- 📝 Last note
- 📅 When submitted (time ago)
- 💬 Subject (if different inquiry)

**Example:**
```
🟠 Duplicate Lead Detected (2 inquiries)

┌─────────────────────────────────────┐
│ FJ Leads • 🟢 Warm                  │
│ 2 weeks ago                         │
├─────────────────────────────────────┤
│ 📍 Project: Luxury Condos Downtown  │
│ 🆔 Project ID: 12345                │
│ Status: contacted                   │
│ Type: Buyer                         │
│ 📞 Calls Logged: 3                  │
│                                      │
│ Last Note: "Scheduled site visit    │
│ for next Tuesday"                   │
└─────────────────────────────────────┘
```

---

### Call History Timeline

**Shows all logged calls:**
- Most recent first
- Each entry shows:
  - Outcome (bold)
  - Note (if provided)
  - Time ago

**Example:**
```
Call History (5 entries)

┌─────────────────────────────────┐
│ Spoke – Interested              │
│ 2 hours ago                     │
│                                  │
│ Great conversation! Ready to    │
│ book site visit. Will call back │
│ tomorrow to confirm time.       │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Called – Left Voicemail         │
│ 1 day ago                       │
│                                  │
│ Left message about new project  │
│ launch and VIP pricing.         │
└─────────────────────────────────┘
```

**If no history:**
```
No calls logged yet. Use "Log Call" 
to start tracking touchpoints.
```

---

## 🔌 API Endpoints (Used by All Tables)

### 1. `/api/leads/notify`
**Purpose:** Send SMS notifications when new lead arrives  
**Trigger:** Database INSERT trigger  
**Sends to:** 3 phone numbers  
**Format:**
```
🔔 New FJ Lead!

👤 John Smith
📧 john@example.com
📱 416-555-1234
🏢 Project: Luxury Condos Downtown
🆔 Project ID: 12345
🌐 Landing Page: https://...
🎯 Type: Buyer
⏰ Just now

👉 View in Dashboard: https://...
```

---

### 2. `/api/leads/auto-analyze`
**Purpose:** AI analysis on new lead  
**Trigger:** Database INSERT trigger  
**AI:** DeepSeek Chat API  
**Stores:** All ai_* columns  
**Time:** 3-5 seconds

---

### 3. `/api/leads/analyze`
**Purpose:** On-demand AI analysis (Re-analyze button)  
**Called:** When user clicks "Re-analyze" in modal  
**Returns:** Full analysis JSON

---

### 4. `/api/leads/recommend-projects`
**Purpose:** Get AI project recommendations  
**Input:** Lead data  
**Output:** Top 3-5 matching projects with scores & reasoning

---

### 5. `/api/leads/log-call`
**Purpose:** Log call outcome & note  
**Updates:**
- Increments `call_count`
- Appends to `call_history` JSONB
- Updates `last_note`
**Returns:** Updated lead object

---

### 6. `/api/leads/send-sms`
**Purpose:** Send SMS via Twilio  
**Logs:** Saves to `sms_conversations` table  
**Parameters:**
- `to`: Phone number
- `message`: SMS body
- `leadName`: For reference
- `leadId`: Link conversation to lead
- `leadTable`: Which table (fj_leads / precon_factory_leads / gta_lowrise_leads)

---

### 7. `/api/leads/update-temperature`
**Purpose:** Update lead temperature (hot/warm/cold)  
**Parameters:**
- `table`: Which lead table
- `leadId`: Lead UUID
- `temperature`: hot | warm | cold

---

### 8. `/api/leads/delete`
**Purpose:** Bulk delete leads  
**Parameters:**
- `table`: Which lead table
- `leadIds`: Array of UUIDs

---

### 9. `/api/leads/duplicate-history`
**Purpose:** Find duplicate leads across all tables  
**Checks:** fj_leads, precon_factory_leads, gta_lowrise_leads  
**Matches by:** Email, phone, name  
**Returns:** Array of matching leads with full details

---

## 📱 SMS Features

### SMS Conversations Page (`/conversations`)

**Shows all SMS threads:**
- Groups messages by lead phone number
- Shows lead name & source
- Displays full conversation history
- Real-time updates via webhook

**Incoming SMS:**
- Handled by `/api/sms/webhook`
- Linked to lead by phone number
- Stored in `sms_conversations` table
- Shows in conversations page

---

## 🎨 Branding Differences

| Element | FJ Leads | Precon Factory | GTA Lowrise |
|---------|----------|----------------|-------------|
| **Primary Color** | Blue (`bg-blue-600`) | Purple (`bg-purple-600`) | Teal (`bg-teal-600`) |
| **Hover States** | `hover:bg-blue-700` | `hover:bg-purple-700` | `hover:bg-teal-700` |
| **Light Backgrounds** | `bg-blue-50` | `bg-purple-50` | `bg-teal-50` |
| **Badges** | `bg-blue-100 text-blue-800` | `bg-purple-100 text-purple-800` | `bg-teal-100 text-teal-800` |
| **AI Section** | Blue gradient | Purple gradient | Teal gradient |
| **Call Count Badge** | Blue | Purple | Teal |

---

## 🎯 Summary: What We Do for FJ, Precon Factory & GTA Lowrise Leads

✅ **Automatic SMS notifications** to 3 phone numbers  
✅ **AI auto-analysis** with lead scoring (0-100)  
✅ **AI insights extraction** (budget, timeline, buyer type, urgency)  
✅ **Project recommendations** with match scores & pitches  
✅ **Call logging** with outcomes & notes  
✅ **Call history timeline** with all touchpoints  
✅ **SMS sending** via Twilio integration  
✅ **AI SMS generation** personalized by project  
✅ **Lead temperature** management (hot/warm/cold)  
✅ **Duplicate detection** across all 3 brands  
✅ **Bulk operations** (select, delete, export)  
✅ **CSV export** of filtered leads  
✅ **Search & filtering** by multiple criteria  
✅ **Real-time updates** without page refresh  
✅ **Responsive design** for mobile & desktop  
✅ **Landing page tracking** with redirect links  

**Everything works identically across all three systems with different branding! 🎨**

