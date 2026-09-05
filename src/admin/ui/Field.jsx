import { useId } from 'react'
import Icon from './Icon.jsx'

/**
 * Form controls. One label treatment, one hint treatment, one error treatment,
 * used by both editors — so a field behaves the same whether it's on a flavor
 * or a show.
 *
 * Every control is wired for real: label `htmlFor`, `aria-describedby` pointing
 * at whichever of hint/error/counter is present, and `aria-invalid` when the
 * field has been marked wrong.
 */

export function Field({ label, hint, error, required, counter, htmlFor, children, id }) {
  const errorId = error ? `${htmlFor || id}-error` : undefined
  const hintId = hint ? `${htmlFor || id}-hint` : undefined

  return (
    <div className={`field${error ? ' field--invalid' : ''}`}>
      <div className="field__top">
        <label className="field__label" htmlFor={htmlFor || id}>
          {label}
          {required ? (
            <span className="field__req" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
        {counter ? <span className="field__counter">{counter}</span> : null}
      </div>

      {children}

      {error ? (
        <p className="field__error" id={errorId} role="alert">
          <Icon name="alert" size={15} />
          {error}
        </p>
      ) : hint ? (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

/** Ties a control to its Field's label, hint and error without repeating ids. */
function describedBy({ id, hint, error }) {
  const ids = []
  if (error) ids.push(`${id}-error`)
  else if (hint) ids.push(`${id}-hint`)
  return ids.length ? ids.join(' ') : undefined
}

export function TextInput({ label, hint, error, required, prefix, ...rest }) {
  const auto = useId()
  const id = rest.id || auto

  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={id}>
      <div className={`input-wrap${prefix ? ' input-wrap--prefixed' : ''}`}>
        {prefix ? (
          <span className="input-wrap__prefix" aria-hidden="true">
            {prefix}
          </span>
        ) : null}
        <input
          {...rest}
          id={id}
          className="input"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy({ id, hint, error })}
          aria-required={required || undefined}
        />
      </div>
    </Field>
  )
}

export function TextArea({ label, hint, error, required, maxLength, value = '', ...rest }) {
  const auto = useId()
  const id = rest.id || auto
  const over = maxLength ? value.length > maxLength : false

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={id}
      counter={
        maxLength ? (
          <span className={over ? 'is-over' : undefined}>
            {value.length}/{maxLength}
          </span>
        ) : null
      }
    >
      <textarea
        {...rest}
        id={id}
        value={value}
        className="input input--area"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy({ id, hint, error })}
        aria-required={required || undefined}
      />
    </Field>
  )
}

/**
 * A real checkbox behind a switch face — keyboard, form semantics and screen
 * readers all get the native control; only the visuals are ours.
 */
export function Switch({ checked, onChange, label, description, disabled, tone = 'blue' }) {
  const id = useId()

  return (
    <div className={`switch-row${disabled ? ' is-disabled' : ''}`}>
      <div className="switch-row__text">
        <label className="switch-row__label" htmlFor={id}>
          {label}
        </label>
        {description ? <p className="switch-row__desc">{description}</p> : null}
      </div>
      <span className={`switch switch--${tone}`}>
        <input
          type="checkbox"
          id={id}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="switch__track" aria-hidden="true">
          <span className="switch__thumb" />
        </span>
      </span>
    </div>
  )
}

/** Multi-select as toggle chips — the same chip vocabulary the public site uses. */
export function ChipGroup({ label, hint, error, required, options, value, onToggle }) {
  const id = useId()

  return (
    <fieldset className={`field field--group${error ? ' field--invalid' : ''}`}>
      <legend className="field__label">
        {label}
        {required ? (
          <span className="field__req" aria-hidden="true">
            *
          </span>
        ) : null}
      </legend>

      <div className="chip-group">
        {options.map((opt) => {
          const on = value.includes(opt.key)
          return (
            <label key={opt.key} className={`chip-check${on ? ' is-on' : ''}`}>
              <input
                type="checkbox"
                checked={on}
                onChange={() => onToggle(opt.key)}
              />
              <Icon name={on ? 'check' : 'plus'} size={14} />
              <span>{opt.label}</span>
            </label>
          )
        })}
      </div>

      {error ? (
        <p className="field__error" id={`${id}-error`} role="alert">
          <Icon name="alert" size={15} />
          {error}
        </p>
      ) : hint ? (
        <p className="field__hint">{hint}</p>
      ) : null}
    </fieldset>
  )
}
