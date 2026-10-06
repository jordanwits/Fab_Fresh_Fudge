/**
 * Publish step: snapshot the dashboard's content into the site.
 *
 * Runs before every `npm run build` and `npm run dev` (the prebuild/predev
 * scripts). Reads flavors, shows, gift packages and prices from Firestore and
 * writes:
 *
 *   src/data/generated/content.js   what src/data/{flavors,site,checkout}.js
 *                                   export. The browser bundle AND the checkout
 *                                   function import it, and Vercel runs this
 *                                   build command before it bundles functions,
 *                                   so the price a customer sees and the price
 *                                   Square charges come from the same snapshot.
 *   public/content-version.json     { builtAt, source } -- the dashboard polls
 *                                   it to say when a publish has gone live.
 *
 * Both files are gitignored. If content.js were ever missing when a function
 * is bundled, the import fails and the deploy fails -- loudly, never stale.
 *
 * Reads are public (see firestore.rules), so this needs no credentials, only
 * VITE_FIREBASE_PROJECT_ID. Without it (Vercel previews, a fresh clone) the
 * snapshot is the built-in content from src/admin/backend/seed.js.
 *
 * A PRODUCTION build (VERCEL_ENV=production) that can't read Firestore fails
 * instead of falling back, so a Firebase hiccup leaves the last good deploy
 * live rather than quietly replacing her content with the built-in catalog.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'
import { seedData } from '../src/admin/backend/seed.js'
import { validatePricing } from '../src/admin/lib/price.js'
import { byDate } from '../src/admin/lib/eventDate.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CONTENT_FILE = path.join(ROOT, 'src/data/generated/content.js')
const VERSION_FILE = path.join(ROOT, 'public/content-version.json')

const mode = process.argv.includes('--dev') ? 'development' : 'production'
const env = { ...loadEnv(mode, ROOT, 'VITE_'), ...process.env }
const projectId = env.VITE_FIREBASE_PROJECT_ID?.trim()
const strict = env.VERCEL_ENV === 'production'

const log = (msg) => console.log(`[content] ${msg}`)

// ---------------------------------------------------------------------------
// Firestore REST -> plain values
// ---------------------------------------------------------------------------

function plain(value) {
  if (!value || typeof value !== 'object') return null
  if ('stringValue' in value) return value.stringValue
  if ('booleanValue' in value) return value.booleanValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return Number(value.doubleValue)
  if ('nullValue' in value) return null
  if ('timestampValue' in value) return value.timestampValue
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(plain)
  if ('mapValue' in value) return fields(value.mapValue.fields)
  return null // bytes, references, geo points: nothing the site renders
}

function fields(map = {}) {
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, plain(v)]))
}

const docId = (doc) => doc.name.slice(doc.name.lastIndexOf('/') + 1)

async function firestore(pathPart) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${pathPart}`
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Firestore ${pathPart}: HTTP ${res.status}`)
  return res.json()
}

async function collection(name) {
  const docs = []
  let pageToken = ''
  do {
    const page = await firestore(
      `${name}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`
    )
    docs.push(...(page?.documents || []))
    pageToken = page?.nextPageToken || ''
  } while (pageToken)
  return docs.map((d) => ({ ...fields(d.fields), id: docId(d) }))
}

const bySortOrder = (a, b) =>
  (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity) ||
  String(a.name).localeCompare(String(b.name))

// eslint-disable-next-line no-unused-vars
const withoutBookkeeping = ({ sortOrder, ...rest }) => rest

// ---------------------------------------------------------------------------
// the two sources
// ---------------------------------------------------------------------------

function builtIn() {
  const seed = seedData()
  return {
    flavors: seed.flavors,
    events: seed.events.sort(byDate),
    packages: seed.packages,
    pricing: seed.pricing,
  }
}

async function fromFirestore() {
  // settings/pricing is written in the same transaction as the one-time import
  // of the starting content (settings/meta, the real marker, is admin-only), so
  // no pricing doc means nobody has signed in yet and there's nothing to publish.
  const pricingDoc = await firestore('settings/pricing')
  if (!pricingDoc) return null

  const [flavors, events, packages] = await Promise.all([
    collection('flavors'),
    collection('events'),
    collection('packages'),
  ])

  const pricing = fields(pricingDoc.fields)
  const problems = Object.values(validatePricing(pricing))
  if (problems.length) throw new Error(`settings/pricing is not valid: ${problems.join(' ')}`)

  for (const f of flavors) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f.id) || !f.name) {
      throw new Error(`flavors/${f.id} has no usable id or name`)
    }
  }

  return {
    flavors: flavors.sort(bySortOrder).map(withoutBookkeeping),
    events: events.sort(byDate),
    packages: packages.sort(bySortOrder).map(withoutBookkeeping),
    pricing: {
      squarePrice: pricing.squarePrice,
      boxPrice: pricing.boxPrice,
      shippingFee: pricing.shippingFee,
    },
  }
}

// ---------------------------------------------------------------------------

let content
let source = 'built-in'

if (!projectId) {
  log('VITE_FIREBASE_PROJECT_ID not set -- publishing the built-in content.')
  content = builtIn()
} else {
  try {
    content = await fromFirestore()
    if (content) {
      source = 'firestore'
    } else if (strict) {
      // Production only ever ran without content before the first sign-in.
      // Now it would mean a wrong project id or deleted data, and publishing
      // the built-in catalog would silently undo every edit she's made.
      throw new Error(`settings/pricing is missing in Firestore project ${projectId}`)
    } else {
      log(`Firestore project ${projectId} hasn't been set up yet -- publishing the built-in content.`)
      content = builtIn()
    }
  } catch (err) {
    if (strict) {
      console.error(`[content] Could not read Firestore for a production build: ${err.message}`)
      console.error('[content] Failing the build so the last good deploy stays live.')
      process.exit(1)
    }
    console.warn(`[content] Could not read Firestore (${err.message}) -- using the built-in content.`)
    content = builtIn()
  }
}

const builtAt = new Date().toISOString()

fs.mkdirSync(path.dirname(CONTENT_FILE), { recursive: true })
fs.writeFileSync(
  CONTENT_FILE,
  `// GENERATED by scripts/build-content.mjs at ${builtAt} from ${source}.\n` +
    `// Do not edit: change content in the dashboard and it is republished.\n\n` +
    `export default ${JSON.stringify({ source, builtAt, ...content }, null, 2)}\n`,
  'utf8'
)
fs.writeFileSync(VERSION_FILE, `${JSON.stringify({ builtAt, source })}\n`, 'utf8')

log(
  `${source}: ${content.flavors.length} flavors, ${content.events.length} shows, ` +
    `${content.packages.length} gift packages, $${content.pricing.squarePrice} / ` +
    `$${content.pricing.boxPrice} / $${content.pricing.shippingFee} shipping.`
)
