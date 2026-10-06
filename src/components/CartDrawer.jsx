import { useEffect, useRef, useState } from 'react'
import Overlay from './Overlay.jsx'
import { flavorById } from '../data/flavors.js'
import { MAX_LINE_QTY, SHIPPING_SEASON_LABEL } from '../data/checkout.js'
import {
  BOX_NAME,
  cartTotals,
  flavorName,
  formatMoney,
  lineKey,
  linePriceCents,
  summarizeBox,
  unitPriceCents,
} from '../lib/cart.js'

const OFFLINE =
  "We couldn't reach checkout. Check your connection and try again."

function Thumb({ id }) {
  const flavor = flavorById(id)
  return flavor?.img ? (
    <img src={flavor.img} alt="" loading="lazy" style={{ '--focal': flavor.focal }} />
  ) : (
    <span className="cart-thumb-blank" />
  )
}

function Stepper({ name, qty, onChange }) {
  return (
    <div className="qty" role="group" aria-label={`Quantity of ${name}`}>
      <button
        type="button"
        onClick={() => onChange(qty - 1)}
        disabled={qty <= 1}
        aria-label={`One fewer ${name}`}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <span className="qty-value" aria-live="polite">
        {qty}
      </span>
      <button
        type="button"
        onClick={() => onChange(qty + 1)}
        disabled={qty >= MAX_LINE_QTY}
        aria-label={`One more ${name}`}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

function CartLine({ line, problem, onQty, onRemove }) {
  const isBox = line.type === 'box'
  const name = isBox ? BOX_NAME : flavorName(line.flavorId)
  const contents = isBox
    ? summarizeBox(line.flavors)
        .map(({ name: n, count }) => (count > 1 ? `${count}× ${n}` : n))
        .join(', ')
    : null

  return (
    <li className={`cart-line${problem ? ' has-problem' : ''}`}>
      <div className="cart-line-media" aria-hidden="true">
        {isBox ? (
          <span className="cart-box-grid">
            {line.flavors.map((id, i) => (
              <Thumb key={i} id={id} />
            ))}
          </span>
        ) : (
          <Thumb id={line.flavorId} />
        )}
      </div>

      <div className="cart-line-body">
        <div className="cart-line-head">
          <h3 className="cart-line-name">{name}</h3>
          <span className="cart-line-price">{formatMoney(linePriceCents(line))}</span>
        </div>
        <p className="cart-line-meta">
          {isBox ? contents : `¼ lb square · ${formatMoney(unitPriceCents(line))} each`}
          {isBox && line.qty > 1 && ` · ${formatMoney(unitPriceCents(line))} each`}
        </p>
        {problem && <p className="cart-line-problem">{problem.message}</p>}
        <div className="cart-line-actions">
          <Stepper name={name} qty={line.qty} onChange={onQty} />
          <button
            type="button"
            className="btn-text cart-remove"
            onClick={onRemove}
            aria-label={`Remove ${name}`}
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  )
}

export default function CartDrawer({ open, onClose, cart, season, onRequestQuote }) {
  const { lines, problems, setQty, removeLine } = cart
  const titleRef = useRef(null)
  const [status, setStatus] = useState({ state: 'idle' })
  // Problems the server found that this page didn't: the site was redeployed
  // with new stock while this tab sat open. Keyed like `problems`.
  const [serverProblems, setServerProblems] = useState([])

  // Any edit to the cart makes an old error or a server verdict stale.
  useEffect(() => {
    setStatus((s) => (s.state === 'loading' ? s : { state: 'idle' }))
    setServerProblems([])
  }, [lines])

  // Back button from Square's page restores this page from the bfcache with
  // the button still saying "Opening checkout". Reset it.
  useEffect(() => {
    const onShow = (e) => {
      if (e.persisted) setStatus({ state: 'idle' })
    }
    window.addEventListener('pageshow', onShow)
    return () => window.removeEventListener('pageshow', onShow)
  }, [])

  const allProblems = [...problems, ...serverProblems]
  const problemFor = (key) => allProblems.find((p) => p.key === key)
  const cartWideProblem = allProblems.find((p) => p.key === null)
  const blocked = allProblems.length > 0
  const loading = status.state === 'loading'
  const { subtotal, shipping, total } = cartTotals(lines)

  const remove = (key) => {
    removeLine(key)
    // The focused Remove button is about to disappear; keep focus in the drawer.
    titleRef.current?.focus()
  }

  const checkout = async () => {
    setStatus({ state: 'loading' })
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lines, expectedTotal: total }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.url) {
        // Leave the loading state up: the page is navigating away.
        window.location.assign(data.url)
        return
      }
      if (data.code === 'cart_problem' && Array.isArray(data.problems)) {
        setServerProblems(data.problems)
      }
      setStatus({
        state: 'error',
        message: data.message || OFFLINE,
        // The cart lives in localStorage, so a reload keeps it and shows the
        // prices the server just checked against.
        reload: data.code === 'prices_changed',
      })
    } catch {
      setStatus({ state: 'error', message: OFFLINE })
    }
  }

  return (
    <Overlay open={open} onClose={onClose} variant="drawer" labelledBy="cart-title">
      <div className="cart">
        <div className="cart-head">
          <h2 id="cart-title" tabIndex={-1} ref={titleRef}>
            Your cart
          </h2>
          <button type="button" className="cart-close" onClick={onClose} aria-label="Close cart">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path
                d="m3.5 3.5 9 9m0-9-9 9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="cart-empty">
            <p className="cart-empty-title">Your cart is empty.</p>
            <p>Pick a few squares from the flavor case, or build a six-pack box.</p>
            <div className="cart-empty-actions">
              <a className="btn btn-primary" href="#shop" onClick={onClose}>
                Browse flavors
              </a>
              <a className="btn btn-outline" href="#build-a-box" onClick={onClose}>
                Build a box
              </a>
            </div>
          </div>
        ) : (
          <>
            <div className="cart-body">
              <ul className="cart-lines">
                {lines.map((line) => {
                  const key = lineKey(line)
                  return (
                    <CartLine
                      key={key}
                      line={line}
                      problem={problemFor(key)}
                      onQty={(qty) => setQty(key, qty)}
                      onRemove={() => remove(key)}
                    />
                  )
                })}
              </ul>
            </div>

            <div className="cart-foot">
              <dl className="cart-totals">
                <div>
                  <dt>Subtotal</dt>
                  <dd>{formatMoney(subtotal)}</dd>
                </div>
                {shipping > 0 && (
                  <div>
                    <dt>Shipping</dt>
                    <dd>{formatMoney(shipping)}</dd>
                  </div>
                )}
                <div className="is-total">
                  <dt>Total</dt>
                  <dd>{formatMoney(total)}</dd>
                </div>
              </dl>

              {season.open ? (
                <>
                  {(status.state === 'error' || cartWideProblem) && (
                    <p className="cart-alert" role="alert">
                      {status.state === 'error' ? status.message : cartWideProblem.message}
                      {status.reload ? (
                        <>
                          {' '}
                          <button
                            type="button"
                            className="cart-alert-action"
                            onClick={() => window.location.reload()}
                          >
                            Refresh prices
                          </button>
                        </>
                      ) : null}
                    </p>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary btn-lg cart-checkout"
                    onClick={checkout}
                    disabled={blocked || loading}
                    aria-busy={loading}
                  >
                    {loading ? 'Opening secure checkout…' : 'Check out'}
                  </button>
                  <p className="cart-fineprint">
                    {blocked
                      ? 'Sort out the items marked above to check out.'
                      : "You'll pay on Square's secure checkout page. Cards, Apple Pay, Google Pay, and Cash App Pay accepted."}
                  </p>
                </>
              ) : (
                <div className="cart-season">
                  {season.paused ? (
                    <>
                      <strong>Online checkout is paused.</strong>
                      <p>We'll be taking orders again soon. Your cart is saved on this device.</p>
                    </>
                  ) : (
                    <>
                      <strong>Checkout reopens {season.reopens}.</strong>
                      <p>
                        Fudge and summer delivery trucks don't mix, so we only ship{' '}
                        {SHIPPING_SEASON_LABEL}. We can still send it packed with ice —
                        ask us for a quote, and your cart is saved here until then.
                      </p>
                    </>
                  )}
                  <div className="cart-season-actions">
                    <button type="button" className="btn btn-butter" onClick={onRequestQuote}>
                      Ask about summer shipping
                    </button>
                    <a href="#events" onClick={onClose}>
                      Find us at a show
                    </a>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Overlay>
  )
}
