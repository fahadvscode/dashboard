const FUB_API = "https://api.followupboss.com/v1"

const CLIENT_ID_FIELD = "customClientId"
const PERSON_FIELDS =
  "id,name,firstName,lastName,stage,source,sourceUrl,assignedTo,assignedUserId,tags,emails,phones,addresses,lastActivity,created,updated,contacted,price,background,customClientId"

function customFieldKey(name) {
  const raw = String(name || "").trim()
  if (!raw) return ""
  if (/^custom[A-Za-z0-9]+$/.test(raw)) return raw
  const words = raw.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ""
  const camel = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("")
  return `custom${camel}`
}

function looksLikeClientId(value) {
  return /^[A-Za-z]{1,6}-\d{3,}[A-Za-z0-9]*$/.test(String(value || "").trim())
}

function env(name) {
  return String(process.env[name] || "").trim()
}

function getFubApiKey() {
  return env("FUB_API_KEY") || env("FOLLOW_UP_BOSS_API_KEY")
}

function fubHeaders() {
  const apiKey = getFubApiKey()
  if (!apiKey) return null
  const headers = {
    Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  }
  const system = env("FUB_X_SYSTEM")
  const systemKey = env("FUB_X_SYSTEM_KEY")
  if (system) headers["X-System"] = system
  if (systemKey) headers["X-System-Key"] = systemKey
  return headers
}

async function fubFetch(path, init = {}) {
  const headers = fubHeaders()
  if (!headers) throw new Error("FUB_API_KEY is not set.")
  const response = await fetch(`${FUB_API}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  })
  const text = await response.text()
  let json = {}
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = { error: text }
    }
  }
  return { ok: response.ok, status: response.status, json }
}

function queryString(params) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    search.set(key, String(value))
  }
  const encoded = search.toString()
  return encoded ? `?${encoded}` : ""
}

function fubErrorMessage(result) {
  const body = result.json
  if (body && typeof body === "object") {
    const message = body.errorMessage || body.message || body.error
    if (typeof message === "string" && message.trim()) return message.trim()
  }
  return `Follow Up Boss returned HTTP ${result.status}.`
}

function textResult(payload, isError = false) {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2)
  const clipped = text.length > 80000 ? `${text.slice(0, 80000)}\n…truncated` : text
  return { content: [{ type: "text", text: clipped }], ...(isError ? { isError: true } : {}) }
}

async function callFub(path, init) {
  const result = await fubFetch(path, init)
  if (!result.ok) return textResult({ error: fubErrorMessage(result), status: result.status }, true)
  return textResult(result.json)
}

const limitField = {
  type: "integer",
  minimum: 1,
  maximum: 100,
  description: "How many results to return. Max 100.",
}
const personIdField = { type: "integer", minimum: 1, description: "Follow Up Boss person id." }

const tools = [
  {
    name: "check_connection",
    description: "Check that the Follow Up Boss API key works and return a short account snapshot.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    call: async () => {
      if (!getFubApiKey()) return textResult({ ok: false, error: "FUB_API_KEY is not set." }, true)
      try {
        const result = await fubFetch("/users?limit=1&fields=id,name,email")
        if (!result.ok) return textResult({ ok: false, error: fubErrorMessage(result) }, true)
        const first = result.json.users?.[0]
        return textResult({
          ok: true,
          sampleUser: first ? { id: first.id, name: first.name, email: first.email } : null,
        })
      } catch (error) {
        return textResult({ ok: false, error: error instanceof Error ? error.message : "Connection failed." }, true)
      }
    },
  },
  {
    name: "search_people",
    description:
      "Search Follow Up Boss contacts by name, email, phone, Client ID, stage, source, tag, assignee, or another custom field. A Client ID looks like SH-102606505X. Use clientId for that field. Do not guess it from tags.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Name, email, phone, or Client ID. The format is detected automatically." },
        clientId: { type: "string", description: "Client ID custom field, for example SH-102606505X." },
        name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        stage: { type: "string", description: "Stage name, for example Lead." },
        source: { type: "string" },
        tags: { type: "string", description: "Comma-separated tags. Matches any of them." },
        assignedTo: { type: "string", description: "Assignee name." },
        assignedUserId: { type: "integer", minimum: 1 },
        customField: { type: "string", description: "Another custom field label or API name, for example Birthday or customBirthday." },
        customValue: { type: "string", description: "Value to match on customField." },
        limit: limitField,
        offset: { type: "integer", minimum: 0 },
      },
      additionalProperties: false,
    },
    call: async (args) => {
      const query = String(args.query || "").trim()
      const clientId = String(args.clientId || "").trim() || (looksLikeClientId(query) ? query : "")
      const looksLikeEmail = query.includes("@")
      const digits = query.replace(/\D/g, "")
      const looksLikePhone = !looksLikeEmail && !clientId && digits.length >= 7
      const extraField = customFieldKey(args.customField)
      const extraValue = String(args.customValue || "").trim()
      const params = {
        name: args.name || (!looksLikeEmail && !looksLikePhone && !clientId ? query : undefined),
        email: args.email || (looksLikeEmail ? query : undefined),
        phone: args.phone || (looksLikePhone ? query : undefined),
        [CLIENT_ID_FIELD]: clientId || undefined,
        stage: args.stage,
        source: args.source,
        tags: args.tags,
        assignedTo: args.assignedTo,
        assignedUserId: args.assignedUserId,
        limit: args.limit ?? 10,
        offset: args.offset,
        sort: "lastActivity",
        fields: PERSON_FIELDS,
      }
      if (extraField && extraValue && extraField !== CLIENT_ID_FIELD) params[extraField] = extraValue
      return callFub(`/people${queryString(params)}`)
    },
  },
  {
    name: "get_person",
    description: "Get one Follow Up Boss contact, including emails, phones, tags, stage, and background.",
    inputSchema: { type: "object", properties: { personId: personIdField }, required: ["personId"], additionalProperties: false },
    call: async ({ personId }) => callFub(`/people/${personId}${queryString({ fields: `${PERSON_FIELDS},allCustom` })}`),
  },
  {
    name: "update_person",
    description: "Update a Follow Up Boss contact. Tags are merged onto the existing tags.",
    inputSchema: {
      type: "object",
      properties: {
        personId: personIdField,
        stage: { type: "string" },
        assignedUserId: { type: "integer", minimum: 1 },
        price: { type: "integer", minimum: 0 },
        background: { type: "string", description: "Background / profile notes stored on the person." },
        tags: { type: "array", items: { type: "string" }, description: "Tags to add. Existing tags are kept." },
      },
      required: ["personId"],
      additionalProperties: false,
    },
    call: async ({ personId, tags, ...rest }) => {
      const body = {}
      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined) body[key] = value
      }
      if (tags) body.tags = tags.map((tag) => String(tag).trim()).filter(Boolean)
      if (Object.keys(body).length === 0) return textResult({ error: "Provide at least one field to update." }, true)
      const merge = tags ? "?mergeTags=true" : ""
      return callFub(`/people/${personId}${merge}`, { method: "PUT", body: JSON.stringify(body) })
    },
  },
  {
    name: "list_notes",
    description: "List notes on a Follow Up Boss contact.",
    inputSchema: {
      type: "object",
      properties: { personId: personIdField, limit: limitField },
      required: ["personId"],
      additionalProperties: false,
    },
    call: async ({ personId, limit }) => callFub(`/notes${queryString({ personId, limit: limit ?? 20 })}`),
  },
  {
    name: "add_note",
    description: "Add a note on a Follow Up Boss contact.",
    inputSchema: {
      type: "object",
      properties: {
        personId: personIdField,
        body: { type: "string", minLength: 1, description: "Note text." },
        subject: { type: "string" },
      },
      required: ["personId", "body"],
      additionalProperties: false,
    },
    call: async ({ personId, body, subject }) =>
      callFub("/notes", {
        method: "POST",
        body: JSON.stringify({ personId, body, ...(subject ? { subject } : {}) }),
      }),
  },
  {
    name: "list_tasks",
    description: "List tasks for a Follow Up Boss contact, or the account task list when personId is omitted.",
    inputSchema: {
      type: "object",
      properties: { personId: { type: "integer", minimum: 1 }, limit: limitField },
      additionalProperties: false,
    },
    call: async ({ personId, limit }) => callFub(`/tasks${queryString({ personId, limit: limit ?? 20 })}`),
  },
  {
    name: "create_task",
    description: "Create a follow-up task on a Follow Up Boss contact.",
    inputSchema: {
      type: "object",
      properties: {
        personId: personIdField,
        name: { type: "string", minLength: 1, description: "Task title." },
        type: { type: "string", description: "Task type, for example Follow Up." },
        dueDate: { type: "string", description: "Date only, YYYY-MM-DD." },
        dueDateTime: { type: "string", description: "ISO datetime, for example 2026-10-02T16:00:00-04:00." },
        assignedUserId: { type: "integer", minimum: 1 },
        assignedTo: { type: "string", description: "Assignee name, if you do not have the user id." },
      },
      required: ["personId", "name"],
      additionalProperties: false,
    },
    call: async (args) =>
      callFub("/tasks", {
        method: "POST",
        body: JSON.stringify({
          personId: args.personId,
          name: args.name,
          type: args.type || "Follow Up",
          ...(args.dueDate ? { dueDate: args.dueDate } : {}),
          ...(args.dueDateTime ? { dueDateTime: args.dueDateTime } : {}),
          ...(args.assignedUserId ? { assignedUserId: args.assignedUserId } : {}),
          ...(args.assignedTo ? { assignedTo: args.assignedTo } : {}),
        }),
      }),
  },
  {
    name: "complete_task",
    description: "Mark a Follow Up Boss task complete.",
    inputSchema: {
      type: "object",
      properties: { taskId: { type: "integer", minimum: 1, description: "Follow Up Boss task id." } },
      required: ["taskId"],
      additionalProperties: false,
    },
    call: async ({ taskId }) => callFub(`/tasks/${taskId}`, { method: "PUT", body: JSON.stringify({ isCompleted: 1 }) }),
  },
  {
    name: "list_appointments",
    description: "List Follow Up Boss appointments. Filter by person and/or a start/end range.",
    inputSchema: {
      type: "object",
      properties: {
        personId: { type: "integer", minimum: 1 },
        start: { type: "string", description: "Range start. Use with end." },
        end: { type: "string", description: "Range end. Use with start." },
        limit: limitField,
      },
      additionalProperties: false,
    },
    call: async (args) => callFub(`/appointments${queryString({ ...args, limit: args.limit ?? 20 })}`),
  },
  {
    name: "create_appointment",
    description: "Create a Follow Up Boss appointment and invite a contact.",
    inputSchema: {
      type: "object",
      properties: {
        personId: personIdField,
        title: { type: "string", minLength: 1 },
        start: { type: "string", description: "ISO datetime." },
        end: { type: "string", description: "ISO datetime." },
        description: { type: "string" },
        location: { type: "string" },
      },
      required: ["personId", "title", "start", "end"],
      additionalProperties: false,
    },
    call: async ({ personId, title, start, end, description, location }) =>
      callFub("/appointments", {
        method: "POST",
        body: JSON.stringify({
          title,
          start,
          end,
          invitees: [{ personId }],
          ...(description ? { description } : {}),
          ...(location ? { location } : {}),
        }),
      }),
  },
  {
    name: "list_calls",
    description: "List calls logged on a Follow Up Boss contact.",
    inputSchema: {
      type: "object",
      properties: { personId: personIdField, limit: limitField },
      required: ["personId"],
      additionalProperties: false,
    },
    call: async ({ personId, limit }) => callFub(`/calls${queryString({ personId, limit: limit ?? 20 })}`),
  },
  {
    name: "list_text_messages",
    description: "List text messages on a Follow Up Boss contact.",
    inputSchema: {
      type: "object",
      properties: { personId: personIdField, limit: limitField },
      required: ["personId"],
      additionalProperties: false,
    },
    call: async ({ personId, limit }) => callFub(`/textMessages${queryString({ personId, limit: limit ?? 20 })}`),
  },
  {
    name: "list_events",
    description: "List the activity timeline for a Follow Up Boss contact (emails, calls, texts, notes, and other events).",
    inputSchema: {
      type: "object",
      properties: { personId: personIdField, limit: limitField },
      required: ["personId"],
      additionalProperties: false,
    },
    call: async ({ personId, limit }) => callFub(`/events${queryString({ personId, limit: limit ?? 25 })}`),
  },
  {
    name: "list_users",
    description: "List Follow Up Boss users so tasks and leads can be assigned to the right person.",
    inputSchema: { type: "object", properties: { limit: limitField }, additionalProperties: false },
    call: async ({ limit }) => callFub(`/users${queryString({ limit: limit ?? 100, fields: "id,name,email,status" })}`),
  },
  {
    name: "list_stages",
    description: "List Follow Up Boss pipeline stages.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    call: async () => callFub("/stages"),
  },
  {
    name: "list_custom_fields",
    description: "List Follow Up Boss custom fields, including the API name used to search them. Client ID is customClientId.",
    inputSchema: { type: "object", properties: { limit: limitField }, additionalProperties: false },
    call: async ({ limit }) => callFub(`/customFields${queryString({ limit: limit ?? 100 })}`),
  },
]

function validateArgs(schema, args) {
  const input = args && typeof args === "object" && !Array.isArray(args) ? args : {}
  const properties = schema.properties || {}
  const required = schema.required || []
  for (const key of required) {
    if (input[key] === undefined || input[key] === null || input[key] === "") {
      return `${key} is required.`
    }
  }
  for (const [key, value] of Object.entries(input)) {
    const prop = properties[key]
    if (!prop || value === undefined || value === null) continue
    if (prop.type === "integer" || prop.type === "number") {
      if (typeof value !== "number" || !Number.isFinite(value)) return `${key} must be a number.`
      if (prop.minimum != null && value < prop.minimum) return `${key} is too small.`
      if (prop.maximum != null && value > prop.maximum) return `${key} is too large.`
    } else if (prop.type === "string") {
      if (typeof value !== "string") return `${key} must be text.`
      if (prop.minLength && value.trim().length < prop.minLength) return `${key} is required.`
    } else if (prop.type === "array") {
      if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) return `${key} must be a list of text.`
    }
  }
  return null
}

async function callTool(name, args) {
  const tool = tools.find((item) => item.name === name)
  if (!tool) return { error: `Unknown tool: ${name}` }
  const invalid = validateArgs(tool.inputSchema, args)
  if (invalid) return { error: invalid }
  return { result: await tool.call(args || {}) }
}

function toolDefinitions() {
  return tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }))
}

module.exports = {
  tools,
  toolDefinitions,
  callTool,
  getFubApiKey,
  fubFetch,
  queryString,
  fubErrorMessage,
}
