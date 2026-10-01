import { NextResponse } from "next/server"
import mcpAuth from "../../../../../lib/fubMcpAuth.js"

const { authConfigured, clientRedirects, issueCode, passwordMatches, publicOrigin, redirectAllowed, redirectMatches } =
  mcpAuth

export const dynamic = "force-dynamic"

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function page({ title, body }) {
  return new NextResponse(
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; font-family: Georgia, serif; background: #f6f3ee; color: #1c1917; }
    main { max-width: 28rem; margin: 8vh auto; padding: 2rem; background: white; border: 1px solid #e7e5e4; }
    h1 { font-size: 1.4rem; margin: 0 0 0.75rem; }
    p, label { line-height: 1.45; }
    input { width: 100%; box-sizing: border-box; margin: 0.4rem 0 1rem; padding: 0.7rem; font-size: 1rem; }
    button { background: #1c1917; color: white; border: 0; padding: 0.75rem 1rem; font-size: 1rem; cursor: pointer; }
    .error { color: #9f1239; }
    .host { font-family: ui-monospace, monospace; font-size: 0.9rem; }
  </style>
</head>
<body><main>${body}</main></body>
</html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } }
  )
}

function hidden(name, value) {
  return `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}" />`
}

async function approvedRedirect(request, fields) {
  const clientId = String(fields.client_id || "")
  const redirectUri = String(fields.redirect_uri || "")
  const state = String(fields.state || "")
  const challenge = String(fields.code_challenge || "")
  const method = String(fields.code_challenge_method || "")
  if (!redirectAllowed(redirectUri) || method !== "S256" || !challenge) {
    return page({ title: "Cannot connect", body: "<h1>Cannot connect</h1><p>Claude did not send a valid sign-in request.</p>" })
  }
  let redirects
  try {
    redirects = await clientRedirects(clientId)
  } catch {
    redirects = null
  }
  if (!redirects || !redirects.some((uri) => redirectMatches(uri, redirectUri))) {
    return page({ title: "Cannot connect", body: "<h1>Cannot connect</h1><p>This Claude app is not allowed to receive the sign-in.</p>" })
  }
  const code = issueCode({
    clientId,
    redirectUri,
    codeChallenge: challenge,
    resource: String(fields.resource || ""),
  })
  const target = new URL(redirectUri)
  target.searchParams.set("code", code)
  if (state) target.searchParams.set("state", state)
  target.searchParams.set("iss", publicOrigin(request))
  return NextResponse.redirect(target, 302)
}

function loginForm(fields, error) {
  let host = "Claude"
  try {
    host = new URL(String(fields.redirect_uri || "")).host || host
  } catch {
    host = "Claude"
  }
  return page({
    title: "Connect Follow Up Boss",
    body: `<h1>Connect Follow Up Boss</h1>
      <p>This links your Follow Up Boss account to Claude on the web, phone, and desktop. You only do this once for your Claude account.</p>
      <p>Claude will return to <span class="host">${escapeHtml(host)}</span>.</p>
      ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
      <form method="post">
        ${hidden("client_id", fields.client_id)}
        ${hidden("redirect_uri", fields.redirect_uri)}
        ${hidden("state", fields.state)}
        ${hidden("code_challenge", fields.code_challenge)}
        ${hidden("code_challenge_method", fields.code_challenge_method)}
        ${hidden("resource", fields.resource)}
        ${hidden("scope", fields.scope)}
        <label for="password">Connector password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required />
        <button type="submit">Connect</button>
      </form>`,
  })
}

export async function GET(request) {
  if (!authConfigured()) {
    return page({
      title: "Not ready",
      body: "<h1>Not ready</h1><p>Add FUB_MCP_TOKEN in Vercel, then try connecting again.</p>",
    })
  }
  const fields = Object.fromEntries(request.nextUrl.searchParams.entries())
  return loginForm(fields, "")
}

export async function POST(request) {
  if (!authConfigured()) {
    return page({
      title: "Not ready",
      body: "<h1>Not ready</h1><p>Add FUB_MCP_TOKEN in Vercel, then try connecting again.</p>",
    })
  }
  const form = await request.formData()
  const fields = Object.fromEntries(Array.from(form.entries()).map(([key, value]) => [key, String(value)]))
  if (!passwordMatches(fields.password)) return loginForm(fields, "That password is wrong.")
  return approvedRedirect(request, fields)
}
