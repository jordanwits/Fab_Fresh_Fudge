import { useEffect, useRef } from 'react'

// Additive scroll reveal: content is fully visible by default; JS adds the
// initial offset class only when IntersectionObserver is available and the
// user hasn't asked for reduced motion, and takes it back off on teardown —
// so nothing can ever ship hidden.
export function useReveal() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !('IntersectionObserver' in window)) return

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const target = entry.target
          io.unobserve(target)
          target.classList.add('reveal-in')

          // Drop both classes once the reveal finishes, so the element falls
          // back to its natural styles — the animation's forwards fill would
          // otherwise keep overriding hover transforms for good.
          const done = (ev) => {
            if (ev.target !== target) return // ignore descendant animations
            clearTimeout(failsafe)
            target.removeEventListener('animationend', done)
            target.classList.remove('reveal-init', 'reveal-in')
          }
          target.addEventListener('animationend', done)
          // If animationend never arrives — a throttled or non-rendering tab —
          // clean up anyway rather than leave the element at opacity 0.
          const failsafe = setTimeout(() => done({ target }), 1500)
        })
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    )

    // Tracked in a Set rather than by testing for the class: StrictMode runs
    // this effect twice, and the second pass has to re-observe elements the
    // first pass already marked — otherwise nothing is observed and every
    // target stays stranded at opacity 0.
    const armed = new Set()

    const arm = (targets) => {
      targets.forEach((t) => {
        if (armed.has(t)) return
        armed.add(t)
        t.classList.add('reveal-init')
        io.observe(t)
      })
    }

    arm(el.querySelectorAll('[data-reveal]'))

    // Filtering the flavor case or expanding the grid mounts cards after this
    // effect has run; without watching for them they would pop in unanimated.
    const mo = new MutationObserver((records) => {
      records.forEach((rec) => {
        rec.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return
          if (node.matches('[data-reveal]')) arm([node])
          arm(node.querySelectorAll('[data-reveal]'))
        })
      })
    })
    mo.observe(el, { childList: true, subtree: true })

    return () => {
      mo.disconnect()
      io.disconnect()
      // With the observers gone nothing can reveal these any more, so hand
      // them back their natural visibility rather than stranding them hidden.
      armed.forEach((t) => t.classList.remove('reveal-init'))
    }
  }, [])

  return ref
}
