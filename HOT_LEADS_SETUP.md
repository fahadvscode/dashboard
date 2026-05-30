# Hot Leads Setup

The **Hot Leads** section on the home page (`/`) stores your active working list in Supabase.

## One-time database setup

1. Open your [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql).
2. Copy and run the full contents of [`database/setup_hot_leads.sql`](database/setup_hot_leads.sql).
3. Confirm the `hot_leads` table exists in **Table Editor**.

### Is the SQL safe?

Yes. The script is **additive only**:

- Creates a **new** table `hot_leads` only (`CREATE TABLE IF NOT EXISTS`).
- Does **not** `DROP`, `DELETE`, or `TRUNCATE` any existing tables or data (`fj_leads`, `precon_factory_leads`, properties, etc.).
- Does **not** change your app code.
- Safe to **re-run** if needed (indexes use `IF NOT EXISTS`; policy/trigger on `hot_leads` are refreshed without removing rows).

Removing someone from the Hot Leads UI only deletes that row in `hot_leads`, not the original lead in other tables.

## Environment

Uses the same Supabase env vars as the rest of the dashboard:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client reads)
- `SUPABASE_SERVICE_KEY` (API writes via service role)

## Usage

- **Home page** — Hot Leads appears at the top of Canada Properties.
- **Add from leads** — Search across FJ, Precon, GTA Lowrise, Rental, and landing-page lead tables.
- **Add manually** — Name + optional phone, email, note (no link to a source lead).
- **Priority** — Red (Call now), Orange (In progress), Green (New on list).

Removing a lead from Hot Leads does **not** delete the original record in `fj_leads` or other tables.
