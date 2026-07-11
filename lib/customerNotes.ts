/** Customer free-text from forms; Supabase email leads use `notes`, some tables use `message`. */
export function resolveCustomerNotes(record: Record<string, unknown>): string {
  return String(record.notes ?? record.message ?? '').trim()
}
