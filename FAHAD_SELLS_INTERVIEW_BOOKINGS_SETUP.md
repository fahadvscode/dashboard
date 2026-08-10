# Fahad Sells interview bookings (shared with careers site)

## Single table

Both the **Fahad Sells careers site** (`fahadsells`) and this **Property Dashboard** use:

`fahad_sells_interview_bookings`

- The **website** creates rows when a candidate books (`POST /api/careers/book`) with `status: scheduled` and `slot_start` / `slot_end`.
- The **dashboard** lists bookings, sends notifications (trigger → `/api/bookings/notify`), syncs Google Sheets, and can **cancel** only (no rescheduling — that would conflict with site slot logic).

## Status values (must match)

| Status       | Meaning |
|-------------|---------|
| `scheduled` | Holds a seat; careers slots API treats this as blocking capacity. |
| `cancelled` | Frees the seat; careers page can show the slot again. |

Use **`cancelled`** (British spelling), not `canceled`. The DB check constraint and partial unique indexes follow the site migration `005_interview_booking_status.sql`.

## Slot availability on the site

- `listActiveInterviewBookings()` → `status = 'scheduled'`.
- Partial unique indexes on `slot_start` and `application_id` **WHERE status = 'scheduled'**.
- Dashboard cancel updates status to `cancelled` via `lib/bookingCalendar.ts` so the site’s next slots fetch sees freed capacity.

## SQL to run in Supabase (if needed)

1. `setup_fahad_sells_interview_booking_notifications.sql`
2. `fix_fahad_sells_interview_bookings_rls.sql`
3. `fix_fahad_sells_interview_bookings_status_constraint.sql` (aligns with site migration 005)

If you previously ran an older dashboard constraint that allowed `canceled`, run step 3 again to migrate `canceled` → `cancelled` and restore partial indexes.
