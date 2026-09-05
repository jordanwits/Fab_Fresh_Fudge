import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { backend } from '../backend/adapter.js'
import { AuthError } from '../backend/errors.js'

/**
 * Session state for the dashboard. Nothing here knows what the backend is —
 * it calls backend.auth and reports what comes back.
 *
 * `status` drives the three top-level renders in AdminApp:
 *   'checking' → boot splash while a stored session is restored
 *   'out'      → login screen
 *   'in'       → the dashboard
 */

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('checking')
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancelled = false
    backend.auth
      .getSession()
      .then((session) => {
        if (cancelled) return
        setUser(session?.user ?? null)
        setStatus(session?.user ? 'in' : 'out')
      })
      .catch(() => {
        if (cancelled) return
        setStatus('out')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(async (email, password) => {
    setPending(true)
    setError(null)
    try {
      const session = await backend.auth.signIn({ email, password })
      setUser(session.user)
      setStatus('in')
      return true
    } catch (err) {
      // Only messages the adapter marked as user-facing get shown verbatim;
      // anything else is an unexpected failure and shouldn't leak its text.
      setError(
        err instanceof AuthError
          ? err.message
          : "Something went wrong signing in. Try again in a moment."
      )
      return false
    } finally {
      setPending(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    await backend.auth.signOut()
    setUser(null)
    setStatus('out')
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo(
    () => ({ status, user, error, pending, signIn, signOut, clearError }),
    [status, user, error, pending, signIn, signOut, clearError]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
