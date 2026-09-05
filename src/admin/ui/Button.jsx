import { forwardRef } from 'react'
import Icon from './Icon.jsx'

/**
 * One button, every variant the dashboard uses. Same shape, same padding, same
 * focus ring everywhere — a save button that looks different on two screens
 * means one of them is wrong.
 *
 * States covered: default, hover, active, focus-visible, disabled, loading.
 * `loading` implies disabled and swaps the leading icon for a spinner while
 * keeping the label, so the button never changes width mid-click.
 */

const Button = forwardRef(function Button(
  {
    variant = 'secondary',
    size = 'md',
    icon,
    iconEnd,
    loading = false,
    disabled = false,
    full = false,
    className = '',
    children,
    ...rest
  },
  ref
) {
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    full ? 'btn--full' : '',
    loading ? 'is-loading' : '',
    !children ? 'btn--icon-only' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      ref={ref}
      type="button"
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className="btn__spinner" aria-hidden="true" />
      ) : icon ? (
        <Icon name={icon} size={size === 'sm' ? 16 : 18} />
      ) : null}
      {children ? <span className="btn__label">{children}</span> : null}
      {iconEnd && !loading ? <Icon name={iconEnd} size={size === 'sm' ? 16 : 18} /> : null}
    </button>
  )
})

export default Button
