import { NextResponse } from "next/server"
import mcpAuth from "../../../../../lib/fubMcpAuth.js"

const { authConfigured, clientRedirects, issueAccess, pkceMatches, readPayload, redirectMatches } = mcpAuth

export const dynamic = "force-dynamic"

function oauthError(error, description, status = 400) {
  return NextResponse.json(
    { error, error_description: description },
    { status, headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } }
  )
}

async function formBody(request) {
  const type = request.headers.get("content-type") || ""
  if (type.includes("application/json")) return request.json()
  const text = await request.text()
  return Object.fromEntries(new URLSearchParams(text))
}

export async function POST(request) {
  if (!authConfigured()) return oauthError("server_error", "FUB_MCP_TOKEN is not set.", 503)
  let body
  try {
    body = await formBody(request)
  } catch {
    return oauthError("invalid_request", "Could not read the token request.")
  }
  const grant = String(body.grant_type || "")
  if (grant === "refresh_token") {
    const payload = readPayload(String(body.refresh_token || ""))
    if (payload?.typ !== "refresh") return oauthError("invalid_grant", "Refresh token is not valid.")
    return NextResponse.json(issueAccess(), { headers: { "Cache-Control": "no-store" } })
  }
  if (grant !== "authorization_code") return oauthError("unsupported_grant_type", "Use authorization_code or refresh_token.")

  const code = readPayload(String(body.code || ""))
  if (code?.typ !== "code") return oauthError("invalid_grant", "Authorization code is not valid.")
  const clientId = String(body.client_id || "")
  const redirectUri = String(body.redirect_uri || "")
  if (code.client_id !== clientId || !redirectMatches(code.redirect_uri, redirectUri)) {
    return oauthError("invalid_grant", "Authorization code does not match this client.")
  }
  if (!pkceMatches(body.code_verifier, code.code_challenge)) {
    return oauthError("invalid_grant", "PKCE verification failed.")
  }
  try {
    const redirects = await clientRedirects(clientId)
    if (!redirects || !redirects.some((uri) => redirectMatches(uri, redirectUri))) {
      return oauthError("invalid_grant", "Client is not allowed to use this redirect.")
    }
  } catch {
    return oauthError("invalid_client", "Could not verify the Claude client.", 401)
  }
  return NextResponse.json(issueAccess(), { headers: { "Cache-Control": "no-store" } })
}
