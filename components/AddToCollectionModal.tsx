'use client'

import { useEffect, useState } from 'react'
import { Check, FolderPlus, Loader2, Plus, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Company = 'fj' | 'precon_factory'

interface Collection {
  id: string
  name: string
  city: string | null
  company: Company
}

const COMPANY_LABEL: Record<Company, string> = {
  precon_factory: 'Precon Factory',
  fj: 'FJ',
}

export default function AddToCollectionModal({
  propertyId,
  projectName,
  onClose,
}: {
  propertyId: string
  projectName: string
  onClose: () => void
}) {
  const [company, setCompany] = useState<Company>('precon_factory')
  const [collections, setCollections] = useState<Collection[]>([])
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCity, setNewCity] = useState('')
  const [creatingCollection, setCreatingCollection] = useState(false)

  const propertyKey = String(propertyId)

  useEffect(() => {
    void loadCollections()
  }, [company, propertyKey])

  async function loadCollections() {
    setLoading(true)
    setMessage(null)
    try {
      const { data, error } = await (supabase as any)
        .from('project_collections')
        .select('id, name, city, company')
        .eq('company', company)
        .order('updated_at', { ascending: false })

      if (error) throw error
      const rows = (data ?? []) as Collection[]
      setCollections(rows)

      if (rows.length === 0) {
        setMemberIds(new Set())
        return
      }

      const { data: links } = await (supabase as any)
        .from('collection_projects')
        .select('collection_id')
        .eq('property_id', propertyKey)
        .in(
          'collection_id',
          rows.map((row) => row.id)
        )

      setMemberIds(new Set(((links ?? []) as { collection_id: string }[]).map((row) => row.collection_id)))
    } catch (error) {
      console.error('Error loading collections:', error)
      setCollections([])
      setMessage('Could not load collections. If this is a new setup, run the collections SQL first.')
    } finally {
      setLoading(false)
    }
  }

  async function addToCollection(collectionId: string) {
    if (memberIds.has(collectionId)) {
      setMessage('This project is already in that collection.')
      return
    }

    setSavingId(collectionId)
    setMessage(null)
    try {
      const { data: max } = await (supabase as any)
        .from('collection_projects')
        .select('sort_order')
        .eq('collection_id', collectionId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { error } = await (supabase as any).from('collection_projects').insert({
        collection_id: collectionId,
        property_id: propertyKey,
        sort_order: (max?.sort_order ?? -1) + 1,
      })
      if (error) throw error

      setMemberIds((prev) => new Set(prev).add(collectionId))
      setMessage(`Added ${projectName} to the collection.`)
    } catch (error) {
      console.error('Error adding to collection:', error)
      setMessage('Could not add this project to the collection.')
    } finally {
      setSavingId(null)
    }
  }

  async function createAndAdd() {
    if (!newName.trim()) {
      setMessage('Please enter a collection name.')
      return
    }

    setCreatingCollection(true)
    setMessage(null)
    try {
      const { data: col, error: colError } = await (supabase as any)
        .from('project_collections')
        .insert({
          name: newName.trim(),
          city: newCity.trim() || null,
          company,
        })
        .select('id, name, city, company')
        .single()

      if (colError) throw colError

      const { error: linkError } = await (supabase as any).from('collection_projects').insert({
        collection_id: col.id,
        property_id: propertyKey,
        sort_order: 0,
      })
      if (linkError) throw linkError

      setCollections((prev) => [col as Collection, ...prev])
      setMemberIds((prev) => new Set(prev).add(col.id))
      setNewName('')
      setNewCity('')
      setCreating(false)
      setMessage(`Created ${col.name} and added ${projectName}.`)
    } catch (error) {
      console.error('Error creating collection:', error)
      setMessage('Could not create the collection.')
    } finally {
      setCreatingCollection(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[88vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Add to collection</h3>
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{projectName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100 flex gap-2">
          {(['precon_factory', 'fj'] as Company[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setCompany(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                company === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {COMPANY_LABEL[key]}
            </button>
          ))}
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-3">
          {message && (
            <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              {message}
            </p>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : collections.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">
              No {COMPANY_LABEL[company]} collections yet. Create one below.
            </p>
          ) : (
            collections.map((collection) => {
              const alreadyIn = memberIds.has(collection.id)
              return (
                <button
                  key={collection.id}
                  type="button"
                  disabled={alreadyIn || savingId === collection.id}
                  onClick={() => addToCollection(collection.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-200 text-left hover:bg-gray-50 disabled:opacity-70"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{collection.name}</p>
                    {collection.city && <p className="text-xs text-gray-500">{collection.city}</p>}
                  </div>
                  {savingId === collection.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400 shrink-0" />
                  ) : alreadyIn ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-green-700">
                      <Check className="h-4 w-4" />
                      Added
                    </span>
                  ) : (
                    <Plus className="h-4 w-4 text-gray-400 shrink-0" />
                  )}
                </button>
              )
            })
          )}

          {creating ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-900">New {COMPANY_LABEL[company]} collection</p>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Collection name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                placeholder="City (optional)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="flex-1 px-3 py-2 text-sm rounded-lg bg-white border border-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void createAndAdd()}
                  disabled={creatingCollection}
                  className="flex-1 px-3 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium disabled:opacity-60"
                >
                  {creatingCollection ? 'Creating…' : 'Create and add'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FolderPlus className="h-4 w-4" />
              Create a new collection
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
