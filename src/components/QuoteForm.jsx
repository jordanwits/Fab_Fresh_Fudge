import { useEffect, useState } from 'react'
import Overlay from './Overlay.jsx'
import { CONTACT } from '../data/site.js'
import { SHIPPING_SEASON_LABEL } from '../data/checkout.js'
import { cartTotals, flavorName, formatMoney, summarizeBox } from '../lib/cart.js'

// Out of season the shop still ships, but it needs ice packs and costs more,
// so those orders are priced by hand. This collects enough for them to answer
// with a number: who, where, and what they were about to buy.

const EMPTY = { name: '', email: '', place: '', notes: '', botcheck: false }

const describeLine = (line) =>
  line.type === 'square'
    ? `${line.qty} x ${flavorName(line.flavorId)} square`
    : `${line.qty} x Six-Pack Box (${summarizeBox(line.flavors)
        .map(({ name, count }) => (count > 1 ? `${count} x ${name}` : name))
        .join(', ')})`

/** Last resort if the form can't send: their own email app, already written. */
function mailtoFallback(form, lines) {
  const body = [
    `Name: ${form.name}`,
    `Shipping to: ${form.place}`,
    '',
    lines.length > 0 ? 'What I picked:' : '',
    ...lines.map((line) => `  ${describeLine(line)}`),
    lines.length > 0 ? `  Subtotal: ${formatMoney(cartTotals(lines).subtotal)}` : '',
    '',
    form.notes,
  ]
    .filter((row) => row !== '')
    .join('\n')

  return `mailto:${CONTACT.email}?subject=${encodeURIComponent(
    'Summer shipping quote'
  )}&body=${encodeURIComponent(body)}`
}

export default function QuoteForm({ open, onClose, lines = [] }) {
  const [form, setForm] = useState(EMPTY)
  const [status, setStatus] = useState({ state: 'idle' })

  // This component stays mounted so the overlay can animate out, which means
  // its state would otherwise still be here next time — reopening on the
  // "thanks" panel, with the last person's details still typed in.
  useEffect(() => {
    if (!open) return
    setForm(EMPTY)
    setStatus({ state: 'idle' })
  }, [open])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const invalid = (field) => status.state === 'error' && status.fields?.includes(field)

  const submit = async (e) => {
    e.preventDefault()
    setStatus({ state: 'sending' })
    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, lines }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        setStatus({ state: 'sent' })
        return
      }
      setStatus({
        state: 'error',
        message: data.message || "We couldn't send that just now.",
        fields: data.fields,
        // Anything but a validation slip means the form itself is the problem,
        // so offer the email address instead of asking them to retry forever.
        offerEmail: data.code !== 'invalid',
      })
    } catch {
      setStatus({
        state: 'error',
        message: "We couldn't reach us just now. Check your connection, or email us directly.",
        offerEmail: true,
      })
    }
  }

  const sending = status.state === 'sending'

  return (
    <Overlay open={open} onClose={onClose} variant="center" labelledBy="quote-title">
      <div className="quote">
        <button type="button" className="quote-close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="m3.5 3.5 9 9m0-9-9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {status.state === 'sent' ? (
          <div className="quote-done">
            <h2 id="quote-title">Thanks. That's on its way.</h2>
            <p>
              We'll work out what it costs to ship your fudge cold and email you a quote,
              usually within a day or two.
            </p>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Back to the fudge
            </button>
          </div>
        ) : (
          <form className="quote-form" onSubmit={submit}>
            <h2 id="quote-title">Summer shipping quote</h2>
            <p className="quote-lede">
              We ship {SHIPPING_SEASON_LABEL}, when fudge travels well. The rest of the year
              we can still send it packed with ice, so tell us where it's going and we'll
              email you a price.
            </p>

            {lines.length > 0 && (
              <div className="quote-cart">
                <h3>What you picked</h3>
                <ul>
                  {lines.map((line, i) => (
                    <li key={i}>{describeLine(line)}</li>
                  ))}
                </ul>
                <p>Fudge subtotal {formatMoney(cartTotals(lines).subtotal)}, shipping to be quoted.</p>
              </div>
            )}

            <div className="field">
              <label htmlFor="quote-name">Your name</label>
              <input
                id="quote-name"
                name="name"
                value={form.name}
                onChange={set('name')}
                autoComplete="name"
                aria-invalid={invalid('name') || undefined}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="quote-email">Email</label>
              <input
                id="quote-email"
                name="email"
                type="email"
                value={form.email}
                onChange={set('email')}
                autoComplete="email"
                aria-invalid={invalid('email') || undefined}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="quote-place">Where is it going?</label>
              <input
                id="quote-place"
                name="place"
                value={form.place}
                onChange={set('place')}
                placeholder="City and state, or ZIP"
                autoComplete="postal-code"
                aria-invalid={invalid('place') || undefined}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="quote-notes">
                Anything else? <span>(optional)</span>
              </label>
              <textarea
                id="quote-notes"
                name="notes"
                rows="3"
                value={form.notes}
                onChange={set('notes')}
                placeholder="When you need it, flavors you're after, a gift note…"
              />
            </div>

            {/* Honeypot: hidden from people, catnip for bots. */}
            <input
              type="checkbox"
              name="botcheck"
              className="visually-hidden"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              checked={form.botcheck}
              onChange={(e) => setForm((f) => ({ ...f, botcheck: e.target.checked }))}
            />

            {status.state === 'error' && (
              <p className="quote-alert" role="alert">
                {status.message}
                {status.offerEmail && (
                  <>
                    {' '}
                    <a href={mailtoFallback(form, lines)}>Email us instead</a>.
                  </>
                )}
              </p>
            )}

            <div className="quote-actions">
              <button type="submit" className="btn btn-primary" disabled={sending} aria-busy={sending}>
                {sending ? 'Sending…' : 'Ask for a quote'}
              </button>
              <p>We only use this to answer you.</p>
            </div>
          </form>
        )}
      </div>
    </Overlay>
  )
}
