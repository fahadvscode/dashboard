import { NextResponse } from 'next/server'
import { buildConstantContactAuthUrl } from '@/lib/constantContact'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    return NextResponse.redirect(buildConstantContactAuthUrl())
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not start Constant Contact login.' },
      { status: 500 }
    )
  }
}
