import { useEffect, useState } from 'react'
import { BOX_SIZE } from '../data/flavors.js'

// Floating six-pack progress pill: appears once the box has something in it,
// pulses on each add, and jumps you back to the builder.
export default function BoxPill({ count, bump }) {
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    if (bump === 0) return
    setPulse(true)
    const t = setTimeout(() => setPulse(false), 450)
    return () => clearTimeout(t)
  }, [bump])

  if (count === 0) return null

  return (
    <a
      className={`box-pill${pulse ? ' is-pulsing' : ''}`}
      href="#build-a-box"
      aria-label={`Your six-pack box has ${count} of ${BOX_SIZE} squares, go to Build a Box`}
    >
      <span className="box-pill-squares" aria-hidden="true">
        {Array.from({ length: BOX_SIZE }).map((_, i) => (
          <span key={i} className={i < count ? 'is-filled' : ''} />
        ))}
      </span>
      <span className="box-pill-label">
        {count === BOX_SIZE ? 'Box full, check out' : `${count}/${BOX_SIZE} in your box`}
      </span>
    </a>
  )
}
