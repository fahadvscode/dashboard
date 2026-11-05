import { getSupabaseAdmin } from '@/lib/supabase'
import { fubApiFetch } from '@/lib/fubApi'
import {
  emptyPurchaser,
  type Purchaser,
  type WorksheetFile,
  type WorksheetModel,
  type WorksheetRecord,
  type WorksheetSummary,
} from '@/lib/worksheetTypes'

export const WORKSHEET_BUCKET = 'worksheet-documents'

const ID_PREFIX = 'ids/'
const FILE_PREFIX = 'files/'
const RECORD_PREFIX = 'records/'

let bucketReady = false

function clip(value: unknown, max: number) {
  return String(value ?? '').trim().slice(0, max)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function safeUploadName(name: string) {
  const base = name.split(/[/\\]/).pop() || 'document'
  const cleaned = base.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 80)
  return cleaned || 'document'
}

export function sniffWorksheetFile(buffer: Buffer): string | null {
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString() === '%PDF') return 'application/pdf'
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png'
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString() === 'RIFF' &&
    buffer.subarray(8, 12).toString() === 'WEBP'
  ) {
    return 'image/webp'
  }
  return null
}

export async function ensureWorksheetBucket() {
  if (bucketReady) return
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.storage.listBuckets()
  if (error) throw new Error(error.message)
  if (!data?.some((bucket) => bucket.name === WORKSHEET_BUCKET)) {
    const created = await supabase.storage.createBucket(WORKSHEET_BUCKET, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024,
    })
    if (created.error && !/already exists/i.test(created.error.message)) {
      throw new Error(created.error.message)
    }
  }
  bucketReady = true
}

function cleanFile(value: unknown): WorksheetFile | null {
  if (!isRecord(value)) return null
  const path = clip(value.path, 240)
  if (!/^(ids|files)\/[A-Za-z0-9._/-]+$/.test(path) || path.includes('..')) return null
  return {
    path,
    name: clip(value.name, 180) || 'document',
    contentType: clip(value.contentType, 80) || 'application/octet-stream',
  }
}

function cleanPurchaser(value: unknown): Purchaser {
  const row = isRecord(value) ? value : {}
  const base = emptyPurchaser()
  return {
    firstName: clip(row.firstName, 80),
    lastName: clip(row.lastName, 80),
    address1: clip(row.address1, 160),
    address2: clip(row.address2, 160),
    city: clip(row.city, 80),
    state: clip(row.state, 80),
    postal: clip(row.postal, 20),
    country: clip(row.country, 80),
    phone: clip(row.phone, 40),
    email: clip(row.email, 160),
    idFile: cleanFile(row.idFile),
  }
}

function storedTime(value: unknown, fallback: string) {
  const text = clip(value, 40)
  const time = Date.parse(text)
  return Number.isFinite(time) ? new Date(time).toISOString() : fallback
}

function cleanModels(value: unknown): WorksheetModel[] {
  const rows = Array.isArray(value) ? value : []
  return [0, 1, 2].map((index) => {
    const row = isRecord(rows[index]) ? rows[index] : {}
    return { name: clip(row.name, 120), type: clip(row.type, 120) }
  })
}

export function normalizeWorksheet(input: unknown, existing?: WorksheetRecord | null, touch = true): WorksheetRecord {
  const row = isRecord(input) ? input : {}
  const now = new Date().toISOString()
  const id = existing?.id || (/^[0-9a-f-]{36}$/i.test(clip(row.id, 40)) ? clip(row.id, 40) : crypto.randomUUID())
  const purchaser1 = cleanPurchaser(row.purchaser1)
  const personName =
    `${purchaser1.firstName} ${purchaser1.lastName}`.trim() || clip(row.personName, 160) || existing?.personName || ''
  const tried = Array.isArray(row.fubAttachTried)
    ? row.fubAttachTried.map((item) => clip(item, 240)).filter((item) => item.startsWith(ID_PREFIX) || item.startsWith(FILE_PREFIX))
    : existing?.fubAttachTried || []
  return {
    id,
    createdAt: storedTime(row.createdAt, existing?.createdAt || now),
    updatedAt: touch ? now : storedTime(row.updatedAt, existing?.updatedAt || now),
    fubPersonId: clip(row.fubPersonId, 40),
    clientId: clip(row.clientId, 80),
    personName,
    projectId: clip(row.projectId, 80),
    projectName: clip(row.projectName, 160),
    projectCity: clip(row.projectCity, 80),
    projectBuilder: clip(row.projectBuilder, 120),
    models: cleanModels(row.models),
    purchaser1,
    purchaser2: cleanPurchaser(row.purchaser2),
    occupation: clip(row.occupation, 120),
    employer: clip(row.employer, 120),
    notes: clip(row.notes, 5000),
    extraFiles: (Array.isArray(row.extraFiles) ? row.extraFiles : []).map(cleanFile).filter((file): file is WorksheetFile => Boolean(file)).slice(0, 8),
    fubAttachTried: tried,
  }
}

async function signedUrl(path: string, expiresIn: number) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.storage.from(WORKSHEET_BUCKET).createSignedUrl(path, expiresIn)
  if (error || !data?.signedUrl) return ''
  return data.signedUrl
}

async function withViewUrls(record: WorksheetRecord): Promise<WorksheetRecord> {
  async function sign(file: WorksheetFile | null) {
    if (!file) return null
    return { ...file, viewUrl: await signedUrl(file.path, 60 * 60) }
  }
  return {
    ...record,
    purchaser1: { ...record.purchaser1, idFile: await sign(record.purchaser1.idFile) },
    purchaser2: { ...record.purchaser2, idFile: await sign(record.purchaser2.idFile) },
    extraFiles: await Promise.all(record.extraFiles.map(async (file) => ({ ...file, viewUrl: await signedUrl(file.path, 60 * 60) }))),
  }
}

function recordPath(id: string) {
  return `${RECORD_PREFIX}${id}.json`
}

async function readRecord(id: string): Promise<WorksheetRecord | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.storage.from(WORKSHEET_BUCKET).download(recordPath(id))
  if (error || !data) return null
  try {
    return normalizeWorksheet(JSON.parse(await data.text()), null, false)
  } catch {
    return null
  }
}

async function writeRecord(record: WorksheetRecord) {
  const supabase = getSupabaseAdmin()
  const body = Buffer.from(JSON.stringify(record), 'utf8')
  const { error } = await supabase.storage.from(WORKSHEET_BUCKET).upload(recordPath(record.id), body, {
    contentType: 'application/json',
    upsert: true,
  })
  if (error) throw new Error(error.message)
}

function filesOn(record: WorksheetRecord) {
  return [record.purchaser1.idFile, record.purchaser2.idFile, ...record.extraFiles].filter((file): file is WorksheetFile => Boolean(file))
}

async function attachNewFiles(record: WorksheetRecord) {
  const personId = Number(record.fubPersonId)
  if (!Number.isFinite(personId) || personId <= 0) return ''
  const pending = filesOn(record).filter((file) => !record.fubAttachTried.includes(file.path))
  if (pending.length === 0) return ''
  let warning = ''
  for (const file of pending) {
    record.fubAttachTried.push(file.path)
    const url = await signedUrl(file.path, 60 * 60 * 24 * 7)
    if (!url) {
      warning = 'Worksheet saved. The ID link could not be added to Follow Up Boss.'
      continue
    }
    try {
      const result = await fubApiFetch('/personAttachments', {
        method: 'POST',
        body: JSON.stringify({
          personId,
          uri: url,
          fileName: record.clientId ? `${record.clientId} ${file.name}` : file.name,
        }),
      })
      if (!result.ok && !warning) {
        warning = 'Worksheet saved. Follow Up Boss did not accept the ID link in Files.'
      }
    } catch {
      if (!warning) warning = 'Worksheet saved. The ID link could not be added to Follow Up Boss.'
    }
  }
  return warning
}

export async function uploadWorksheetFile(buffer: Buffer, filename: string, mime: string, kind: 'id' | 'document') {
  await ensureWorksheetBucket()
  const prefix = kind === 'id' ? 'ids' : 'files'
  const path = `${prefix}/${crypto.randomUUID()}-${safeUploadName(filename)}`
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.storage.from(WORKSHEET_BUCKET).upload(path, buffer, {
    contentType: mime,
    upsert: false,
  })
  if (error) throw new Error(error.message)
  const file: WorksheetFile = {
    path,
    name: safeUploadName(filename),
    contentType: mime,
    viewUrl: await signedUrl(path, 60 * 60),
  }
  return file
}

export async function listWorksheets(clientId?: string): Promise<WorksheetSummary[]> {
  await ensureWorksheetBucket()
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.storage.from(WORKSHEET_BUCKET).list('records', {
    limit: 100,
    sortBy: { column: 'updated_at', order: 'desc' },
  })
  if (error) throw new Error(error.message)
  const names = (data || [])
    .map((item) => item.name)
    .filter((name) => name.endsWith('.json'))
    .slice(0, 40)
  const records = await Promise.all(
    names.map(async (name) => readRecord(name.replace(/\.json$/, '')))
  )
  const wanted = clip(clientId, 80).toLowerCase()
  return records
    .filter((record): record is WorksheetRecord => Boolean(record))
    .filter((record) => !wanted || record.clientId.toLowerCase() === wanted)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((record) => ({
      id: record.id,
      clientId: record.clientId,
      personName: record.personName,
      projectName: record.projectName,
      updatedAt: record.updatedAt,
    }))
}

export async function getWorksheet(id: string) {
  await ensureWorksheetBucket()
  const record = await readRecord(id)
  if (!record) return null
  return withViewUrls(record)
}

export async function saveWorksheet(input: unknown, existingId?: string) {
  await ensureWorksheetBucket()
  const existing = existingId ? await readRecord(existingId) : null
  if (existingId && !existing) return { error: 'Worksheet not found.', status: 404 as const }
  const record = normalizeWorksheet(input, existing)
  if (existing) record.fubAttachTried = existing.fubAttachTried
  const fubWarning = await attachNewFiles(record)
  await writeRecord(record)
  return { worksheet: await withViewUrls(record), fubWarning }
}
