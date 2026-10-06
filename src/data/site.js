// Shows and gift tiers are published from the dashboard (the CONTENT snapshot).
// The reviews are real quotes
// the client supplied; they came without names or order details, so the cards
// carry the quote alone.

import CONTENT from './generated/content.js'

export const REVIEWS = [
  {
    quote:
      'Very nice fresh fudge. I love going to the trade show, everyone is ' +
      'always so very helpful.',
    stars: 5,
    featured: true,
  },
  {
    quote:
      "Fudge is delish! It's one of the stops my granddaughter and I always make.",
    stars: 5,
  },
  {
    quote: 'Terrific fudge. My whole group bought one square each!!!',
    stars: 5,
  },
  {
    quote: 'Great service and great fudge. Thank you.',
    stars: 5,
  },
]

// Shows and gift tiers are published from the dashboard (see flavors.js).
export const EVENTS = CONTENT.events


export const CORPORATE_TIERS = CONTENT.packages

// Harvested from the client's live Square store (their own contact + socials).
export const CONTACT = {
  email: 'fabfreshfudge@gmail.com',
  instagram: 'https://www.instagram.com/fabfreshfudge',
  facebook: 'https://www.facebook.com/fabfreshfudge',
}
