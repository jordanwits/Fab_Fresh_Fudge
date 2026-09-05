/**
 * Client-side downscale for uploaded flavor photos.
 *
 * The mock backend keeps uploads in localStorage as data URLs, and a 4000x3000
 * camera JPEG blows the ~5 MB quota on the first try. Downscaling to the size
 * the site actually renders keeps a demo session workable. A real adapter
 * uploads the original File to storage and deletes this step -- the resize
 * belongs in a build/CDN pipeline, not the browser.
 *
 * 1400px matches the compression the shipped flavor photos already use, but the
 * mock stores base64 in a 5 MB bucket, so it settles for 1000px instead.
 */

const MAX_EDGE = 1000
const QUALITY = 0.8

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024

export function isSupportedImage(file) {
  return /^image\/(jpeg|png|webp|avif)$/i.test(file?.type || '')
}

/** Read a File into a data URL, downscaled so the long edge is <= MAX_EDGE. */
export function downscaleToDataURL(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)
      try {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight))
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

        resolve({ url: canvas.toDataURL('image/jpeg', QUALITY), width: w, height: h })
      } catch (err) {
        reject(err)
      }
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

/** '2.4 MB' */
export function formatBytes(bytes) {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
