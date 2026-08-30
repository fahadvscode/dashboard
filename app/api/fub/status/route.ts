import { NextResponse } from 'next/server'
import { getFubEmbeddedAppSecret } from '@/lib/fubEmbeddedApp'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    configured: Boolean(getFubEmbeddedAppSecret()),
  })
}
