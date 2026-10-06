// Checkout settings. The browser (cart drawer) and the server (api/checkout.js)
// both import this file, so the total a customer sees and the total Square
// charges come from the same numbers.
//
// SHIPPING_FEE comes from the dashboard's Pricing screen via the published
// snapshot, like the prices per item in flavors.js.

import CONTENT from './generated/content.js'

export const CURRENCY = 'USD'

/** Flat shipping per order, in dollars. 0 drops the shipping line entirely. */
export const SHIPPING_FEE = CONTENT.pricing.shippingFee

/** Most of one thing a single cart line can hold. The server enforces it too. */
export const MAX_LINE_QTY = 24

/** Most separate lines a cart can hold (every flavor as a square plus boxes). */
export const MAX_CART_LINES = 40

/**
 * The client ships November through April only: fudge and warm delivery trucks
 * don't mix. (Their Square store said Oct-April; they narrowed it to Nov 1 on
 * 2026-09-28.) Summer orders are possible but cost more to pack with ice, so
 * they are quoted by email rather than sold here. Outside the season the cart
 * still works and checkout is closed. Months are 1-12; the range wraps the
 * new year.
 */
export const SHIPPING_SEASON = { firstMonth: 11, lastMonth: 4 }

/** The business runs on California time, so the month flips on that clock. */
export const SHOP_TIME_ZONE = 'America/Los_Angeles'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/**
 * Whether checkout is open right now.
 *
 * `override` is the VITE_CHECKOUT_SEASON environment variable: 'open' or
 * 'closed' force the answer (a September test deploy, or pausing orders early
 * in a heat wave); anything else follows the calendar. The browser reads it at
 * build time and the server at request time -- the server's answer is the one
 * that counts.
 *
 * @returns {{ open: boolean, paused: boolean, reopens: string | null }}
 *   `paused` means closed by override rather than by season; `reopens` is a
 *   human date like "October 1" when the calendar is what closed it.
 */
export function checkoutSeason(now = new Date(), override) {
  const mode = String(override || '').trim().toLowerCase()
  if (mode === 'open') return { open: true, paused: false, reopens: null }
  if (mode === 'closed') return { open: false, paused: true, reopens: null }

  const month = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: SHOP_TIME_ZONE, month: 'numeric' }).format(now)
  )
  const { firstMonth, lastMonth } = SHIPPING_SEASON
  const open =
    firstMonth <= lastMonth
      ? month >= firstMonth && month <= lastMonth
      : month >= firstMonth || month <= lastMonth

  return {
    open,
    paused: false,
    reopens: open ? null : `${MONTHS[firstMonth - 1]} 1`,
  }
}

/** "October through April", for copy. */
export const SHIPPING_SEASON_LABEL = `${MONTHS[SHIPPING_SEASON.firstMonth - 1]} through ${
  MONTHS[SHIPPING_SEASON.lastMonth - 1]
}`
