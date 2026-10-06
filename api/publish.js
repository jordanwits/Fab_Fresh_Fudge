// Vercel function: POST /api/publish. All of the work lives in
// server/publish.js; this file only hands it the request and the environment.
// Needs DEPLOY_HOOK_URL (secret, Production only) -- see .env.example.

import { handlePublish } from '../server/publish.js'

export const config = { maxDuration: 15 }

export default {
  fetch(request) {
    return handlePublish(request, process.env)
  },
}
