// Vercel function: GET /api/photo?id=<id>[&size=thumb]. All of the work lives
// in server/photo.js; this file only hands it the request and the environment.

import { handlePhoto } from '../server/photo.js'

export const config = { maxDuration: 10 }

export default {
  fetch(request) {
    return handlePhoto(request, process.env)
  },
}
