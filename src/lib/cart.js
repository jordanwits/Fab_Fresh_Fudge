// The cart, as plain data and pure functions. No React, no DOM, no fetch: the
// cart drawer uses this to show totals and flag problems, and the checkout
// function on the server imports the very same file to re-check the cart
// before anything reaches Square. The browser never sends a price.
//
// A cart is an array of lines:
//   { type: 'square', flavorId, qty }            one flavor, sold by the square
//   { type: 'box', flavors: [six ids], qty }     a finished Build-a-Box
//
// Two boxes holding the same six flavors are the same product whatever order
// the slots were filled in, so they share a key and stack into one line.

import { BOX_PRICE, BOX_SIZE, SQUARE_PRICE, flavorById } from '../data/flavors.js'
import { MAX_CART_LINES, MAX_LINE_QTY, SHIPPING_FEE } from '../data/checkout.js'

export const BOX_NAME = 'Six-Pack Box'

export const toCents = (dollars) => Math.round(dollars * 100)

export const formatMoney = (cents) => `$${(cents / 100).toFixed(2)}`

export function lineKey(line) {
  return line.type === 'box'
    ? `box:${[...line.flavors].sort().join('+')}`
    : `square:${line.flavorId}`
}

export const lineFlavorIds = (line) => (line.type === 'box' ? line.flavors : [line.flavorId])

export const unitPriceCents = (line) => toCents(line.type === 'box' ? BOX_PRICE : SQUARE_PRICE)

export const linePriceCents = (line) => unitPriceCents(line) * line.qty

/** Boxes count once each, so "3 items" means three things in the bag. */
export const cartCount = (lines) => lines.reduce((n, line) => n + line.qty, 0)

export function cartTotals(lines) {
  const subtotal = lines.reduce((sum, line) => sum + linePriceCents(line), 0)
  const shipping = lines.length > 0 ? toCents(SHIPPING_FEE) : 0
  return { subtotal, shipping, total: subtotal + shipping }
}

/**
 * A box's contents grouped by flavor, in the order the slots were first
 * filled: ['chocolate', 'rocky-road', 'chocolate'] -> chocolate x2, rocky-road x1.
 */
export function summarizeBox(flavorIds) {
  const counts = new Map()
  for (const id of flavorIds) counts.set(id, (counts.get(id) || 0) + 1)
  return [...counts].map(([id, count]) => ({ id, count, name: flavorName(id) }))
}

export const flavorName = (id) => flavorById(id)?.name ?? 'Retired flavor'

/** "Salted Caramel", "A and B", "A, B, and C" */
export function listNames(names) {
  if (names.length <= 2) return names.join(' and ')
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

// ---------------------------------------------------------------------------
// Untrusted input: localStorage on the way in, the request body on the server
// ---------------------------------------------------------------------------

const isFlavorId = (value) => typeof value === 'string' && /^[a-z0-9-]{1,80}$/.test(value)

function parseLine(item) {
  if (!item || typeof item !== 'object') return null
  const { qty } = item
  if (!Number.isInteger(qty) || qty < 1) return null

  if (item.type === 'square' && isFlavorId(item.flavorId)) {
    return { type: 'square', flavorId: item.flavorId, qty }
  }
  if (
    item.type === 'box' &&
    Array.isArray(item.flavors) &&
    item.flavors.length === BOX_SIZE &&
    item.flavors.every(isFlavorId)
  ) {
    return { type: 'box', flavors: [...item.flavors], qty }
  }
  return null
}

/**
 * Structural check only: keeps well-formed lines, merges duplicates, and counts
 * what it had to throw away. Whether the flavors exist or are in stock is
 * `findProblems`' job, so a line that has gone sold out survives parsing and
 * can be shown to the customer instead of silently vanishing.
 *
 * @returns {{ lines: object[], rejected: number }}
 */
export function parseLines(raw) {
  if (!Array.isArray(raw)) return { lines: [], rejected: raw == null ? 0 : 1 }

  const byKey = new Map()
  let rejected = 0
  for (const item of raw) {
    const line = parseLine(item)
    if (!line) {
      rejected += 1
      continue
    }
    const key = lineKey(line)
    const existing = byKey.get(key)
    if (existing) existing.qty += line.qty
    else byKey.set(key, line)
  }
  return { lines: [...byKey.values()], rejected }
}

/**
 * Everything that stops a structurally valid cart from being bought, one entry
 * per affected line. An empty array means the cart can go to checkout.
 *
 * @returns {{ key: string|null, code: string, message: string, flavorIds?: string[] }[]}
 */
export function findProblems(lines) {
  const problems = []

  if (lines.length > MAX_CART_LINES) {
    problems.push({
      key: null,
      code: 'too_many_lines',
      message: `Online orders can hold up to ${MAX_CART_LINES} different items. For bigger orders, email us.`,
    })
  }

  for (const line of lines) {
    const key = lineKey(line)
    const ids = [...new Set(lineFlavorIds(line))]

    const retired = ids.filter((id) => !flavorById(id))
    if (retired.length > 0) {
      problems.push({
        key,
        code: 'unavailable',
        flavorIds: retired,
        message: 'A flavor in here is no longer on the menu. Remove it to check out.',
      })
      continue
    }

    const soldOut = ids.filter((id) => flavorById(id).soldOut)
    if (soldOut.length > 0) {
      const names = listNames(soldOut.map(flavorName))
      problems.push({
        key,
        code: 'sold_out',
        flavorIds: soldOut,
        message: `${names} ${soldOut.length > 1 ? 'have' : 'has'} sold out. Remove ${
          line.type === 'box' ? 'this box' : 'it'
        } to check out.`,
      })
      continue
    }

    if (line.qty > MAX_LINE_QTY) {
      problems.push({
        key,
        code: 'too_many',
        message: `Online orders take up to ${MAX_LINE_QTY} of one item. For bigger orders, email us.`,
      })
    }
  }

  return problems
}
