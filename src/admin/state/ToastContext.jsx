import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import Toaster from '../ui/Toaster.jsx'

/**
 * Confirmation and failure messages.
 *
 * Success toasts auto-dismiss; errors don't, because an error the user blinked
 * past is an error they never saw. Both are dismissible by hand.
 *
 *   const toast = useToast()
 *   toast.success('Saved', 'Dark Chocolate is live on the site.')
 *   toast.error("Couldn't save", err.message)
 */

const ToastContext = createContext(null)

const SUCCESS_MS = 4200

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())
  const nextId = useRef(0)

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (tone, title, detail) => {
      const id = ++nextId.current
      // Cap the stack: a burst of failures shouldn't bury the screen.
      setToasts((prev) => [...prev.slice(-2), { id, tone, title, detail }])
      if (tone === 'success') {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), SUCCESS_MS)
        )
      }
      return id
    },
    [dismiss]
  )

  const value = useMemo(
    () => ({
      success: (title, detail) => push('success', title, detail),
      error: (title, detail) => push('error', title, detail),
      dismiss,
    }),
    [push, dismiss]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
