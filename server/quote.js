/**
 * Summer shipping quote requests.
 *
 * The shop only sells online November through April, because fudge and warm
 * delivery trucks don't mix. Out of season they will still ship, but it needs
 * ice packs and costs more, so those orders are quoted by hand. This endpoint
 * takes the form on the site and emails it to the shop through Web3Forms.
 *
 * Same shape as server/checkout.js: web-standard Request in, Response out, so
 * api/quote.js on Vercel and the dev plugin in vite.config.js can both use it.
 *
 * Environment:
 *   WEB3FORMS_ACCESS_KEY   the shop's Web3Forms key, tied to the inbox that
 *                          receives these. Web3Forms calls this key public and
 *                          safe in a browser, but it is kept server-side here
 *                          so it can't be scraped out of the bundle and used
 *                          to spam the shop's inbox.
 */

import { cartTotals, flavorName, formatMoney, parseLines, summarizeBox } from '../src/lib/cart.js'

const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit'
const MAX_BODY_CHARS = 8_000
const TIMEOUT_MS = 15_000

const LIMITS = { name: 100, email: 200, place: 160, notes: 2000 }

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

const MALFORMED = {
  code: 'bad_request',
  message: "That didn't come through right. Refresh the page and try again.",
}

const UNAVAILABLE = {
  code: 'send_failed',
  message: "We couldn't send that just now.",
}

const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

// Deliberately loose: the address only has to be something the shop can reply
// to, and over-strict patterns reject real addresses.
const looksLikeEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

/** The cart, written out for a human reading their email. */
function describeCart(lines) {
  if (lines.length === 0) return 'Nothing in their cart yet.'

  const rows = lines.map((line) => {
    if (line.type === 'square') {
      return `  ${line.qty} x 1/4 lb square - ${flavorName(line.flavorId)}`
    }
    const inside = summarizeBox(line.flavors)
      .map(({ name, count }) => (count > 1 ? `${count} x ${name}` : name))
      .join(', ')
    return `  ${line.qty} x Six-Pack Box (${inside})`
  })

  const { subtotal } = cartTotals(lines)
  rows.push(`  Fudge subtotal: ${formatMoney(subtotal)} (shipping still to be quoted)`)
  return rows.join('\n')
}

export function buildMessage({ name, email, place, notes, lines }) {
  return [
    'Summer shipping quote request from the website.',
    '',
    `Name:  ${name}`,
    `Email: ${email}`,
    `Shipping to: ${place}`,
    '',
    'What they picked:',
    describeCart(lines),
    '',
    'Notes:',
    notes || '  (none)',
  ].join('\n')
}

export async function handleQuote(request, env = {}) {
  if (request.method !== 'POST') {
    return json(405, { code: 'method_not_allowed', message: 'Quote requests only accept POST.' })
  }

  let body
  try {
    const raw = await request.text()
    if (raw.length > MAX_BODY_CHARS) return json(413, MALFORMED)
    body = JSON.parse(raw)
  } catch {
    return json(400, MALFORMED)
  }

  // Honeypot: a real person never sees this field. Answer as though it worked,
  // so a bot gets no signal about what gave it away.
  if (body?.botcheck) return json(200, { ok: true })

  const name = text(body?.name, LIMITS.name)
  const email = text(body?.email, LIMITS.email)
  const place = text(body?.place, LIMITS.place)
  const notes = text(body?.notes, LIMITS.notes)

  const missing = []
  if (!name) missing.push('name')
  if (!looksLikeEmail(email)) missing.push('email')
  if (!place) missing.push('place')
  if (missing.length > 0) {
    return json(422, {
      code: 'invalid',
      fields: missing,
      message: 'Please fill in your name, a valid email, and where it is going.',
    })
  }

  const { lines } = parseLines(body?.lines)

  const key = env.WEB3FORMS_ACCESS_KEY?.trim()
  if (!key) {
    console.error('[quote] WEB3FORMS_ACCESS_KEY is not set.')
    return json(503, {
      code: 'not_configured',
      message: 'The quote form is not switched on yet.',
    })
  }

  let response
  try {
    response = await fetch(WEB3FORMS_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        access_key: key,
        subject: `Summer shipping quote — ${name}`,
        from_name: 'Fab Fresh Fudge website',
        name,
        email,
        replyto: email,
        message: buildMessage({ name, email, place, notes, lines }),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (err) {
    console.error('[quote] Could not reach Web3Forms:', err)
    return json(502, UNAVAILABLE)
  }

  const data = await response.json().catch(() => null)
  if (!response.ok || data?.success !== true) {
    console.error(`[quote] Web3Forms refused the message: HTTP ${response.status}`, JSON.stringify(data))
    return json(502, UNAVAILABLE)
  }

  return json(200, { ok: true })
}
