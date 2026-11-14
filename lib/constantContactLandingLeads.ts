import {
  constantContactFetch,
  constantContactWrite,
  type ConstantContactAccount,
} from '@/lib/constantContact'
import {
  formatBrokerYesNo,
  getBrokerFieldForLead,
  resolveLandingProjectName,
  type LandingPageSheetMeta,
} from '@/lib/landingPageSources'

const ACCOUNTS: ConstantContactAccount[] = ['primary', 'second', 'third']

const listsByAccount = new Map<ConstantContactAccount, Map<string, string>>()

function text(value: unknown) {
  if (typeof value === 'string') return value.trim()
  if (value == null) return ''
  return String(value).trim()
}

function looksLikeWebsite(value: string) {
  return value.includes('.') || /^https?:\/\//i.test(value)
}

export function isAgentOrBrokerLead(lead: Record<string, unknown>) {
  if (formatBrokerYesNo(getBrokerFieldForLead(lead)) === 'Yes') return true
  const agent = text(lead.isagent).toLowerCase()
  if (agent === 'true' || agent === 'yes' || agent === 'y' || agent === '1') return true
  const buyer = `${text(lead.buyer_type)} ${text(lead.lead_type)}`.toLowerCase()
  return /\b(agent|broker|realtor)\b/.test(buyer)
}

export function landingListName(lead: Record<string, unknown>, meta: LandingPageSheetMeta) {
  const project = resolveLandingProjectName(lead, meta).replace(/\s+/g, ' ').trim() || meta.pageName || 'Landing Page'
  const utm = text(lead.utm_source)
  const source = text(lead.source)
  const leadSource = utm || (source && !looksLikeWebsite(source) ? source : '')
  const name = leadSource ? `${project} - ${leadSource}` : project
  return name.slice(0, 255)
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function leadEmail(lead: Record<string, unknown>) {
  const email = text(lead.email)
  if (!EMAIL.test(email) || email.length > 50) return ''
  return email
}

function leadNames(lead: Record<string, unknown>) {
  const full = text(lead.full_name)
  const first = text(lead.firstname) || text(lead.first_name) || full.split(' ')[0] || ''
  const last = text(lead.lastname) || text(lead.last_name) || full.split(' ').slice(1).join(' ') || ''
  return { first: first.slice(0, 50), last: last.slice(0, 50) }
}

function nextHref(body: Record<string, unknown>) {
  const links = body._links as { next?: { href?: string } } | undefined
  return links?.next?.href || ''
}

async function loadLists(account: ConstantContactAccount) {
  const cached = listsByAccount.get(account)
  if (cached) return cached
  const lists = new Map<string, string>()
  let next = '/contact_lists?limit=1000'
  for (let page = 0; next && page < 5; page += 1) {
    const body = await constantContactFetch(next, account)
    const rows = (body.lists as { list_id?: string; name?: string }[] | undefined) || []
    for (const row of rows) {
      const name = text(row.name).toLowerCase()
      if (name && row.list_id) lists.set(name, row.list_id)
    }
    next = nextHref(body)
  }
  listsByAccount.set(account, lists)
  return lists
}

async function ensureList(account: ConstantContactAccount, name: string) {
  const key = name.toLowerCase()
  const lists = await loadLists(account)
  const existing = lists.get(key)
  if (existing) return existing

  try {
    const created = (await constantContactWrite('/contact_lists', account, 'POST', {
      name,
      description: 'Landing page leads',
    })) as { list_id?: string }
    const id = text(created.list_id)
    if (!id) throw new Error('Constant Contact did not return a list.')
    lists.set(key, id)
    return id
  } catch (error) {
    listsByAccount.delete(account)
    const refreshed = await loadLists(account)
    const found = refreshed.get(key)
    if (found) return found
    throw error
  }
}

async function contactOnList(account: ConstantContactAccount, contactId: string, listId: string) {
  const read = async () => {
    const contact = (await constantContactFetch(
      `/contacts/${contactId}?include=list_memberships`,
      account
    )) as { list_memberships?: string[] }
    return Array.isArray(contact.list_memberships) && contact.list_memberships.includes(listId)
  }
  if (await read()) return true
  await new Promise((resolve) => setTimeout(resolve, 500))
  return read()
}

async function saveContact(account: ConstantContactAccount, lead: Record<string, unknown>, listId: string) {
  const names = leadNames(lead)
  const phone = text(lead.phone).slice(0, 50)
  const body: Record<string, unknown> = {
    email_address: leadEmail(lead),
    list_memberships: [listId],
  }
  if (names.first) body.first_name = names.first
  if (names.last) body.last_name = names.last
  if (phone) body.phone_number = phone
  return (await constantContactWrite('/contacts/sign_up_form', account, 'POST', body)) as { contact_id?: string }
}

async function addToAccount(account: ConstantContactAccount, lead: Record<string, unknown>, listName: string) {
  let listId = await ensureList(account, listName)
  let saved = await saveContact(account, lead, listId)
  const contactId = text(saved.contact_id)
  let onList = false
  if (contactId) {
    try {
      onList = await contactOnList(account, contactId, listId)
    } catch {
      onList = true
    }
  }
  if (!onList) {
    listsByAccount.delete(account)
    listId = await ensureList(account, listName)
    saved = await saveContact(account, lead, listId)
    const retriedId = text(saved.contact_id)
    if (retriedId) {
      try {
        onList = await contactOnList(account, retriedId, listId)
      } catch {
        onList = true
      }
    }
  }
  if (!onList) throw new Error('The lead was not added to the Constant Contact list.')
  return { account, listName, ok: true as const }
}

export async function syncLandingLeadToConstantContact(
  lead: Record<string, unknown>,
  meta: LandingPageSheetMeta
) {
  if (isAgentOrBrokerLead(lead)) return { skipped: 'broker' as const }
  if (!leadEmail(lead)) return { skipped: 'no-email' as const }

  const listName = landingListName(lead, meta)
  const results = await Promise.all(
    ACCOUNTS.map(async (account) => {
      try {
        return await addToAccount(account, lead, listName)
      } catch (error) {
        return {
          account,
          listName,
          ok: false as const,
          error: error instanceof Error ? error.message : 'Constant Contact request failed.',
        }
      }
    })
  )
  return { listName, results }
}
