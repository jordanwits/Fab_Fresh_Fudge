import { useEffect, useMemo, useState } from 'react'
import { parseISO, toDateChip, formatRange } from '../lib/eventDate.js'
import Drawer from '../ui/Drawer.jsx'
import Button from '../ui/Button.jsx'
import Icon from '../ui/Icon.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import { Field, TextArea, TextInput } from '../ui/Field.jsx'

/**
 * Add or edit one show.
 *
 * Dates are entered as real dates, not as the "Jun" / "20–21" pair the site
 * renders — those are derived on save (see lib/eventDate.js). That keeps the
 * stored record drop-in compatible with the public Events section while sparing
 * the client from hand-typing a date chip, and it means shows can actually be
 * sorted and split into upcoming and past.
 *
 * The date chip preview under the fields shows exactly what the derivation
 * produces, so there's no guessing about how a multi-day show will read.
 */

const BLANK = {
  name: '',
  place: '',
  startDate: '',
  endDate: '',
  detail: '',
  tag: 'Free samples',
}

const DETAIL_MAX = 120

function validate(values) {
  const errors = {}
  if (!values.name.trim()) errors.name = 'What is the show called?'
  if (!values.place.trim()) errors.place = 'Where is it? This shows under the name.'
  if (!values.startDate) errors.startDate = 'Pick the first day.'

  if (values.endDate && values.startDate) {
    const start = parseISO(values.startDate)
    const end = parseISO(values.endDate)
    if (start && end && end.getTime() < start.getTime()) {
      errors.endDate = 'The last day comes before the first day.'
    }
  }
  if (values.detail.length > DETAIL_MAX) {
    errors.detail = `Keep it under ${DETAIL_MAX} characters.`
  }
  return errors
}

export default function EventEditor({ open, event, onClose, onSave, onDelete }) {
  const isNew = !event

  const initial = useMemo(() => (event ? { ...BLANK, ...event } : { ...BLANK }), [event])

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

  const chip = toDateChip(values.startDate, values.endDate)

  const set = (key, next) => {
    const merged = { ...values, [key]: next }
    // A single-day show that grows an earlier start shouldn't silently keep an
    // end date that now sits before it.
    if (key === 'startDate' && merged.endDate) {
      const start = parseISO(next)
      const end = parseISO(merged.endDate)
      if (start && end && end.getTime() < start.getTime()) merged.endDate = ''
    }
    setValues(merged)
    // Re-check everything once the form has been submitted once: clearing one
    // key at a time leaves errors standing on fields this change already fixed.
    if (submitted) setErrors(validate(merged))
  }


  // Move focus to the first field that needs fixing. This has to wait for the
  // render that paints `errors` -- querying the DOM straight after setErrors
  // finds nothing, because React hasn't committed the aria-invalid attributes
  // yet. Keyed on an attempt counter rather than on `errors` so that correcting
  // a field mid-typing doesn't yank focus back to the top of the form.
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
          ...values,
          name: values.name.trim(),
          place: values.place.trim(),
          detail: values.detail.trim(),
          tag: values.tag.trim(),
          // Derived, so the record matches what the site's date chip expects.
          ...toDateChip(values.startDate, values.endDate),
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
        title={isNew ? 'Add a show' : values.name || 'Edit show'}
        subtitle="Shows appear under “Upcoming shows”, soonest first."
        footer={
          <>
            {!isNew ? (
              <Button variant="quiet-danger" icon="trash" onClick={() => onDelete(event)} disabled={saving}>
                Delete
              </Button>
            ) : null}
            <div className="drawer__foot-main">
              <Button variant="secondary" onClick={requestClose} disabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSubmit} loading={saving}>
                {isNew ? 'Add show' : 'Save changes'}
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
            label="Show name"
            required
            value={values.name}
            error={errors.name}
            placeholder="e.g. Harvest Craft Fair"
            onChange={(e) => set('name', e.target.value)}
          />

          <TextInput
            label="Where"
            required
            value={values.place}
            error={errors.place}
            placeholder="e.g. Shasta District Fairgrounds"
            hint="Venue, and the booth if you know it."
            onChange={(e) => set('place', e.target.value)}
          />

          <div className="form__row">
            <TextInput
              label="First day"
              required
              type="date"
              value={values.startDate}
              error={errors.startDate}
              onChange={(e) => set('startDate', e.target.value)}
            />
            <TextInput
              label="Last day"
              type="date"
              value={values.endDate}
              error={errors.endDate}
              min={values.startDate || undefined}
              hint="Leave empty for a one-day show."
              onChange={(e) => set('endDate', e.target.value)}
            />
          </div>

          <Field label="On the site" htmlFor="event-preview">
            <div className="date-preview" id="event-preview">
              <span className="date-chip" aria-hidden="true">
                <span className="date-chip__month">{chip.month || '—'}</span>
                <span className="date-chip__day">{chip.day || '—'}</span>
              </span>
              <span className="date-preview__text">
                <strong>{values.name || 'Your show'}</strong>
                <span className="date-preview__place">{values.place || 'Venue'}</span>
                <span className="date-preview__range">
                  {values.startDate ? formatRange(values.startDate, values.endDate) : 'No date yet'}
                </span>
              </span>
            </div>
          </Field>

          <TextArea
            label="One-line detail"
            rows={2}
            value={values.detail}
            error={errors.detail}
            maxLength={DETAIL_MAX}
            placeholder="e.g. Booth 14, next to the kettle corn."
            hint="Optional. The small line under the venue."
            onChange={(e) => set('detail', e.target.value)}
          />

          <TextInput
            label="Corner tag"
            value={values.tag}
            placeholder="e.g. Free samples"
            hint="The little pill on the right of the row. Leave empty for none."
            onChange={(e) => set('tag', e.target.value)}
          />

          <button type="submit" className="visually-hidden" tabIndex={-1} aria-hidden="true">
            Save
          </button>
        </form>
      </Drawer>

      <ConfirmDialog
        open={confirmDiscard}
        tone="warning"
        title="Discard your changes?"
        body={<p>You&rsquo;ve edited this show but haven&rsquo;t saved it yet.</p>}
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
