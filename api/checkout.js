// Vercel function: POST /api/checkout. All of the work lives in
// server/checkout.js, which is host-agnostic; this file only hands it the
// request and the environment. Configure the variables in the Vercel project
// settings (see .env.example). Every method reaches the handler, which answers
// anything but POST with a 405.

import { handleCheckout } from '../server/checkout.js'

export const config = { maxDuration: 20 }

export default {
  fetch(request) {
    return handleCheckout(request, process.env)
  },
}
