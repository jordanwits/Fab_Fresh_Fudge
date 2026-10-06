/**
 * Uploaded photos live in Firestore (photos/{id}) and are served by
 * /api/photo -- see server/photo.js. A flavor's `img` holds that URL, so the
 * public site renders it like any other image path.
 */

export const photoUrl = (id) => `/api/photo?id=${id}`

/** The photo id inside an `img` value, or null for a committed /images/ path. */
export function photoIdFrom(src) {
  const match = /^\/api\/photo\?id=([A-Za-z0-9_-]+)/.exec(src || '')
  return match ? match[1] : null
}

/** The small version, for lists and grids. Committed photos have only one size. */
export const thumbSrc = (src) => (photoIdFrom(src) ? `${src}&size=thumb` : src)
