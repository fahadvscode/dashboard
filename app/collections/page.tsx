'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Plus,
  FolderOpen,
  Trash2,
  MapPin,
  ChevronRight,
  X,
  Building2,
  Loader2,
} from 'lucide-react'
import ProjectSearchSelect from '@/components/ProjectSearchSelect'
import CollectionProjectCard from '@/components/CollectionProjectCard'
import CollectionsMapPanel from '@/components/CollectionsMapPanel'

type Company = 'fj' | 'precon_factory'

interface Collection {
  id: string
  name: string
  city: string | null
  company: Company
  created_at: string
}

interface Property {
  id: string
  project_name: string
  builder: string
  address: string
  city: string
  price: string
  bedrooms: string
  bathrooms: string
  sqft: string
  details: string
  features: string
  quick_facts: string
  pictures: string
  website_url: string
  fj_landing_page: string
  precon_factory_landing_page: string
  map_address?: string | null
  map_lat?: number | null
  map_lng?: number | null
}

const COMPANY_CONFIG: Record<Company, { label: string; color: string; bg: string }> = {
  fj: {
    label: 'FJ',
    color: 'text-blue-600',
    bg: 'from-blue-500 to-blue-600',
  },
  precon_factory: {
    label: 'Precon Factory',
    color: 'text-purple-600',
    bg: 'from-purple-600 via-purple-700 to-pink-600',
  },
}

async function fetchPropertiesForCollection(collection: Collection): Promise<Property[]> {
  const { data: links } = await (supabase as any)
    .from('collection_projects')
    .select('property_id, sort_order')
    .eq('collection_id', collection.id)
    .order('sort_order', { ascending: true })

  const linkRows = (links ?? []) as { property_id: string; sort_order: number }[]
  if (!linkRows.length) return []

  const ids = linkRows.map((l) => l.property_id)
  const { data: props, error } = await supabase
    .from('canada_properties')
    .select('*')
    .in('id', ids)

  if (error) {
    console.error('Error fetching properties:', error)
    return []
  }

  const propList = (props ?? []) as Property[]
  return propList.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
}

export default function CollectionsPage() {
  const [activeCompany, setActiveCompany] = useState<Company>('precon_factory')
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [setupRequired, setSetupRequired] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewingCollection, setViewingCollection] = useState<{ collection: Collection; properties: Property[] } | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [mapCollectionId, setMapCollectionId] = useState<string | null>(null)
  const [mapProperties, setMapProperties] = useState<Property[]>([])
  const [mapLoading, setMapLoading] = useState(false)

  useEffect(() => {
    fetchCollections()
  }, [activeCompany])

  useEffect(() => {
    setMapCollectionId(null)
    setMapProperties([])
  }, [activeCompany])

  useEffect(() => {
    if (viewMode !== 'map' || !mapCollectionId) return
    const col = collections.find((c) => c.id === mapCollectionId)
    if (!col) return
    let cancelled = false
    setMapLoading(true)
    void fetchPropertiesForCollection(col)
      .then((props) => {
        if (!cancelled) setMapProperties(props)
      })
      .finally(() => {
        if (!cancelled) setMapLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [viewMode, mapCollectionId, collections])

  useEffect(() => {
    if (viewMode !== 'map' || collections.length === 0) return
    const valid =
      mapCollectionId != null && collections.some((c) => c.id === mapCollectionId)
    if (!valid) setMapCollectionId(collections[0].id)
  }, [viewMode, collections, mapCollectionId])

  async function fetchCollections() {
    setLoading(true)
    setSetupRequired(false)
    try {
      const { data, error } = await (supabase as any)
        .from('project_collections')
        .select('*')
        .eq('company', activeCompany)
        .order('updated_at', { ascending: false })

      if (error) {
        const err = error as { code?: string; message?: string; status?: number }
        if (err?.status === 404 || err?.code === '42P01' || err?.code === 'PGRST116' || err?.message?.includes('relation') || err?.message?.includes('does not exist')) {
          setSetupRequired(true)
        }
        throw error
      }
      setCollections(data ?? [])
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string; status?: number }
      if (err?.status === 404 || err?.code === '42P01' || err?.code === 'PGRST116' || err?.message?.includes('relation') || err?.message?.includes('does not exist')) {
        setSetupRequired(true)
      }
      console.error('Error fetching collections:', error)
      setCollections([])
    } finally {
      setLoading(false)
    }
  }

  async function openCollection(collection: Collection) {
    const ordered = await fetchPropertiesForCollection(collection)
    setViewingCollection({ collection, properties: ordered })
  }

  function switchToMapView() {
    setViewMode('map')
    if (collections.length > 0) {
      setMapCollectionId((prev) => prev ?? collections[0].id)
    }
  }

  async function removeProjectFromCollection(collectionId: string, propertyId: string) {
    await (supabase as any)
      .from('collection_projects')
      .delete()
      .eq('collection_id', collectionId)
      .eq('property_id', propertyId)

    if (viewingCollection?.collection.id === collectionId) {
      setViewingCollection((prev) =>
        prev
          ? {
              ...prev,
              properties: prev.properties.filter((p) => p.id !== propertyId),
            }
          : null
      )
    }
  }

  async function deleteCollection(id: string) {
    if (!confirm('Delete this collection?')) return
    await (supabase as any).from('project_collections').delete().eq('id', id)
    setCollections((c) => c.filter((col) => col.id !== id))
    if (viewingCollection?.collection.id === id) setViewingCollection(null)
  }

  const config = COMPANY_CONFIG[activeCompany]

  return (
    <div className="p-4 md:p-6 lg:p-8 pb-20 md:pb-8">
      <div className="mb-6 mt-12 lg:mt-0">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Project Collections</h1>
        <p className="text-gray-600 mt-1 text-sm md:text-base">
          Curated project lists for client conversations — grouped by company
        </p>
      </div>

      {/* Company Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setActiveCompany('precon_factory')}
          className={`px-5 py-2.5 rounded-xl font-semibold transition-all ${
            activeCompany === 'precon_factory'
              ? 'bg-gradient-to-r from-purple-600 via-purple-700 to-pink-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Precon Factory
        </button>
        <button
          onClick={() => setActiveCompany('fj')}
          className={`px-5 py-2.5 rounded-xl font-semibold transition-all ${
            activeCompany === 'fj'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          FJ
        </button>
      </div>

      {/* List vs Map */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => setViewMode('list')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            viewMode === 'list'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Collection list
        </button>
        <button
          type="button"
          onClick={switchToMapView}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            viewMode === 'map'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Map view
        </button>
      </div>

      {/* Setup Required Banner */}
      {setupRequired && (
        <div className="mb-6 p-4 md:p-6 bg-amber-50 border-2 border-amber-200 rounded-xl">
          <h3 className="font-semibold text-amber-800 mb-2">Database setup required</h3>
          <p className="text-amber-700 text-sm mb-3">
            The Project Collections tables don&apos;t exist yet. Run the SQL migration in your Supabase project to create them.
          </p>
          <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside mb-4">
            <li>Open your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline font-medium">Supabase Dashboard</a></li>
            <li>Go to <strong>SQL Editor</strong> → New query</li>
            <li>Copy the contents of <code className="bg-amber-100 px-1.5 py-0.5 rounded">database/setup_project_collections.sql</code></li>
            <li>Paste and run the query</li>
            <li>Refresh this page</li>
          </ol>
          <button
            onClick={() => fetchCollections()}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium text-sm"
          >
            I&apos;ve run the migration — retry
          </button>
        </div>
      )}

      {/* Create Button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {config.label} {viewMode === 'list' ? 'Collections' : 'on map'}
        </h2>
        {viewMode === 'list' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            <Plus className="h-5 w-5" />
            New Collection
          </button>
        )}
      </div>

      {viewMode === 'map' && !setupRequired && (
        <div className="mb-6 space-y-3">
          <p className="text-sm text-gray-600">
            Choose branding (FJ or Precon Factory) above, then pick a collection. Pins use each project&apos;s address; open a collection to add a map address override if needed.
          </p>
          {collections.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">Create a collection first, then return to Map view.</p>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Collection</label>
                <select
                  value={mapCollectionId ?? ''}
                  onChange={(e) => setMapCollectionId(e.target.value || null)}
                  className="w-full sm:max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.city ? ` · ${c.city}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {mapLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : mapCollectionId ? (
                <CollectionsMapPanel
                  apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                  collectionName={collections.find((c) => c.id === mapCollectionId)?.name ?? ''}
                  companyLabel={config.label}
                  company={activeCompany}
                  properties={mapProperties}
                />
              ) : null}
            </>
          )}
        </div>
      )}

      {/* Collections List */}
      {viewMode === 'list' && loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : viewMode === 'list' && collections.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
          <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No collections yet</p>
          <p className="text-gray-500 text-sm mt-1">Create one to curate projects for {config.label} clients</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            <Plus className="h-4 w-4" />
            Create Collection
          </button>
        </div>
      ) : viewMode === 'list' ? (
        <div className="grid gap-3">
          {collections.map((col) => (
            <div
              key={col.id}
              className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div
                  className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.bg} flex items-center justify-center text-white flex-shrink-0`}
                >
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{col.name}</p>
                  {col.city && (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {col.city}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <button
                  onClick={() => deleteCollection(col.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => openCollection(col)}
                  className="flex items-center gap-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-sm"
                >
                  View
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Create Collection Modal */}
      {showCreateModal && (
        <CreateCollectionModal
          company={activeCompany}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false)
            fetchCollections()
          }}
          onSetupRequired={() => setSetupRequired(true)}
        />
      )}

      {/* View Collection Modal */}
      {viewingCollection && (
        <ViewCollectionModal
          collection={viewingCollection.collection}
          properties={viewingCollection.properties}
          company={activeCompany}
          onClose={() => setViewingCollection(null)}
          onRemoveProject={(propertyId) =>
            removeProjectFromCollection(viewingCollection.collection.id, propertyId)
          }
          onUpdated={openCollection}
        />
      )}
    </div>
  )
}

function CreateCollectionModal({
  company,
  onClose,
  onCreated,
  onSetupRequired,
}: {
  company: Company
  onClose: () => void
  onCreated: () => void
  onSetupRequired?: () => void
}) {
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [selectedProjects, setSelectedProjects] = useState<{ id: string; project_name: string; city: string; builder: string }[]>([])
  const [saving, setSaving] = useState(false)

  const config = COMPANY_CONFIG[company]

  const handleAddProject = (p: { id: string; project_name: string; city: string; builder: string }) => {
    if (selectedProjects.some((s) => s.id === p.id)) return
    setSelectedProjects((prev) => [...prev, p])
  }

  const handleRemoveProject = (id: string) => {
    setSelectedProjects((prev) => prev.filter((p) => p.id !== id))
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      alert('Please enter a collection name')
      return
    }
    setSaving(true)
    try {
      const { data: col, error: colError } = await (supabase as any)
        .from('project_collections')
        .insert({
          name: name.trim(),
          city: city.trim() || null,
          company,
        })
        .select('id')
        .single()

      if (colError) throw colError
      if (!col) throw new Error('No collection returned')

      for (let i = 0; i < selectedProjects.length; i++) {
        const { error: insertErr } = await (supabase as any).from('collection_projects').insert({
          collection_id: col.id,
          property_id: selectedProjects[i].id,
          sort_order: i,
        })
        if (insertErr) throw insertErr
      }

      onCreated()
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string; status?: number }
      if (err?.status === 404 || err?.code === '42P01' || err?.code === 'PGRST116' || err?.message?.includes('relation') || err?.message?.includes('does not exist')) {
        onSetupRequired?.()
        onClose()
        alert('Database setup required. Please run the SQL migration in Supabase (see instructions on this page), then try again.')
      } else {
        console.error('Error creating collection:', error)
        alert('Failed to create collection')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">
            New {config.label} Collection
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Collection name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mississauga Top Picks"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City (optional)</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Mississauga"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Add projects</label>
            <ProjectSearchSelect
              onSelect={handleAddProject}
              excludeIds={selectedProjects.map((p) => p.id)}
              placeholder="Search by project name, city, builder..."
            />
          </div>

          {selectedProjects.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Selected ({selectedProjects.length})
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {selectedProjects.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm font-medium truncate">{p.project_name}</span>
                    <button
                      onClick={() => handleRemoveProject(p.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

function ViewCollectionModal({
  collection,
  properties,
  company,
  onClose,
  onRemoveProject,
  onUpdated,
}: {
  collection: Collection
  properties: Property[]
  company: Company
  onClose: () => void
  onRemoveProject: (propertyId: string) => void
  onUpdated: (col: Collection) => void
}) {
  const [showAdd, setShowAdd] = useState(false)
  const config = COMPANY_CONFIG[company]

  const handleAddProject = async (p: { id: string }) => {
    const { data: max } = await (supabase as any)
      .from('collection_projects')
      .select('sort_order')
      .eq('collection_id', collection.id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    await (supabase as any).from('collection_projects').insert({
      collection_id: collection.id,
      property_id: p.id,
      sort_order: (max?.sort_order ?? -1) + 1,
    })
    setShowAdd(false)
    onUpdated(collection)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{collection.name}</h3>
            {collection.city && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin className="h-4 w-4" />
                {collection.city}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {properties.length} project{properties.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline font-medium"
          >
            <Plus className="h-4 w-4" />
            Add project
          </button>
        </div>

        {showAdd && (
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <ProjectSearchSelect
              onSelect={handleAddProject}
              excludeIds={properties.map((p) => p.id)}
              placeholder="Search to add another project..."
            />
          </div>
        )}

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {properties.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No projects in this collection yet.</p>
          ) : (
            properties.map((prop) => (
              <CollectionProjectCard
                key={prop.id}
                property={prop}
                company={company}
                showRemove
                showMapAddressEdit
                onRemove={() => onRemoveProject(prop.id)}
                onMapLocationSaved={() => onUpdated(collection)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
