import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { backend } from '../backend/adapter.js'
import { useToast } from './ToastContext.jsx'
import { usePublish } from './PublishContext.jsx'
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
  // Every successful write tells the publisher, which flags the website as
  // behind until she publishes. Failed writes and plain reads don't.
  const { changed } = usePublish()

  const [flavors, setFlavors] = useState([])
  const [events, setEvents] = useState([])
  const [packages, setPackages] = useState([])
  const [pricing, setPricing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [nextFlavors, nextEvents, nextPackages, nextPricing] = await Promise.all([
        backend.flavors.list(),
        backend.events.list(),
        backend.packages.list(),
        backend.pricing.get(),
      ])
      setFlavors(nextFlavors)
      setEvents(nextEvents)
      setPackages(nextPackages)
      setPricing(nextPricing)
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
      changed()
      setFlavors((prev) => [...prev, saved])
      toast.success('Flavor added', `${saved.name} is now in the flavor case.`)
      return saved
    },
    [toast, changed]
  )

  const updateFlavor = useCallback(
    async (id, patch) => {
      const saved = await backend.flavors.update(id, patch)
      changed()
      setFlavors((prev) => prev.map((f) => (f.id === id ? saved : f)))
      toast.success('Changes saved', `${saved.name} is up to date.`)
      return saved
    },
    [toast, changed]
  )

  const deleteFlavor = useCallback(
    async (flavor) => {
      await backend.flavors.remove(flavor.id)
      changed()
      setFlavors((prev) => prev.filter((f) => f.id !== flavor.id))
      toast.success('Flavor deleted', `${flavor.name} was deleted.`)
    },
    [toast, changed]
  )

  const setSoldOut = useCallback(
    async (id, soldOut) => {
      const before = flavors
      setFlavors((prev) => prev.map((f) => (f.id === id ? { ...f, soldOut } : f)))
      try {
        const saved = await backend.flavors.update(id, { soldOut })
        changed()
        setFlavors((prev) => prev.map((f) => (f.id === id ? saved : f)))
      } catch (err) {
        setFlavors(before)
        toast.error("Couldn't update stock", err?.message || 'Try again in a moment.')
      }
    },
    [flavors, toast, changed]
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
        changed()
      } catch (err) {
        setFlavors(before)
        toast.error("Couldn't save the new order", err?.message || 'Try again in a moment.')
      }
    },
    [flavors, toast, changed]
  )

  // --- events --------------------------------------------------------------

  const createEvent = useCallback(
    async (draft) => {
      const saved = await backend.events.create(draft)
      changed()
      setEvents((prev) => [...prev, saved].sort(byDate))
      toast.success('Show added', `${saved.name} is on the schedule.`)
      return saved
    },
    [toast, changed]
  )

  const updateEvent = useCallback(
    async (id, patch) => {
      const saved = await backend.events.update(id, patch)
      changed()
      setEvents((prev) => prev.map((e) => (e.id === id ? saved : e)).sort(byDate))
      toast.success('Changes saved', `${saved.name} is up to date.`)
      return saved
    },
    [toast, changed]
  )

  const deleteEvent = useCallback(
    async (event) => {
      await backend.events.remove(event.id)
      changed()
      setEvents((prev) => prev.filter((e) => e.id !== event.id))
      toast.success('Show deleted', `${event.name} was removed from the schedule.`)
    },
    [toast, changed]
  )

  // --- corporate packages --------------------------------------------------

  const createPackage = useCallback(
    async (draft) => {
      const saved = await backend.packages.create(draft)
      changed()
      setPackages((prev) => [...prev, saved])
      toast.success('Package added', `${saved.name} was added to the gift packages.`)
      return saved
    },
    [toast, changed]
  )

  const updatePackage = useCallback(
    async (id, patch) => {
      const saved = await backend.packages.update(id, patch)
      changed()
      setPackages((prev) => prev.map((p) => (p.id === id ? saved : p)))
      toast.success('Changes saved', `${saved.name} is up to date.`)
      return saved
    },
    [toast, changed]
  )

  const deletePackage = useCallback(
    async (pkg) => {
      await backend.packages.remove(pkg.id)
      changed()
      setPackages((prev) => prev.filter((p) => p.id !== pkg.id))
      toast.success('Package deleted', `${pkg.name} was deleted.`)
    },
    [toast, changed]
  )

  /**
   * Store a new package order, given the order the list is showing.
   *
   * Much simpler than the flavor version, and deliberately so: there is no
   * grouping to preserve here. The Corporate Gifts section prints these in
   * array order, full stop, so what the client dragged IS the stored order --
   * no walking the array refilling slots, no interleaving to protect.
   *
   * Optimistic, because waiting on the round trip would snap the row back to
   * where it started and then jump it forward again.
   */
  const reorderPackages = useCallback(
    async (orderedIds) => {
      const byId = new Map(packages.map((p) => [p.id, p]))
      const next = orderedIds.map((id) => byId.get(id)).filter(Boolean)
      if (next.length !== packages.length) return
      if (next.every((p, i) => p.id === packages[i].id)) return

      const before = packages
      setPackages(next)

      try {
        await backend.packages.reorder(next.map((p) => p.id))
        changed()
      } catch (err) {
        setPackages(before)
        toast.error("Couldn't save the new order", err?.message || 'Try again in a moment.')
      }
    },
    [packages, toast, changed]
  )

  // --- pricing -------------------------------------------------------------

  const updatePricing = useCallback(
    async (patch) => {
      const saved = await backend.pricing.update(patch)
      changed()
      setPricing(saved)
      toast.success(
        'Prices saved',
        backend.feedsSite ? 'Publish to put them on the website.' : 'The new prices are stored.'
      )
      return saved
    },
    [toast, changed]
  )

  // --- dev -----------------------------------------------------------------

  const resetSampleData = useCallback(async () => {
    await backend.dev.reset()
    await refresh()
    toast.success(
      'Sample data restored',
      'Every flavor, show and gift package is back to its starting state.'
    )
  }, [refresh, toast])

  const value = useMemo(
    () => ({
      flavors,
      events,
      packages,
      pricing,
      loading,
      loadError,
      refresh,
      updatePricing,
      createFlavor,
      updateFlavor,
      deleteFlavor,
      setSoldOut,
      reorderFlavors,
      createEvent,
      updateEvent,
      deleteEvent,
      createPackage,
      updatePackage,
      deletePackage,
      reorderPackages,
      resetSampleData: backend.dev ? resetSampleData : null,
    }),
    [
      flavors,
      events,
      packages,
      pricing,
      loading,
      loadError,
      refresh,
      updatePricing,
      createFlavor,
      updateFlavor,
      deleteFlavor,
      setSoldOut,
      reorderFlavors,
      createEvent,
      updateEvent,
      deleteEvent,
      createPackage,
      updatePackage,
      deletePackage,
      reorderPackages,
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
