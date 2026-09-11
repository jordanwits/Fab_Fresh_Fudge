import { Component } from 'react'
import { AuthProvider, useAuth } from './state/AuthContext.jsx'
import { ToastProvider } from './state/ToastContext.jsx'
import { DataProvider } from './state/DataContext.jsx'
import { useRoute } from './lib/router.js'
import Login from './screens/Login.jsx'
import Shell from './screens/Shell.jsx'
import FlavorsScreen from './screens/FlavorsScreen.jsx'
import EventsScreen from './screens/EventsScreen.jsx'
import PackagesScreen from './screens/PackagesScreen.jsx'
import Button from './ui/Button.jsx'
import Icon from './ui/Icon.jsx'

/**
 * The dashboard, top to bottom.
 *
 * Three states, in order: restoring a session, signed out, signed in. Auth is a
 * gate rather than a route, so there is no URL that renders the dashboard
 * chrome without a session behind it.
 */

/** A render crash shouldn't hand the client a blank white page. */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Admin crashed:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="crash">
        <span className="crash__mark" aria-hidden="true">
          <Icon name="alert" size={26} />
        </span>
        <h1>Something broke</h1>
        <p>
          The dashboard hit an error it couldn&rsquo;t recover from. Reloading usually clears
          it; nothing you saved has been lost.
        </p>
        <p className="crash__detail">{String(this.state.error?.message || this.state.error)}</p>
        <Button variant="primary" icon="refresh" onClick={() => window.location.reload()}>
          Reload the dashboard
        </Button>
      </div>
    )
  }
}

function BootSplash() {
  return (
    <div className="boot" role="status" aria-live="polite">
      <img src="/images/Logos/Fab Fresh Color.png" alt="" width="52" height="52" />
      <span className="boot__bar" aria-hidden="true" />
      <span className="visually-hidden">Loading the dashboard</span>
    </div>
  )
}

const SCREENS = {
  flavors: FlavorsScreen,
  events: EventsScreen,
  packages: PackagesScreen,
}

function Dashboard() {
  const [route] = useRoute()
  const Screen = SCREENS[route] || FlavorsScreen

  return (
    <DataProvider>
      <Shell route={route}>
        <Screen />
      </Shell>
    </DataProvider>
  )
}

function Gate() {
  const { status } = useAuth()

  if (status === 'checking') return <BootSplash />
  if (status === 'out') return <Login />
  return <Dashboard />
}

export default function AdminApp() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}
