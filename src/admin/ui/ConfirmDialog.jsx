import { useId } from 'react'
import Dialog from './Dialog.jsx'
import Button from './Button.jsx'
import Icon from './Icon.jsx'

/**
 * Confirmation for the handful of actions that can't be undone.
 *
 * No type-the-name-to-confirm gate: the people using this run a fudge stand,
 * not a datacenter, and a deletion here costs one form to re-enter. The
 * safeguards that actually help are naming the exact record and spelling out
 * what happens on the website, both of which are in the body copy.
 *
 * Cancel is focused on open, so a stray Return doesn't delete anything.
 */

export default function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  body,
  confirmLabel = 'Delete',
  cancelLabel = 'Keep it',
  tone = 'danger',
  pending = false,
}) {
  const titleId = useId()
  const bodyId = useId()

  return (
    <Dialog
      open={open}
      onClose={() => !pending && onCancel?.()}
      variant="center"
      labelledBy={titleId}
      describedBy={bodyId}
    >
      <div className="confirm">
        <span className={`confirm__mark confirm__mark--${tone}`} aria-hidden="true">
          <Icon name={tone === 'danger' ? 'trash' : 'alert'} size={22} />
        </span>

        <h2 className="confirm__title" id={titleId}>
          {title}
        </h2>
        <div className="confirm__body" id={bodyId}>
          {body}
        </div>

        <div className="confirm__actions">
          <Button variant="secondary" onClick={onCancel} disabled={pending} autoFocus>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={pending}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
