import { constantContactFetch } from '@/lib/constantContact'
import { accountProfile, isCampaignId, reportAccount } from '@/lib/constantContactReport'
import type { ReportAccountId } from '@/lib/constantContactReportTypes'

const INSTRUCTIONS =
  'Constant Contact for three accounts. primary is Fahad Javed Real Estate. second is Precon Factory. third is GTA Lowrise. Pass account on every call. This connection can read accounts, lists, emails, and results. It cannot send or schedule a campaign.'

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean }

type Tool = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  call: (args: Record<string, unknown>) => Promise<ToolResult>
}

const accountField = {
  type: 'string',
  description: 'primary (Fahad Javed Real Estate), second (Precon Factory), or third (GTA Lowrise).',
}

function textResult(payload: unknown, isError = false): ToolResult {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)
  const clipped = text.length > 60000 ? `${text.slice(0, 60000)}\n…truncated` : text
  return { content: [{ type: 'text', text: clipped }], ...(isError ? { isError: true } : {}) }
}

function accountOf(value: unknown): ReportAccountId {
  const account = reportAccount(String(value || 'primary'))
  if (!account) throw new Error('Account must be primary, second, or third.')
  return account
}

function nextHref(body: Record<string, unknown>) {
  const links = body._links as { next?: { href?: string } } | undefined
  return links?.next?.href || ''
}

async function listEmails(account: ReportAccountId, status: string, limit: number) {
  const rows: { id: string; name: string; status: string; updatedAt: string }[] = []
  let next = '/emails?limit=50'
  for (let page = 0; next && page < 8 && rows.length < limit; page += 1) {
    const body = await constantContactFetch(next, account)
    const campaigns = (body.campaigns as { campaign_id?: string; name?: string; current_status?: string; updated_at?: string }[] | undefined) || []
    for (const campaign of campaigns) {
      if (!campaign.campaign_id) continue
      const current = String(campaign.current_status || '')
      if (status && current.toLowerCase() !== status.toLowerCase()) continue
      rows.push({
        id: campaign.campaign_id,
        name: campaign.name || 'Untitled',
        status: current,
        updatedAt: campaign.updated_at || '',
      })
      if (rows.length >= limit) break
    }
    next = nextHref(body)
  }
  return rows
}

const tools: Tool[] = [
  {
    name: 'list_accounts',
    description: 'List the three Constant Contact accounts this connection can read.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    call: async () =>
      textResult([
        { account: 'primary', ...accountProfile('primary') },
        { account: 'second', ...accountProfile('second') },
        { account: 'third', ...accountProfile('third') },
      ]),
  },
  {
    name: 'account_summary',
    description: 'Read the connected Constant Contact account name, email, and contact count.',
    inputSchema: {
      type: 'object',
      properties: { account: accountField },
      required: ['account'],
      additionalProperties: false,
    },
    call: async ({ account }) => {
      const id = accountOf(account)
      const summary = await constantContactFetch('/account/summary', id)
      let contacts: number | null = null
      try {
        const counted = await constantContactFetch('/contacts?limit=1&include_count=true', id)
        const count = Number(counted.contacts_count)
        contacts = Number.isFinite(count) ? count : null
      } catch {
        contacts = null
      }
      const profile = accountProfile(id)
      return textResult({
        account: id,
        expectedName: profile.name,
        expectedEmail: profile.email,
        organization: summary.organization_name || '',
        email: summary.contact_email || '',
        contacts,
      })
    },
  },
  {
    name: 'list_lists',
    description: 'List contact lists on one Constant Contact account. Returns list id and name.',
    inputSchema: {
      type: 'object',
      properties: { account: accountField },
      required: ['account'],
      additionalProperties: false,
    },
    call: async ({ account }) => {
      const id = accountOf(account)
      const body = await constantContactFetch('/contact_lists?limit=1000', id)
      const lists = (body.lists as { list_id?: string; name?: string }[] | undefined) || []
      return textResult({
        account: id,
        count: lists.length,
        lists: lists.map((list) => ({ id: list.list_id || '', name: list.name || '' })).filter((list) => list.id),
      })
    },
  },
  {
    name: 'list_emails',
    description: 'List recent Constant Contact emails. Filter by status such as draft, scheduled, or done.',
    inputSchema: {
      type: 'object',
      properties: {
        account: accountField,
        status: { type: 'string', description: 'Optional. draft, scheduled, or done.' },
        limit: { type: 'integer', minimum: 1, maximum: 50, description: 'How many emails to return. Default 20.' },
      },
      required: ['account'],
      additionalProperties: false,
    },
    call: async ({ account, status, limit }) => {
      const id = accountOf(account)
      const size = Math.min(50, Math.max(1, Number(limit) || 20))
      const emails = await listEmails(id, String(status || ''), size)
      return textResult({ account: id, emails })
    },
  },
  {
    name: 'get_email',
    description: 'Read one email: name, subject, status, public link, and send results when it has been sent. Does not return the design HTML and does not send the email.',
    inputSchema: {
      type: 'object',
      properties: {
        account: accountField,
        campaignId: { type: 'string', description: 'Constant Contact campaign id.' },
      },
      required: ['account', 'campaignId'],
      additionalProperties: false,
    },
    call: async ({ account, campaignId }) => {
      const id = accountOf(account)
      const campaign = String(campaignId || '').trim()
      if (!isCampaignId(campaign)) throw new Error('Choose an email id.')
      const detail = await constantContactFetch(`/emails/${campaign}`, id)
      const activities = (detail.campaign_activities as { campaign_activity_id?: string; role?: string }[] | undefined) || []
      const primary = activities.find((activity) => activity.role === 'primary_email')
      let subject = ''
      let permalink = ''
      let stats: Record<string, unknown> | null = null
      if (primary?.campaign_activity_id) {
        const activity = await constantContactFetch(
          `/emails/activities/${primary.campaign_activity_id}?include=permalink_url`,
          id
        )
        subject = String(activity.subject || '')
        permalink = String(activity.permalink_url || '')
        if (String(detail.current_status || '').toLowerCase() === 'done') {
          try {
            const report = await constantContactFetch(`/reports/email_reports/${primary.campaign_activity_id}`, id)
            const unique = (report.unique_counts as Record<string, unknown> | undefined) || {}
            stats = {
              sends: unique.sends ?? null,
              opens: unique.opens ?? null,
              clicks: unique.clicks ?? null,
              unsubscribed: unique.optouts ?? null,
              bounced: unique.bounces ?? null,
            }
          } catch {
            stats = null
          }
        }
      }
      return textResult({
        account: id,
        id: campaign,
        name: detail.name || '',
        status: detail.current_status || '',
        subject,
        permalink,
        stats,
      })
    },
  },
  {
    name: 'find_contacts',
    description: 'Find contacts on one account by email, or list the newest contacts when no email is given. Returns name, email, and list ids. Does not change contacts.',
    inputSchema: {
      type: 'object',
      properties: {
        account: accountField,
        email: { type: 'string', description: 'Optional exact email address.' },
        limit: { type: 'integer', minimum: 1, maximum: 50 },
      },
      required: ['account'],
      additionalProperties: false,
    },
    call: async ({ account, email, limit }) => {
      const id = accountOf(account)
      const size = Math.min(50, Math.max(1, Number(limit) || 20))
      const address = String(email || '').trim()
      const path = address
        ? `/contacts?email=${encodeURIComponent(address)}&limit=${size}&include=list_memberships`
        : `/contacts?limit=${size}&include=list_memberships`
      const body = await constantContactFetch(path, id)
      const contacts = (body.contacts as Record<string, unknown>[] | undefined) || []
      return textResult({
        account: id,
        contacts: contacts.map((contact) => {
          const emailAddress = contact.email_address as { address?: string } | undefined
          return {
            id: contact.contact_id || '',
            firstName: contact.first_name || '',
            lastName: contact.last_name || '',
            email: emailAddress?.address || '',
            lists: contact.list_memberships || [],
            updatedAt: contact.updated_at || '',
          }
        }),
      })
    },
  },
]

export async function handleConstantContactRpc(body: unknown): Promise<unknown> {
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

async function handleMessage(message: unknown) {
  const record = message as { jsonrpc?: string; method?: string; id?: unknown; params?: { name?: string; arguments?: Record<string, unknown> } }
  if (!record || record.jsonrpc !== '2.0' || typeof record.method !== 'string') {
    return { jsonrpc: '2.0', id: record?.id ?? null, error: { code: -32600, message: 'Invalid request.' } }
  }
  const { id, method, params } = record
  if (method === 'notifications/initialized' || method === 'notifications/cancelled') return null
  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2025-03-26',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'constant-contact', version: '1.0.0' },
        instructions: INSTRUCTIONS,
      },
    }
  }
  if (method === 'ping') return { jsonrpc: '2.0', id, result: {} }
  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: tools.map((tool) => ({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema })),
      },
    }
  }
  if (method === 'tools/call') {
    const name = String(params?.name || '')
    const args = params?.arguments && typeof params.arguments === 'object' ? params.arguments : {}
    const tool = tools.find((item) => item.name === name)
    if (!tool) {
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true } }
    }
    try {
      const result = await tool.call(args)
      return { jsonrpc: '2.0', id, result }
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Tool failed.'
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }], isError: true } }
    }
  }
  if (id === undefined || id === null) return null
  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown method: ${method}` } }
}
