import { useEffect, useState } from 'react'
import { useAuth } from '../state/AuthContext.jsx'
import { useData } from '../state/DataContext.jsx'
import { useToast } from '../state/ToastContext.jsx'
import { usePublish } from '../state/PublishContext.jsx'
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
  { route: 'pricing', label: 'Pricing', icon: 'tag', blurb: 'What things cost' },
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
                {counts[item.route] != null ? (
                  <span className="rail__count">{counts[item.route]}</span>
                ) : null}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/**
 * Whether the website has caught up with the dashboard. Saving changes the
 * database at once; the site only changes when she publishes (PublishContext),
 * so she needs to see which of those she's looking at -- and the button.
 */
function publishCopy(status) {
  const time = (iso) =>
    new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  switch (status.state) {
    case 'dirty':
      return {
        tone: 'info',
        icon: 'upload',
        title: 'Unpublished changes',
        body: "Saved, but not on the website yet. Publish when you're done editing.",
        action: 'Publish changes',
        short: 'Publish',
        pillPublishes: true,
      }
    case 'publishing':
      return {
        tone: 'info',
        icon: 'refresh',
        spin: true,
        title: 'Publishing\u2026',
        body: 'The website updates in about a minute. You can keep working.',
        short: 'Publishing\u2026',
      }
    case 'slow':
      return {
        tone: 'info',
        icon: 'refresh',
        spin: true,
        title: 'Still publishing\u2026',
        body: 'Taking longer than usual. It will catch up; no need to publish again.',
        short: 'Still publishing',
      }
    case 'clean':
      return {
        tone: 'good',
        icon: 'check',
        title: 'Website is up to date',
        body: status.liveAt ? `Last published at ${time(status.liveAt)}.` : 'Nothing waiting to publish.',
      }
    case 'error':
      if (status.code === 'not_configured') {
        return {
          tone: 'quiet',
          icon: 'alert',
          title: 'Publishing is off here',
          body: "Saved. This copy of the dashboard can't publish the live site.",
        }
      }
      return {
        tone: 'warn',
        icon: 'alert',
        title: "Couldn't publish",
        body: status.message || 'Your changes are saved. Try again in a moment.',
        action: 'Try again',
        short: 'Publish failed',
      }
    default:
      return {
        tone: 'quiet',
        icon: 'external',
        title: 'Website',
        body: 'Checking for unpublished changes\u2026',
      }
  }
}

function PublishStatus() {
  const { status, publish } = usePublish()
  const copy = publishCopy(status)

  return (
    <div className={`rail__notice rail__notice--${copy.tone}`} role="status" aria-live="polite">
      <p className="rail__notice-title">
        <span className={copy.spin ? 'is-spinning' : undefined}>
          <Icon name={copy.icon} size={14} />
        </span>
        {copy.title}
      </p>
      <p className="rail__notice-body">{copy.body}</p>
      {copy.action ? (
        <Button
          variant="primary"
          size="sm"
          icon={status.state === 'error' ? 'refresh' : 'upload'}
          full
          className="rail__publish"
          onClick={publish}
        >
          {copy.action}
        </Button>
      ) : null}
    </div>
  )
}

/**
 * The phone's version, in the top bar. With unpublished changes it IS the
 * publish button -- she updates stock from a phone at markets and shouldn't
 * have to open the menu to finish the job. Otherwise it opens the menu, where
 * the full status lives.
 */
function PublishPill({ onOpen }) {
  const { status, publish } = usePublish()
  const copy = publishCopy(status)
  if (!copy.short) return null
  return (
    <button
      type="button"
      className={`topbar__status topbar__status--${copy.tone}${
        copy.pillPublishes ? ' topbar__status--action' : ''
      }`}
      onClick={copy.pillPublishes ? publish : onOpen}
    >
      {copy.short}
    </button>
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
        ) : backend.publish ? (
          <PublishStatus />
        ) : !backend.feedsSite ? (
          <div className="rail__notice">
            <p className="rail__notice-title">
              <Icon name="alert" size={14} />
              Not on the website yet
            </p>
            <p className="rail__notice-body">
              Edits are saved to the database, but the public site still shows its built-in
              content until it is connected.
            </p>
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
    // Unpublished changes survive signing out: they're flagged from the
    // server, so the next sign-in on any device still offers to publish.
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
        <PublishPill onOpen={() => setNavOpen(true)} />
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
