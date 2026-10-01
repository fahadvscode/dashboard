const FUB_API = "https://api.followupboss.com/v1"

const CLIENT_ID_FIELD_FALLBACK = "customClientID"
const PERSON_FIELDS =
  "id,name,firstName,lastName,stage,source,sourceUrl,assignedTo,assignedUserId,tags,emails,phones,addresses,lastActivity,created,updated,contacted,price,background"

let cachedClientIdField = ""

async function resolveClientIdField() {
  if (cachedClientIdField) return cachedClientIdField
  try {
    const result = await fubFetch("/customFields?limit=100")
    const body = result.ok && result.json && typeof result.json === "object" ? result.json : {}
    const fields = body.customfields || body.customFields || body.fields || []
    const match = (Array.isArray(fields) ? fields : []).find(
      (field) => String(field.label || "").trim().toLowerCase() === "client id"
    )
    cachedClientIdField = (match && match.name) || CLIENT_ID_FIELD_FALLBACK
  } catch {
    cachedClientIdField = CLIENT_ID_FIELD_FALLBACK
  }
  return cachedClientIdField
}

async function searchPeople(args) {
  const query = String(args.query || "").trim()
  const clientId = String(args.clientId || "").trim() || (looksLikeClientId(query) ? query : "")
  const looksLikeEmail = query.includes("@")
  const digits = query.replace(/\D/g, "")
  const looksLikePhone = !looksLikeEmail && !clientId && digits.length >= 7
  const clientField = await resolveClientIdField()
  const extraField = customFieldKey(args.customField)
  const extraValue = String(args.customValue || "").trim()
  const params = {
    name: args.name || (!looksLikeEmail && !looksLikePhone && !clientId ? query : undefined),
    email: args.email || (looksLikeEmail ? query : undefined),
    phone: args.phone || (looksLikePhone ? query : undefined),
    [clientField]: clientId || undefined,
    stage: args.stage,
    source: args.source,
    tags: args.tags,
    assignedTo: args.assignedTo,
    assignedUserId: args.assignedUserId,
    limit: args.limit ?? 10,
    offset: args.offset,
    sort: "lastActivity",
    fields: `${PERSON_FIELDS},${clientField}`,
  }
  if (extraField && extraValue && extraField !== clientField) params[extraField] = extraValue
  return callFub(`/people${queryString(params)}`)
}

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

async function readFub(path) {
  try {
    const result = await fubFetch(path)
    if (!result.ok) return { error: fubErrorMessage(result), status: result.status }
    return { data: result.json }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Request failed." }
  }
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
      "Search Follow Up Boss contacts. For a Client ID such as SH-102606505X, pass clientId. That value lives in the Client ID custom field (customClientID), not in the name, tag, email, or phone. Also searches name, email, phone, stage, source, tag, assignee, and any other custom field.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Name, email, phone, or Client ID. The format is detected automatically." },
        clientId: { type: "string", description: "Exact Client ID custom field value, for example SH-102606505X. Required for that kind of id." },
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
    call: async (args) => searchPeople(args),
  },
  {
    name: "find_by_client_id",
    description:
      "Find a Follow Up Boss contact by Client ID. Use this when the value looks like SH-102606505X. It filters the Client ID custom field (customClientID). Do not search that value as a name, tag, email, or phone.",
    inputSchema: {
      type: "object",
      properties: {
        clientId: { type: "string", description: "Exact Client ID, for example SH-102606505X." },
      },
      required: ["clientId"],
      additionalProperties: false,
    },
    call: async ({ clientId }) => searchPeople({ clientId, limit: 5 }),
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
    name: "add_person_file",
    description:
      "Put an external link in a contact's Files section in Follow Up Boss. Use this for a Google Drive folder or file URL. Pass the https link and a file name, usually the Client ID. This stores the link. It does not upload photo bytes, and it is not a note.",
    inputSchema: {
      type: "object",
      properties: {
        personId: personIdField,
        url: { type: "string", description: "https link to a Google Drive folder or other file stored outside Follow Up Boss." },
        fileName: { type: "string", description: "Name shown in Files. Use the Client ID for a client folder, for example SS-052329978B." },
      },
      required: ["personId", "url", "fileName"],
      additionalProperties: false,
    },
    call: async ({ personId, url, fileName }) => {
      const uri = String(url || "").trim()
      const name = String(fileName || "").trim()
      if (!/^https?:\/\//i.test(uri)) return textResult({ error: "url must start with http:// or https://." }, true)
      if (!name) return textResult({ error: "fileName is required." }, true)
      const result = await fubFetch("/personAttachments", {
        method: "POST",
        body: JSON.stringify({ personId, uri, fileName: name }),
      })
      if (result.ok) return textResult(result.json)
      if (result.status === 403) {
        return textResult(
          {
            error:
              "Follow Up Boss refused the Files section. Only a system registered with Follow Up Boss can add a link there. This connector's API key is not registered, so the link was not saved in Files. Do not add a note and call it the Files field.",
            status: 403,
          },
          true
        )
      }
      return textResult({ error: fubErrorMessage(result), status: result.status }, true)
    },
  },
  {
    name: "list_notes",
    description: "List notes on a Follow Up Boss contact, including team replies on those notes. Omit personId to list recent notes.",
    inputSchema: {
      type: "object",
      properties: { personId: { type: "integer", minimum: 1 }, limit: limitField, offset: { type: "integer", minimum: 0 } },
      additionalProperties: false,
    },
    call: async ({ personId, limit, offset }) =>
      callFub(`/notes${queryString({ personId, limit: limit ?? 50, offset, includeThreadedReplies: true })}`),
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
    description:
      "List calls for a contact or the whole account. Each call includes the agent, outcome, duration, and the call note. Use get_call for one call's full record, including a transcript when Follow Up Boss returns one.",
    inputSchema: {
      type: "object",
      properties: { personId: { type: "integer", minimum: 1 }, limit: limitField, offset: { type: "integer", minimum: 0 } },
      additionalProperties: false,
    },
    call: async ({ personId, limit, offset }) => callFub(`/calls${queryString({ personId, limit: limit ?? 50, offset })}`),
  },
  {
    name: "get_call",
    description:
      "Get one Follow Up Boss call, including the agent, outcome, duration, note, and transcript when Follow Up Boss includes it. Recording audio URLs are hidden by Follow Up Boss and are not available.",
    inputSchema: {
      type: "object",
      properties: { callId: { type: "integer", minimum: 1, description: "Follow Up Boss call id." } },
      required: ["callId"],
      additionalProperties: false,
    },
    call: async ({ callId }) => callFub(`/calls/${callId}`),
  },
  {
    name: "list_text_messages",
    description: "List text messages for a contact or the whole account, including the message body and which agent sent or received it.",
    inputSchema: {
      type: "object",
      properties: { personId: { type: "integer", minimum: 1 }, limit: limitField, offset: { type: "integer", minimum: 0 } },
      additionalProperties: false,
    },
    call: async ({ personId, limit, offset }) =>
      callFub(`/textMessages${queryString({ personId, limit: limit ?? 50, offset })}`),
  },
  {
    name: "list_emails",
    description:
      "List synced email messages for a Follow Up Boss contact. Use this for inbox and email-sync history. Marketing opens and clicks are list_email_marketing.",
    inputSchema: {
      type: "object",
      properties: { personId: { type: "integer", minimum: 1 }, limit: limitField, offset: { type: "integer", minimum: 0 } },
      additionalProperties: false,
    },
    call: async ({ personId, limit, offset }) => callFub(`/emails${queryString({ personId, limit: limit ?? 50, offset })}`),
  },
  {
    name: "list_email_marketing",
    description: "List marketing email activity for a contact: delivered, opened, clicked, bounced, and unsubscribed.",
    inputSchema: {
      type: "object",
      properties: {
        personId: { type: "integer", minimum: 1 },
        type: {
          type: "string",
          description: "delivered, open, click, bounced, soft-bounce, hard-bounce, unsubscribe, spamreport, or dropped.",
        },
        limit: limitField,
        offset: { type: "integer", minimum: 0 },
      },
      additionalProperties: false,
    },
    call: async ({ personId, type, limit, offset }) =>
      callFub(`/emEvents${queryString({ personId, type, limit: limit ?? 50, offset })}`),
  },
  {
    name: "list_events",
    description:
      "List timeline activity for a contact or the account: inquiries, property views, website visits, calls, and other logged events.",
    inputSchema: {
      type: "object",
      properties: {
        personId: { type: "integer", minimum: 1 },
        type: { type: "string", description: "Optional event type filter, for example Incoming Call or Property Inquiry." },
        limit: limitField,
        offset: { type: "integer", minimum: 0 },
      },
      additionalProperties: false,
    },
    call: async ({ personId, type, limit, offset }) =>
      callFub(`/events${queryString({ personId, type, limit: limit ?? 50, offset })}`),
  },
  {
    name: "list_deals",
    description: "List Follow Up Boss deals for a contact or agent, including price, stage, and status.",
    inputSchema: {
      type: "object",
      properties: {
        personId: { type: "integer", minimum: 1 },
        userId: { type: "integer", minimum: 1, description: "Agent user id." },
        status: { type: "string", description: "Active, Archived, or Deleted." },
      },
      additionalProperties: false,
    },
    call: async ({ personId, userId, status }) => callFub(`/deals${queryString({ personId, userId, status })}`),
  },
  {
    name: "get_person_history",
    description:
      "Load one contact's full Follow Up Boss history in one call: profile, notes and team replies, calls, call details, texts, emails, marketing email activity, timeline events, appointments, deals, action plans, and relationships. Use this before answering questions about what happened with a lead.",
    inputSchema: {
      type: "object",
      properties: {
        personId: personIdField,
        limit: limitField,
      },
      required: ["personId"],
      additionalProperties: false,
    },
    call: async ({ personId, limit }) => {
      const size = limit ?? 50
      const [person, notes, calls, texts, emails, marketing, events, appointments, deals, plans, relationships] =
        await Promise.all([
          readFub(`/people/${personId}${queryString({ fields: "allFields" })}`),
          readFub(`/notes${queryString({ personId, limit: size, includeThreadedReplies: true })}`),
          readFub(`/calls${queryString({ personId, limit: size })}`),
          readFub(`/textMessages${queryString({ personId, limit: size })}`),
          readFub(`/emails${queryString({ personId, limit: size })}`),
          readFub(`/emEvents${queryString({ personId, limit: size })}`),
          readFub(`/events${queryString({ personId, limit: size })}`),
          readFub(`/appointments${queryString({ personId, limit: size })}`),
          readFub(`/deals${queryString({ personId })}`),
          readFub(`/actionPlansPeople${queryString({ personId })}`),
          readFub(`/peopleRelationships${queryString({ personId })}`),
        ])
      const callRows = calls.data?.calls
      const callDetails = Array.isArray(callRows)
        ? await Promise.all(callRows.slice(0, 15).map((call) => readFub(`/calls/${call.id}`)))
        : []
      return textResult({
        person,
        notes,
        calls,
        callDetails,
        textMessages: texts,
        emails,
        emailMarketing: marketing,
        events,
        appointments,
        deals,
        actionPlans: plans,
        relationships,
      })
    },
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
    description: "List Follow Up Boss custom fields, including the API name used to search them. On this account, Client ID is customClientID.",
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
