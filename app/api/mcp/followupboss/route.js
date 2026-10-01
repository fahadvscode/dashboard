import { NextResponse } from "next/server"
import mcpHttp from "../../../../lib/fubMcpHttp.js"
import mcpAuth from "../../../../lib/fubMcpAuth.js"

const { handleRpcBody, PROTOCOL } = mcpHttp
const { authConfigured, bearerAccepted, publicOrigin, unauthorizedHeader } = mcpAuth

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, MCP-Protocol-Version, Mcp-Protocol-Version",
  "Access-Control-Expose-Headers": "WWW-Authenticate, MCP-Protocol-Version",
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex",
}

function json(body, status, extra = {}) {
  return NextResponse.json(body, {
    status,
    headers: { ...CORS, "MCP-Protocol-Version": PROTOCOL, ...extra },
  })
}

function denied(request) {
  const origin = publicOrigin(request)
  if (!authConfigured()) {
    return json(
      { error: "Set FUB_MCP_TOKEN on the server before connecting Claude." },
      503,
      { "WWW-Authenticate": unauthorizedHeader(origin) }
    )
  }
  return json(
    { error: "Sign in to use Follow Up Boss." },
    401,
    { "WWW-Authenticate": unauthorizedHeader(origin) }
  )
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export function GET() {
  return json({ error: "This server accepts POST requests." }, 405, { Allow: "POST" })
}

export function DELETE() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(request) {
  if (!bearerAccepted(request.headers.get("authorization"))) return denied(request)
  let body
  try {
    body = await request.json()
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Invalid JSON." } }, 400)
  }
  const result = await handleRpcBody(body)
  if (result == null) return new NextResponse(null, { status: 202, headers: CORS })
  return json(result, 200)
}
