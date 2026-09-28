import { useEffect, useRef, useState } from 'react'

// Native <dialog> underneath, so focus trapping, Esc, the inert page behind and
// focus returning to the button that opened it all come from the browser. The
// same approach as the admin's ui/Dialog.jsx, kept separate so the marketing
// bundle never imports admin code.
//
// variant 'drawer' slides in from the right; 'center' pops in mid-screen.

const CLOSE_MS = 200

export default function Overlay({ open, onClose, variant = 'drawer', labelledBy, className = '', children }) {
  const ref = useRef(null)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (open) {
      el.classList.remove('is-closing')
      setClosing(false)
      if (!el.open) el.showModal()
      return
    }
    if (!el.open) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.close()
      return
    }
    setClosing(true)
    el.classList.add('is-closing')
    const timer = setTimeout(() => {
      el.classList.remove('is-closing')
      el.close()
      setClosing(false)
    }, CLOSE_MS)
    return () => clearTimeout(timer)
  }, [open])

  // Every way out goes through onClose, so the owner's state stays the source
  // of truth. Three routes, because the platform's own is unreliable: Chrome's
  // close-watcher guard can skip the `cancel` event (then closes the dialog
  // behind React's back), and some embedded browsers never send it at all.
  //   keydown Escape  handled here first; preventDefault stops a native close
  //   cancel          a close request with no key, e.g. Android's back gesture
  //   close           the dialog shut anyway: bring the owner's state along
  const openRef = useRef(open)
  openRef.current = open

  useEffect(() => {
    const el = ref.current
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      onClose()
    }
    const onCancel = (e) => {
      e.preventDefault()
      onClose()
    }
    const onNativeClose = () => {
      if (openRef.current) onClose()
    }
    el.addEventListener('keydown', onKeyDown)
    el.addEventListener('cancel', onCancel)
    el.addEventListener('close', onNativeClose)
    return () => {
      el.removeEventListener('keydown', onKeyDown)
      el.removeEventListener('cancel', onCancel)
      el.removeEventListener('close', onNativeClose)
    }
  }, [onClose])

  // showModal() doesn't stop the page behind from scrolling.
  useEffect(() => {
    if (!open) return
    const root = document.documentElement
    const before = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = before
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      className={`overlay overlay--${variant} ${className}`.trim()}
      aria-labelledby={labelledBy}
      onClick={(e) => {
        // A click on the <dialog> element itself landed on the backdrop.
        if (e.target === ref.current) onClose()
      }}
    >
      {open || closing ? children : null}
    </dialog>
  )
}
