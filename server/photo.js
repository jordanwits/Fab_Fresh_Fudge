/**
 * Uploaded flavor photos: GET /api/photo?id=<id>[&size=thumb]
 *
 * The free Firebase plan has no Cloud Storage, so the dashboard stores each
 * upload inside Firestore (photos/{id}: a full-size JPEG and a thumbnail, as
 * bytes) and a flavor's `img` is this endpoint's URL. That URL works the moment
 * the upload finishes -- in the dashboard before anything is published, and on
 * the site afterwards -- with no build step copying files around.
 *
 * Photos never change (a new upload is a new id), so the response is cached for
 * a year by browsers AND by Vercel's CDN (s-maxage). Firestore is read once per
 * photo per CDN region, not once per visitor, which is what keeps this inside
 * the free plan's download allowance.
 *
 * Same shape as server/checkout.js: web-standard Request in, Response out, so
 * api/photo.js on Vercel and the dev plugin in vite.config.js can both use it.
 *
 * Environment:
 *   VITE_FIREBASE_PROJECT_ID   reads are public (firestore.rules), so the
 *                              project id is all this needs
 */

const ID = /^[A-Za-z0-9_-]{8,64}$/
const TIMEOUT_MS = 10_000

function miss(status) {
  return new Response(null, {
    status,
    // A missing photo may be uploading right now; don't let the CDN pin a 404.
    headers: { 'cache-control': status === 404 ? 'public, max-age=60, s-maxage=60' : 'no-store' },
  })
}

function decodeBase64(b64) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function handlePhoto(request, env = {}) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return miss(405)

  const url = new URL(request.url)
  const id = url.searchParams.get('id') || ''
  const field = url.searchParams.get('size') === 'thumb' ? 'thumb' : 'full'
  const projectId = env.VITE_FIREBASE_PROJECT_ID?.trim()
  if (!projectId) return miss(503)
  if (!ID.test(id)) return miss(404)

  let res
  try {
    res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/photos/${id}?mask.fieldPaths=${field}`,
      { signal: AbortSignal.timeout(TIMEOUT_MS) }
    )
  } catch (err) {
    console.error('[photo] Could not reach Firestore:', err)
    return miss(502)
  }
  if (res.status === 404) return miss(404)
  if (!res.ok) {
    console.error(`[photo] Firestore answered HTTP ${res.status} for photos/${id}`)
    return miss(502)
  }

  const b64 = (await res.json().catch(() => null))?.fields?.[field]?.bytesValue
  if (!b64) return miss(404)

  const bytes = decodeBase64(b64)
  return new Response(request.method === 'HEAD' ? null : bytes, {
    status: 200,
    headers: {
      'content-type': 'image/jpeg',
      'content-length': String(bytes.length),
      'cache-control': 'public, max-age=31536000, s-maxage=31536000, immutable',
    },
  })
}
