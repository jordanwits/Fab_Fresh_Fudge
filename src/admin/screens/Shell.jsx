import { useEffect, useState } from 'react'
import { useAuth } from '../state/AuthContext.jsx'
import { useData } from '../state/DataContext.jsx'
import { useToast } from '../state/ToastContext.jsx'
import { backend } from '../backend/adapter.js'
import { hrefFor } from '../lib/router.js'
import Icon from '../ui/Icon.jsx'
import Button from '../ui/Button.jsx'
import Dialog from '../ui/Dialog.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'

/**
 * The frame: a cocoa rail on the left, work surface on the right.
 *
 * The rail is the one dark element in the tool — it borrows the site's own
 * header colour so the dashboard reads as part of the same brand, and it gives
 * the content area a neutral edge to sit against instead of floating.
 *
 * Below 1000px the rail becomes an off-canvas panel behind a top bar, because
 * the client updates stock from a phone at a market as often as from a desk.
 */

const NAV = [
  { route: 'flavors', label: 'Flavors', icon: 'image', blurb: 'The flavor case' },
  { route: 'events', label: 'Shows', icon: 'calendar', blurb: 'Upcoming schedule' },
  { route: 'packages', label: 'Corporate Gifts', icon: 'gift', blurb: 'Gift packages' },
]

function NavList({ route, counts, onNavigate }) {
  return (
    <nav className="rail__nav" aria-label="Sections">
      <ul>
        {NAV.map((item) => {
          const current = route === item.route
          return (
            <li key={item.route}>
              <a
                className={`rail__link${current ? ' is-current' : ''}`}
                href={hrefFor(item.route)}
                aria-current={current ? 'page' : undefined}
                onClick={onNavigate}
              >
                <Icon name={item.icon} size={19} />
                <span className="rail__link-text">
                  <span className="rail__link-label">{item.label}</span>
                  <span className="rail__link-blurb">{item.blurb}</span>
                </span>
                <span className="rail__count">{counts[item.route]}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function RailBody({ route, counts, onNavigate, onSignOut, onReset, user, resetting }) {
  return (
    <>
      <a className="rail__brand" href="/" title="Open the website">
        <img
          src="/images/Logos/Fab Fresh Color.png"
          alt=""
          width="38"
          height="38"
          className="rail__logo"
        />
        <span className="rail__brand-text">
          <span className="rail__wordmark">
            Fab Fresh <em>Fudge</em>
          </span>
          <span className="rail__brand-sub">
            Website admin
            <Icon name="external" size={12} />
          </span>
        </span>
      </a>

      <NavList route={route} counts={counts} onNavigate={onNavigate} />

      <div className="rail__foot">
        {backend.isMock ? (
          <div className="rail__notice">
            <p className="rail__notice-title">
              <Icon name="alert" size={14} />
              {backend.label}
            </p>
            <p className="rail__notice-body">
              Edits are saved in this browser only. Nothing reaches the live site until a
              backend is connected.
            </p>
            {onReset ? (
              <button
                type="button"
                className="rail__notice-action"
                onClick={onReset}
                disabled={resetting}
              >
                <Icon name="refresh" size={13} />
                {resetting ? 'Restoring…' : 'Reset to sample data'}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="rail__user">
          <span className="rail__avatar" aria-hidden="true">
            {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
          </span>
          <span className="rail__user-text">
            <span className="rail__user-name">{user?.name || 'Signed in'}</span>
            <span className="rail__user-mail">{user?.email}</span>
          </span>
          <button
            type="button"
            className="rail__signout"
            onClick={onSignOut}
            aria-label="Sign out"
            title="Sign out"
          >
            <Icon name="logout" size={17} />
          </button>
        </div>
      </div>
    </>
  )
}

export default function Shell({ route, children }) {
  const { user, signOut } = useAuth()
  const { flavors, events, packages, resetSampleData } = useData()
  const toast = useToast()

  const [navOpen, setNavOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)

  const counts = {
    flavors: flavors.length,
    events: events.length,
    packages: packages.length,
  }
  const current = NAV.find((n) => n.route === route) || NAV[0]

  // Keep the document title in step with the section, so browser history and
  // pinned tabs say something useful.
  useEffect(() => {
    document.title = `${current.label} · Fab Fresh Fudge admin`
  }, [current.label])

  // A hash change means a section change; the phone panel has done its job.
  useEffect(() => {
    setNavOpen(false)
  }, [route])

  const handleReset = async () => {
    setResetting(true)
    try {
      await resetSampleData()
      setConfirmReset(false)
    } catch (err) {
      toast.error("Couldn't reset", err?.message || 'Try again in a moment.')
    } finally {
      setResetting(false)
    }
  }

  const railProps = {
    route,
    counts,
    user,
    resetting,
    onSignOut: signOut,
    onReset: resetSampleData ? () => setConfirmReset(true) : null,
  }

  return (
    <div className="shell">
      <a className="skip-link" href="#admin-main">
        Skip to content
      </a>

      <aside className="rail rail--fixed">
        <RailBody {...railProps} onNavigate={undefined} />
      </aside>

      <header className="topbar">
        <Button
          variant="quiet"
          icon="menu"
          className="topbar__menu"
          aria-label="Open menu"
          aria-expanded={navOpen}
          onClick={() => setNavOpen(true)}
        />
        <span className="topbar__title">{current.label}</span>
        <a className="topbar__site" href="/" aria-label="Open the website">
          <Icon name="external" size={18} />
        </a>
      </header>

      <Dialog open={navOpen} onClose={() => setNavOpen(false)} variant="nav">
        <div className="rail rail--panel">
          <RailBody {...railProps} onNavigate={() => setNavOpen(false)} />
          <button
            type="button"
            className="rail__close"
            onClick={() => setNavOpen(false)}
            aria-label="Close menu"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      </Dialog>

      <main className="work" id="admin-main">
        {children}
      </main>

      <ConfirmDialog
        open={confirmReset}
        tone="warning"
        title="Reset to sample data?"
        body={
          <p>
            Every flavor and show goes back to how it started, and anything you&rsquo;ve added,
            edited, or deleted in this browser is discarded.
          </p>
        }
        confirmLabel="Reset everything"
        cancelLabel="Cancel"
        pending={resetting}
        onCancel={() => setConfirmReset(false)}
        onConfirm={handleReset}
      />
    </div>
  )
}
