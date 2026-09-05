import { useCallback, useSyncExternalStore } from 'react'

/**
 * Hash routing inside /admin/.
 *
 * The dashboard is its own Vite entry, so /admin/ is a real file on disk and
 * resolves on any static host with no rewrite rule. Sub-sections ride on the
 * hash (/admin/#/events) for the same reason: a deep link survives a refresh
 * without the host needing an SPA fallback.
 *
 * Everything routing-related is confined to this file. Moving to the History
 * API later (once a host rewrite exists) means changing `readRoute` and
 * `navigate` here and nothing else.
 */

export const ROUTES = ['flavors', 'events']
const DEFAULT_ROUTE = 'flavors'

function readRoute() {
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0]
  return ROUTES.includes(raw) ? raw : DEFAULT_ROUTE
}

function subscribe(onChange) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function useRoute() {
  const route = useSyncExternalStore(subscribe, readRoute, () => DEFAULT_ROUTE)

  const navigate = useCallback((next) => {
    if (!ROUTES.includes(next)) return
    if (readRoute() === next) return
    window.location.hash = `#/${next}`
  }, [])

  return [route, navigate]
}

export const hrefFor = (route) => `#/${route}`
