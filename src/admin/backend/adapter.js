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
 * backend.media
 *   upload(file)         -> Promise<{ url }>    url is whatever <img src> needs
 *   library()            -> Promise<string[]>   already-available image paths
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
 *   flavors.create -> db.from('flavors').insert(draft).select().single()
 *   media.upload -> db.storage.from('flavors').upload(path, file)
 *                   then db.storage.from('flavors').getPublicUrl(path)
 *
 *   Lock it down with RLS: public SELECT, writes restricted to authenticated
 *   users in an `admins` table.
 *
 * FIREBASE — create `firebaseAdapter.js`:
 *
 *   import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
 *   import { getFirestore, collection, getDocs, addDoc, ... } from 'firebase/firestore'
 *   import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
 *
 *   flavors.list -> getDocs(query(collection(db,'flavors'), orderBy('sortOrder')))
 *   media.upload -> uploadBytes(ref(storage, path), file).then(getDownloadURL)
 *
 *   Lock it down with security rules: public read, writes only for uids
 *   carrying an `admin` custom claim.
 *
 * EITHER WAY, READ THIS: the mock adapter's sign-in is a UI stub, not security.
 * It compares strings in the browser, so anyone can read the credentials in the
 * bundle and anyone can edit localStorage directly. Nothing here protects data.
 * Real access control has to be enforced server-side by the rules above before
 * this dashboard is exposed to the internet.
 */

import { localAdapter } from './localAdapter.js'

export { AuthError, DataError } from './errors.js'

// --- Swap this line to go live. -------------------------------------------
// import { supabaseAdapter } from './supabaseAdapter.js'
// export const backend = supabaseAdapter
export const backend = localAdapter
