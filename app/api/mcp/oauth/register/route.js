import { NextResponse } from "next/server"
import mcpAuth from "../../../../../lib/fubMcpAuth.js"

const { authConfigured, issueClient, redirectAllowed } = mcpAuth

export const dynamic = "force-dynamic"

function oauthError(error, description, status = 400) {
  return NextResponse.json({ error, error_description: description }, { status })
}

export async function POST(request) {
  if (!authConfigured()) return oauthError("server_error", "FUB_MCP_TOKEN is not set.", 503)
  let body
  try {
    body = await request.json()
  } catch {
    return oauthError("invalid_client_metadata", "Registration body must be JSON.")
  }
  const redirects = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter((uri) => redirectAllowed(String(uri))) : []
  if (redirects.length === 0) {
    return oauthError("invalid_redirect_uri", "Redirect URI must be the Claude callback or a localhost callback.")
  }
  const now = Math.floor(Date.now() / 1000)
  return NextResponse.json({
    client_id: issueClient(redirects),
    client_id_issued_at: now,
    client_secret_expires_at: 0,
    redirect_uris: redirects,
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    client_name: String(body.client_name || "Claude"),
  })
}
