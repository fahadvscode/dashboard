export type WorksheetFile = {
  path: string
  name: string
  contentType: string
  viewUrl?: string
}

export type IdFields = {
  firstName: string
  lastName: string
  address1: string
  address2: string
  city: string
  state: string
  postal: string
  country: string
}

export type Purchaser = IdFields & {
  phone: string
  email: string
  idFile: WorksheetFile | null
}

export type WorksheetModel = {
  name: string
  type: string
}

export type WorksheetRecord = {
  id: string
  createdAt: string
  updatedAt: string
  fubPersonId: string
  clientId: string
  personName: string
  projectId: string
  projectName: string
  projectCity: string
  projectBuilder: string
  models: WorksheetModel[]
  purchaser1: Purchaser
  purchaser2: Purchaser
  occupation: string
  employer: string
  notes: string
  extraFiles: WorksheetFile[]
  fubAttachTried: string[]
}

export type WorksheetSummary = {
  id: string
  clientId: string
  personName: string
  projectName: string
  updatedAt: string
}

export type WorksheetPerson = {
  id: string
  clientId: string
  firstName: string
  lastName: string
  name: string
  email: string
  phone: string
  address1: string
  address2: string
  city: string
  state: string
  postal: string
  country: string
  occupation: string
  employer: string
}

export function emptyIdFields(): IdFields {
  return {
    firstName: '',
    lastName: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postal: '',
    country: '',
  }
}

export function emptyPurchaser(): Purchaser {
  return {
    ...emptyIdFields(),
    phone: '',
    email: '',
    idFile: null,
  }
}
