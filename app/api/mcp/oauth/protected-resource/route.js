import { NextResponse } from "next/server"
import mcpAuth from "../../../../../lib/fubMcpAuth.js"

const { publicOrigin, protectedResourceMetadata } = mcpAuth

export const dynamic = "force-dynamic"

export function GET(request) {
  const fromQuery = request.nextUrl.searchParams.get("resource_path") || ""
  const resourcePath = fromQuery ? `/${fromQuery.replace(/^\/+/, "")}` : "/api/mcp/followupboss"
  return NextResponse.json(protectedResourceMetadata(publicOrigin(request), resourcePath), {
    headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" },
  })
}
