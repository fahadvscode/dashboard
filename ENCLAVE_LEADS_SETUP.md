# Enclave leads — notifications & dashboard

The Supabase table is **`public.enclave`** (not `enclave_leads`). Existing columns:

`id`, `first_name`, `last_name`, `email`, `phone`, `model`, `collection`, `source`, `form_name`, `created_at`

**Do not run `setup_*_leads.sql` ALTER scripts on `enclave`** unless you intentionally add CRM columns later.

## 1. Run SQL in Supabase (in order)

Both scripts use `BEGIN` / `COMMIT`, only touch **`public.enclave`**, and do **not** delete or change existing rows.

| Script | What it does | What it does NOT do |
|--------|----------------|---------------------|
| `fix_enclave_rls.sql` | Adds read/insert/delete policies for dashboard + forms | No `ALTER COLUMN`, no `TRUNCATE`, no other tables |
| `setup_enclave_lead_notifications.sql` | Adds `AFTER INSERT` trigger for new leads only | No backfill on old rows; does not touch `notify_new_lead()` |

1. `fix_enclave_rls.sql` — dashboard can read Enclave leads
2. `setup_enclave_lead_notifications.sql` — SMS, email, Google Sheet on **new** inserts only

**Website forms:** If your Enclave site inserts with the **service role** key, RLS does not block it (service role bypasses RLS). If it uses the **anon** key, the insert policy in step 1 is required.

## 2. Deploy the dashboard app

Deploy to Vercel so `/api/leads/notify` includes Enclave handling:

```bash
npm run build
# then deploy (git push / vercel --prod)
```

## 3. Verify

- Insert a test row in `enclave` (or submit the live form)
- SMS to team numbers, email to configured addresses
- New row on the shared Google Sheet (`GOOGLE_SHEETS_SPREADSHEET_ID`)
- Lead appears under **Landing Pages Leads** → **Enclave** filter

## CRM note

Call logging and lead temperature are disabled for Enclave in the UI until optional CRM columns are added to `enclave` (separate migration, not included here).
