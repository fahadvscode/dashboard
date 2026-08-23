export const HOME_SCREEN_PROJECTS_EVENT = 'home-screen-projects-changed'
const STORAGE_KEY = 'dashboard_home_projects'
const MAX_PINNED = 8

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

export function getHomeScreenProjects(): HomeScreenProject[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as HomeScreenProject[]) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function isPinnedToHomeScreen(id: string): boolean {
  return getHomeScreenProjects().some((project) => project.id === String(id))
}

export function pinHomeScreenProject(project: Omit<HomeScreenProject, 'pinnedAt'>): void {
  const id = String(project.id)
  const next = [
    { ...project, id, pinnedAt: Date.now() },
    ...getHomeScreenProjects().filter((item) => item.id !== id),
  ].slice(0, MAX_PINNED)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  notify()
}

export function unpinHomeScreenProject(id: string): void {
  const next = getHomeScreenProjects().filter((project) => project.id !== String(id))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  notify()
}
