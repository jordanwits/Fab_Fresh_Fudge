// The flavor case and what things cost, as PUBLISHED from the dashboard.
//
// CONTENT is a snapshot of Firestore that scripts/build-content.mjs writes
// before every build, so the browser and the checkout function (which imports
// this file through src/lib/cart.js) are always built from the same numbers.
// Without Firebase configured the snapshot is the built-in content in
// builtin.js. Stock (`soldOut`) and prices are edited in the dashboard.

import CONTENT from './generated/content.js'

export const SQUARE_PRICE = CONTENT.pricing.squarePrice
export const BOX_PRICE = CONTENT.pricing.boxPrice
export const BOX_SIZE = 6

export const CATEGORIES = [
  { key: 'all', label: 'All flavors' },
  { key: 'chocolate', label: 'Chocolate' },
  { key: 'nutty', label: 'Nutty' },
  { key: 'fruity', label: 'Fruity & citrus' },
  { key: 'coffee', label: 'Coffee & caramel' },
  { key: 'mint', label: 'Mint' },
  { key: 'vanilla', label: 'Vanilla & toffee' },
]

export const FLAVORS = CONTENT.flavors

export const flavorById = (id) => FLAVORS.find((f) => f.id === id)

// Sold-out flavors stay in the list but sink below the in-stock ones so the
// case leads with what can actually be bought. Array#sort is stable, so the
// catalog order still holds inside each group.
export const stockFirst = (list) =>
  [...list].sort((a, b) => Number(Boolean(a.soldOut)) - Number(Boolean(b.soldOut)))
