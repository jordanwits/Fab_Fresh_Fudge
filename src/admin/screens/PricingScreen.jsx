import { useEffect, useMemo, useState } from 'react'
import { useData } from '../state/DataContext.jsx'
import { useToast } from '../state/ToastContext.jsx'
import { backend } from '../backend/adapter.js'
import { BOX_SIZE } from '../../data/flavors.js'
import { boxMath, formatPrice, parsePrice, validatePricing } from '../lib/price.js'
import Button from '../ui/Button.jsx'
import Icon from '../ui/Icon.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import { TextInput } from '../ui/Field.jsx'
import { ErrorState, LoadingRegion, RowSkeleton } from '../ui/States.jsx'

/**
 * What things cost.
 *
 * Three numbers, and unlike every other screen in here they decide what a
 * customer's card is charged. So this screen is deliberately slower than the
 * others: nothing saves until the numbers are valid, the box deal is spelled
 * out as you type, and the confirm repeats the totals in the words a customer
 * would see. The mistake being guarded against is not malice, it's typing 70
 * when you meant 7.00 and finding out from a customer.
 *
 * `backend.pricing` stores it. Until a real backend is wired the site still
 * reads the numbers compiled into src/data/, and the notice at the top of this
 * screen says so rather than letting the client believe otherwise.
 */

const money = (value) => `$${formatPrice(value)}`

function BoxDealNote({ squarePrice, boxPrice }) {
  if (squarePrice === null || boxPrice === null) return null
  const { singles, savings } = boxMath({ squarePrice, boxPrice, boxSize: BOX_SIZE })

  if (savings > 0) {
    return (
      <p className="pricing-math">
        <Icon name="check" size={15} />
        <span>
          Six squares one at a time come to <strong>{money(singles)}</strong>, so a box saves{' '}
          <strong>{money(savings)}</strong>. The site prints that saving under the box.
        </span>
      </p>
    )
  }

  return (
    <p className="pricing-math is-warning">
      <Icon name="alert" size={15} />
      <span>
        {savings === 0 ? (
          <>
            A box costs the same as six single squares, so there&rsquo;s no saving to
            advertise — the site would print &ldquo;save $0.00&rdquo;.
          </>
        ) : (
          <>
            A box costs <strong>{money(Math.abs(savings))}</strong> more than six single
            squares, so buying the box is the worse deal.
          </>
        )}
      </span>
    </p>
  )
}

export default function PricingScreen() {
  const { pricing, loading, loadError, refresh, updatePricing } = useData()
  const toast = useToast()

  const [values, setValues] = useState(null)
  const [errors, setErrors] = useState({})
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)

  // Fill the form once the record arrives, and again whenever a save returns a
  // new one, so the inputs always show what is actually stored.
  useEffect(() => {
    if (!pricing) return
    setValues({
      squarePrice: formatPrice(pricing.squarePrice),
      boxPrice: formatPrice(pricing.boxPrice),
      shippingFee: formatPrice(pricing.shippingFee),
    })
    setErrors({})
  }, [pricing])

  const parsed = useMemo(
    () => ({
      squarePrice: parsePrice(values?.squarePrice),
      boxPrice: parsePrice(values?.boxPrice),
      shippingFee: parsePrice(values?.shippingFee),
    }),
    [values]
  )

  const dirty =
    values &&
    pricing &&
    (parsed.squarePrice !== pricing.squarePrice ||
      parsed.boxPrice !== pricing.boxPrice ||
      parsed.shippingFee !== pricing.shippingFee)

  const set = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }))
    // Clear a field's complaint as soon as it's touched; re-check on submit.
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
  }

  const review = () => {
    const found = validatePricing(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setConfirming(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      await updatePricing(parsed)
      setConfirming(false)
    } catch (err) {
      setConfirming(false)
      toast.error("Couldn't save the prices", err?.message || 'Try again in a moment.')
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setValues({
      squarePrice: formatPrice(pricing.squarePrice),
      boxPrice: formatPrice(pricing.boxPrice),
      shippingFee: formatPrice(pricing.shippingFee),
    })
    setErrors({})
  }

  return (
    <>
      <header className="page-head">
        <div className="page-head__text">
          <h1 className="page-head__title">Pricing</h1>
          <p className="page-head__meta">
            {loading ? 'Loading prices…' : 'What customers pay for fudge and shipping'}
          </p>
        </div>
      </header>

      {loadError ? (
        <ErrorState message={loadError} onRetry={refresh} />
      ) : loading || !values ? (
        <LoadingRegion label="Loading prices">
          <RowSkeleton rows={3} />
        </LoadingRegion>
      ) : (
        <div className="pricing">
          {backend.isMock ? (
            <p className="pricing-notice">
              <Icon name="alert" size={16} />
              <span>
                <strong>Not connected to the website yet.</strong> The site still charges the
                prices built into it. Saving here stores your numbers in this browser; they
                start driving the site when the database is connected.
              </span>
            </p>
          ) : null}

          <div className="pricing-card">
            <h2 className="pricing-card__title">Fudge</h2>

            <div className="pricing-grid">
              <TextInput
                label="One square"
                prefix="$"
                inputMode="decimal"
                value={values.squarePrice}
                onChange={set('squarePrice')}
                error={errors.squarePrice}
                hint="Each square is about a quarter pound."
                required
              />
              <TextInput
                label={`Box of ${BOX_SIZE}`}
                prefix="$"
                inputMode="decimal"
                value={values.boxPrice}
                onChange={set('boxPrice')}
                error={errors.boxPrice}
                hint="What a Build-a-Box costs, whatever flavors go in it."
                required
              />
            </div>

            <BoxDealNote squarePrice={parsed.squarePrice} boxPrice={parsed.boxPrice} />
          </div>

          <div className="pricing-card">
            <h2 className="pricing-card__title">Shipping</h2>

            <div className="pricing-grid">
              <TextInput
                label="Flat shipping"
                prefix="$"
                inputMode="decimal"
                value={values.shippingFee}
                onChange={set('shippingFee')}
                error={errors.shippingFee}
                hint="Charged once per order. Set 0 for free shipping."
              />
            </div>

            <p className="pricing-math">
              <Icon name="tag" size={15} />
              <span>
                A box plus shipping comes to{' '}
                <strong>
                  {parsed.boxPrice !== null && parsed.shippingFee !== null
                    ? money(parsed.boxPrice + parsed.shippingFee)
                    : '—'}
                </strong>{' '}
                at checkout. Summer orders are quoted by email instead, so this doesn&rsquo;t
                apply to those.
              </span>
            </p>
          </div>

          <div className="pricing-actions">
            <Button variant="primary" icon="check" onClick={review} disabled={!dirty || saving}>
              Review and save
            </Button>
            {dirty ? (
              <Button variant="quiet" onClick={reset} disabled={saving}>
                Discard changes
              </Button>
            ) : (
              <p className="pricing-actions__note">Saved. Nothing to update right now.</p>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        tone="warning"
        title="Change what customers pay?"
        body={
          <>
            <p>From now on the website will charge:</p>
            <ul className="pricing-confirm">
              <li>
                One square <strong>{money(parsed.squarePrice)}</strong>
              </li>
              <li>
                Box of {BOX_SIZE} <strong>{money(parsed.boxPrice)}</strong>
              </li>
              <li>
                Shipping <strong>{money(parsed.shippingFee)}</strong> per order
              </li>
            </ul>
          </>
        }
        confirmLabel="Save prices"
        cancelLabel="Go back"
        pending={saving}
        onCancel={() => setConfirming(false)}
        onConfirm={save}
      />
    </>
  )
}
