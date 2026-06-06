# Hawthorne East Village leads

Supabase table: **`public.hawthorne_east_village`**

Columns (do not ALTER from dashboard):  
`id`, `first_name`, `last_name`, `email`, `phone`, `interest`, `budget`, `timeline`, `form_type`, `page_path`, `source`, `utm_*`, `created_at`

## Supabase (run in order)

1. `fix_hawthorne_east_village_rls.sql`
2. `setup_hawthorne_east_village_lead_notifications.sql`

## Deploy

Push to `main` / Vercel so `/api/leads/notify` includes Hawthorne handling.

## Verify

New form submit → SMS, email, Google Sheet row → **Landing Pages Leads** → **Hawthorne East Village** filter.

CRM (call log / temperature) is disabled until optional CRM columns are added later.
