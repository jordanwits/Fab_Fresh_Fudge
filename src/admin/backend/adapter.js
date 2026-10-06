/**
 * ============================================================================
 * THE BACKEND SEAM
 * ============================================================================
 *
 * Every screen in the admin talks to `backend` and nothing else. No component
 * imports localStorage, Firebase, or Supabase directly. Swapping the real
 * backend in means writing ONE sibling file that satisfies the contract below
 * and changing the single import at the bottom of this file.
 *
 * The contract is deliberately promise-based and id-addressed, because that is
 * the shape both Firestore and Supabase already speak.
 *
 * ---------------------------------------------------------------------------
 * CONTRACT
 * ---------------------------------------------------------------------------
 *
 * backend.label            string   shown in the sidebar footer, e.g. "Sample data"
 * backend.isMock           boolean  drives the "not a real backend" notice
 * backend.feedsSite        boolean  false while the public site still reads
 *                                   src/data/ -- drives the "not on the
 *                                   website yet" notices
 *
 * backend.auth
 *   getSession()                 -> Promise<Session|null>   restore on load
 *   signIn({ email, password })  -> Promise<Session>        throws AuthError
 *   signOut()                    -> Promise<void>
 *
 * backend.flavors
 *   list()               -> Promise<Flavor[]>   in catalog order
 *   create(draft)        -> Promise<Flavor>
 *   update(id, patch)    -> Promise<Flavor>
 *   remove(id)           -> Promise<void>
 *   reorder(orderedIds)  -> Promise<Flavor[]>
 *
 * backend.events
 *   list()               -> Promise<ShowEvent[]>  soonest first
 *   create(draft)        -> Promise<ShowEvent>
 *   update(id, patch)    -> Promise<ShowEvent>
 *   remove(id)           -> Promise<void>
 *
 * backend.packages
 *   list()               -> Promise<CorporatePackage[]>  in display order
 *   create(draft)        -> Promise<CorporatePackage>
 *   update(id, patch)    -> Promise<CorporatePackage>
 *   remove(id)           -> Promise<void>
 *   reorder(orderedIds)  -> Promise<CorporatePackage[]>
 *
 * backend.pricing
 *   get()                -> Promise<Pricing>
 *   update(patch)        -> Promise<Pricing>    validates; throws DataError
 *
 * backend.media
 *   upload(file)         -> Promise<{ url }>    url is whatever <img src> needs
 *   library()            -> Promise<string[]>   already-available image paths
 *
 * backend.publish                   optional; Firebase only (see PublishContext)
 *   markEdited()         -> Promise<void>       stamp settings/edits
 *   lastEditAt()         -> Promise<string|null> ISO time of the last save
 *   request()            -> Promise<{ requestedAt }>  rebuild the site;
 *                                                throws { code, message }
 *   liveVersion()        -> Promise<{ builtAt, source }|null>
 *
 * backend.dev                       optional; the UI hides these when absent
 *   reset()              -> Promise<void>       restore sample data
 *
 * ---------------------------------------------------------------------------
 * SHAPES
 * ---------------------------------------------------------------------------
 *
 * Session   { user: { email, name } }
 *
 * Flavor    { id, name, desc, img, focal, cats[], popular, isNew, soldOut, note }
 *           `id` is the slug the public site keys off (Build-a-Box stores ids),
 *           so it is write-once: set on create, read-only afterwards.
 *
 * ShowEvent { id, name, place, detail, tag, startDate, endDate, month, day }
 *           `startDate`/`endDate` are ISO 'YYYY-MM-DD'. `month`/`day` are
 *           DERIVED on write (see lib/eventDate.js) so the record stays
 *           drop-in compatible with the shape src/components/Events.jsx renders.
 *
 * CorporatePackage
 *           { id, name, size, blurb, price }
 *           The corporate gift tiers, exactly the shape
 *           src/components/Corporate.jsx renders, plus an id the site ignores.
 *           `price` and `size` are free text ("from $42", "6 squares · 1.5 lbs")
 *           rather than numbers: they are printed verbatim and the client
 *           quotes real jobs by email anyway. Array order is the price ladder
 *           the section reads down, so it is stored, not sorted.
 *
 * ---------------------------------------------------------------------------
 * Pricing   { squarePrice, boxPrice, shippingFee }
 *           Plain dollars (7, 35, 12), matching SQUARE_PRICE / BOX_PRICE in
 *           src/data/flavors.js and SHIPPING_FEE in src/data/checkout.js, which
 *           is where the site and the checkout function read them from TODAY.
 *           Editing them here does not move those files: closing that loop is
 *           part of wiring a real backend, and it is the one piece of this
 *           dashboard that changes what a customer is charged. See below.
 *
 * ---------------------------------------------------------------------------
 * AuthError
 * ---------------------------------------------------------------------------
 * Throw `new AuthError(message)` for anything the login form should show the
 * user verbatim (bad credentials, locked account). Any other rejection is
 * treated as an unexpected failure and gets a generic message.
 *
 * ---------------------------------------------------------------------------
 * WIRING A REAL BACKEND
 * ---------------------------------------------------------------------------
 *
 * SUPABASE — create `supabaseAdapter.js`:
 *
 *   import { createClient } from '@supabase/supabase-js'
 *   const db = createClient(import.meta.env.VITE_SUPABASE_URL,
 *                           import.meta.env.VITE_SUPABASE_ANON_KEY)
 *
 *   auth.signIn  -> db.auth.signInWithPassword({ email, password })
 *   auth.getSession -> db.auth.getSession()
 *   flavors.list -> db.from('flavors').select('*').order('sort_order')
 *   packages.list -> db.from('corporate_packages').select('*').order('sort_order')
 *   flavors.create -> db.from('flavors').insert(draft).select().single()
 *   media.upload -> db.storage.from('flavors').upload(path, file)
 *                   then db.storage.from('flavors').getPublicUrl(path)
 *
 *   Lock it down with RLS: public SELECT, writes restricted to authenticated
 *   users in an `admins` table.
 *
 * FIREBASE — DONE (2026-10-06): `firebaseAdapter.js`, project `fab-fresh-site`,
 *   free plan. Its header documents the Firestore layout (photos included --
 *   no Cloud Storage). Security is firestore.rules at the repo root: public
 *   read, writes only for uids listed in `admins/{uid}` (an allowlist doc
 *   rather than a custom claim, so admins are managed in the console with no
 *   Admin SDK script).
 *
 * HOW EDITS REACH THE SITE (and why prices can't drift)
 *
 * The site is a snapshot. scripts/build-content.mjs runs before every build,
 * reads Firestore and writes src/data/generated/content.js, which
 * src/data/{flavors,site,checkout}.js export. The checkout function imports
 * those same modules (via src/lib/cart.js), and Vercel runs the build command
 * before bundling functions, so the price on the page and the price charged
 * come from one snapshot. Saving only changes the database; pressing Publish
 * in the dashboard rebuilds through /api/publish (state/PublishContext.jsx),
 * so a batch of edits goes live together. Pricing writes are
 * admin-only and shape-checked in the rules, and validatePricing runs again
 * in the build; a page left open across a price change is caught at checkout
 * by the drawer's expectedTotal (409 prices_changed).
 *
 * EITHER WAY, READ THIS: the mock adapter's sign-in is a UI stub, not security.
 * It compares strings in the browser, so anyone can read the credentials in the
 * bundle and anyone can edit localStorage directly. Nothing here protects data.
 * With Firebase, the protection is the published rules, never the adapter.
 */

import { localAdapter } from './localAdapter.js'
import { firebaseAdapter } from './firebaseAdapter.js'

export { AuthError, DataError } from './errors.js'

// --- Which backend --------------------------------------------------------
// Firebase whenever VITE_FIREBASE_* is set (production, and local dev with a
// filled-in .env.local); the sample-data mock otherwise (Vercel previews, a
// fresh clone). Vite inlines the env at build time, so the unused adapter is
// dropped from the bundle -- the demo credentials don't ship to production.
// Keep the test a bare import.meta.env read: that is what Rollup can fold.
export const backend = import.meta.env.VITE_FIREBASE_API_KEY ? firebaseAdapter : localAdapter
