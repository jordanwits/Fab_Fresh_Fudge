import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { backend } from '../backend/adapter.js'

/**
 * Getting saved changes onto the website, automatically.
 *
 * The site is a snapshot rebuilt on publish (scripts/build-content.mjs), and a
 * rebuild takes about a minute, so rebuilding after every save would queue a
 * pile of builds while the client flips five flavors to sold out. Instead each
 * successful save calls `changed()`, which (re)starts a QUIET_MS timer; when
 * the saves pause, the site is rebuilt once with all of them. A rebuild reads
 * ALL of Firestore, so it carries everyone's edits, not just this tab's.
 *
 * Leaving the page (closing the tab, locking the phone, switching apps)
 * publishes at once, and a flag in localStorage catches the case where even
 * that didn't get out, so the next visit to the dashboard finishes the job.
 *
 * After a publish, the status polls /content-version.json until the live site
 * reports a build from after the request -- that's "Live on the website".
 *
 * With the sample-data mock there is no `backend.publish`; everything here is
 * then a no-op and the status stays idle.
 */

const QUIET_MS = 30_000
const POLL_MS = 8_000
const SLOW_MS = 4 * 60_000
const GIVE_UP_MS = 20 * 60_000
const PENDING_KEY = 'fff-admin/publish-pending'

const PublishContext = createContext(null)

function readPending() {
  try {
    return localStorage.getItem(PENDING_KEY) === '1'
  } catch {
    return false
  }
}

function writePending(on) {
  try {
    if (on) localStorage.setItem(PENDING_KEY, '1')
    else localStorage.removeItem(PENDING_KEY)
  } catch {
    /* private mode: the in-memory flag still covers this visit */
  }
}

export function PublishProvider({ children }) {
  const api = backend.publish
  const [status, setStatus] = useState({ state: 'idle' })

  const pending = useRef(false)
  // Bumped by every change, so a publish that started before the latest save
  // doesn't clear the "still unpublished" flag on its way out.
  const version = useRef(0)
  const timer = useRef(null)
  const poll = useRef(null)

  const stopPolling = () => {
    clearTimeout(poll.current)
    poll.current = null
  }

  const watch = useCallback(
    (requestedAt) => {
      stopPolling()
      const started = Date.now()
      const check = async () => {
        try {
          const live = await api.liveVersion()
          // Both are ISO strings from server clocks, so they compare as text.
          if (live?.builtAt && live.builtAt >= requestedAt) {
            setStatus({ state: 'live', at: live.builtAt })
            return
          }
        } catch {
          /* a blip while the deploy swaps over; keep looking */
        }
        const waited = Date.now() - started
        if (waited > GIVE_UP_MS) return
        if (waited > SLOW_MS) {
          setStatus((s) => (s.state === 'publishing' ? { state: 'slow' } : s))
        }
        poll.current = setTimeout(check, POLL_MS)
      }
      poll.current = setTimeout(check, POLL_MS)
    },
    [api]
  )

  const flush = useCallback(
    async ({ keepalive = false } = {}) => {
      clearTimeout(timer.current)
      timer.current = null
      if (!api || !pending.current) return

      const publishing = version.current
      pending.current = false
      setStatus({ state: 'publishing' })
      try {
        const { requestedAt } = await api.request({ keepalive })
        if (version.current === publishing) writePending(false)
        watch(requestedAt)
      } catch (err) {
        pending.current = true
        setStatus({ state: 'error', code: err?.code, message: err?.message })
      }
    },
    [api, watch]
  )

  const changed = useCallback(() => {
    if (!api) return
    version.current += 1
    pending.current = true
    writePending(true)
    stopPolling()
    clearTimeout(timer.current)
    timer.current = setTimeout(() => flush(), QUIET_MS)
    setStatus({ state: 'waiting' })
    api.warm().catch(() => {})
  }, [api, flush])

  // A previous visit saved something it never got published: do it now.
  useEffect(() => {
    if (api && readPending()) {
      pending.current = true
      flush()
    }
  }, [api, flush])

  // Leaving the page: publish now rather than lose the timer with the tab.
  useEffect(() => {
    if (!api) return undefined
    const leave = () => {
      if (pending.current) flush({ keepalive: true })
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') leave()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', leave)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', leave)
    }
  }, [api, flush])

  useEffect(
    () => () => {
      clearTimeout(timer.current)
      stopPolling()
    },
    []
  )

  const value = useMemo(
    () => ({
      enabled: Boolean(api),
      status,
      changed,
      /** "Update now" / "Try again", and before signing out. */
      publishNow: () => {
        if (api && (pending.current || readPending())) {
          pending.current = true
          return flush()
        }
        return Promise.resolve()
      },
    }),
    [api, status, changed, flush]
  )

  return <PublishContext.Provider value={value}>{children}</PublishContext.Provider>
}

export function usePublish() {
  const ctx = useContext(PublishContext)
  if (!ctx) throw new Error('usePublish must be used inside <PublishProvider>')
  return ctx
}
