import Icon from './Icon.jsx'

/**
 * Confirmations and failures, bottom-right, above everything.
 *
 * The region is a polite live region so a save is announced without stealing
 * focus; errors carry `role="alert"` on the item itself, which is assertive.
 * `pointer-events: none` on the region and `auto` on each toast means the stack
 * never blocks the buttons underneath it.
 */

export default function Toaster({ toasts, onDismiss }) {
  return (
    <div className="toaster" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast--${t.tone}`}
          role={t.tone === 'error' ? 'alert' : undefined}
        >
          <span className="toast__mark" aria-hidden="true">
            <Icon name={t.tone === 'error' ? 'alert' : 'check'} size={16} strokeWidth={2.25} />
          </span>
          <div className="toast__text">
            <p className="toast__title">{t.title}</p>
            {t.detail ? <p className="toast__detail">{t.detail}</p> : null}
          </div>
          <button
            type="button"
            className="toast__close"
            onClick={() => onDismiss(t.id)}
            aria-label={`Dismiss: ${t.title}`}
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      ))}
    </div>
  )
}
