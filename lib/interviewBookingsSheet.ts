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

export async function appendInterviewBookingToGoogleSheet(
  record: Record<string, unknown>
): Promise<void> {
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
}
