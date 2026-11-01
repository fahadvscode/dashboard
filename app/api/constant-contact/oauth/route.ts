import { NextRequest, NextResponse } from 'next/server'
import { buildConstantContactAuthUrl, type ConstantContactAccount } from '@/lib/constantContact'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function accountFromQuery(value: string | null): ConstantContactAccount {
  if (value === '3') return 'third'
  if (value === '2') return 'second'
  return 'primary'
}

export async function GET(request: NextRequest) {
  const account = accountFromQuery(request.nextUrl.searchParams.get('account'))
  try {
    return NextResponse.redirect(buildConstantContactAuthUrl(account))
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not start Constant Contact login.' },
      { status: 500 }
    )
  }
}
