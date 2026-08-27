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
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id) : []
  } catch {
    return []
  }
}

function setLocal(projects: HomeScreenProject[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dedupeProjects(projects).slice(0, MAX_PINNED)))
}

function dedupeProjects(projects: HomeScreenProject[]) {
  const seen = new Set<string>()
  const next: HomeScreenProject[] = []
  for (const project of projects) {
    const id = String(project.id)
    if (!id || seen.has(id)) continue
    seen.add(id)
    next.push({ ...project, id })
  }
  return next
}

function mergeProjects(primary: HomeScreenProject[], secondary: HomeScreenProject[]) {
  return dedupeProjects([...primary, ...secondary]).slice(0, MAX_PINNED)
}

async function getCollectionId(): Promise<string | null> {
  const { data: rows, error } = await (supabase as any)
    .from('project_collections')
    .select('id, created_at')
    .eq('name', COLLECTION_NAME)
    .order('created_at', { ascending: true })

  if (error) return null

  const collections = (rows ?? []) as { id: string; created_at?: string }[]
  if (collections.length === 0) {
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

  const primaryId = collections[0].id
  for (const extra of collections.slice(1)) {
    const { data: links } = await (supabase as any)
      .from('collection_projects')
      .select('property_id, sort_order')
      .eq('collection_id', extra.id)

    for (const link of (links ?? []) as { property_id: string; sort_order: number }[]) {
      await (supabase as any).from('collection_projects').upsert(
        {
          collection_id: primaryId,
          property_id: String(link.property_id),
          sort_order: link.sort_order ?? 0,
        },
        { onConflict: 'collection_id,property_id', ignoreDuplicates: true }
      )
    }

    await (supabase as any).from('project_collections').delete().eq('id', extra.id)
  }

  return primaryId
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

async function loadProjectsByIds(ids: string[], fallback: HomeScreenProject[]) {
  if (ids.length === 0) return []

  const { data: props } = await supabase
    .from('canada_properties')
    .select('id, project_name, builder, city, price, address, pictures')
    .in('id', ids)

  const byId = new Map((props ?? []).map((row) => [String((row as { id: string }).id), row]))
  const fallbackById = new Map(fallback.map((item) => [item.id, item]))

  return ids
    .map((id, index) => {
      const row = byId.get(id)
      if (row) return mapProperty(row as Record<string, unknown>, index)
      return fallbackById.get(id) ?? null
    })
    .filter((item): item is HomeScreenProject => Boolean(item))
}

async function writeCollection(collectionId: string, projects: HomeScreenProject[]) {
  const { data: existing } = await (supabase as any)
    .from('collection_projects')
    .select('property_id')
    .eq('collection_id', collectionId)

  const existingIds = new Set(
    ((existing ?? []) as { property_id: string }[]).map((row) => String(row.property_id))
  )
  const nextIds = new Set(projects.map((project) => project.id))

  for (const id of existingIds) {
    if (!nextIds.has(id)) {
      await (supabase as any)
        .from('collection_projects')
        .delete()
        .eq('collection_id', collectionId)
        .eq('property_id', id)
    }
  }

  for (let i = 0; i < projects.length; i++) {
    const id = projects[i].id
    if (existingIds.has(id)) {
      await (supabase as any)
        .from('collection_projects')
        .update({ sort_order: i })
        .eq('collection_id', collectionId)
        .eq('property_id', id)
      continue
    }
    await (supabase as any).from('collection_projects').insert({
      collection_id: collectionId,
      property_id: id,
      sort_order: i,
    })
  }
}

function pendingNotInDb(projects: HomeScreenProject[], dbIdSet: Set<string>) {
  const pendingMs = 2 * 60 * 1000
  return projects.filter(
    (project) => !dbIdSet.has(project.id) && Date.now() - (project.pinnedAt || 0) < pendingMs
  )
}

export async function fetchHomeScreenProjects(): Promise<HomeScreenProject[]> {
  const localAtStart = getLocal()

  try {
    const collectionId = await getCollectionId()
    if (!collectionId) return getLocal()

    const { data: links } = await (supabase as any)
      .from('collection_projects')
      .select('property_id, sort_order')
      .eq('collection_id', collectionId)
      .order('sort_order', { ascending: true })

    const dbIds = ((links ?? []) as { property_id: string }[]).map((row) => String(row.property_id))
    const dbIdSet = new Set(dbIds)
    const dbProjects = await loadProjectsByIds(dbIds, getLocal())
    const current = getLocal()

    if (dbProjects.length === 0 && current.length > 0) {
      setLocal(current)
      await writeCollection(collectionId, current)
      return current
    }

    const pendingPins = pendingNotInDb(current, dbIdSet)
    const merged = mergeProjects(dbProjects, pendingPins)

    setLocal(merged)
    if (pendingPins.length > 0) {
      await writeCollection(collectionId, merged)
    }
    return merged
  } catch {
    return getLocal().length > 0 ? getLocal() : localAtStart
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
  const next = mergeProjects(
    [{ ...project, id, pinnedAt: Date.now() }],
    getLocal()
  )
  setLocal(next)

  try {
    const collectionId = await getCollectionId()
    if (collectionId) await writeCollection(collectionId, next)
  } catch (error) {
    console.error('Could not sync home screen project:', error)
  }
  notify()
}

export async function unpinHomeScreenProject(id: string): Promise<void> {
  const key = String(id)
  const next = getLocal().filter((project) => project.id !== key)
  setLocal(next)

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
