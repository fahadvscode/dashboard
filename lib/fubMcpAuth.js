const crypto = require("crypto")

const ACCESS_SECONDS = 60 * 60 * 24 * 30
const REFRESH_SECONDS = 60 * 60 * 24 * 90
const CODE_SECONDS = 60 * 10
const CLIENT_SECONDS = 60 * 60 * 24 * 365

function connectorPassword() {
  return String(process.env.FUB_MCP_TOKEN || "").trim()
}

function authConfigured() {
  return connectorPassword().length >= 16
}

function signingKey() {
  return crypto.createHash("sha256").update(`fub-mcp-v1:${connectorPassword()}`).digest()
}

function signPayload(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const mac = crypto.createHmac("sha256", signingKey()).update(body).digest("base64url")
  return `${body}.${mac}`
}

function readPayload(token) {
  if (!authConfigured()) return null
  const [body, mac] = String(token || "").split(".")
  if (!body || !mac) return null
  const expected = crypto.createHmac("sha256", signingKey()).update(body).digest()
  let got
  try {
    got = Buffer.from(mac, "base64url")
  } catch {
    return null
  }
  if (got.length !== expected.length || !crypto.timingSafeEqual(got, expected)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"))
    if (!payload || typeof payload !== "object") return null
    if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

function passwordMatches(input) {
  const expected = connectorPassword()
  const given = Buffer.from(String(input || ""))
  const wanted = Buffer.from(expected)
  if (!expected || given.length !== wanted.length) return false
  return crypto.timingSafeEqual(given, wanted)
}

function bearerAccepted(headerValue) {
  const raw = String(headerValue || "")
  const token = raw.toLowerCase().startsWith("bearer ") ? raw.slice(7).trim() : raw.trim()
  if (!token || !authConfigured()) return false
  if (passwordMatches(token)) return true
  const payload = readPayload(token)
  return payload?.typ === "access"
}

function publicOrigin(request) {
  const configured = String(process.env.FUB_MCP_PUBLIC_URL || "").trim().replace(/\/$/, "")
  if (configured) return configured
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000"
  const proto = request.headers.get("x-forwarded-proto") || (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https")
  return `${proto}://${host}`
}

function mcpResourceUrl(origin) {
  return `${origin}/api/mcp/followupboss`
}

function sameLoopback(registered, actual) {
  const loopback = new Set(["localhost", "127.0.0.1"])
  if (!loopback.has(registered.hostname) || !loopback.has(actual.hostname)) return false
  return registered.protocol === "http:" && actual.protocol === "http:" && registered.pathname === actual.pathname
}

function redirectAllowed(uri) {
  let url
  try {
    url = new URL(uri)
  } catch {
    return false
  }
  if (url.origin === "https://claude.ai" && url.pathname === "/api/mcp/auth_callback") return true
  if (url.origin === "https://claude.com" && url.pathname === "/api/mcp/auth_callback") return true
  if ((url.hostname === "localhost" || url.hostname === "127.0.0.1") && url.protocol === "http:") return true
  return false
}

function redirectMatches(registeredUri, actualUri) {
  if (registeredUri === actualUri) return true
  try {
    return sameLoopback(new URL(registeredUri), new URL(actualUri))
  } catch {
    return false
  }
}

function issueClient(redirectUris) {
  const now = Math.floor(Date.now() / 1000)
  return signPayload({ typ: "client", redirect_uris: redirectUris, iat: now, exp: now + CLIENT_SECONDS })
}

function issueCode({ clientId, redirectUri, codeChallenge, resource }) {
  const now = Math.floor(Date.now() / 1000)
  return signPayload({
    typ: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    resource: resource || "",
    iat: now,
    exp: now + CODE_SECONDS,
  })
}

function issueAccess() {
  const now = Math.floor(Date.now() / 1000)
  return {
    access_token: signPayload({ typ: "access", iat: now, exp: now + ACCESS_SECONDS }),
    refresh_token: signPayload({ typ: "refresh", iat: now, exp: now + REFRESH_SECONDS }),
    token_type: "Bearer",
    expires_in: ACCESS_SECONDS,
    scope: "mcp offline_access",
  }
}

function pkceMatches(verifier, challenge) {
  const actual = crypto.createHash("sha256").update(String(verifier || "")).digest("base64url")
  const expected = String(challenge || "")
  const a = Buffer.from(actual)
  const b = Buffer.from(expected)
  if (!verifier || a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

function cimdHostAllowed(hostname) {
  const host = hostname.toLowerCase()
  return (
    host === "claude.ai" ||
    host === "www.claude.ai" ||
    host === "claude.com" ||
    host === "www.claude.com" ||
    host.endsWith(".claude.ai") ||
    host.endsWith(".anthropic.com")
  )
}

async function clientRedirects(clientId) {
  if (!clientId) return null
  if (clientId.startsWith("https://")) {
    let url
    try {
      url = new URL(clientId)
    } catch {
      return null
    }
    if (!cimdHostAllowed(url.hostname)) return null
    const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(5000) })
    if (!response.ok) return null
    const doc = await response.json()
    if (!doc || doc.client_id !== clientId || !Array.isArray(doc.redirect_uris)) return null
    const allowed = doc.redirect_uris.filter((uri) => redirectAllowed(uri))
    return allowed.length ? allowed : null
  }
  const payload = readPayload(clientId)
  if (payload?.typ !== "client" || !Array.isArray(payload.redirect_uris)) return null
  return payload.redirect_uris.filter((uri) => redirectAllowed(uri))
}

function protectedResourceMetadata(origin) {
  return {
    resource: mcpResourceUrl(origin),
    authorization_servers: [origin],
    scopes_supported: ["mcp", "offline_access"],
    bearer_methods_supported: ["header"],
    resource_name: "Follow Up Boss",
  }
}

function authorizationServerMetadata(origin) {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/api/mcp/oauth/authorize`,
    token_endpoint: `${origin}/api/mcp/oauth/token`,
    registration_endpoint: `${origin}/api/mcp/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    client_id_metadata_document_supported: true,
    scopes_supported: ["mcp", "offline_access"],
  }
}

function unauthorizedHeader(origin) {
  const metadata = `${origin}/api/mcp/oauth/protected-resource`
  return `Bearer resource_metadata="${metadata}", scope="mcp"`
}

module.exports = {
  authConfigured,
  passwordMatches,
  bearerAccepted,
  publicOrigin,
  mcpResourceUrl,
  redirectAllowed,
  redirectMatches,
  issueClient,
  issueCode,
  issueAccess,
  readPayload,
  pkceMatches,
  clientRedirects,
  protectedResourceMetadata,
  authorizationServerMetadata,
  unauthorizedHeader,
}
