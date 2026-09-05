import { useEffect, useRef, useState } from 'react'

/**
 * Base mechanics for every overlay in the dashboard, built on native
 * `<dialog>`: focus trapping, Esc, inertness of the page behind, and the top
 * layer all come from the platform rather than a hand-rolled reimplementation
 * that gets one of them subtly wrong.
 *
 * Two things are ours:
 *  - Esc is intercepted (`cancel`) and routed through `onClose`, so an editor
 *    with unsaved changes can ask before it disappears.
 *  - Closing animates out before `close()` fires, since the platform's own
 *    close is instant.
 *
 * Children mount only while open, so every open starts from a clean form.
 */

const CLOSE_MS = 190

/**
 * Scroll lock, reference-counted across every open dialog.
 *
 * showModal() does not stop the page behind from scrolling, so the lock has to
 * be ours. It must be counted rather than saved-and-restored per dialog: the
 * delete confirm opens on top of the editor drawer, and when both close in the
 * same commit the second cleanup can restore the value the first one captured
 * while the page was already locked — stranding the page unscrollable with no
 * dialog open at all. A counter makes the outcome independent of teardown
 * order.
 */
let scrollLocks = 0
let overflowBeforeLock = ''

function lockScroll() {
  if (scrollLocks === 0) {
    overflowBeforeLock = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
  }
  scrollLocks += 1
}

function unlockScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1)
  if (scrollLocks === 0) {
    document.documentElement.style.overflow = overflowBeforeLock
  }
}

export default function Dialog({
  open,
  onClose,
  variant = 'center',
  labelledBy,
  describedBy,
  className = '',
  children,
}) {
  const ref = useRef(null)
  const closeTimer = useRef(null)
  // Children outlive `open` by the length of the close animation, otherwise the
  // panel would slide out empty. Note this is only ever set to true by the
  // close path — on open, children render in the same commit as `open` itself,
  // so they're in the DOM before showModal() picks something to focus.
  const [closing, setClosing] = useState(false)

  // Open, and animate out on close.
  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (open) {
      clearTimeout(closeTimer.current)
      el.classList.remove('is-closing')
      setClosing(false)
      if (!el.open) el.showModal()
      return
    }

    if (!el.open) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      el.close()
      setClosing(false)
      return
    }

    setClosing(true)
    el.classList.add('is-closing')
    closeTimer.current = setTimeout(() => {
      el.classList.remove('is-closing')
      el.close()
      setClosing(false)
    }, CLOSE_MS)

    return () => clearTimeout(closeTimer.current)
  }, [open])

  // Esc: let the owner decide, so it can guard unsaved work.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onCancel = (e) => {
      e.preventDefault()
      onClose?.('escape')
    }
    el.addEventListener('cancel', onCancel)
    return () => el.removeEventListener('cancel', onCancel)
  }, [onClose])

  useEffect(() => {
    if (!open) return
    lockScroll()
    return unlockScroll
  }, [open])

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  return (
    <dialog
      ref={ref}
      className={`dlg dlg--${variant} ${className}`.trim()}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClick={(e) => {
        // A click that lands on the dialog element itself is a backdrop click;
        // anything inside the panel stops at the panel.
        if (e.target === ref.current) onClose?.('backdrop')
      }}
    >
      {open || closing ? children : null}
    </dialog>
  )
}
