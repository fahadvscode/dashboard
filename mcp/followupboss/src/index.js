#!/usr/bin/env node
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { config: loadEnv } = require("dotenv");
const { resolve } = require("path");
const { z } = require("zod");
const { fubErrorMessage, fubFetch, getFubApiKey, queryString } = require("./fub");

const packageRoot = resolve(__dirname, "..");
const repoRoot = resolve(packageRoot, "../..");
loadEnv({ path: resolve(repoRoot, ".env.local") });
loadEnv({ path: resolve(repoRoot, ".env") });
loadEnv({ path: resolve(packageRoot, ".env") });

const PERSON_FIELDS =
  "id,name,firstName,lastName,stage,source,sourceUrl,assignedTo,assignedUserId,tags,emails,phones,addresses,lastActivity,created,updated,contacted,price,background";

const limitSchema = z.number().int().min(1).max(100).optional().describe("How many results to return. Max 100.");
const personIdSchema = z.number().int().positive().describe("Follow Up Boss person id.");

function textResult(payload, isError = false) {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  const clipped = text.length > 80000 ? `${text.slice(0, 80000)}\n…truncated` : text;
  return { content: [{ type: "text", text: clipped }], ...(isError ? { isError: true } : {}) };
}

async function callFub(path, init) {
  const result = await fubFetch(path, init);
  if (!result.ok) return textResult({ error: fubErrorMessage(result), status: result.status }, true);
  return textResult(result.json);
}

function createServer() {
  const server = new McpServer({
    name: "followupboss",
    version: "1.0.0",
  });

  server.tool(
    "check_connection",
    "Check that the Follow Up Boss API key works and return a short account snapshot.",
    {},
    async () => {
      if (!getFubApiKey()) {
        return textResult({ ok: false, error: "FUB_API_KEY is not set." }, true);
      }
      try {
        const result = await fubFetch("/users?limit=1&fields=id,name,email");
        if (!result.ok) return textResult({ ok: false, error: fubErrorMessage(result) }, true);
        const first = result.json.users?.[0];
        return textResult({
          ok: true,
          sampleUser: first ? { id: first.id, name: first.name, email: first.email } : null,
        });
      } catch (error) {
        return textResult({ ok: false, error: error instanceof Error ? error.message : "Connection failed." }, true);
      }
    }
  );

  server.tool(
    "search_people",
    "Search Follow Up Boss contacts by name, email, phone, stage, source, tag, or assignee.",
    {
      query: z.string().optional().describe("Name, email, or phone. Email and phone are detected automatically."),
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      stage: z.string().optional().describe("Stage name, for example Lead."),
      source: z.string().optional(),
      tags: z.string().optional().describe("Comma-separated tags. Matches any of them."),
      assignedTo: z.string().optional().describe("Assignee name."),
      assignedUserId: z.number().int().positive().optional(),
      limit: limitSchema,
      offset: z.number().int().min(0).optional(),
    },
    async (args) => {
      const query = String(args.query || "").trim();
      const looksLikeEmail = query.includes("@");
      const digits = query.replace(/\D/g, "");
      const looksLikePhone = !looksLikeEmail && digits.length >= 7;
      return callFub(
        `/people${queryString({
          name: args.name || (!looksLikeEmail && !looksLikePhone ? query : undefined),
          email: args.email || (looksLikeEmail ? query : undefined),
          phone: args.phone || (looksLikePhone ? query : undefined),
          stage: args.stage,
          source: args.source,
          tags: args.tags,
          assignedTo: args.assignedTo,
          assignedUserId: args.assignedUserId,
          limit: args.limit ?? 10,
          offset: args.offset,
          sort: "lastActivity",
          fields: PERSON_FIELDS,
        })}`
      );
    }
  );

  server.tool(
    "get_person",
    "Get one Follow Up Boss contact, including emails, phones, tags, stage, and background.",
    { personId: personIdSchema },
    async ({ personId }) => callFub(`/people/${personId}${queryString({ fields: `${PERSON_FIELDS},allCustom` })}`)
  );

  server.tool(
    "update_person",
    "Update a Follow Up Boss contact. Tags are merged onto the existing tags.",
    {
      personId: personIdSchema,
      stage: z.string().optional(),
      assignedUserId: z.number().int().positive().optional(),
      price: z.number().int().min(0).optional(),
      background: z.string().optional().describe("Background / profile notes stored on the person."),
      tags: z.array(z.string()).optional().describe("Tags to add. Existing tags are kept."),
    },
    async ({ personId, tags, ...rest }) => {
      const body = {};
      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined) body[key] = value;
      }
      if (tags) body.tags = tags.map((tag) => tag.trim()).filter(Boolean);
      if (Object.keys(body).length === 0) return textResult({ error: "Provide at least one field to update." }, true);
      const merge = tags ? "?mergeTags=true" : "";
      return callFub(`/people/${personId}${merge}`, { method: "PUT", body: JSON.stringify(body) });
    }
  );

  server.tool(
    "list_notes",
    "List notes on a Follow Up Boss contact.",
    { personId: personIdSchema, limit: limitSchema },
    async ({ personId, limit }) => callFub(`/notes${queryString({ personId, limit: limit ?? 20 })}`)
  );

  server.tool(
    "add_note",
    "Add a note on a Follow Up Boss contact.",
    {
      personId: personIdSchema,
      body: z.string().min(1).describe("Note text."),
      subject: z.string().optional(),
    },
    async ({ personId, body, subject }) =>
      callFub("/notes", {
        method: "POST",
        body: JSON.stringify({ personId, body, ...(subject ? { subject } : {}) }),
      })
  );

  server.tool(
    "list_tasks",
    "List tasks for a Follow Up Boss contact, or the account task list when personId is omitted.",
    { personId: z.number().int().positive().optional(), limit: limitSchema },
    async ({ personId, limit }) => callFub(`/tasks${queryString({ personId, limit: limit ?? 20 })}`)
  );

  server.tool(
    "create_task",
    "Create a follow-up task on a Follow Up Boss contact.",
    {
      personId: personIdSchema,
      name: z.string().min(1).describe("Task title."),
      type: z.string().optional().describe("Task type, for example Follow Up."),
      dueDate: z.string().optional().describe("Date only, YYYY-MM-DD."),
      dueDateTime: z.string().optional().describe("ISO datetime, for example 2026-10-02T16:00:00-04:00."),
      assignedUserId: z.number().int().positive().optional(),
      assignedTo: z.string().optional().describe("Assignee name, if you do not have the user id."),
    },
    async (args) =>
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
      })
  );

  server.tool(
    "complete_task",
    "Mark a Follow Up Boss task complete.",
    { taskId: z.number().int().positive().describe("Follow Up Boss task id.") },
    async ({ taskId }) => callFub(`/tasks/${taskId}`, { method: "PUT", body: JSON.stringify({ isCompleted: 1 }) })
  );

  server.tool(
    "list_appointments",
    "List Follow Up Boss appointments. Filter by person and/or a start/end range.",
    {
      personId: z.number().int().positive().optional(),
      start: z.string().optional().describe("Range start. Use with end."),
      end: z.string().optional().describe("Range end. Use with start."),
      limit: limitSchema,
    },
    async (args) => callFub(`/appointments${queryString({ ...args, limit: args.limit ?? 20 })}`)
  );

  server.tool(
    "create_appointment",
    "Create a Follow Up Boss appointment and invite a contact.",
    {
      personId: personIdSchema,
      title: z.string().min(1),
      start: z.string().describe("ISO datetime."),
      end: z.string().describe("ISO datetime."),
      description: z.string().optional(),
      location: z.string().optional(),
    },
    async ({ personId, title, start, end, description, location }) =>
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
      })
  );

  server.tool(
    "list_calls",
    "List calls logged on a Follow Up Boss contact.",
    { personId: personIdSchema, limit: limitSchema },
    async ({ personId, limit }) => callFub(`/calls${queryString({ personId, limit: limit ?? 20 })}`)
  );

  server.tool(
    "list_text_messages",
    "List text messages on a Follow Up Boss contact.",
    { personId: personIdSchema, limit: limitSchema },
    async ({ personId, limit }) => callFub(`/textMessages${queryString({ personId, limit: limit ?? 20 })}`)
  );

  server.tool(
    "list_events",
    "List the activity timeline for a Follow Up Boss contact (emails, calls, texts, notes, and other events).",
    { personId: personIdSchema, limit: limitSchema },
    async ({ personId, limit }) => callFub(`/events${queryString({ personId, limit: limit ?? 25 })}`)
  );

  server.tool(
    "list_users",
    "List Follow Up Boss users so tasks and leads can be assigned to the right person.",
    { limit: limitSchema },
    async ({ limit }) => callFub(`/users${queryString({ limit: limit ?? 100, fields: "id,name,email,status" })}`)
  );

  server.tool(
    "list_stages",
    "List Follow Up Boss pipeline stages.",
    {},
    async () => callFub("/stages")
  );

  return server;
}

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

module.exports = { createServer };
