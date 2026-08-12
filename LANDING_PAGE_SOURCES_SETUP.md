# Landing Page Sources (auto setup)

Register any lead table once. New inserts get **email + SMS + Google Sheet**, and show on **Landing Pages Leads** — without more code changes.

## One-time Supabase setup

Run in Supabase SQL Editor:

1. `setup_landing_page_lead_sources.sql` — creates the registry + seeds existing pages

## Add a new landing page (ongoing)

1. Create your lead table in Supabase (website form inserts into it).
2. Open dashboard → **Landing Page Sources**.
3. Enter:
   - **Table name** (e.g. `my_project_leads`)
   - **Display name** (e.g. `My Project`)
   - **Site URL** (optional)
4. Click **Save & generate SQL**.
5. Copy the SQL → run in Supabase (RLS + `AFTER INSERT` notify trigger).
6. Submit a test lead.

Expected columns (any mix is fine):

- `firstname`/`lastname` **or** `first_name`/`last_name`
- `email`, `phone`
- optional: `is_broker` / `is_realtor` / `realtor`, `project_name`, `source`, `form_location`, `form_type`, `notes`, UTMs, etc.

## How it works

```
INSERT into your_table
  → pg_net trigger POSTs row + table_name to /api/leads/notify
  → notify looks up table in landing_page_lead_sources (builtins if registry missing)
  → email + SMS + Google Sheet row
  → Landing Pages Leads lists all enabled sources dynamically
```

## Notes

- Built-in pages still work even before you run the registry SQL.
- Disabling a source stops notifications and hides it from the leads list.
- Removing a source only deletes the registry row — not the lead table or trigger.
