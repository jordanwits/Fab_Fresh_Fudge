import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { backend } from '../backend/adapter.js'
import { useToast } from './ToastContext.jsx'
import { byDate } from '../lib/eventDate.js'

/**
 * The dashboard's data layer. Every screen reads and writes through here, and
 * this is the only place that touches `backend`.
 *
 * Writes go through the adapter first and update local state from what comes
 * back, so the UI can never drift from what was actually stored. The one
 * exception is the sold-out toggle, which flips optimistically and rolls back
 * on failure — it is the most-used control in the whole tool and waiting half a
 * second for a checkbox to move feels broken.
 */

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const toast = useToast()

  const [flavors, setFlavors] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [nextFlavors, nextEvents] = await Promise.all([
        backend.flavors.list(),
        backend.events.list(),
      ])
      setFlavors(nextFlavors)
      setEvents(nextEvents)
    } catch (err) {
      setLoadError(err?.message || "Couldn't load your content.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // --- flavors -------------------------------------------------------------

  const createFlavor = useCallback(
    async (draft) => {
      const saved = await backend.flavors.create(draft)
      setFlavors((prev) => [...prev, saved])
      toast.success('Flavor added', `${saved.name} is now in the flavor case.`)
      return saved
    },
    [toast]
  )

  const updateFlavor = useCallback(
    async (id, patch) => {
      const saved = await backend.flavors.update(id, patch)
      setFlavors((prev) => prev.map((f) => (f.id === id ? saved : f)))
      toast.success('Changes saved', `${saved.name} is up to date.`)
      return saved
    },
    [toast]
  )

  const deleteFlavor = useCallback(
    async (flavor) => {
      await backend.flavors.remove(flavor.id)
      setFlavors((prev) => prev.filter((f) => f.id !== flavor.id))
      toast.success('Flavor deleted', `${flavor.name} was removed from the site.`)
    },
    [toast]
  )

  const setSoldOut = useCallback(
    async (id, soldOut) => {
      const before = flavors
      setFlavors((prev) => prev.map((f) => (f.id === id ? { ...f, soldOut } : f)))
      try {
        const saved = await backend.flavors.update(id, { soldOut })
        setFlavors((prev) => prev.map((f) => (f.id === id ? saved : f)))
      } catch (err) {
        setFlavors(before)
        toast.error("Couldn't update stock", err?.message || 'Try again in a moment.')
      }
    },
    [flavors, toast]
  )

  /**
   * Store a new flavor order, given the order the admin table is showing.
   *
   * The table shows what the site shows: in-stock flavors first, then sold-out
   * ones (`stockFirst`). The stored catalog is NOT grouped that way, and
   * flattening it to match would quietly cost something — the site's sort is
   * stable, so a flavor's catalog slot is what brings it back to its old
   * neighbourhood when it returns to stock. Normalise the catalog and every
   * returning flavor would instead reappear at the end of the in-stock block.
   *
   * So the catalog keeps its shape: walk it, and refill each in-stock slot from
   * the new in-stock sequence and each sold-out slot from the new sold-out
   * sequence. Relative order within each group becomes what the user dragged;
   * the interleaving that survives a stock change is left alone.
   *
   * Optimistic, because waiting on the round trip would snap the row back to
   * where it started and then jump it forward again.
   */
  const reorderFlavors = useCallback(
    async (orderedIds) => {
      const byId = new Map(flavors.map((f) => [f.id, f]))
      const ordered = orderedIds.map((id) => byId.get(id)).filter(Boolean)
      if (ordered.length !== flavors.length) return

      const inStock = ordered.filter((f) => !f.soldOut)
      const soldOut = ordered.filter((f) => f.soldOut)
      let s = 0
      let d = 0
      const next = flavors.map((f) => (f.soldOut ? soldOut[d++] : inStock[s++]))

      if (next.every((f, i) => f.id === flavors[i].id)) return

      const before = flavors
      setFlavors(next)

      try {
        await backend.flavors.reorder(next.map((f) => f.id))
      } catch (err) {
        setFlavors(before)
        toast.error("Couldn't save the new order", err?.message || 'Try again in a moment.')
      }
    },
    [flavors, toast]
  )

  // --- events --------------------------------------------------------------

  const createEvent = useCallback(
    async (draft) => {
      const saved = await backend.events.create(draft)
      setEvents((prev) => [...prev, saved].sort(byDate))
      toast.success('Show added', `${saved.name} is on the schedule.`)
      return saved
    },
    [toast]
  )

  const updateEvent = useCallback(
    async (id, patch) => {
      const saved = await backend.events.update(id, patch)
      setEvents((prev) => prev.map((e) => (e.id === id ? saved : e)).sort(byDate))
      toast.success('Changes saved', `${saved.name} is up to date.`)
      return saved
    },
    [toast]
  )

  const deleteEvent = useCallback(
    async (event) => {
      await backend.events.remove(event.id)
      setEvents((prev) => prev.filter((e) => e.id !== event.id))
      toast.success('Show deleted', `${event.name} was removed from the schedule.`)
    },
    [toast]
  )

  // --- dev -----------------------------------------------------------------

  const resetSampleData = useCallback(async () => {
    await backend.dev.reset()
    await refresh()
    toast.success('Sample data restored', 'Every flavor and show is back to its starting state.')
  }, [refresh, toast])

  const value = useMemo(
    () => ({
      flavors,
      events,
      loading,
      loadError,
      refresh,
      createFlavor,
      updateFlavor,
      deleteFlavor,
      setSoldOut,
      reorderFlavors,
      createEvent,
      updateEvent,
      deleteEvent,
      resetSampleData: backend.dev ? resetSampleData : null,
    }),
    [
      flavors,
      events,
      loading,
      loadError,
      refresh,
      createFlavor,
      updateFlavor,
      deleteFlavor,
      setSoldOut,
      reorderFlavors,
      createEvent,
      updateEvent,
      deleteEvent,
      resetSampleData,
    ]
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside <DataProvider>')
  return ctx
}
