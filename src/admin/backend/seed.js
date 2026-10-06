/**
 * The dashboard's starting content, built from the real catalog in src/data/.
 *
 * Shared by both adapters: the local mock seeds localStorage from it, and the
 * Firebase adapter imports it into Firestore once, the first time an admin
 * signs in to an empty project.
 */

import { BOX_PRICE, FLAVORS, SQUARE_PRICE } from '../../data/flavors.js'
import { SHIPPING_FEE } from '../../data/checkout.js'
import { EVENTS, CORPORATE_TIERS } from '../../data/site.js'
import { randomId } from '../lib/slug.js'
import { toDateChip } from '../lib/eventDate.js'

/**
 * Photos already committed to public/images/flavors/ -- the "choose from what
 * we already have" half of the image field. Newest reshoot first. The Firebase
 * adapter adds anything uploaded to Storage on top of these.
 */
export const PHOTO_LIBRARY = [
  ...[
    'butterfinger',
    'chocolate',
    'chocolate-walnut',
    'cookies-cream',
    'lemon-cream',
    'mint-chocolate',
    'peanut-butter-chocolate',
    'penuchi-pecan',
    'rocky-road',
    'vanilla-toffee',
  ].map((n) => `/images/flavors/FlavorImages/${n}.jpg`),
  '/images/flavors/FlavorImages/Orange%20Cream.jpg',
  ...[
    'caramel-macchiato',
    'chocolate-toffee',
    'chocolate-walnut',
    'chocolate',
    'coffee-cream',
    'cookies-cream',
    'dark-chocolate-raspberry',
    'dark-chocolate',
    'lemon-cream',
    'lemon-dark-chocolate',
    'mint-chocolate',
    'mint-mocha',
    'peanut-butter-chocolate',
    'peanut-butter',
    'penuchi-pecan',
    'rocky-road',
    'salted-caramel',
    'smores',
    'vanilla-toffee',
  ].map((n) => `/images/flavors/${n}.jpeg`),
]

/**
 * The four events in site.js carry a month and day but no year, and the site
 * renders them under "Upcoming shows" -- so the year that reading implies is the
 * next one they fall in. 2027 here; the client replaces all of it with their
 * real schedule anyway.
 */
const EVENT_YEAR = 2027
const EVENT_SEED_DATES = [
  { startDate: `${EVENT_YEAR}-06-20`, endDate: `${EVENT_YEAR}-06-21` },
  { startDate: `${EVENT_YEAR}-07-04`, endDate: '' },
  { startDate: `${EVENT_YEAR}-07-18`, endDate: `${EVENT_YEAR}-07-19` },
  { startDate: `${EVENT_YEAR}-08-08`, endDate: `${EVENT_YEAR}-08-10` },
]

const clone = (value) => JSON.parse(JSON.stringify(value))

/** A fresh copy every call, so nobody can mutate the seed through a result. */
export function seedData() {
  return {
    flavors: FLAVORS.map((f) => ({
      focal: '50% 50%',
      note: '',
      popular: false,
      isNew: false,
      soldOut: false,
      ...clone(f),
    })),
    packages: CORPORATE_TIERS.map((t) => ({ id: randomId('pkg'), ...clone(t) })),
    // Seeded from what the site is actually charging today, so the screen
    // opens on the truth rather than on a guess.
    pricing: { squarePrice: SQUARE_PRICE, boxPrice: BOX_PRICE, shippingFee: SHIPPING_FEE },
    events: EVENTS.map((e, i) => {
      const dates = EVENT_SEED_DATES[i] || { startDate: '', endDate: '' }
      return {
        id: randomId('evt'),
        name: e.name,
        place: e.place,
        detail: e.detail,
        tag: 'Free samples',
        ...dates,
        ...toDateChip(dates.startDate, dates.endDate),
      }
    }),
  }
}
