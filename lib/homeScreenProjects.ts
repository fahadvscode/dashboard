import { supabase } from '@/lib/supabase'

export const HOME_SCREEN_PROJECTS_EVENT = 'home-screen-projects-changed'
const STORAGE_KEY = 'dashboard_home_projects'
const COLLECTION_NAME = '__home_screen__'
const COLLECTION_COMPANY = 'precon_factory'
const MAX_PINNED = 8

export const HOME_SCREEN_COLLECTION_NAME = COLLECTION_NAME

export type HomeScreenProject = {
  id: string
  project_name: string
  builder: string
  city: string
  price: string
  address: string
  pictures: string
  pinnedAt: number
}

function notify() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(HOME_SCREEN_PROJECTS_EVENT))
}

function getLocal(): HomeScreenProject[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as HomeScreenProject[]) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function setLocal(projects: HomeScreenProject[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects.slice(0, MAX_PINNED)))
}

async function getCollectionId(): Promise<string | null> {
  const { data, error } = await (supabase as any)
    .from('project_collections')
    .select('id')
    .eq('name', COLLECTION_NAME)
    .maybeSingle()

  if (!error && data?.id) return data.id as string

  const { data: created, error: createError } = await (supabase as any)
    .from('project_collections')
    .insert({
      name: COLLECTION_NAME,
      city: 'Home',
      company: COLLECTION_COMPANY,
    })
    .select('id')
    .single()

  if (createError || !created?.id) return null
  return created.id as string
}

function mapProperty(row: Record<string, unknown>, index: number): HomeScreenProject {
  return {
    id: String(row.id ?? ''),
    project_name: String(row.project_name ?? ''),
    builder: String(row.builder ?? ''),
    city: String(row.city ?? ''),
    price: String(row.price ?? ''),
    address: String(row.address ?? ''),
    pictures: String(row.pictures ?? ''),
    pinnedAt: Date.now() - index,
  }
}

export async function fetchHomeScreenProjects(): Promise<HomeScreenProject[]> {
  const local = getLocal()

  try {
    const collectionId = await getCollectionId()
    if (!collectionId) return local

    const { data: links } = await (supabase as any)
      .from('collection_projects')
      .select('property_id, sort_order')
      .eq('collection_id', collectionId)
      .order('sort_order', { ascending: true })

    const ids = ((links ?? []) as { property_id: string; sort_order: number }[]).map((row) =>
      String(row.property_id)
    )

    if (ids.length === 0 && local.length > 0) {
      for (let i = 0; i < local.length; i++) {
        await (supabase as any).from('collection_projects').insert({
          collection_id: collectionId,
          property_id: local[i].id,
          sort_order: i,
        })
      }
      return local
    }

    if (ids.length === 0) return []

    const { data: props } = await supabase
      .from('canada_properties')
      .select('id, project_name, builder, city, price, address, pictures')
      .in('id', ids)

    const byId = new Map((props ?? []).map((row) => [String((row as { id: string }).id), row]))
    const mapped = ids
      .map((id, index) => {
        const row = byId.get(id)
        if (row) return mapProperty(row as Record<string, unknown>, index)
        return local.find((item) => item.id === id) ?? null
      })
      .filter((item): item is HomeScreenProject => Boolean(item))

    setLocal(mapped)
    return mapped
  } catch {
    return local
  }
}

export function getHomeScreenProjects(): HomeScreenProject[] {
  return getLocal()
}

export function isPinnedToHomeScreen(id: string): boolean {
  return getLocal().some((project) => project.id === String(id))
}

export async function pinHomeScreenProject(project: Omit<HomeScreenProject, 'pinnedAt'>): Promise<void> {
  const id = String(project.id)
  const next = [
    { ...project, id, pinnedAt: Date.now() },
    ...getLocal().filter((item) => item.id !== id),
  ].slice(0, MAX_PINNED)
  setLocal(next)

  try {
    const collectionId = await getCollectionId()
    if (!collectionId) {
      notify()
      return
    }

    await (supabase as any).from('collection_projects').delete().eq('collection_id', collectionId).eq('property_id', id)
    await (supabase as any).from('collection_projects').insert({
      collection_id: collectionId,
      property_id: id,
      sort_order: 0,
    })
  } catch (error) {
    console.error('Could not sync home screen project:', error)
  }
  notify()
}

export async function unpinHomeScreenProject(id: string): Promise<void> {
  const key = String(id)
  setLocal(getLocal().filter((project) => project.id !== key))

  try {
    const collectionId = await getCollectionId()
    if (collectionId) {
      await (supabase as any)
        .from('collection_projects')
        .delete()
        .eq('collection_id', collectionId)
        .eq('property_id', key)
    }
  } catch (error) {
    console.error('Could not remove home screen project:', error)
  }
  notify()
}
