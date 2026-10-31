import { NextRequest, NextResponse } from 'next/server'
import { buildConstantContactAuthUrl, type ConstantContactAccount } from '@/lib/constantContact'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const account: ConstantContactAccount = request.nextUrl.searchParams.get('account') === '2' ? 'second' : 'primary'
  try {
    return NextResponse.redirect(buildConstantContactAuthUrl(account))
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not start Constant Contact login.' },
      { status: 500 }
    )
  }
}
