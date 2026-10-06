/**
 * Publishing: POST /api/publish asks Vercel to rebuild the site, which runs
 * scripts/build-content.mjs and so picks up whatever is in Firestore now.
 *
 * The dashboard calls this about 30 seconds after the client's last save
 * (sooner if she leaves the page), with her Firebase ID token. Only admins may
 * trigger a build, because the deploy hook is a cost and a rate limit (Vercel
 * Hobby allows 100 deployments a day).
 *
 * Admin check without a service account: the caller's ID token is handed
 * straight to Firestore's REST API to read admins/{uid}. Firestore verifies the
 * token's signature and expiry itself, and the rules only let a user read their
 * OWN admins doc -- so a 200 proves "valid login, and listed as an admin". The
 * uid comes from the token's payload; tampering with it breaks the signature.
 *
 * Same shape as server/checkout.js: web-standard Request in, Response out.
 *
 * Environment:
 *   DEPLOY_HOOK_URL            SECRET. Vercel -> Settings -> Git -> Deploy
 *                              Hooks. Anyone holding it can trigger builds.
 *                              Production only; without it this answers 503
 *                              not_configured (local dev, previews).
 *   VITE_FIREBASE_PROJECT_ID   which Firestore to check admins against
 */

const TIMEOUT_MS = 10_000

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

/** The uid inside a Firebase ID token, WITHOUT verifying it (Firestore does). */
function uidFrom(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    const uid = payload.user_id || payload.sub
    return typeof uid === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(uid) ? uid : null
  } catch {
    return null
  }
}

export async function handlePublish(request, env = {}) {
  if (request.method !== 'POST') {
    return json(405, { code: 'method_not_allowed', message: 'Publishing only accepts POST.' })
  }

  const hook = env.DEPLOY_HOOK_URL?.trim()
  const projectId = env.VITE_FIREBASE_PROJECT_ID?.trim()
  if (!hook || !projectId) {
    return json(503, {
      code: 'not_configured',
      message: "Automatic publishing isn't set up on this copy of the site.",
    })
  }

  const token = /^Bearer\s+(\S+)$/.exec(request.headers.get('authorization') || '')?.[1]
  const uid = token ? uidFrom(token) : null
  if (!uid) {
    return json(401, { code: 'unauthenticated', message: 'Sign in again to publish.' })
  }

  let check
  try {
    check = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/admins/${uid}?mask.fieldPaths=email`,
      { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(TIMEOUT_MS) }
    )
  } catch (err) {
    console.error('[publish] Could not reach Firestore:', err)
    return json(502, { code: 'unavailable', message: "Couldn't reach the database. Try again." })
  }
  if (check.status === 401 || check.status === 403) {
    return json(401, { code: 'unauthenticated', message: 'Your sign-in has expired. Sign in again.' })
  }
  if (check.status === 404) {
    return json(403, { code: 'not_admin', message: "This login can't publish the website." })
  }
  if (!check.ok) {
    console.error(`[publish] Firestore answered HTTP ${check.status} checking admins/${uid}`)
    return json(502, { code: 'unavailable', message: "Couldn't reach the database. Try again." })
  }

  const requestedAt = new Date().toISOString()
  let hookRes
  try {
    hookRes = await fetch(hook, { method: 'POST', signal: AbortSignal.timeout(TIMEOUT_MS) })
  } catch (err) {
    console.error('[publish] Could not reach the deploy hook:', err)
    return json(502, { code: 'hook_failed', message: "Couldn't reach Vercel to update the site." })
  }
  if (!hookRes.ok) {
    console.error(`[publish] Deploy hook answered HTTP ${hookRes.status}`)
    return json(502, { code: 'hook_failed', message: "Vercel didn't accept the update. Try again." })
  }

  return json(202, { requestedAt })
}
