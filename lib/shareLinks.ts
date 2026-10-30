export const BOOKING_PAGE_LINKS = [
  { id: 'fj-booking', name: 'FJ Booking', href: 'https://www.qikfill.com/fj-booking' },
  { id: 'precon-booking', name: 'Precon Factory Booking', href: 'https://www.qikfill.com/preconfactory-booking' },
] as const

export const WORKSHEET_PAGE_LINKS = [
  { id: 'fj-worksheet', name: 'FJ Worksheet', href: 'https://qikfill.com/worksheet.html?template=fj-sold' },
  { id: 'precon-worksheet', name: 'Precon Factory Worksheet', href: 'https://qikfill.com/worksheet.html?template=preconfactory-dark' },
  { id: 'gta-worksheet', name: 'GTA Lowrise Worksheet', href: 'https://qikfill.com/worksheet.html?template=gtalowrise' },
] as const

export const COPY_PAGE_LINKS = [...BOOKING_PAGE_LINKS, ...WORKSHEET_PAGE_LINKS]

export async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    try {
      const input = document.createElement('textarea')
      input.value = value
      input.setAttribute('readonly', '')
      input.style.position = 'fixed'
      input.style.left = '-9999px'
      document.body.appendChild(input)
      input.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(input)
      return ok
    } catch {
      return false
    }
  }
}
