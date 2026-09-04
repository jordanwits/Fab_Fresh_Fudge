// Events and specials are drafted placeholders for the client to swap with
// their real show schedule and current promotion. The reviews are real quotes
// the client supplied; they came without names or order details, so the cards
// carry the quote alone.

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

export const EVENTS = [
  {
    month: 'Jun',
    day: '20–21',
    name: 'Summer Makers Market',
    place: 'Riverside Fairgrounds',
    detail: 'Booth 14: first batch of the day sells out by noon.',
  },
  {
    month: 'Jul',
    day: '4',
    name: 'Independence Day Street Fair',
    place: 'Main Street, Downtown',
    detail: 'Limited-run Star-Spangled S’mores all weekend.',
  },
  {
    month: 'Jul',
    day: '18–19',
    name: 'Lakeside Art & Food Festival',
    place: 'Harbor Park Pavilion',
    detail: 'Free samples of the new Butterfinger flavor.',
  },
  {
    month: 'Aug',
    day: '8–10',
    name: 'County Fair',
    place: 'Expo Hall, Aisle C',
    detail: 'The big one: all twenty flavors on the slab.',
  },
]

export const SPECIAL = {
  kicker: 'June special',
  title: 'Buy three squares, get a fourth free',
  body: 'Mix and match any flavors in the case, and the cheapest square is on us. Online and at every show this month.',
  code: 'FABFOUR',
}

export const CORPORATE_TIERS = [
  {
    name: 'The Six-Pack',
    size: '6 squares · 1.5 lbs',
    blurb: 'Your pick of flavors in our signature box with a printed card from your team.',
    price: 'from $42',
  },
  {
    name: 'The Dozen',
    size: '12 squares · 3 lbs',
    blurb: 'Two trays, twelve flavors if you want them, with custom ribbon and logo sticker.',
    price: 'from $78',
  },
  {
    name: 'The Whole Slab',
    size: '6 lb slab, cut & wrapped',
    blurb: 'One flavor, one glorious slab, sliced, wrapped, and ready for the break room.',
    price: 'from $150',
  },
]

export const CONTACT = {
  email: 'hello@fabfreshfudge.com',
  instagram: 'https://www.instagram.com/',
  facebook: 'https://www.facebook.com/',
}
