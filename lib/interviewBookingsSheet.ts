import { resolveCustomerNotes } from '@/lib/customerNotes'
import { sendSheetRowToFollowUpBoss } from '@/lib/fubLeadInquiry'
import { INTERVIEW_BRAND_NAME, interviewHeading } from '@/lib/interviewBookingConstants'
import {
  appendSpreadsheetTabRows,
  ensureSpreadsheetTab,
  quoteSheetTab,
  readLeadGoogleSheetValues,
  updateSpreadsheetTabHeader,
} from '@/lib/leadGoogleSheets'

export const INTERVIEW_BOOKINGS_SHEET_TAB = 'Interview Bookings'

const SKIP_SHEET_KEYS = new Set(['table_name'])

export function interviewBookingSheetColumnKeys(record: Record<string, unknown>): string[] {
  return Object.keys(record)
    .filter((key) => !SKIP_SHEET_KEYS.has(key))
    .sort()
}

function formatInterviewBookingSheetCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function rowForHeaders(record: Record<string, unknown>, headers: string[]): string[] {
  return headers.map((header) => formatInterviewBookingSheetCell(record[header]))
}

function mergeHeaderRow(existing: string[], record: Record<string, unknown>): string[] {
  const merged = [...existing]
  for (const key of interviewBookingSheetColumnKeys(record)) {
    if (!merged.includes(key)) merged.push(key)
  }
  return merged
}

function interviewBookingFubRow(record: Record<string, unknown>): string[] {
  const firstName = String(record.firstname || record.first_name || 'N/A')
  const lastName = String(record.lastname || record.last_name || '')
  const heading = interviewHeading(record)
  const when = [record.appointment_date, record.appointment_time].filter(Boolean).join(' ')
  const notes = resolveCustomerNotes(record)
  const message = [when, notes].filter(Boolean).join(' — ')
  return [
    firstName,
    lastName,
    String(record.email || 'N/A'),
    String(record.phone || 'N/A'),
    heading,
    'N/A',
    'N/A',
    INTERVIEW_BRAND_NAME,
    '',
    'Booking',
    '',
    '',
    message,
  ]
}

export async function appendInterviewBookingToGoogleSheet(
  record: Record<string, unknown>
): Promise<void> {
  try {
  await ensureSpreadsheetTab(INTERVIEW_BOOKINGS_SHEET_TAB)

  const headerRange = `${quoteSheetTab(INTERVIEW_BOOKINGS_SHEET_TAB)}!1:1`
  const firstRow = await readLeadGoogleSheetValues(headerRange)
  const existingHeaders = firstRow[0]?.filter((cell) => cell !== undefined && cell !== '') ?? []

  const rowsToAppend: string[][] = []

  if (existingHeaders.length === 0) {
    const headers = interviewBookingSheetColumnKeys(record)
    rowsToAppend.push(headers)
    rowsToAppend.push(rowForHeaders(record, headers))
  } else {
    const headers = mergeHeaderRow(existingHeaders, record)
    if (headers.length > existingHeaders.length) {
      await updateSpreadsheetTabHeader(INTERVIEW_BOOKINGS_SHEET_TAB, headers)
    }
    rowsToAppend.push(rowForHeaders(record, headers))
  }

  await appendSpreadsheetTabRows(INTERVIEW_BOOKINGS_SHEET_TAB, rowsToAppend)
  } catch (error) {
    console.error('Error appending interview booking to Google Sheet:', error)
  }

  try {
    const fub = await sendSheetRowToFollowUpBoss(interviewBookingFubRow(record))
    console.log('Follow Up Boss interview inquiry:', {
      email: record.email,
      ok: fub.ok,
      status: fub.status,
      personId: fub.personId,
      skipped: fub.skipped,
      error: fub.error,
    })
  } catch (error) {
    console.error('Follow Up Boss interview inquiry error:', error)
  }
}
