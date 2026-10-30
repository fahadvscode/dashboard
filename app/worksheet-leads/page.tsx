import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Purchaser = {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  occupation?: string
}

type WorksheetLead = {
  id: string
  created_at: string
  brand: string | null
  project_name: string | null
  project_id: string | null
  parking: string | null
  locker: string | null
  notes: string | null
  status: string | null
  purchasers: Purchaser[] | null
}

function purchaserName(person: Purchaser | undefined) {
  return [person?.first_name, person?.last_name].filter(Boolean).join(' ') || 'Name not provided'
}

function formatWhen(value: string) {
  return new Date(value).toLocaleString('en-US', {
    timeZone: 'America/Toronto',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default async function WorksheetLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>
}) {
  const { leadId } = await searchParams
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('worksheets')
    .select('id, created_at, brand, project_name, project_id, parking, locker, notes, status, purchasers')
    .order('created_at', { ascending: false })
    .limit(200)

  const leads = (data || []) as WorksheetLead[]

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-semibold text-slate-900">Worksheet Leads</h1>
      <p className="mt-1 text-sm text-slate-600">Purchaser worksheets submitted from the project forms.</p>
      {error ? <p className="mt-4 text-sm text-red-700">{error.message}</p> : null}
      {!error && leads.length === 0 ? <p className="mt-6 text-sm text-slate-500">No worksheets yet.</p> : null}
      <div className="mt-4 space-y-3">
        {leads.map((lead) => {
          const person = lead.purchasers?.[0]
          const selected = leadId === lead.id
          return (
            <article
              key={lead.id}
              id={lead.id}
              className={`rounded-2xl bg-white p-4 shadow-sm ${selected ? 'ring-2 ring-blue-500' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">{purchaserName(person)}</h2>
                  <p className="text-sm text-slate-600">{lead.project_name || 'Project not specified'}</p>
                </div>
                <p className="shrink-0 text-xs text-slate-500">{formatWhen(lead.created_at)}</p>
              </div>
              <dl className="mt-3 grid gap-1 text-sm text-slate-700">
                <div>{person?.email || 'No email'}</div>
                <div>{person?.phone || 'No phone'}</div>
                <div>{[lead.brand, lead.project_id ? `ID ${lead.project_id}` : ''].filter(Boolean).join(' · ')}</div>
                <div>{[lead.parking ? `Parking: ${lead.parking}` : '', lead.locker ? `Locker: ${lead.locker}` : ''].filter(Boolean).join(' · ')}</div>
                {person?.occupation ? <div>Occupation: {person.occupation}</div> : null}
                {lead.notes ? <div className="whitespace-pre-wrap">Notes: {lead.notes}</div> : null}
              </dl>
            </article>
          )
        })}
      </div>
    </div>
  )
}
