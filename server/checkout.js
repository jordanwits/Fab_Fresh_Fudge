/**
 * Checkout: turns a cart into a Square payment link and returns its URL.
 *
 * Written against the web-standard Request/Response, so it doesn't care where
 * it runs. Two places call it:
 *   - api/checkout.js            the Vercel function in production
 *   - vite.config.js (dev only)  so `npm run dev` checks out against Sandbox
 *
 * The browser sends flavor ids and quantities, nothing else. Prices, stock,
 * shipping and the season are all decided here from the same modules the site
 * renders, so a doctored request can't change what gets charged.
 *
 * Environment:
 *   SQUARE_ACCESS_TOKEN    secret; never expose it to the browser
 *   SQUARE_LOCATION_ID     the location orders are filed under
 *   SQUARE_ENVIRONMENT     'production' or 'sandbox' (anything else = sandbox)
 *   VITE_CHECKOUT_SEASON   optional 'open' | 'closed' override, see src/data/checkout.js
 */

import { CURRENCY, SHIPPING_SEASON_LABEL, checkoutSeason } from '../src/data/checkout.js'
import {
  BOX_NAME,
  cartTotals,
  findProblems,
  flavorName,
  parseLines,
  summarizeBox,
  unitPriceCents,
} from '../src/lib/cart.js'

/** Pinned so a Square release can't change behavior underneath a live store. */
export const SQUARE_VERSION = '2026-08-19'

const SQUARE_HOSTS = {
  production: 'https://connect.squareup.com',
  sandbox: 'https://connect.squareupsandbox.com',
}

const MAX_BODY_CHARS = 16_000
const SQUARE_TIMEOUT_MS = 15_000

/** Where Square sends the buyer after paying. App.jsx watches for it. */
export const ORDER_PLACED_PATH = '/?order=placed'

const money = (amount) => ({ amount, currency: CURRENCY })

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

const MALFORMED = {
  code: 'bad_request',
  message: "Something in your cart didn't come through right. Refresh the page and try again.",
}

const UNAVAILABLE = {
  code: 'checkout_unavailable',
  message: "We couldn't open checkout just now. Please try again in a minute.",
}

function toLineItem(line) {
  const priced = {
    quantity: String(line.qty),
    base_price_money: money(unitPriceCents(line)),
  }

  if (line.type === 'square') {
    // Same naming as the client's existing Square items, so online orders read
    // like the ones they already fill.
    return { name: `1/4 lb square - ${flavorName(line.flavorId)}`, ...priced }
  }

  // The flavors ride along as free modifiers, one per flavor with its count in
  // the name. Modifiers print under the item on the order, the receipt and the
  // packing ticket; ASCII "x" because receipt printers mangle "×".
  return {
    name: BOX_NAME,
    ...priced,
    modifiers: summarizeBox(line.flavors).map(({ name, count }) => ({
      name: `${count} x ${name}`,
      base_price_money: money(0),
    })),
  }
}

/** The CreatePaymentLink request body. Exported so it can be inspected in tests. */
export function buildPaymentLinkRequest(lines, { locationId, redirectUrl, idempotencyKey }) {
  const { shipping } = cartTotals(lines)

  return {
    idempotency_key: idempotencyKey,
    order: {
      location_id: locationId,
      line_items: lines.map(toLineItem),
    },
    checkout_options: {
      redirect_url: redirectUrl,
      ask_for_shipping_address: true,
      allow_tipping: false,
      accepted_payment_methods: {
        apple_pay: true,
        google_pay: true,
        cash_app_pay: true,
        afterpay_clearpay: false,
      },
      ...(shipping > 0 && { shipping_fee: { name: 'Shipping', charge: money(shipping) } }),
    },
    payment_note: 'Online order from the website',
  }
}

function readConfig(env) {
  const token = env.SQUARE_ACCESS_TOKEN?.trim()
  const locationId = env.SQUARE_LOCATION_ID?.trim()
  if (!token || !locationId) return null
  const environment =
    env.SQUARE_ENVIRONMENT?.trim().toLowerCase() === 'production' ? 'production' : 'sandbox'
  return { token, locationId, environment, host: SQUARE_HOSTS[environment] }
}

export async function handleCheckout(request, env = {}) {
  if (request.method !== 'POST') {
    return json(405, { code: 'method_not_allowed', message: 'Checkout only accepts POST.' })
  }

  const season = checkoutSeason(new Date(), env.VITE_CHECKOUT_SEASON)
  if (!season.open) {
    return json(409, {
      code: 'season_closed',
      message: season.reopens
        ? `We only ship ${SHIPPING_SEASON_LABEL}. Online checkout reopens ${season.reopens}.`
        : 'Online checkout is paused right now.',
    })
  }

  let body
  try {
    const text = await request.text()
    if (text.length > MAX_BODY_CHARS) return json(413, MALFORMED)
    body = JSON.parse(text)
  } catch {
    return json(400, MALFORMED)
  }

  const { lines, rejected } = parseLines(body?.lines)
  if (rejected > 0 || lines.length === 0) return json(400, MALFORMED)

  const problems = findProblems(lines)
  if (problems.length > 0) {
    return json(409, { code: 'cart_problem', message: problems[0].message, problems })
  }

  const config = readConfig(env)
  if (!config) {
    console.error('[checkout] SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID must both be set.')
    return json(503, UNAVAILABLE)
  }

  const payload = buildPaymentLinkRequest(lines, {
    locationId: config.locationId,
    redirectUrl: new URL(ORDER_PLACED_PATH, new URL(request.url).origin).href,
    idempotencyKey: crypto.randomUUID(),
  })

  let response
  try {
    response = await fetch(`${config.host}/v2/online-checkout/payment-links`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.token}`,
        'content-type': 'application/json',
        'square-version': SQUARE_VERSION,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(SQUARE_TIMEOUT_MS),
    })
  } catch (err) {
    console.error(`[checkout] Could not reach Square (${config.environment}):`, err)
    return json(502, UNAVAILABLE)
  }

  const data = await response.json().catch(() => null)
  const url = data?.payment_link?.url
  if (!response.ok || !url) {
    // Square's errors name the exact field at fault; they belong in the
    // function log, not in front of a customer.
    console.error(
      `[checkout] Square (${config.environment}) refused the payment link: HTTP ${response.status}`,
      JSON.stringify(data?.errors ?? data)
    )
    return json(502, UNAVAILABLE)
  }

  return json(200, { url })
}
