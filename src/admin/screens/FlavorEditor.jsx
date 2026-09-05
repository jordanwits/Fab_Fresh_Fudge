import { useEffect, useMemo, useState } from 'react'
import { CATEGORIES } from '../../data/flavors.js'
import { isSlug, slugify, uniqueSlug } from '../lib/slug.js'
import Drawer from '../ui/Drawer.jsx'
import Button from '../ui/Button.jsx'
import Icon from '../ui/Icon.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import { ChipGroup, Switch, TextArea, TextInput } from '../ui/Field.jsx'
import ImageField from './ImageField.jsx'

/**
 * Add or edit one flavor.
 *
 * Field order follows how the flavor reads on the site — photo, name,
 * description, then the badges that sit on top of it — rather than the order
 * the fields happen to appear in flavors.js.
 *
 * The id is generated from the name on create and locked afterwards. It's the
 * key the public site stores in a customer's Build-a-Box, so renaming it later
 * would empty boxes and break photo filenames; the name above it is free to
 * change any time.
 */

const CAT_OPTIONS = CATEGORIES.filter((c) => c.key !== 'all')
const DESC_MAX = 190
const NAME_MAX = 42

const BLANK = {
  name: '',
  desc: '',
  img: '',
  focal: '50% 50%',
  cats: [],
  note: '',
  popular: false,
  isNew: false,
  soldOut: false,
}

function validate(values, { isNew, takenIds }) {
  const errors = {}

  if (!values.name.trim()) errors.name = 'Give the flavor a name.'
  else if (values.name.length > NAME_MAX) errors.name = `Keep it under ${NAME_MAX} characters.`

  if (!values.desc.trim()) errors.desc = 'Write a line about what is in it.'
  else if (values.desc.length > DESC_MAX)
    errors.desc = `Cards clamp to two lines — trim to ${DESC_MAX} characters.`

  if (!values.cats.length) errors.cats = 'Pick at least one, so the flavor shows up in filters.'

  if (isNew) {
    if (!values.id?.trim()) errors.id = 'The reference ID needs a value.'
    else if (!isSlug(values.id)) errors.id = 'Lowercase letters, numbers and hyphens only.'
    else if (takenIds.includes(values.id)) errors.id = 'Another flavor already uses this.'
  }

  return errors
}

export default function FlavorEditor({ open, flavor, allFlavors, onClose, onSave, onDelete }) {
  const isNew = !flavor

  const initial = useMemo(() => {
    if (flavor) return { ...BLANK, ...flavor }
    return { ...BLANK, id: '' }
  }, [flavor])

  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  // The id follows the name until the user edits it themselves.
  const [idTouched, setIdTouched] = useState(false)
  const [focusAttempt, setFocusAttempt] = useState(0)

  const takenIds = useMemo(
    () => allFlavors.filter((f) => f.id !== flavor?.id).map((f) => f.id),
    [allFlavors, flavor]
  )

  const dirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(initial),
    [values, initial]
  )

  const set = (key, next) => {
    const merged = { ...values, [key]: next }
    if (key === 'name' && isNew && !idTouched) {
      merged.id = uniqueSlug(next, takenIds)
    }
    setValues(merged)
    // Once the form has been submitted once, re-check the whole thing on every
    // keystroke rather than only clearing the edited field's error. Typing a
    // name also fills the web address, and clearing errors key-by-key left that
    // derived field showing a complaint it had already satisfied.
    if (submitted) setErrors(validate(merged, { isNew, takenIds }))
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

  const toggleCat = (key) =>
    set('cats', values.cats.includes(key) ? values.cats.filter((c) => c !== key) : [...values.cats, key])

  const requestClose = (reason) => {
    if (saving) return
    if (dirty && reason !== 'saved') {
      setConfirmDiscard(true)
      return
    }
    onClose()
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    setSubmitted(true)
    setSaveError('')

    const found = validate(values, { isNew, takenIds })
    setErrors(found)
    if (Object.keys(found).length) {
      setFocusAttempt((n) => n + 1)
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...values,
        name: values.name.trim(),
        desc: values.desc.trim(),
        note: values.note.trim(),
        id: isNew ? values.id.trim() : flavor.id,
      }
      await onSave(payload, isNew)
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
        title={isNew ? 'Add a flavor' : values.name || 'Edit flavor'}
        subtitle={
          isNew
            ? 'It appears in the flavor case as soon as you save.'
            : 'Changes show on the website right away.'
        }
        footer={
          <>
            {!isNew ? (
              <Button variant="quiet-danger" icon="trash" onClick={() => onDelete(flavor)} disabled={saving}>
                Delete
              </Button>
            ) : null}
            <div className="drawer__foot-main">
              <Button variant="secondary" onClick={() => requestClose('button')} disabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSubmit} loading={saving}>
                {isNew ? 'Add flavor' : 'Save changes'}
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

          <ImageField
            value={values.img}
            focal={values.focal}
            alt={values.name ? `${values.name} fudge` : 'Flavor photo'}
            onChange={(img) => set('img', img)}
            onFocalChange={(focal) => set('focal', focal)}
          />

          <TextInput
            label="Name"
            required
            value={values.name}
            error={errors.name}
            maxLength={NAME_MAX + 10}
            placeholder="e.g. Maple Walnut"
            onChange={(e) => set('name', e.target.value)}
          />

          {isNew ? (
            <TextInput
              label="Reference ID"
              required
              value={values.id || ''}
              error={errors.id}
              hint="Filled in from the name. The site uses this behind the scenes to match the flavor to its photo and to boxes customers have saved, so it can't be changed later."
              onChange={(e) => {
                setIdTouched(true)
                set('id', slugify(e.target.value))
              }}
            />
          ) : (
            <div className="locked-field">
              <span className="locked-field__label">Reference ID</span>
              <code className="locked-field__value">{flavor.id}</code>
              <span className="locked-field__note">
                <Icon name="lock" size={13} />
                Fixed — saved boxes and the photo file point at it
              </span>
            </div>
          )}

          <TextArea
            label="Description"
            required
            rows={3}
            value={values.desc}
            error={errors.desc}
            maxLength={DESC_MAX}
            placeholder="e.g. Brown sugar fudge with toasted walnuts folded through by hand."
            hint="One or two sentences. Cards on the site show two lines."
            onChange={(e) => set('desc', e.target.value)}
          />

          <ChipGroup
            label="Flavor filters"
            required
            options={CAT_OPTIONS}
            value={values.cats}
            error={errors.cats}
            onToggle={toggleCat}
            hint="Which filter buttons this flavor appears under."
          />

          <TextInput
            label="Small print"
            value={values.note}
            placeholder="e.g. Contains nuts"
            hint="Optional. Shows under the description in amber — allergens, shipping notes."
            onChange={(e) => set('note', e.target.value)}
          />

          <div className="form__group">
            <h3 className="form__group-title">On the card</h3>
            <Switch
              label="Sold out"
              description="Stays on the site, greyed out, and can't be added to a box."
              checked={values.soldOut}
              tone="amber"
              onChange={(v) => set('soldOut', v)}
            />
            <Switch
              label="Fan favorite"
              description="Adds the buttercream badge."
              checked={values.popular}
              disabled={values.soldOut}
              onChange={(v) => set('popular', v)}
            />
            <Switch
              label="New flavor"
              description="Adds the blue badge."
              checked={values.isNew}
              disabled={values.soldOut}
              onChange={(v) => set('isNew', v)}
            />
            {values.soldOut && (values.popular || values.isNew) ? (
              <p className="form__note">
                <Icon name="alert" size={14} />
                Sold out takes the badge corner, so the others stay hidden until it&rsquo;s back.
              </p>
            ) : null}
          </div>

          {/* Lets Return submit the form from any text field. */}
          <button type="submit" className="visually-hidden" tabIndex={-1} aria-hidden="true">
            Save
          </button>
        </form>
      </Drawer>

      <ConfirmDialog
        open={confirmDiscard}
        tone="warning"
        title="Discard your changes?"
        body={<p>You&rsquo;ve edited this flavor but haven&rsquo;t saved it yet.</p>}
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
