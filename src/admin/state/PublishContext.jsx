import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { backend } from '../backend/adapter.js'

/**
 * Getting saved changes onto the website -- when the client says so.
 *
 * Saving changes the database straight away; the website is a snapshot that
 * is only rebuilt when someone presses Publish (scripts/build-content.mjs).
 * A button rather than auto-publishing, so a batch of edits -- re-pricing,
 * reshuffling the case before a market -- goes live in one piece instead of
 * half-way through (Jordan's call, 2026-10-06; an earlier version published
 * itself 30 s after the last save).
 *
 * "Unpublished changes" is decided from the SERVER, not from this tab: every
 * save stamps settings/edits.lastEditAt, and the live site reports when it was
 * built in /content-version.json. An edit newer than the build means the site
 * is behind -- on her phone, her laptop, and for Jordan, whoever made the edit.
 *
 * Publishing calls /api/publish, then polls /content-version.json until the
 * live site was built after the request, and checks again in case something
 * was saved while it built.
 *
 * With the sample-data mock there is no `backend.publish`; everything here is
 * a no-op.
 */

const POLL_MS = 8_000
const SLOW_MS = 4 * 60_000
const GIVE_UP_MS = 20 * 60_000

const PublishContext = createContext(null)

const isBusy = (state) => state === 'publishing' || state === 'slow'

export function PublishProvider({ children }) {
  const api = backend.publish
  const [status, setStatus] = useState({ state: api ? 'checking' : 'idle' })
  const poll = useRef(null)

  const stopPolling = () => {
    clearTimeout(poll.current)
    poll.current = null
  }

  /** Compare the last save with the live build and settle on clean or dirty. */
  const check = useCallback(async () => {
    if (!api) return
    const [lastEditAt, live] = await Promise.all([
      api.lastEditAt().catch(() => null),
      api.liveVersion().catch(() => null),
    ])
    const liveAt = live?.builtAt ?? null
    // Both are ISO strings from server clocks, so they compare as text.
    const dirty = Boolean(lastEditAt && (!liveAt || lastEditAt > liveAt))
    setStatus((s) => (isBusy(s.state) ? s : { state: dirty ? 'dirty' : 'clean', liveAt }))
  }, [api])

  const watch = useCallback(
    (requestedAt) => {
      stopPolling()
      const started = Date.now()
      const tick = async () => {
        try {
          const live = await api.liveVersion()
          if (live?.builtAt && live.builtAt >= requestedAt) {
            setStatus({ state: 'clean', liveAt: live.builtAt })
            check() // anything saved while it was building?
            return
          }
        } catch {
          /* a blip while the deploy swaps over; keep looking */
        }
        const waited = Date.now() - started
        if (waited > GIVE_UP_MS) return
        if (waited > SLOW_MS) {
          setStatus((s) => (s.state === 'publishing' ? { ...s, state: 'slow' } : s))
        }
        poll.current = setTimeout(tick, POLL_MS)
      }
      poll.current = setTimeout(tick, POLL_MS)
    },
    [api, check]
  )

  const publish = useCallback(async () => {
    if (!api) return
    setStatus((s) => ({ state: 'publishing', liveAt: s.liveAt }))
    try {
      const { requestedAt } = await api.request()
      watch(requestedAt)
    } catch (err) {
      setStatus((s) => ({ state: 'error', code: err?.code, message: err?.message, liveAt: s.liveAt }))
    }
  }, [api, watch])

  /** Called by DataContext after every successful save. */
  const changed = useCallback(() => {
    if (!api) return
    // Mid-publish, the build may or may not have caught this save; check()
    // decides once it lands.
    setStatus((s) => (isBusy(s.state) ? s : { state: 'dirty', liveAt: s.liveAt }))
    api.markEdited().catch((err) => console.warn('[publish] could not stamp the edit:', err))
  }, [api])

  // Where things stand when the dashboard opens, and again whenever she comes
  // back to it -- someone may have saved or published from another device.
  useEffect(() => {
    if (!api) return undefined
    check()
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [api, check])

  useEffect(() => stopPolling, [])

  const value = useMemo(
    () => ({ enabled: Boolean(api), status, changed, publish }),
    [api, status, changed, publish]
  )

  return <PublishContext.Provider value={value}>{children}</PublishContext.Provider>
}

export function usePublish() {
  const ctx = useContext(PublishContext)
  if (!ctx) throw new Error('usePublish must be used inside <PublishProvider>')
  return ctx
}
