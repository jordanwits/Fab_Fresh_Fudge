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

import { FLAVORS } from '../../data/flavors.js'
import { EVENTS } from '../../data/site.js'
import { AuthError, DataError } from './errors.js'
import { randomId } from '../lib/slug.js'
import { toDateChip, byDate } from '../lib/eventDate.js'
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

/**
 * Photos already committed to public/images/flavors/. A real adapter replaces
 * this with a storage-bucket listing; until then it is the "choose from what we
 * already have" half of the image field. Newest reshoot first.
 */
const LIBRARY = [
  ...[
    'butterfinger',
    'chocolate',
    'chocolate-walnut',
    'cookies-cream',
    'lemon-cream',
    'mint-chocolate',
    'peanut-butter-chocolate',
    'penuchi-pecan',
    'rocky-road',
    'vanilla-toffee',
  ].map((n) => `/images/flavors/FlavorImages/${n}.jpg`),
  '/images/flavors/FlavorImages/Orange%20Cream.jpg',
  ...[
    'caramel-macchiato',
    'chocolate-toffee',
    'chocolate-walnut',
    'chocolate',
    'coffee-cream',
    'cookies-cream',
    'dark-chocolate-raspberry',
    'dark-chocolate',
    'lemon-cream',
    'lemon-dark-chocolate',
    'mint-chocolate',
    'mint-mocha',
    'peanut-butter-chocolate',
    'peanut-butter',
    'penuchi-pecan',
    'rocky-road',
    'salted-caramel',
    'smores',
    'vanilla-toffee',
  ].map((n) => `/images/flavors/${n}.jpeg`),
]

/**
 * The four events in site.js carry a month and day but no year, and the site
 * renders them under "Upcoming shows" — so the year that reading implies is the
 * next one they fall in. 2027 here; the client replaces all of it with their
 * real schedule anyway.
 */
const EVENT_YEAR = 2027
const EVENT_SEED_DATES = [
  { startDate: `${EVENT_YEAR}-06-20`, endDate: `${EVENT_YEAR}-06-21` },
  { startDate: `${EVENT_YEAR}-07-04`, endDate: '' },
  { startDate: `${EVENT_YEAR}-07-18`, endDate: `${EVENT_YEAR}-07-19` },
  { startDate: `${EVENT_YEAR}-08-08`, endDate: `${EVENT_YEAR}-08-10` },
]

// ---------------------------------------------------------------------------
// store
// ---------------------------------------------------------------------------

const clone = (value) => JSON.parse(JSON.stringify(value))

function seed() {
  return {
    flavors: FLAVORS.map((f) => ({
      focal: '50% 50%',
      note: '',
      popular: false,
      isNew: false,
      soldOut: false,
      ...clone(f),
    })),
    events: EVENTS.map((e, i) => {
      const dates = EVENT_SEED_DATES[i] || { startDate: '', endDate: '' }
      return {
        id: randomId('evt'),
        name: e.name,
        place: e.place,
        detail: e.detail,
        tag: 'Free samples',
        ...dates,
        ...toDateChip(dates.startDate, dates.endDate),
      }
    }),
    session: null,
  }
}

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

  media: {
    async library() {
      await delay(120)
      return [...LIBRARY]
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
