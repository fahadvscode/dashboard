#!/usr/bin/env node
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js")
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js")
const { config: loadEnv } = require("dotenv")
const { resolve } = require("path")
const { z } = require("zod")
const { tools } = require("../../../lib/fubMcpTools")

const packageRoot = resolve(__dirname, "..")
const repoRoot = resolve(packageRoot, "../..")
loadEnv({ path: resolve(repoRoot, ".env.local") })
loadEnv({ path: resolve(repoRoot, ".env") })
loadEnv({ path: resolve(packageRoot, ".env") })

function zodFromSchema(schema) {
  const shape = {}
  const properties = schema.properties || {}
  const required = new Set(schema.required || [])
  for (const [key, prop] of Object.entries(properties)) {
    let field
    if (prop.type === "integer" || prop.type === "number") {
      field = z.number()
      if (prop.type === "integer") field = field.int()
      if (prop.minimum != null) field = field.min(prop.minimum)
      if (prop.maximum != null) field = field.max(prop.maximum)
    } else if (prop.type === "array") {
      field = z.array(z.string())
    } else {
      field = z.string()
      if (prop.minLength) field = field.min(prop.minLength)
    }
    if (prop.description) field = field.describe(prop.description)
    if (!required.has(key)) field = field.optional()
    shape[key] = field
  }
  return shape
}

function createServer() {
  const server = new McpServer({
    name: "followupboss",
    version: "1.0.0",
  })
  for (const tool of tools) {
    server.tool(tool.name, tool.description, zodFromSchema(tool.inputSchema), async (args) => tool.call(args || {}))
  }
  return server
}

async function main() {
  const server = createServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}

module.exports = { createServer }
