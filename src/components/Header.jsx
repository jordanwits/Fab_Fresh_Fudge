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

function CartButton({ count, onClick }) {
  return (
    <button
      type="button"
      className="cart-button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={count > 0 ? `Cart, ${count} ${count === 1 ? 'item' : 'items'}` : 'Cart, empty'}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          d="M5 8.5h14l-1.1 10.6a2 2 0 0 1-2 1.9H8.1a2 2 0 0 1-2-1.9L5 8.5Z M9 8.5V7a3 3 0 0 1 6 0v1.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {count > 0 && (
        // Keyed on the count so the badge remounts, and its pop replays, on
        // every change.
        <span key={count} className="cart-button-count" aria-hidden="true">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}

export default function Header({ cartCount, onOpenCart }) {
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

        <div className="header-actions">
          <a className="btn btn-primary header-cta" href="#build-a-box">
            Order fudge
          </a>

          <CartButton
            count={cartCount}
            onClick={() => {
              setOpen(false)
              onOpenCart()
            }}
          />

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
            <span className="nav-toggle-label">{open ? 'Close' : 'Menu'}</span>
          </button>
        </div>
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
