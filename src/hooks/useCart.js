import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BOX_SIZE, flavorById } from '../data/flavors.js'
import { MAX_LINE_QTY } from '../data/checkout.js'
import { cartCount, findProblems, lineKey, parseLines } from '../lib/cart.js'

// Survives reloads, the trip out to Square and back, and a closed shipping
// season. Versioned so a future shape change can start clean instead of
// misreading old carts.
const STORAGE_KEY = 'fff-cart/v1'

function load() {
  try {
    return parseLines(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).lines
  } catch {
    return []
  }
}

function save(lines) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
  } catch {
    // Private mode or a full quota: the cart still works for this visit.
  }
}

const inStock = (id) => {
  const flavor = flavorById(id)
  return Boolean(flavor) && !flavor.soldOut
}

/** Adds a line, stacking onto an identical one and never past MAX_LINE_QTY. */
function addLine(prev, line) {
  const key = lineKey(line)
  const existing = prev.find((l) => lineKey(l) === key)
  if (!existing) return [...prev, line]
  return prev.map((l) =>
    l === existing ? { ...l, qty: Math.min(MAX_LINE_QTY, l.qty + line.qty) } : l
  )
}

export function useCart() {
  const [lines, setLines] = useState(load)
  const linesRef = useRef(lines)
  linesRef.current = lines

  useEffect(() => save(lines), [lines])

  // Another tab changed the cart: follow it, so checking out in one tab and
  // coming back to the other doesn't resurrect a paid-for cart.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setLines(load())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  /** @returns {boolean} whether the square went in */
  const addSquare = useCallback((flavorId) => {
    if (!inStock(flavorId)) return false
    const existing = linesRef.current.find((l) => lineKey(l) === `square:${flavorId}`)
    if (existing && existing.qty >= MAX_LINE_QTY) return false
    setLines((prev) => addLine(prev, { type: 'square', flavorId, qty: 1 }))
    return true
  }, [])

  /** @returns {boolean} whether the box went in */
  const addBox = useCallback((flavorIds) => {
    if (flavorIds.length !== BOX_SIZE || !flavorIds.every(inStock)) return false
    setLines((prev) => addLine(prev, { type: 'box', flavors: [...flavorIds], qty: 1 }))
    return true
  }, [])

  const setQty = useCallback((key, qty) => {
    const next = Math.max(1, Math.min(MAX_LINE_QTY, Math.round(qty)))
    setLines((prev) => prev.map((l) => (lineKey(l) === key ? { ...l, qty: next } : l)))
  }, [])

  const removeLine = useCallback((key) => {
    setLines((prev) => prev.filter((l) => lineKey(l) !== key))
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const count = useMemo(() => cartCount(lines), [lines])
  const problems = useMemo(() => findProblems(lines), [lines])

  return { lines, count, problems, addSquare, addBox, setQty, removeLine, clear }
}
