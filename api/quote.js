// Vercel function: POST /api/quote — the summer shipping quote form.
// All of the work lives in server/quote.js; this hands it the request and the
// environment. See .env.example for WEB3FORMS_ACCESS_KEY.

import { handleQuote } from '../server/quote.js'

export const config = { maxDuration: 20 }

export default {
  fetch(request) {
    return handleQuote(request, process.env)
  },
}
