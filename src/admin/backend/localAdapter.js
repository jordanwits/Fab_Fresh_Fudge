/**
 * Mock backend: satisfies the contract in adapter.js against localStorage,
 * seeded from the real catalog in src/data/. It exists so the dashboard can be
 * demoed end to end — add a flavor, refresh, it's still there — before the
 * Firebase/Supabase decision is made.
 *
 * Deliberately imperfect on purpose: it takes a beat to respond and it can
 * fail, so every loading and error state in the UI is a real code path rather
 * than something that only exists in theory.
 *
 * NOT SECURITY. Sign-in compares strings in the browser. See adapter.js.
 */

import { AuthError, DataError } from './errors.js'
import { PHOTO_LIBRARY, seedData } from './seed.js'
import { randomId } from '../lib/slug.js'
import { parsePrice, validatePricing } from '../lib/price.js'
import { byDate } from '../lib/eventDate.js'
import {
  downscaleToDataURL,
  isSupportedImage,
  MAX_UPLOAD_BYTES,
  formatBytes,
} from '../lib/image.js'

const KEY = 'fff-admin/v1'

/** Demo sign-in. A real adapter deletes this and defers to the auth provider. */
const DEMO_USER = {
  email: 'owner@fabfreshfudge.com',
  password: 'fudge2026',
  name: 'Ragle Family',
}

// ---------------------------------------------------------------------------
// store
// ---------------------------------------------------------------------------

const clone = (value) => JSON.parse(JSON.stringify(value))

const seed = () => ({ ...seedData(), session: null })

let store = null

function load() {
  if (store) return store
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // Guard against a half-written or hand-edited blob rather than crashing
      // the whole dashboard on boot.
      if (Array.isArray(parsed?.flavors) && Array.isArray(parsed?.events)) {
        store = parsed
        // A blob written before a collection existed is valid, just short one
        // key. Backfill from the seed rather than discarding the client's real
        // edits -- or worse, handing a screen an undefined array to push onto.
        const missing = ['flavors', 'events', 'packages'].filter(
          (key) => !Array.isArray(store[key])
        )
        // `pricing` is an object rather than a collection, so it needs its own
        // check -- Array.isArray would call a perfectly good record missing.
        if (!store.pricing || typeof store.pricing !== 'object') missing.push('pricing')
        if (missing.length) {
          const fresh = seed()
          missing.forEach((key) => {
            store[key] = fresh[key]
          })
          save()
        }
        return store
      }
    }
  } catch {
    /* private mode, disabled storage, or corrupt JSON — fall through to seed */
  }
  store = seed()
  save()
  return store
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch (err) {
    if (err?.name === 'QuotaExceededError' || err?.code === 22) {
      throw new DataError(
        'Browser storage is full. Remove an uploaded photo, or use "Reset to sample data" in the sidebar.'
      )
    }
    // Storage unavailable (private mode): the session still works in memory.
  }
}

/** Latency, so skeletons and pending buttons are real code paths. */
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const read = () => delay(160 + Math.random() * 140)
const write = () => delay(280 + Math.random() * 200)

// ---------------------------------------------------------------------------
// adapter
// ---------------------------------------------------------------------------

export const localAdapter = {
  label: 'Sample data',
  isMock: true,
  feedsSite: false,

  auth: {
    async getSession() {
      await delay(120)
      return clone(load().session)
    },

    async signIn({ email, password }) {
      await write()
      const match =
        String(email).trim().toLowerCase() === DEMO_USER.email &&
        password === DEMO_USER.password
      if (!match) {
        throw new AuthError("That email and password don't match an account.")
      }
      load().session = { user: { email: DEMO_USER.email, name: DEMO_USER.name } }
      save()
      return clone(store.session)
    },

    async signOut() {
      await delay(150)
      load().session = null
      save()
    },
  },

  flavors: {
    async list() {
      await read()
      return clone(load().flavors)
    },

    async create(draft) {
      await write()
      const db = load()
      if (db.flavors.some((f) => f.id === draft.id)) {
        throw new DataError(`A flavor with the id "${draft.id}" already exists.`)
      }
      const record = clone(draft)
      db.flavors.push(record)
      save()
      return clone(record)
    },

    async update(id, patch) {
      await write()
      const db = load()
      const index = db.flavors.findIndex((f) => f.id === id)
      if (index === -1) throw new DataError('That flavor no longer exists.')
      db.flavors[index] = { ...db.flavors[index], ...clone(patch), id }
      save()
      return clone(db.flavors[index])
    },

    async remove(id) {
      await write()
      const db = load()
      db.flavors = db.flavors.filter((f) => f.id !== id)
      save()
    },

    async reorder(orderedIds) {
      await delay(120)
      const db = load()
      const byId = new Map(db.flavors.map((f) => [f.id, f]))
      // Anything the caller didn't mention keeps its place at the end, so a
      // stale id list can never silently drop a flavor.
      const next = orderedIds.map((id) => byId.get(id)).filter(Boolean)
      const seen = new Set(next.map((f) => f.id))
      db.flavors = [...next, ...db.flavors.filter((f) => !seen.has(f.id))]
      save()
      return clone(db.flavors)
    },
  },

  events: {
    async list() {
      await read()
      return clone(load().events).sort(byDate)
    },

    async create(draft) {
      await write()
      const db = load()
      const record = { ...clone(draft), id: randomId('evt') }
      db.events.push(record)
      save()
      return clone(record)
    },

    async update(id, patch) {
      await write()
      const db = load()
      const index = db.events.findIndex((e) => e.id === id)
      if (index === -1) throw new DataError('That show no longer exists.')
      db.events[index] = { ...db.events[index], ...clone(patch), id }
      save()
      return clone(db.events[index])
    },

    async remove(id) {
      await write()
      const db = load()
      db.events = db.events.filter((e) => e.id !== id)
      save()
    },
  },

  /**
   * Corporate gift tiers. Plain records with no derived fields and no id the
   * public site keys off -- the site renders them in array order, so order is
   * the only thing here that carries meaning beyond the text itself.
   */
  packages: {
    async list() {
      await read()
      return clone(load().packages)
    },

    async create(draft) {
      await write()
      const db = load()
      const record = { ...clone(draft), id: randomId('pkg') }
      db.packages.push(record)
      save()
      return clone(record)
    },

    async update(id, patch) {
      await write()
      const db = load()
      const index = db.packages.findIndex((p) => p.id === id)
      if (index === -1) throw new DataError('That package no longer exists.')
      db.packages[index] = { ...db.packages[index], ...clone(patch), id }
      save()
      return clone(db.packages[index])
    },

    async remove(id) {
      await write()
      const db = load()
      db.packages = db.packages.filter((p) => p.id !== id)
      save()
    },

    async reorder(orderedIds) {
      await delay(120)
      const db = load()
      const byId = new Map(db.packages.map((p) => [p.id, p]))
      const next = orderedIds.map((id) => byId.get(id)).filter(Boolean)
      const seen = new Set(next.map((p) => p.id))
      db.packages = [...next, ...db.packages.filter((p) => !seen.has(p.id))]
      save()
      return clone(db.packages)
    },
  },

  /**
   * What things cost. One record, not a collection: every square is the same
   * price and the box deal is one number, which is how the client sells it.
   *
   * Validated here as well as in the screen, because this stands in for a
   * server: a price that reaches storage decides what a customer is charged,
   * and "the form checked it" is not a guarantee anyone should rely on.
   */
  pricing: {
    async get() {
      await read()
      return clone(load().pricing)
    },

    async update(patch) {
      await write()
      const db = load()
      const next = { ...db.pricing, ...clone(patch) }
      const errors = validatePricing(next)
      const first = Object.values(errors)[0]
      if (first) throw new DataError(first)

      db.pricing = {
        squarePrice: parsePrice(next.squarePrice),
        boxPrice: parsePrice(next.boxPrice),
        shippingFee: parsePrice(next.shippingFee),
      }
      save()
      return clone(db.pricing)
    },
  },

  media: {
    async library() {
      await delay(120)
      return [...PHOTO_LIBRARY]
    },

    async upload(file) {
      if (!isSupportedImage(file)) {
        throw new DataError('Pick a JPG, PNG, WebP, or AVIF image.')
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new DataError(
          `That photo is ${formatBytes(file.size)}. Keep it under ${formatBytes(MAX_UPLOAD_BYTES)}.`
        )
      }
      const { url } = await downscaleToDataURL(file)
      await delay(200)
      return { url }
    },
  },

  dev: {
    async reset() {
      await write()
      const session = load().session
      store = seed()
      store.session = session // don't sign the user out from under themselves
      save()
    },
  },
}
