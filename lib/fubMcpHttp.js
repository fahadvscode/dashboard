const { callTool, toolDefinitions } = require("./fubMcpTools")

const PROTOCOL = "2025-03-26"
const INSTRUCTIONS =
  "Follow Up Boss CRM for this account. Search for a person before changing them. Client IDs such as SH-102606505X are the Client ID custom field: pass them as clientId, not as a tag. Notes, tasks, and appointments you create are saved in Follow Up Boss."

async function handleMessage(message) {
  if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return { jsonrpc: "2.0", id: message?.id ?? null, error: { code: -32600, message: "Invalid request." } }
  }
  const { id, method, params } = message
  const isNotification = id === undefined || id === null
  if (method === "notifications/initialized" || method === "notifications/cancelled") return null
  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "followupboss", version: "1.0.0" },
        instructions: INSTRUCTIONS,
      },
    }
  }
  if (method === "ping") return { jsonrpc: "2.0", id, result: {} }
  if (method === "tools/list") return { jsonrpc: "2.0", id, result: { tools: toolDefinitions() } }
  if (method === "tools/call") {
    const name = String(params?.name || "")
    const args = params?.arguments && typeof params.arguments === "object" ? params.arguments : {}
    try {
      const outcome = await callTool(name, args)
      if (outcome.error) {
        return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: outcome.error }], isError: true } }
      }
      return { jsonrpc: "2.0", id, result: outcome.result }
    } catch (error) {
      const text = error instanceof Error ? error.message : "Tool failed."
      return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text }], isError: true } }
    }
  }
  if (isNotification) return null
  return { jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown method: ${method}` } }
}

async function handleRpcBody(body) {
  if (Array.isArray(body)) {
    const responses = []
    for (const message of body) {
      const response = await handleMessage(message)
      if (response) responses.push(response)
    }
    return responses.length ? responses : null
  }
  return handleMessage(body)
}

module.exports = { handleRpcBody, PROTOCOL }
