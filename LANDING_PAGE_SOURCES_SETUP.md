# Landing Page Sources (auto setup)

Register any lead table once. The form generates **one full SQL script**. Run it in Supabase and new inserts get **email + Google Sheet**, and show on **Landing Pages Leads**.

## Add a new landing page

1. Open dashboard → **Landing Page Sources**.
2. Enter:
   - **Table name** (e.g. `caledon_station_homes_leads`) — created by the SQL if it does not exist
   - **Display name** (e.g. `Caledon Station`)
   - **Site URL** (optional)
3. Click **Save & generate full SQL** (or **Generate SQL only**).
4. Copy the SQL → run once in Supabase SQL Editor.
5. Point the website form at that table and submit a test lead (needs a name + email).

The generated SQL includes:

- Registry row (`landing_page_lead_sources`) so notify/sheets treat it as a landing page
- `CREATE TABLE IF NOT EXISTS` with standard lead columns
- RLS policies
- `AFTER INSERT` trigger → `/api/leads/notify` (email + Google Sheet)

Expected columns (any mix is fine):

- `firstname`/`lastname` **or** `first_name`/`last_name`
- `email`, `phone`
- optional: `is_broker` / `is_realtor` / `realtor`, `project_name`, `source`, `form_location`, `form_type`, `notes`, UTMs, etc.

## How it works

```
INSERT into your_table
  → pg_net trigger POSTs row + table_name to /api/leads/notify
  → notify looks up table in landing_page_lead_sources
  → email + Google Sheet row
  → Landing Pages Leads lists all enabled sources dynamically
```

## Notes

- Built-in pages still work even before you run the registry SQL.
- Disabling a source stops notifications and hides it from the leads list.
- Removing a source only deletes the registry row — not the lead table or trigger.
- Admin SMS is currently off in `/api/leads/notify`.
