export function formatInterviewCandidateId(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(number) || number < 0) return null
  return String(number).padStart(4, '0')
}
