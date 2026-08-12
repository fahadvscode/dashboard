# Hawthorne on Trafalgar leads

Supabase table: **`public.hawthorne_trafalgar_leads`**

Columns (do not ALTER from dashboard):  
`id`, `created_at`, `firstname`, `lastname`, `email`, `phone`, `is_broker`, `project_name`, `source`, `form_location`, `status`, `priority`, `notes`

## Supabase (run in order)

1. `fix_hawthorne_trafalgar_leads_rls.sql`
2. `setup_hawthorne_trafalgar_lead_notifications.sql`

## Deploy

Push to `main` / Vercel so `/api/leads/notify` includes Hawthorne Trafalgar handling (email, SMS, Google Sheet).

## Verify

New VIP form submit → SMS, email, Google Sheet row → **Landing Pages Leads** → **Hawthorne Trafalgar** filter.

CRM (call log / temperature) is disabled until optional CRM columns are added later.
