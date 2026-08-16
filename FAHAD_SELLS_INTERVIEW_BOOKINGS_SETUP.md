# Fahad Sells interview bookings (shared with careers site)

## Single table

Both the **Fahad Sells careers site** (`fahadsells`) and this **Property Dashboard** use:

`fahad_sells_interview_bookings`

- The **website** creates rows when a candidate books (`POST /api/careers/book`) with `status: scheduled` and `slot_start` / `slot_end`.
- The **dashboard** lists bookings, sends notifications (INSERT trigger → `/api/bookings/notify`), syncs Google Sheets, and can **cancel** from the admin UI. A Vercel cron (`/api/cron/interview-notify` every 2 minutes) also catches any scheduled interview that was not notified. When a candidate **reschedules or cancels** on fahadsells.com, an **UPDATE** trigger calls `/api/bookings/interview-updated` to move/cancel the Google Calendar event and text/email the candidate (admins get email only).

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

1. `setup_fahad_sells_interview_booking_notifications.sql` (new booking → notify)
2. `setup_fahad_sells_interview_booking_update_notifications.sql` (reschedule/cancel on site → calendar + candidate SMS/email)
3. `fix_fahad_sells_interview_bookings_rls.sql`
4. `fix_fahad_sells_interview_bookings_status_constraint.sql` (aligns with site migration 005)

If you previously ran an older dashboard constraint that allowed `canceled`, run step 3 again to migrate `canceled` → `cancelled` and restore partial indexes.
