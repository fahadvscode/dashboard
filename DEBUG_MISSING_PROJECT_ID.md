# Debugging Missing Project ID in Lead Notifications

## Problem
When new leads are received in Supabase and notifications are sent, the `project_id` field is missing from the notifications (both SMS and email), even though all other fields are being sent correctly.

## Diagnostic Steps

### Step 1: Verify Column Exists and Check Data

Run the verification script in Supabase SQL Editor:

```sql
-- File: verify_and_fix_project_id.sql
```

This will:
- Confirm `project_id` column exists in all lead tables
- Show recent leads and their `project_id` values
- Display statistics on how many leads have NULL vs non-NULL `project_id`

**Expected Result:** If most/all leads show NULL for `project_id`, that's your issue!

### Step 2: Update Trigger with Enhanced Logging

Run the updated trigger script in Supabase SQL Editor:

```sql
-- File: fix_notify_trigger_with_logging.sql
```

This will:
- Update the `notify_new_lead()` function with detailed logging
- Show exactly what payload is being sent to the API
- Recreate all triggers (fj_leads, precon_factory_leads, gta_lowrise_leads)

### Step 3: Check the Logs

#### In Supabase (Database Logs):
1. Go to Supabase Dashboard → Database → Logs
2. Insert a test lead
3. Look for log entries showing:
   ```
   Project Name: [value]
   Project ID: [value or NULL]
   Redirect Link: [value or NULL]
   Full Payload: {...}
   ```

#### In Vercel (API Logs):
1. Go to Vercel Dashboard → Your Project → Logs
2. Insert a test lead
3. Look for log entries showing:
   ```
   Received Lead Notification Payload:
   Project Name: [value]
   Project ID: [value or undefined]
   ```

### Step 4: Identify the Issue

Compare the logs:

| Scenario | Database Log | API Log | Issue Location |
|----------|-------------|---------|----------------|
| `project_id: NULL` | Shows NULL | Shows `undefined` | **Data source** - Forms not sending project_id |
| `project_id: "123"` | Shows "123" | Shows `undefined` | **HTTP transmission** - payload issue |
| `project_id: "123"` | Shows "123" | Shows "123" | **Notification logic** - conditional display issue |

## Solutions Based on Findings

### Solution A: project_id is NULL in Database
**Root Cause:** Lead capture forms are not sending the `project_id` when submitting leads.

**Fix:** Update the forms that submit leads to include `project_id`:
- Check all form submission endpoints
- Ensure `project_id` is being extracted from URL parameters or form data
- Update form components to capture and send `project_id`

### Solution B: project_id Lost in HTTP Transmission
**Root Cause:** JSONB or pg_net is stripping NULL values or there's an encoding issue.

**Fix:** Already handled by the trigger - JSONB includes NULL values in the payload. If this is the issue, it's a pg_net bug.

### Solution C: project_id Exists But Not Displayed
**Root Cause:** The notification code has a conditional check that prevents empty/falsy values from showing.

**Fix:** The current code (lines 108-110 and 225-229) only shows `project_id` if it's truthy. This is actually correct behavior - we don't want to show "Project ID: null".

**Better Approach:** Show a placeholder when missing:
```typescript
message += `\n🆔 Project ID: ${lead.project_id || 'Not provided'}`
```

## Test Lead Insertion

After updating the trigger, test with a lead that includes `project_id`:

```sql
-- Test with project_id
INSERT INTO fj_leads (
  firstname, 
  lastname, 
  email, 
  phone, 
  project_name,
  project_id,
  redirect_link,
  source,
  status
) VALUES (
  'Test',
  'User',
  'test@example.com',
  '4165551234',
  'Test Project Name',
  'test-project-123',  -- Make sure this has a value
  'https://example.com/project',
  'test',
  'new'
);
```

Check if the notification includes the `project_id`.

## Quick Fix for Display

If you want to always show the Project ID field (even when empty), update the notification route:

```typescript
// Always show project ID (even if empty)
message += `\n🆔 Project ID: ${lead.project_id || 'Not specified'}`

// In email HTML:
<div class="data-row">
  <div class="data-label">Project ID</div>
  <div class="data-value">${lead.project_id || 'Not specified'}</div>
</div>
```

## Files Modified

1. **verify_and_fix_project_id.sql** - Diagnostic queries
2. **fix_notify_trigger_with_logging.sql** - Enhanced trigger with logging
3. **app/api/leads/notify/route.ts** - Added payload logging (lines 25-31)

## Next Steps

1. Run `verify_and_fix_project_id.sql` to check the data
2. Run `fix_notify_trigger_with_logging.sql` to update triggers
3. Insert a test lead and check both Supabase and Vercel logs
4. Based on findings, implement the appropriate solution
