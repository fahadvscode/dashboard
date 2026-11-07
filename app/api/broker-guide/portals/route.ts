import { readFile } from 'fs/promises'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { brokerCodeMatches } from '@/lib/brokerGuide'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const directoryPath = path.join(process.cwd(), 'content/broker-portal-directory.html')

export async function GET(request: NextRequest) {
  if (!brokerCodeMatches(request.headers.get('x-broker-code'))) {
    return NextResponse.json({ error: 'Incorrect access code.' }, { status: 401 })
  }
  const html = await readFile(directoryPath, 'utf8')
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  })
}
