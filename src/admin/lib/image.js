/**
 * Client-side downscale for uploaded flavor photos.
 *
 * A phone or camera JPEG is 4000px and several MB -- roughly four times what
 * the site can ever display (`.flavor-photo` tops out near 350 CSS px). So
 * every upload is redrawn smaller in the browser before it goes anywhere:
 *
 *   - photoBlobs          -> the Firebase adapter stores these IN FIRESTORE
 *                            (photos/{id}), because the free plan has no
 *                            Cloud Storage. A Firestore record tops out at
 *                            1 MiB, so the full photo is squeezed under
 *                            MAX_FULL_BYTES, stepping down quality and then
 *                            size until it fits, plus a small thumbnail for
 *                            the dashboard's lists.
 *   - downscaleToDataURL  -> the sample-data mock keeps base64 in a ~5 MB
 *                            localStorage bucket, so it settles for 1000px.
 */

const MOCK_EDGE = 1000
const MOCK_QUALITY = 0.8

/** Under Firestore's 1 MiB record limit with room for the thumbnail. */
export const MAX_FULL_BYTES = 800 * 1024

/** Long edge and JPEG quality to try, in order, until the photo fits. 1400px
 * matches the compression the shipped flavor photos already use. */
const FULL_STEPS = [
  [1400, 0.8],
  [1400, 0.7],
  [1200, 0.7],
  [1000, 0.7],
  [1000, 0.6],
]

/** Twice the 160px the dashboard's grids draw it at. */
const THUMB_EDGE = 360
const THUMB_QUALITY = 0.75

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024

export function isSupportedImage(file) {
  return /^image\/(jpeg|png|webp|avif)$/i.test(file?.type || '')
}

/** Decode a File into an <img>. */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("That file couldn't be read as an image."))
    }
    // Browsers apply EXIF orientation when decoding via <img>, so the canvas
    // copy comes out the right way up -- the same bake-in the shipped photos got.
    img.src = url
  })
}

/** Redraw onto a canvas whose long edge is <= maxEdge. */
function drawScaled(img, maxEdge) {
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  // Flatten onto white: PNGs with alpha would otherwise go black in JPEG.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  return canvas
}

function toJpeg(canvas, quality) {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("That photo couldn't be prepared."))),
      'image/jpeg',
      quality
    )
  )
}

/** Read a File into a data URL, downscaled so the long edge is <= MOCK_EDGE. */
export async function downscaleToDataURL(file) {
  const canvas = drawScaled(await loadImage(file), MOCK_EDGE)
  return {
    url: canvas.toDataURL('image/jpeg', MOCK_QUALITY),
    width: canvas.width,
    height: canvas.height,
  }
}

/**
 * A File -> { full, thumb } JPEG Blobs ready to store, plus the full size's
 * dimensions. Throws if even the smallest step won't fit.
 */
export async function photoBlobs(file) {
  const img = await loadImage(file)

  let full = null
  for (const [edge, quality] of FULL_STEPS) {
    const canvas = drawScaled(img, edge)
    const blob = await toJpeg(canvas, quality)
    full = { blob, width: canvas.width, height: canvas.height }
    if (blob.size <= MAX_FULL_BYTES) break
  }
  if (full.blob.size > MAX_FULL_BYTES) {
    throw new Error("That photo couldn't be made small enough to store. Try a different one.")
  }

  const thumb = await toJpeg(drawScaled(img, THUMB_EDGE), THUMB_QUALITY)
  return { full: full.blob, thumb, width: full.width, height: full.height }
}

/** '2.4 MB' */
export function formatBytes(bytes) {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
