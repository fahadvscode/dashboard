const FUB_API = "https://api.followupboss.com/v1";

function env(name) {
  return String(process.env[name] || "").trim();
}

function getFubApiKey() {
  return env("FUB_API_KEY") || env("FOLLOW_UP_BOSS_API_KEY");
}

function fubHeaders() {
  const apiKey = getFubApiKey();
  if (!apiKey) return null;
  const headers = {
    Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const system = env("FUB_X_SYSTEM");
  const systemKey = env("FUB_X_SYSTEM_KEY");
  if (system) headers["X-System"] = system;
  if (systemKey) headers["X-System-Key"] = systemKey;
  return headers;
}

async function fubFetch(path, init = {}) {
  const headers = fubHeaders();
  if (!headers) {
    throw new Error("FUB_API_KEY is not set. Add it to .env.local or the Claude MCP config.");
  }
  const response = await fetch(`${FUB_API}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  });
  const text = await response.text();
  let json = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { error: text };
    }
  }
  return { ok: response.ok, status: response.status, json };
}

function queryString(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

function fubErrorMessage(result) {
  const body = result.json;
  if (body && typeof body === "object") {
    const message = body.errorMessage || body.message || body.error;
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  return `Follow Up Boss returned HTTP ${result.status}.`;
}

module.exports = { getFubApiKey, fubFetch, queryString, fubErrorMessage };
