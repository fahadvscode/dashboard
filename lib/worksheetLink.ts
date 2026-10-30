const WORKSHEET_TEMPLATES = {
  fj: 'fj-sold',
  precon: 'preconfactory-dark',
  gta: 'gtalowrise',
} as const

export type WorksheetBrandId = keyof typeof WORKSHEET_TEMPLATES

export function worksheetTemplate(brandId: string) {
  return WORKSHEET_TEMPLATES[brandId as WorksheetBrandId] || ''
}

export function worksheetLink(brandId: string, projectName: string, projectId: string) {
  const template = worksheetTemplate(brandId)
  const project = encodeURIComponent(projectName.trim()).replace(/%20/g, '+')
  const id = encodeURIComponent(projectId.trim())
  if (!template || !project || !id) return ''
  return `https://qikfill.com/worksheet.html?template=${template}&project=${project}&project_id=${id}`
}
