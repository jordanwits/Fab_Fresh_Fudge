import Icon from './Icon.jsx'
import Button from './Button.jsx'

/**
 * Empty, loading and error states.
 *
 * The empty states teach the interface rather than announcing absence — each
 * one says what the thing is, where it shows up on the website, and offers the
 * action that fills it. "No flavors yet" on its own would be a dead end.
 */

export function EmptyState({ icon = 'image', title, body, action }) {
  return (
    <div className="empty">
      <span className="empty__mark" aria-hidden="true">
        <Icon name={icon} size={26} />
      </span>
      <h3 className="empty__title">{title}</h3>
      {body ? <p className="empty__body">{body}</p> : null}
      {action ? <div className="empty__action">{action}</div> : null}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="empty empty--error" role="alert">
      <span className="empty__mark empty__mark--error" aria-hidden="true">
        <Icon name="alert" size={26} />
      </span>
      <h3 className="empty__title">That didn&rsquo;t load</h3>
      <p className="empty__body">{message}</p>
      {onRetry ? (
        <div className="empty__action">
          <Button variant="secondary" icon="refresh" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Skeletons rather than a spinner: the list keeps its shape while it loads, so
 * nothing jumps when the rows arrive.
 */
export function RowSkeleton({ rows = 6 }) {
  return (
    <div className="skeleton-list" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div className="skeleton-row" key={i}>
          <span className="sk sk--thumb" />
          <span className="sk-stack">
            <span className="sk sk--line" style={{ width: `${52 + ((i * 13) % 30)}%` }} />
            <span className="sk sk--line sk--short" style={{ width: `${28 + ((i * 7) % 18)}%` }} />
          </span>
          <span className="sk sk--pill" />
        </div>
      ))}
    </div>
  )
}

/** Announces loading to screen readers while the skeletons carry the visual. */
export function LoadingRegion({ label, children }) {
  return (
    <div aria-busy="true">
      <p className="visually-hidden" role="status">
        {label}
      </p>
      {children}
    </div>
  )
}
