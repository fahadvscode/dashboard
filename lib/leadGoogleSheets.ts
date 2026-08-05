function getSpreadsheetId(): string | undefined {
  return process.env.GOOGLE_SHEETS_SPREADSHEET_ID
}

export function formatLeadSheetTimestamp(createdAt: unknown): string {
  const hasValue =
    createdAt !== undefined && createdAt !== null && String(createdAt).trim() !== ''
  const date = hasValue ? new Date(String(createdAt)) : new Date()
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleString('en-US', {
      timeZone: 'America/Toronto',
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }
  return date.toLocaleString('en-US', {
    timeZone: 'America/Toronto',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

async function getGoogleSheetsClient() {
  const { google } = await import('googleapis')

  let privateKey = (process.env.GOOGLE_SHEETS_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  if (!privateKey.startsWith('-----BEGIN')) {
    privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----\n`
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  return google.sheets({ version: 'v4', auth })
}

export function quoteSheetTab(tabTitle: string): string {
  return `'${tabTitle.replace(/'/g, "''")}'`
}

export async function ensureSpreadsheetTab(tabTitle: string): Promise<void> {
  const spreadsheetId = getSpreadsheetId()
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID is not set')
  }

  const sheets = await getGoogleSheetsClient()
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title',
  })
  const titles =
    meta.data.sheets?.map((sheet) => sheet.properties?.title).filter(Boolean) ?? []
  if (titles.includes(tabTitle)) return

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: tabTitle } } }],
    },
  })
}

export async function updateSpreadsheetTabHeader(tabTitle: string, headers: string[]): Promise<void> {
  const spreadsheetId = getSpreadsheetId()
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID is not set')
  }

  const sheets = await getGoogleSheetsClient()
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quoteSheetTab(tabTitle)}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [headers] },
  })
}

export async function appendSpreadsheetTabRows(tabTitle: string, rows: string[][]): Promise<number> {
  if (!rows.length) return 0
  const spreadsheetId = getSpreadsheetId()
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID is not set')
  }

  const sheets = await getGoogleSheetsClient()
  const chunkSize = 200
  let appended = 0

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${quoteSheetTab(tabTitle)}!A:ZZ`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: chunk },
    })
    appended += chunk.length
  }

  return appended
}

export async function readLeadGoogleSheetValues(range = 'Sheet1!A:M'): Promise<string[][]> {
  const spreadsheetId = getSpreadsheetId()
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID is not set')
  }

  const sheets = await getGoogleSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  })
  return (res.data.values as string[][]) ?? []
}

export async function appendRowsToLeadGoogleSheet(rows: string[][]): Promise<number> {
  if (!rows.length) return 0
  const spreadsheetId = getSpreadsheetId()
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID is not set')
  }

  const sheets = await getGoogleSheetsClient()
  const chunkSize = 200
  let appended = 0

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A:M',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: chunk },
    })
    appended += chunk.length
  }

  return appended
}
