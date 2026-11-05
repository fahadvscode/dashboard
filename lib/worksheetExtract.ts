import os from 'os'
import path from 'path'
import type { IdFields } from '@/lib/worksheetTypes'
import { emptyIdFields } from '@/lib/worksheetTypes'

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'

const FIELD_PROMPT = `Read this government photo ID (driver licence, passport, or similar) and return ONLY JSON with these keys:
{"firstName":"","lastName":"","address1":"","address2":"","city":"","state":"","postal":"","country":""}
Use empty strings for anything not printed. Do not guess. firstName is the given name. lastName is the family name. address1 is the street. state is the province or state. postal is the postal or zip code.`

function clip(value: unknown, max = 160) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
}

function presentField(value: string, key: keyof IdFields) {
  if (!value) return ''
  if (key === 'postal') return value.toUpperCase()
  if (key === 'state' && value.length <= 3) return value.toUpperCase()
  return titleCase(value)
}

function asFields(value: unknown): IdFields {
  const row = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const raw = {
    firstName: clip(row.firstName, 80),
    lastName: clip(row.lastName, 80),
    address1: clip(row.address1, 160),
    address2: clip(row.address2, 160),
    city: clip(row.city, 80),
    state: clip(row.state, 80),
    postal: clip(row.postal, 20),
    country: clip(row.country, 80),
  }
  return {
    firstName: presentField(raw.firstName, 'firstName'),
    lastName: presentField(raw.lastName, 'lastName'),
    address1: presentField(raw.address1, 'address1'),
    address2: presentField(raw.address2, 'address2'),
    city: presentField(raw.city, 'city'),
    state: presentField(raw.state, 'state'),
    postal: presentField(raw.postal, 'postal'),
    country: presentField(raw.country, 'country'),
  }
}

function parseJson(raw: string) {
  const jsonStr = raw.replace(/```json\n?/gi, '').replace(/```/g, '').trim()
  const start = jsonStr.indexOf('{')
  const end = jsonStr.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try {
    return JSON.parse(jsonStr.slice(start, end + 1)) as unknown
  } catch {
    return null
  }
}

function titleCase(value: string) {
  const clean = value.replace(/\s+/g, ' ').trim()
  if (!clean) return ''
  if (clean !== clean.toUpperCase()) return clean
  return clean.toLowerCase().replace(/\b([a-z])/g, (letter) => letter.toUpperCase())
}

export function parseIdText(raw: string): IdFields {
  const fields = emptyIdFields()
  const lines = raw
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  const postalMatch = raw.toUpperCase().match(/\b([A-Z]\d[A-Z])\s?(\d[A-Z]\d)\b/)
  if (postalMatch) fields.postal = `${postalMatch[1]} ${postalMatch[2]}`
  const compact = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '')

  const comma = lines.find((line) => /^[A-Z][A-Z' -]+,\s+[A-Z]/.test(line))
  if (comma) {
    const [last, rest] = comma.split(',')
    const given = (rest || '').trim().split(/\s+/).filter(Boolean)
    fields.lastName = titleCase(last || '')
    fields.firstName = titleCase(given[0] || '')
  } else {
    const nameLine = lines.find((line) => /^[A-Z][A-Za-z' -]+ [A-Z][A-Za-z' -]+$/.test(line) && !/\d/.test(line))
    if (nameLine) {
      const parts = nameLine.split(' ')
      fields.firstName = titleCase(parts[0] || '')
      fields.lastName = titleCase(parts.slice(1).join(' '))
    }
  }

  const street = lines.find((line) =>
    /\d+\s+.+\b(ST|STREET|AVE|AVENUE|RD|ROAD|BLVD|DR|DRIVE|CRES|CRESCENT|WAY|LANE|LN|CRT|COURT|PL|PLACE|TERR|TRAIL|CIR)\b/i.test(line)
  )
  if (street) fields.address1 = titleCase(street.replace(postalMatch ? /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i : /$^/, '').trim())

  const provinceRe = /\b(ON|BC|AB|QC|NS|NB|MB|SK|PE|NL|NT|YT|NU|ONTARIO|BRITISH COLUMBIA|ALBERTA|QUEBEC)\b/i
  const cityLine = lines.find((line) => fields.postal && compact(line).includes(compact(fields.postal)))
  if (cityLine) {
    let rest = cityLine
    if (postalMatch) rest = rest.replace(/\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i, ' ')
    const province = rest.match(provinceRe)
    if (province) {
      fields.state = province[1].length <= 3 ? province[1].toUpperCase() : titleCase(province[1])
      rest = rest.replace(provinceRe, ' ')
    }
    fields.city = titleCase(rest)
  }

  if (fields.postal || /\b(CANADA|DRIVER|PERMIS|ONTARIO)\b/i.test(raw)) fields.country = 'Canada'
  return fields
}

function hasName(fields: IdFields) {
  return Boolean(fields.firstName || fields.lastName)
}

function prefer(primary: IdFields, fallback: IdFields): IdFields {
  const next = { ...fallback }
  ;(Object.keys(primary) as (keyof IdFields)[]).forEach((key) => {
    if (primary[key]) next[key] = primary[key]
  })
  return next
}

async function structureWithDeepSeek(text: string, apiKey: string): Promise<IdFields | null> {
  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0,
      max_tokens: 400,
      messages: [
        { role: 'system', content: 'You extract fields from ID text. Respond with JSON only.' },
        { role: 'user', content: `${FIELD_PROMPT}\n\nID TEXT:\n${text.slice(0, 6000)}` },
      ],
    }),
  })
  if (!response.ok) return null
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const parsed = parseJson(data.choices?.[0]?.message?.content || '')
  return parsed ? asFields(parsed) : null
}

async function readWithGemini(buffer: Buffer, mime: string, apiKey: string): Promise<IdFields | null> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        contents: [
          {
            parts: [
              { text: FIELD_PROMPT },
              { inlineData: { mimeType: mime, data: buffer.toString('base64') } },
            ],
          },
        ],
      }),
    }
  )
  if (!response.ok) return null
  const data = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
  const raw = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n') || ''
  const parsed = parseJson(raw)
  return parsed ? asFields(parsed) : null
}

let ocrChain: Promise<unknown> = Promise.resolve()

async function recognizeImage(buffer: Buffer) {
  const run = ocrChain.then(async () => {
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker('eng', 1, {
      workerPath: path.join(process.cwd(), 'node_modules/tesseract.js/src/worker-script/node/index.js'),
      cachePath: path.join(os.tmpdir(), 'propdash-tess'),
    })
    try {
      const result = await worker.recognize(buffer)
      return result.data.text || ''
    } finally {
      await worker.terminate()
    }
  })
  ocrChain = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

async function pdfText(buffer: Buffer) {
  const { extractText, renderPageAsImage } = await import('unpdf')
  const data = new Uint8Array(buffer)
  const extracted = await extractText(data, { mergePages: true })
  const text = Array.isArray(extracted.text) ? extracted.text.join('\n') : String(extracted.text || '')
  if (text.trim().length >= 25) return text
  try {
    const image = await renderPageAsImage(data, 1, { scale: 2 })
    const ocr = await recognizeImage(Buffer.from(image))
    return ocr.trim() || text
  } catch {
    return text
  }
}

async function fieldsFromText(text: string) {
  const heuristic = parseIdText(text)
  const deepseekKey = String(process.env.DEEPSEEK_API_KEY || '').trim()
  if (!deepseekKey || text.trim().length < 8) return heuristic
  try {
    const structured = await structureWithDeepSeek(text, deepseekKey)
    return structured ? prefer(structured, heuristic) : heuristic
  } catch {
    return heuristic
  }
}

export async function extractIdFields(buffer: Buffer, mime: string) {
  const geminiKey = String(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim()
  if (geminiKey) {
    try {
      const read = await readWithGemini(buffer, mime, geminiKey)
      if (read && hasName(read)) {
        return { fields: read, message: '' }
      }
    } catch {
      // Fall through to text recognition.
    }
  }

  let text = ''
  try {
    if (mime === 'application/pdf') text = await pdfText(buffer)
    else text = await recognizeImage(buffer)
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Could not read the file.'
    return {
      fields: emptyIdFields(),
      message: `The file is attached. The name could not be read (${detail}).`,
    }
  }

  if (mime === 'application/pdf' && text.trim().length < 25) {
    return {
      fields: emptyIdFields(),
      message: 'This PDF looks like a scan. The file is attached. Upload a PNG or JPG photo of the ID to fill the name and address.',
    }
  }

  const fields = await fieldsFromText(text)
  if (!hasName(fields)) {
    return {
      fields,
      message: 'The file is attached. A name was not found on it, so type the purchaser name in.',
    }
  }
  return { fields, message: '' }
}
