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
