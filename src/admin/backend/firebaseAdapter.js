/**
 * Firebase backend: satisfies the contract in adapter.js against Firestore and
 * Firebase Auth, on the free (Spark) plan -- so no Cloud Storage: uploaded
 * photos are stored in Firestore itself and served by /api/photo.
 *
 * SECURITY LIVES IN firestore.rules, NOT HERE. Everything in
 * this file runs in the browser and can be bypassed; the checks below exist
 * to give the client a clear message, never to protect data. The rules allow
 * public reads and let only uids listed in `admins/{uid}` write.
 *
 * Layout:
 *   flavors/{slug}        Flavor minus `id` (the doc id IS the write-once
 *                         slug), plus `sortOrder`
 *   events/{auto}         ShowEvent minus `id`
 *   packages/{auto}       CorporatePackage minus `id`, plus `sortOrder`
 *   settings/pricing      Pricing
 *   settings/meta         { seededAt, seededBy } -- marks the one-time import
 *   settings/edits        { lastEditAt, by } -- stamped on every save; newer
 *                         than the live site's builtAt = unpublished changes
 *   photos/{auto}         { full, thumb (JPEG bytes), contentType, width,
 *                         height, createdAt } -- see lib/image.js photoBlobs
 *   admins/{uid}          { email, name } -- who may sign in and write.
 *                         Added by hand in the Firebase console; no code can
 *                         write it (rules say `write: if false`).
 *
 * Accounts are created by hand in the console too. Self sign-up is switched
 * off in the project, and the dashboard deliberately has no sign-up or
 * password-reset flow: it is an internal tool with a fixed set of logins.
 *
 * Configured from VITE_FIREBASE_* (see .env.example). These values are public
 * by design -- they identify the project, they do not grant access.
 *
 * Saving does not change the website by itself: the site is a build-time
 * snapshot (scripts/build-content.mjs), rebuilt when an admin presses Publish
 * (`publish.request` -> /api/publish). Every save stamps settings/edits, so
 * any device can tell the live site is behind the database.
 */

import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import {
  addDoc,
  Bytes,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { AuthError, DataError } from './errors.js'
import { PHOTO_LIBRARY, seedData } from './seed.js'
import { isSlug } from '../lib/slug.js'
import { parsePrice, validatePricing } from '../lib/price.js'
import { byDate } from '../lib/eventDate.js'
import { formatBytes, isSupportedImage, MAX_UPLOAD_BYTES, photoBlobs } from '../lib/image.js'
import { photoIdFrom, photoUrl } from '../lib/photo.js'

const env = import.meta.env

const CONFIG = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

/** Uploads nobody has used for this long are deleted by sweepPhotos(). */
const UNUSED_PHOTO_TTL_MS = 24 * 60 * 60 * 1000

// ---------------------------------------------------------------------------
// services -- created on first use, so importing this file costs nothing
// when adapter.js falls back to the mock
// ---------------------------------------------------------------------------

let services = null

function fb() {
  if (services) return services
  const app = initializeApp(CONFIG)
  // Editors hand over drafts with optional fields left undefined; Firestore
  // rejects undefined outright unless told to drop it.
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true })
  const auth = getAuth(app)
  services = { app, db, auth }
  return services
}

// ---------------------------------------------------------------------------
// errors
// ---------------------------------------------------------------------------

const DATA_MESSAGES = {
  'permission-denied':
    "You don't have permission to change this. Sign out and back in; if it keeps happening, this login isn't set up as an admin.",
  unauthenticated: 'Your sign-in has expired. Sign out and back in.',
  unavailable: "Can't reach the database. Check your connection and try again.",
  'deadline-exceeded': 'The database took too long to answer. Try again in a moment.',
  'resource-exhausted': "The database's daily allowance is used up. It resets overnight.",
}

/** A publish that didn't go through; `code` comes from server/publish.js. */
export class PublishError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'PublishError'
    this.code = code
  }
}

/** Turn a Firebase rejection into something the UI can show verbatim. */
function toDataError(err) {
  if (err instanceof DataError) return err
  console.error(err)
  return new DataError(DATA_MESSAGES[err?.code] || 'Something went wrong saving that. Try again.')
}

/** Run a backend call, translating whatever it throws. */
async function guard(work) {
  try {
    return await work()
  } catch (err) {
    throw toDataError(err)
  }
}

const AUTH_MESSAGES = {
  'auth/invalid-credential': "That email and password don't match an account.",
  'auth/invalid-email': "That email and password don't match an account.",
  'auth/user-not-found': "That email and password don't match an account.",
  'auth/wrong-password': "That email and password don't match an account.",
  'auth/missing-password': 'Enter your password.',
  'auth/user-disabled': 'This account has been switched off.',
  'auth/too-many-requests':
    'Too many attempts. Wait a few minutes before trying again.',
  'auth/network-request-failed': "Can't reach the sign-in service. Check your connection.",
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Firestore doc -> contract shape: id from the doc, bookkeeping stripped. */
function fromSnap(snap) {
  // eslint-disable-next-line no-unused-vars
  const { sortOrder, id: _storedId, ...rest } = snap.data()
  return { ...rest, id: snap.id }
}

/** Contract shape -> what gets stored: never the id, never the sort key. */
function toStored(record) {
  // eslint-disable-next-line no-unused-vars
  const { id, sortOrder, ...rest } = record
  return rest
}

/**
 * Stored order. Sorted here rather than with orderBy(), because a Firestore
 * orderBy silently drops every document missing that field -- one record
 * added by hand in the console would vanish from the dashboard.
 */
async function listOrdered(name) {
  const { db } = fb()
  const snap = await getDocs(collection(db, name))
  return snap.docs
    .map((d) => ({ sortOrder: d.data().sortOrder, record: fromSnap(d) }))
    .sort(
      (a, b) =>
        (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity) ||
        String(a.record.name).localeCompare(String(b.record.name))
    )
    .map((row) => row.record)
}

/** update() for any collection: write the patch, then return what is stored. */
async function patchDoc(name, id, patch, missingMessage) {
  const { db } = fb()
  const target = doc(db, name, id)
  try {
    await updateDoc(target, toStored(patch))
  } catch (err) {
    if (err?.code === 'not-found') throw new DataError(missingMessage)
    throw err
  }
  return fromSnap(await getDoc(target))
}

/**
 * reorder() for flavors and packages. Anything the caller didn't mention
 * keeps its place at the end, so a stale id list can never drop a record.
 * One batch, so the order is never half-written.
 */
async function writeOrder(name, orderedIds) {
  const { db } = fb()
  const current = await listOrdered(name)
  const byId = new Map(current.map((r) => [r.id, r]))
  const next = orderedIds.map((id) => byId.get(id)).filter(Boolean)
  const seen = new Set(next.map((r) => r.id))
  const all = [...next, ...current.filter((r) => !seen.has(r.id))]

  const batch = writeBatch(db)
  all.forEach((r, i) => batch.update(doc(db, name, r.id), { sortOrder: i }))
  await batch.commit()
  return all
}

/** New records go to the end; reorder() renumbers everything from 0. */
const endOfList = () => Date.now()

// ---------------------------------------------------------------------------
// auth + first-run import
// ---------------------------------------------------------------------------

/** The admins/{uid} record, or null if this login isn't an admin. */
async function adminRecord(user) {
  const { db } = fb()
  const snap = await getDoc(doc(db, 'admins', user.uid))
  return snap.exists() ? snap.data() : null
}

function sessionFor(user, admin) {
  return { user: { email: user.email, name: admin.name || user.displayName || user.email } }
}

/**
 * Copy the site's current content into an empty project, once.
 *
 * Runs the first time an admin signs in. A transaction on settings/meta makes
 * it happen exactly once even if two tabs sign in at the same moment, and the
 * marker (not "is the flavors collection empty?") is what decides -- so a
 * client who deletes every flavor on purpose doesn't get them all back.
 */
let seeding = null

function ensureSeeded(email) {
  if (!seeding) {
    const { db } = fb()
    seeding = runTransaction(db, async (tx) => {
      const metaRef = doc(db, 'settings', 'meta')
      if ((await tx.get(metaRef)).exists()) return

      const data = seedData()
      data.flavors.forEach((f, i) =>
        tx.set(doc(db, 'flavors', f.id), { ...toStored(f), sortOrder: i })
      )
      data.packages.forEach((p, i) =>
        tx.set(doc(collection(db, 'packages')), { ...toStored(p), sortOrder: i })
      )
      data.events.forEach((e) => tx.set(doc(collection(db, 'events')), toStored(e)))
      tx.set(doc(db, 'settings', 'pricing'), data.pricing)
      tx.set(metaRef, { seededAt: serverTimestamp(), seededBy: email || null })
    }).catch((err) => {
      seeding = null // let the next sign-in try again
      throw err
    })
  }
  return seeding
}

// ---------------------------------------------------------------------------
// photos
// ---------------------------------------------------------------------------

/**
 * Every uploaded photo's id and upload time, newest first -- WITHOUT the image
 * bytes. The client SDK can't leave fields out of a read, and pulling every
 * photo's bytes just to list them would cost megabytes, so this asks the
 * Firestore REST API for a projection (photos are public-read).
 */
async function listPhotos() {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${CONFIG.projectId}/databases/(default)/documents:runQuery`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'photos' }],
          select: { fields: [{ fieldPath: 'createdAt' }] },
          orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
        },
      }),
    }
  )
  if (!res.ok) throw new Error(`Listing photos failed: HTTP ${res.status}`)
  const rows = await res.json()
  return rows
    .filter((row) => row.document)
    .map(({ document }) => ({
      id: document.name.slice(document.name.lastIndexOf('/') + 1),
      createdAt: Date.parse(document.fields?.createdAt?.timestampValue || '') || 0,
    }))
}

/**
 * Delete uploads no flavor uses. Only ones older than a day: a photo dropped
 * into an editor that hasn't been saved yet is unused for a while, and the
 * live site keeps showing a replaced photo until the next publish lands.
 * Best effort, once per sign-in, never blocks anything.
 */
async function sweepPhotos() {
  const { db } = fb()
  const [photos, flavors] = await Promise.all([listPhotos(), listOrdered('flavors')])
  const inUse = new Set(flavors.map((f) => photoIdFrom(f.img)).filter(Boolean))
  const cutoff = Date.now() - UNUSED_PHOTO_TTL_MS
  const stale = photos.filter((p) => !inUse.has(p.id) && p.createdAt && p.createdAt < cutoff)
  await Promise.all(stale.map((p) => deleteDoc(doc(db, 'photos', p.id))))
}

let swept = false

/** Signed in AND listed in admins/, or null (and signed back out). */
async function admitted(user) {
  const { auth } = fb()
  const admin = await adminRecord(user)
  if (!admin) {
    await signOut(auth)
    return null
  }
  try {
    await ensureSeeded(user.email)
  } catch (err) {
    // Only AuthError messages reach the login form, so say what happened.
    throw new AuthError(`Signed in, but setting up the content failed. ${toDataError(err).message}`)
  }
  if (!swept) {
    swept = true
    sweepPhotos().catch((err) => console.warn('[photos] sweep skipped:', err))
  }
  return sessionFor(user, admin)
}

// ---------------------------------------------------------------------------
// adapter
// ---------------------------------------------------------------------------

export const firebaseAdapter = {
  label: 'Firebase',
  isMock: false,
  // The site and checkout are rebuilt from Firestore on publish.
  feedsSite: true,

  auth: {
    async getSession() {
      const { auth } = fb()
      // Firebase restores a saved login asynchronously; asking before it has
      // finished reads as "signed out" and bounces every refresh to the form.
      await auth.authStateReady()
      if (!auth.currentUser) return null
      return admitted(auth.currentUser)
    },

    async signIn({ email, password }) {
      const { auth } = fb()
      let credential
      try {
        credential = await signInWithEmailAndPassword(auth, String(email).trim(), password)
      } catch (err) {
        const message = AUTH_MESSAGES[err?.code]
        if (message) throw new AuthError(message)
        throw err
      }
      const session = await admitted(credential.user)
      if (!session) {
        throw new AuthError("That account doesn't have access to this dashboard.")
      }
      return session
    },

    async signOut() {
      seeding = null
      await signOut(fb().auth)
    },
  },

  flavors: {
    list: () => guard(() => listOrdered('flavors')),

    create: (draft) =>
      guard(async () => {
        const { db } = fb()
        if (!isSlug(draft.id)) throw new DataError("That flavor's reference ID isn't valid.")
        const target = doc(db, 'flavors', draft.id)
        // A transaction, so two people adding the same flavor can't overwrite
        // each other: the doc id is the slug, and setDoc would happily replace.
        await runTransaction(db, async (tx) => {
          if ((await tx.get(target)).exists()) {
            throw new DataError(`A flavor with the id "${draft.id}" already exists.`)
          }
          tx.set(target, { ...toStored(draft), sortOrder: endOfList() })
        })
        return fromSnap(await getDoc(target))
      }),

    update: (id, patch) =>
      guard(() => patchDoc('flavors', id, patch, 'That flavor no longer exists.')),

    remove: (id) => guard(() => deleteDoc(doc(fb().db, 'flavors', id))),

    reorder: (orderedIds) => guard(() => writeOrder('flavors', orderedIds)),
  },

  events: {
    list: () =>
      guard(async () => {
        const snap = await getDocs(collection(fb().db, 'events'))
        return snap.docs.map(fromSnap).sort(byDate)
      }),

    create: (draft) =>
      guard(async () => {
        const created = await addDoc(collection(fb().db, 'events'), toStored(draft))
        return fromSnap(await getDoc(created))
      }),

    update: (id, patch) =>
      guard(() => patchDoc('events', id, patch, 'That show no longer exists.')),

    remove: (id) => guard(() => deleteDoc(doc(fb().db, 'events', id))),
  },

  packages: {
    list: () => guard(() => listOrdered('packages')),

    create: (draft) =>
      guard(async () => {
        const created = await addDoc(collection(fb().db, 'packages'), {
          ...toStored(draft),
          sortOrder: endOfList(),
        })
        return fromSnap(await getDoc(created))
      }),

    update: (id, patch) =>
      guard(() => patchDoc('packages', id, patch, 'That package no longer exists.')),

    remove: (id) => guard(() => deleteDoc(doc(fb().db, 'packages', id))),

    reorder: (orderedIds) => guard(() => writeOrder('packages', orderedIds)),
  },

  /**
   * Validated here so the client gets the message, and again by the rules on
   * settings/pricing so a hand-crafted write can't store a nonsense price.
   */
  pricing: {
    get: () =>
      guard(async () => {
        const snap = await getDoc(doc(fb().db, 'settings', 'pricing'))
        return snap.exists() ? snap.data() : seedData().pricing
      }),

    update: (patch) =>
      guard(async () => {
        const target = doc(fb().db, 'settings', 'pricing')
        const current = await getDoc(target)
        const next = { ...(current.exists() ? current.data() : seedData().pricing), ...patch }
        const errors = validatePricing(next)
        const first = Object.values(errors)[0]
        if (first) throw new DataError(first)

        const clean = {
          squarePrice: parsePrice(next.squarePrice),
          boxPrice: parsePrice(next.boxPrice),
          shippingFee: parsePrice(next.shippingFee),
        }
        await setDoc(target, clean)
        return clean
      }),
  },

  media: {
    async library() {
      try {
        const uploaded = (await listPhotos()).map((p) => photoUrl(p.id))
        return [...uploaded, ...PHOTO_LIBRARY]
      } catch (err) {
        console.error(err)
        return [...PHOTO_LIBRARY]
      }
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

      let blobs
      try {
        blobs = await photoBlobs(file)
      } catch (err) {
        throw new DataError(err?.message || "That photo couldn't be prepared.")
      }

      const bytes = async (blob) => Bytes.fromUint8Array(new Uint8Array(await blob.arrayBuffer()))
      return guard(async () => {
        const target = doc(collection(fb().db, 'photos'))
        await setDoc(target, {
          full: await bytes(blobs.full),
          thumb: await bytes(blobs.thumb),
          contentType: 'image/jpeg',
          width: blobs.width,
          height: blobs.height,
          createdAt: serverTimestamp(),
        })
        return { url: photoUrl(target.id) }
      })
    },
  },

  /**
   * Getting saved changes onto the website. The timing (wait for a pause, go
   * now when the page is left, show progress) lives in PublishContext.
   */
  publish: {
    /** Stamp "something changed" so every device can see it's unpublished. */
    async markEdited() {
      const { db, auth } = fb()
      await setDoc(doc(db, 'settings', 'edits'), {
        lastEditAt: serverTimestamp(),
        by: auth.currentUser?.email || null,
      })
    },

    /** ISO time of the last save by anyone, or null if never stamped. */
    async lastEditAt() {
      const snap = await getDoc(doc(fb().db, 'settings', 'edits'))
      return snap.exists() ? snap.data().lastEditAt?.toDate().toISOString() ?? null : null
    },

    /**
     * Ask for a rebuild with everything in the database right now.
     * @returns {Promise<{ requestedAt: string }>} server time of the request
     */
    async request() {
      const user = fb().auth.currentUser
      if (!user) throw new PublishError('unauthenticated', 'Sign in again to publish.')
      let res
      try {
        res = await fetch('/api/publish', {
          method: 'POST',
          headers: { authorization: `Bearer ${await user.getIdToken()}` },
        })
      } catch {
        throw new PublishError('offline', "Couldn't reach the website. Check your connection.")
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.requestedAt) {
        throw new PublishError(data.code || 'failed', data.message || "Couldn't update the website.")
      }
      return { requestedAt: data.requestedAt }
    },

    /** What the live site was built from: { builtAt, source }, or null. */
    async liveVersion() {
      const res = await fetch(`/content-version.json?t=${Date.now()}`, { cache: 'no-store' })
      return res.ok ? res.json() : null
    },
  },

  // No `dev` block: the "Reset to sample data" button would wipe the real
  // database, and the UI hides it when this is absent.
}
