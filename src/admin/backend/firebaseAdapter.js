/**
 * Firebase backend: satisfies the contract in adapter.js against Firestore,
 * Firebase Auth and (once the project is on the Blaze plan) Cloud Storage.
 *
 * SECURITY LIVES IN firestore.rules / storage.rules, NOT HERE. Everything in
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
 */

import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import {
  addDoc,
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
import { getDownloadURL, getStorage, listAll, ref, uploadBytes } from 'firebase/storage'
import { AuthError, DataError } from './errors.js'
import { PHOTO_LIBRARY, seedData } from './seed.js'
import { isSlug, slugify } from '../lib/slug.js'
import { parsePrice, validatePricing } from '../lib/price.js'
import { byDate } from '../lib/eventDate.js'
import { downscaleToBlob, formatBytes, isSupportedImage, MAX_UPLOAD_BYTES } from '../lib/image.js'

const env = import.meta.env

const CONFIG = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

/**
 * Uploads need a Storage bucket, and Firebase only creates one on the Blaze
 * plan. Until then the bucket variable stays blank and uploading says so up
 * front, instead of retrying against a bucket that doesn't exist.
 */
const uploadsEnabled = Boolean(CONFIG.storageBucket)

/** Uploaded photos land here; `library()` lists it. */
const UPLOAD_FOLDER = 'flavors'

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
  let storage = null
  if (uploadsEnabled) {
    storage = getStorage(app)
    // The defaults retry for up to ten minutes, which reads as a hung button.
    storage.maxUploadRetryTime = 30_000
    storage.maxOperationRetryTime = 15_000
  }
  services = { app, db, auth, storage }
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
  return sessionFor(user, admin)
}

// ---------------------------------------------------------------------------
// adapter
// ---------------------------------------------------------------------------

export const firebaseAdapter = {
  label: 'Firebase',
  isMock: false,
  // The public site and checkout still read src/data/, not Firestore. Flip
  // this when they do, and the "not on the website yet" notices go away.
  feedsSite: false,

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
      if (!uploadsEnabled) return [...PHOTO_LIBRARY]
      try {
        const listing = await listAll(ref(fb().storage, UPLOAD_FOLDER))
        const uploaded = await Promise.all(listing.items.map((item) => getDownloadURL(item)))
        return [...uploaded.reverse(), ...PHOTO_LIBRARY]
      } catch (err) {
        console.error(err)
        return [...PHOTO_LIBRARY]
      }
    },

    async upload(file) {
      if (!uploadsEnabled) {
        throw new DataError(
          "Photo uploads aren't switched on yet. Choose one of the photos already on the site for now."
        )
      }
      if (!isSupportedImage(file)) {
        throw new DataError('Pick a JPG, PNG, WebP, or AVIF image.')
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new DataError(
          `That photo is ${formatBytes(file.size)}. Keep it under ${formatBytes(MAX_UPLOAD_BYTES)}.`
        )
      }

      const { blob } = await downscaleToBlob(file)
      const base = slugify(file.name.replace(/\.[^.]+$/, '')) || 'photo'
      const target = ref(fb().storage, `${UPLOAD_FOLDER}/${Date.now()}-${base}.jpg`)
      try {
        await uploadBytes(target, blob, {
          contentType: 'image/jpeg',
          // The name is unique per upload, so the file never changes.
          cacheControl: 'public, max-age=31536000, immutable',
        })
        return { url: await getDownloadURL(target) }
      } catch (err) {
        console.error(err)
        if (err?.code === 'storage/unauthorized') {
          throw new DataError("This login isn't allowed to upload photos.")
        }
        throw new DataError("That photo couldn't be uploaded. Check your connection and try again.")
      }
    },
  },

  // No `dev` block: the "Reset to sample data" button would wipe the real
  // database, and the UI hides it when this is absent.
}
