import { useEffect, useState } from 'react'

const LINKS = [
  { href: '#shop', label: 'Shop' },
  { href: '#build-a-box', label: 'Build a Box' },
  { href: '#our-story', label: 'Our Story' },
  { href: '#reviews', label: 'Reviews' },
  { href: '#events', label: 'Events' },
  { href: '#corporate', label: 'Corporate Gifts' },
]

function Wordmark() {
  return (
    <a className="wordmark" href="#top" aria-label="Fab Fresh Fudge, home">
      <img
        src="/images/Logos/Fab Fresh Color.png"
        alt=""
        width="44"
        height="44"
        className="wordmark-logo"
      />
      <span>
        Fab Fresh <em>Fudge</em>
      </span>
    </a>
  )
}

export default function Header({ boxCount }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="header-inner">
        <Wordmark />

        <nav className="main-nav" aria-label="Primary">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>

        <a className="btn btn-primary header-cta" href="#build-a-box">
          Order fudge
          {boxCount > 0 && <span className="header-count">{boxCount}</span>}
        </a>

        <button
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="nav-toggle-box" aria-hidden="true">
            <span className="nav-toggle-line" />
            <span className="nav-toggle-line" />
          </span>
          {open ? 'Close' : 'Menu'}
        </button>
      </div>

      <div id="mobile-menu" className={`mobile-menu${open ? ' is-open' : ''}`}>
        <nav aria-label="Mobile">
          {LINKS.map((l, i) => (
            <a
              key={l.href}
              href={l.href}
              style={{ transitionDelay: open ? `${60 + i * 40}ms` : '0ms' }}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
        </nav>
        <a
          className="btn btn-primary"
          href="#build-a-box"
          onClick={() => setOpen(false)}
        >
          Build your six-pack
        </a>
      </div>
    </header>
  )
}
