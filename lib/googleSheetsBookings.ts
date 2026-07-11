const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

function isBookingTable(tableName: unknown): boolean {
  return (
    tableName === 'fj_bookings' ||
    tableName === 'precon_factory_bookings' ||
    tableName === 'gta_lowrise_bookings'
  )
}

function resolveBookingCompany(tableName: unknown): string {
  if (tableName === 'fj_bookings') return 'Fahad Javed Dashboard'
  if (tableName === 'precon_factory_bookings') return 'Precon Factory Dashboard'
  if (tableName === 'gta_lowrise_bookings') return 'GTA Lowrise'
  return 'Unknown'
}

export async function appendBookingToGoogleSheet(booking: Record<string, unknown>) {
  try {
    if (!SPREADSHEET_ID) {
      console.warn('GOOGLE_SHEETS_SPREADSHEET_ID not set, skipping booking sheet append')
      return
    }

    if (!isBookingTable(booking.table_name)) return

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

    const sheets = google.sheets({ version: 'v4', auth })

    const firstName =
      (booking.firstname as string) ||
      (booking.first_name as string) ||
      ((booking.full_name as string) || '').split(' ')[0] ||
      'N/A'
    const lastName =
      (booking.lastname as string) ||
      (booking.last_name as string) ||
      ((booking.full_name as string) || '').split(' ').slice(1).join(' ') ||
      'N/A'

    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/Toronto',
      dateStyle: 'medium',
      timeStyle: 'short',
    })

    const projectName = (booking.project_name as string) || 'N/A'
    const projectId = (booking.project_id as string) || 'N/A'
    const landingPage =
      (booking.project_url as string) ||
      (booking.redirect_link as string) ||
      'N/A'
    const company = resolveBookingCompany(booking.table_name)

    const sheetMessage = String(booking.message ?? '').trim()

    const row = [
      firstName,
      lastName,
      (booking.email as string) || 'N/A',
      (booking.phone as string) || 'N/A',
      projectName,
      projectId,
      landingPage,
      company,
      timestamp,
      'Booking',
      '',
      '',
      sheetMessage,
    ]

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:M',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    })

    console.log('Booking appended to Google Sheet successfully:', {
      firstName,
      lastName,
      projectName,
      company,
      tag: 'Booking',
    })
  } catch (error) {
    console.error('Error appending booking to Google Sheet:', error)
  }
}
