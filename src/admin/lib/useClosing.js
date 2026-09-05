import { useEffect, useState } from 'react'

/**
 * Holds onto a value for a moment after it's cleared.
 *
 * An editor drawer is mounted only while something is being edited, so that
 * every open starts from a clean form. Clearing that state would normally rip
 * the panel out of the DOM mid-slide. This keeps the last value alive just long
 * enough for the close animation to finish, then lets it go.
 *
 *   const held = useClosing(editing)
 *   {held ? <Editor open={Boolean(editing)} item={held.item} /> : null}
 */
export function useClosing(value, ms = 240) {
  const [held, setHeld] = useState(value)

  useEffect(() => {
    if (value) {
      setHeld(value)
      return
    }
    const timer = setTimeout(() => setHeld(null), ms)
    return () => clearTimeout(timer)
  }, [value, ms])

  return value || held
}
