import { useId } from 'react'
import Dialog from './Dialog.jsx'
import Button from './Button.jsx'

/**
 * Right-hand slide-over: where records are edited.
 *
 * A panel rather than a full page because the list stays visible behind it —
 * the client can see the flavor case they're editing against — and rather than
 * a centred modal because these forms are tall and a sheet handles tall content
 * without fighting the viewport.
 *
 * The header and footer are pinned; only the form body scrolls, so Save is
 * always reachable without hunting for it.
 */

export default function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'md',
}) {
  const titleId = useId()

  return (
    <Dialog open={open} onClose={onClose} variant="drawer" labelledBy={titleId}>
      <div className={`drawer drawer--${width}`}>
        <header className="drawer__head">
          <div className="drawer__heading">
            <h2 className="drawer__title" id={titleId}>
              {title}
            </h2>
            {subtitle ? <p className="drawer__subtitle">{subtitle}</p> : null}
          </div>
          <Button
            variant="quiet"
            icon="close"
            aria-label="Close without saving"
            onClick={() => onClose?.('button')}
          />
        </header>

        <div className="drawer__body">{children}</div>

        {footer ? <footer className="drawer__foot">{footer}</footer> : null}
      </div>
    </Dialog>
  )
}
