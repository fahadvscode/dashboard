import { NextRequest, NextResponse } from 'next/server'
import { handleConstantContactRpc } from '@/lib/constantContactMcp'
import mcpAuth from '@/lib/fubMcpAuth.js'

const { authConfigured, bearerAccepted, publicOrigin, unauthorizedHeader } = mcpAuth as {
  authConfigured: () => boolean
  bearerAccepted: (header: string | null) => boolean
  publicOrigin: (request: NextRequest) => string
  unauthorizedHeader: (origin: string, resourcePath?: string) => string
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const RESOURCE = '/api/mcp/constant-contact'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, MCP-Protocol-Version, Mcp-Protocol-Version',
  'Access-Control-Expose-Headers': 'WWW-Authenticate, MCP-Protocol-Version',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex',
}

function json(body: unknown, status: number, extra: Record<string, string> = {}) {
  return NextResponse.json(body, {
    status,
    headers: { ...CORS, 'MCP-Protocol-Version': '2025-03-26', ...extra },
  })
}

function denied(request: NextRequest) {
  const origin = publicOrigin(request)
  if (!authConfigured()) {
    return json(
      { error: 'Set FUB_MCP_TOKEN on the server before connecting Claude.' },
      503,
      { 'WWW-Authenticate': unauthorizedHeader(origin, RESOURCE) }
    )
  }
  return json(
    { error: 'Sign in to use Constant Contact.' },
    401,
    { 'WWW-Authenticate': unauthorizedHeader(origin, RESOURCE) }
  )
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export function GET() {
  return json({ error: 'This server accepts POST requests.' }, 405, { Allow: 'POST' })
}

export function DELETE() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(request: NextRequest) {
  if (!bearerAccepted(request.headers.get('authorization'))) return denied(request)
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Invalid JSON.' } }, 400)
  }
  const result = await handleConstantContactRpc(body)
  if (result == null) return new NextResponse(null, { status: 202, headers: CORS })
  return json(result, 200)
}
