import { NextResponse } from "next/server"
import mcpAuth from "../../../../../lib/fubMcpAuth.js"

const { publicOrigin, protectedResourceMetadata } = mcpAuth

export const dynamic = "force-dynamic"

export function GET(request) {
  return NextResponse.json(protectedResourceMetadata(publicOrigin(request)), {
    headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" },
  })
}
