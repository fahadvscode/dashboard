import {
  appendSpreadsheetTabRows,
  ensureSpreadsheetTab,
  quoteSheetTab,
  readLeadGoogleSheetValues,
  updateSpreadsheetTabHeader,
} from '@/lib/leadGoogleSheets'

export const CLEANING_LEADS_SHEET_TAB = 'Cleaning Leads'

const SKIP_SHEET_KEYS = new Set(['table_name'])

export function cleaningLeadSheetColumnKeys(lead: Record<string, unknown>): string[] {
  return Object.keys(lead)
    .filter((key) => !SKIP_SHEET_KEYS.has(key))
    .sort()
}

export function formatCleaningLeadSheetCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function cleaningLeadRowForHeaders(
  lead: Record<string, unknown>,
  headers: string[]
): string[] {
  return headers.map((header) => formatCleaningLeadSheetCell(lead[header]))
}

function mergeHeaderRow(existing: string[], lead: Record<string, unknown>): string[] {
  const merged = [...existing]
  for (const key of cleaningLeadSheetColumnKeys(lead)) {
    if (!merged.includes(key)) merged.push(key)
  }
  return merged
}

/** Append one cleaning_leads row to the "Cleaning Leads" tab (creates tab + header row on first lead). */
export async function appendCleaningLeadToGoogleSheet(lead: Record<string, unknown>): Promise<void> {
  await ensureSpreadsheetTab(CLEANING_LEADS_SHEET_TAB)

  const headerRange = `${quoteSheetTab(CLEANING_LEADS_SHEET_TAB)}!1:1`
  const firstRow = await readLeadGoogleSheetValues(headerRange)
  const existingHeaders = firstRow[0]?.filter((cell) => cell !== undefined && cell !== '') ?? []

  const rowsToAppend: string[][] = []

  if (existingHeaders.length === 0) {
    const headers = cleaningLeadSheetColumnKeys(lead)
    rowsToAppend.push(headers)
    rowsToAppend.push(cleaningLeadRowForHeaders(lead, headers))
  } else {
    const headers = mergeHeaderRow(existingHeaders, lead)
    if (headers.length > existingHeaders.length) {
      await updateSpreadsheetTabHeader(CLEANING_LEADS_SHEET_TAB, headers)
    }
    rowsToAppend.push(cleaningLeadRowForHeaders(lead, headers))
  }

  await appendSpreadsheetTabRows(CLEANING_LEADS_SHEET_TAB, rowsToAppend)
}
