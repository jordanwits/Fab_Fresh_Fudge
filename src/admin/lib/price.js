/**
 * Money in, money out.
 *
 * Prices are the one thing in this dashboard that decides what a customer is
 * actually charged, so parsing and validation live in one place and are used
 * twice: by the pricing screen for instant feedback, and by the adapter before
 * anything is stored. A real backend does the same check server-side — the copy
 * in the browser is a courtesy, never the guard.
 *
 * Values are plain dollars (7, 35, 12) to match src/data/flavors.js and
 * src/data/checkout.js, which is what the site reads today. The cart converts
 * to cents at the edge.
 */

const MAX = { squarePrice: 999, boxPrice: 9999, shippingFee: 999 }

/** "$7.00", " 7 ", "7.5" -> 7 | 7.5. Returns null for anything that isn't money. */
export function parsePrice(input) {
  if (typeof input === 'number') return Number.isFinite(input) ? input : null
  const cleaned = String(input ?? '').trim().replace(/^\$/, '').replace(/,/g, '')
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === '' || cleaned === '.') return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

/** 7 -> "7.00", for inputs and for print. */
export const formatPrice = (value) => (Number.isFinite(value) ? value.toFixed(2) : '')

/** Two decimals is as fine as money gets here; 7.005 is a typo, not a price. */
const tooPrecise = (value) => Math.round(value * 100) !== Number((value * 100).toFixed(4))

function checkOne(field, raw, { allowZero = false } = {}) {
  const value = parsePrice(raw)
  if (value === null) return 'Enter a number, like 7.00.'
  if (tooPrecise(value)) return 'Round to the nearest cent.'
  if (value < 0) return "A price can't be negative."
  if (!allowZero && value === 0) return 'Must be more than zero.'
  if (value > MAX[field]) return `That looks like a typo — the most is $${MAX[field]}.`
  return null
}

/**
 * @returns {{ [field: string]: string }} one message per bad field, empty when
 *   everything is spendable.
 */
export function validatePricing({ squarePrice, boxPrice, shippingFee }) {
  const errors = {}
  const square = checkOne('squarePrice', squarePrice)
  const box = checkOne('boxPrice', boxPrice)
  // Free shipping is a real choice, so zero is allowed here and nowhere else.
  const shipping = checkOne('shippingFee', shippingFee, { allowZero: true })
  if (square) errors.squarePrice = square
  if (box) errors.boxPrice = box
  if (shipping) errors.shippingFee = shipping
  return errors
}

/** The numbers the box deal implies, for the screen to show before saving. */
export function boxMath({ squarePrice, boxPrice, boxSize }) {
  const singles = squarePrice * boxSize
  const savings = singles - boxPrice
  return { singles, savings }
}
