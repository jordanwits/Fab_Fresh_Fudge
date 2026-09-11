import { useEffect, useMemo, useState } from 'react'
import Drawer from '../ui/Drawer.jsx'
import Button from '../ui/Button.jsx'
import Icon from '../ui/Icon.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import { Field, TextArea, TextInput } from '../ui/Field.jsx'

/**
 * Add or edit one corporate gift package.
 *
 * Every field here is printed on the site verbatim -- there is nothing derived
 * and nothing parsed. `price` and `size` stay free text on purpose: the client
 * writes "from $42" and "6 squares · 1.5 lbs" because real corporate jobs are
 * quoted by email, and forcing a number would make the site claim a precision
 * the business doesn't offer.
 *
 * Because it is all verbatim, the preview under the fields is the whole safety
 * net: it renders the row the way the Corporate Gifts section will, so an
 * over-long blurb or a price that reads oddly next to the name is visible here
 * rather than after publishing.
 */

const BLANK = {
  name: '',
  size: '',
  blurb: '',
  price: '',
}

const BLURB_MAX = 160

function validate(values) {
  const errors = {}
  if (!values.name.trim()) errors.name = 'What is this package called?'
  if (!values.size.trim()) errors.size = 'What do they get? This sits under the name.'
  if (!values.price.trim()) errors.price = 'Add a price, or the row reads as unfinished.'
  if (values.blurb.length > BLURB_MAX) {
    errors.blurb = `Keep it under ${BLURB_MAX} characters.`
  }
  return errors
}

export default function PackageEditor({ open, pkg, onClose, onSave, onDelete }) {
  const isNew = !pkg

  const initial = useMemo(() => (pkg ? { ...BLANK, ...pkg } : { ...BLANK }), [pkg])

  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [focusAttempt, setFocusAttempt] = useState(0)

  const dirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(initial),
    [values, initial]
  )

  const set = (key, next) => {
    const merged = { ...values, [key]: next }
    setValues(merged)
    // Re-check everything once the form has been submitted once: clearing one
    // key at a time leaves errors standing on fields this change already fixed.
    if (submitted) setErrors(validate(merged))
  }

  // Move focus to the first field that needs fixing, one render after `errors`
  // paints -- same reasoning as the show editor: React hasn't committed the
  // aria-invalid attributes at the moment setErrors returns.
  useEffect(() => {
    if (!focusAttempt) return
    document
      .querySelector(
        '.drawer [aria-invalid="true"], .drawer .field--invalid input, .drawer .field--invalid textarea'
      )
      ?.focus()
  }, [focusAttempt])

  const requestClose = () => {
    if (saving) return
    if (dirty) {
      setConfirmDiscard(true)
      return
    }
    onClose()
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    setSubmitted(true)
    setSaveError('')

    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length) {
      setFocusAttempt((n) => n + 1)
      return
    }

    setSaving(true)
    try {
      await onSave(
        {
          name: values.name.trim(),
          size: values.size.trim(),
          blurb: values.blurb.trim(),
          price: values.price.trim(),
        },
        isNew
      )
      onClose()
    } catch (err) {
      setSaveError(err?.message || "That didn't save. Try again in a moment.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Drawer
        open={open}
        onClose={requestClose}
        width="sm"
        title={isNew ? 'Add a package' : values.name || 'Edit package'}
        subtitle="Packages are the tier list under “Corporate gifts” on the website."
        footer={
          <>
            {!isNew ? (
              <Button
                variant="quiet-danger"
                icon="trash"
                onClick={() => onDelete(pkg)}
                disabled={saving}
              >
                Delete
              </Button>
            ) : null}
            <div className="drawer__foot-main">
              <Button variant="secondary" onClick={requestClose} disabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSubmit} loading={saving}>
                {isNew ? 'Add package' : 'Save changes'}
              </Button>
            </div>
          </>
        }
      >
        <form className="form" onSubmit={handleSubmit} noValidate>
          {saveError ? (
            <div className="alert alert--error" role="alert">
              <Icon name="alert" size={17} />
              <span>{saveError}</span>
            </div>
          ) : null}

          <TextInput
            label="Package name"
            required
            value={values.name}
            error={errors.name}
            placeholder="e.g. The Dozen"
            onChange={(e) => set('name', e.target.value)}
          />

          <div className="form__row">
            <TextInput
              label="What's in it"
              required
              value={values.size}
              error={errors.size}
              placeholder="e.g. 12 squares · 3 lbs"
              hint="Count and weight."
              onChange={(e) => set('size', e.target.value)}
            />
            <TextInput
              label="Price"
              required
              value={values.price}
              error={errors.price}
              placeholder="e.g. from $78"
              hint="Written out, not a number — “from $78” sets the right expectation."
              onChange={(e) => set('price', e.target.value)}
            />
          </div>

          <TextArea
            label="Description"
            rows={3}
            value={values.blurb}
            error={errors.blurb}
            maxLength={BLURB_MAX}
            placeholder="e.g. Two trays, twelve flavors if you want them, with custom ribbon and logo sticker."
            hint="Optional. One sentence on what makes this tier worth it."
            onChange={(e) => set('blurb', e.target.value)}
          />

          <Field label="On the site" htmlFor="package-preview">
            <div className="tier-preview" id="package-preview">
              <div className="tier-preview__head">
                <strong>{values.name || 'Package name'}</strong>
                <span className="tier-preview__price">{values.price || '—'}</span>
              </div>
              <p className="tier-preview__size">{values.size || 'What’s in it'}</p>
              {values.blurb ? <p className="tier-preview__blurb">{values.blurb}</p> : null}
            </div>
          </Field>

          <button type="submit" className="visually-hidden" tabIndex={-1} aria-hidden="true">
            Save
          </button>
        </form>
      </Drawer>

      <ConfirmDialog
        open={confirmDiscard}
        tone="warning"
        title="Discard your changes?"
        body={<p>You&rsquo;ve edited this package but haven&rsquo;t saved it yet.</p>}
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false)
          onClose()
        }}
      />
    </>
  )
}
