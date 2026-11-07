export type ReportAccountId = 'primary' | 'second' | 'third'

export type SignupPage = {
  name: string
  count: number
}

export type ReportCampaign = {
  id: string
  name: string
  status: 'sent' | 'scheduled' | 'sending'
  when: string | null
  openRate: number | null
  clickRate: number | null
  unsubscribed: number | null
  bounced: number | null
  signups: { total: number; pages: SignupPage[] } | null
}

export type AccountReport = {
  id: ReportAccountId
  name: string
  campaigns: ReportCampaign[]
  error: string | null
}
