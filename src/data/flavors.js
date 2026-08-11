// Flavor catalog — names, descriptions, and photos pulled from the client's
// live Square store (fabfreshfudge.com) on 2026-06-10. Prices are placeholders
// pending the client's current price list.
//
// Stock: `soldOut: true` marks a flavor as currently unavailable — it still
// shows in the case and the picker, greyed out and unselectable. The in-stock
// set is the client's 2026-08-10 list, the same ten flavors they reshot into
// public/images/flavors/FlavorImages/. Flip the flag when stock changes.

export const SQUARE_PRICE = 7.95
export const BOX_PRICE = 42
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

export const FLAVORS = [
  {
    id: 'dark-chocolate-raspberry',
    name: 'Dark Chocolate Raspberry',
    desc: 'Our dark chocolate fudge layered with raspberry cream fudge. Already a fan favorite, and one of our best.',
    img: '/images/flavors/dark-chocolate-raspberry.jpeg',
    focal: '50% 0%',
    cats: ['chocolate', 'fruity'],
    popular: true,
    soldOut: true,
  },
  {
    id: 'salted-caramel',
    name: 'Salted Caramel',
    desc: 'Vanilla fudge with melted caramel hand-mixed in, finished with just a pinch of salt.',
    img: '/images/flavors/salted-caramel.jpeg',
    focal: '50% 56%',
    cats: ['coffee', 'vanilla'],
    popular: true,
    soldOut: true,
  },
  {
    id: 'peanut-butter-chocolate',
    name: 'Peanut Butter Chocolate',
    desc: "Layers of real-peanut-butter fudge and our classic chocolate. Reese's ain't got nothing on us.",
    img: '/images/flavors/FlavorImages/peanut-butter-chocolate.jpg',
    focal: '50% 51%',
    cats: ['chocolate', 'nutty'],
    popular: true,
  },
  {
    id: 'smores',
    name: "S'mores",
    desc: 'Marshmallow fudge, graham cracker middle, chocolate fudge on top, sprinkled with mini marshmallows.',
    img: '/images/flavors/smores.jpeg',
    focal: '50% 39%',
    cats: ['chocolate'],
    popular: true,
    soldOut: true,
    note: 'Contains gluten',
  },
  {
    id: 'dark-chocolate',
    name: 'Dark Chocolate',
    desc: 'A fan favorite. Not too dark, just right.',
    img: '/images/flavors/dark-chocolate.jpeg',
    focal: '50% 70%',
    cats: ['chocolate'],
    popular: true,
    soldOut: true,
  },
  {
    id: 'vanilla-toffee',
    name: 'Vanilla Toffee',
    desc: '"Aunt Carol\'s favorite, and she\'s not even a fudge person." Creamy vanilla loaded with toffee.',
    img: '/images/flavors/FlavorImages/vanilla-toffee.jpg',
    focal: '50% 6%',
    cats: ['vanilla'],
    popular: true,
  },
  {
    id: 'mint-chocolate',
    name: 'Mint Chocolate',
    desc: 'Like an Andes mint, but richer and creamier. Bold enough that it ships in its own box.',
    img: '/images/flavors/FlavorImages/mint-chocolate.jpg',
    focal: '50% 0%',
    cats: ['mint', 'chocolate'],
    popular: true,
    note: 'Ships separately',
  },
  {
    id: 'chocolate',
    name: 'Classic Chocolate',
    desc: 'Our delicious, creamy chocolate fudge. The square every fudge lover starts with.',
    img: '/images/flavors/FlavorImages/chocolate.jpg',
    focal: '50% 13%',
    cats: ['chocolate'],
    popular: true,
  },
  {
    id: 'butterfinger',
    name: 'Butterfinger',
    desc: 'Brand new: vanilla fudge with Butterfinger bits, a layer of chocolate fudge, and more bits on top.',
    img: '/images/flavors/FlavorImages/butterfinger.jpg',
    cats: ['chocolate', 'nutty'],
    isNew: true,
  },
  {
    id: 'caramel-macchiato',
    name: 'Caramel Macchiato',
    desc: 'A blend of our real-coffee chocolate fudge and caramel fudge. For the espresso-bar crowd.',
    img: '/images/flavors/caramel-macchiato.jpeg',
    focal: '50% 59%',
    cats: ['coffee'],
    soldOut: true,
  },
  {
    id: 'chocolate-walnut',
    name: 'Chocolate Nut',
    desc: 'Creamy chocolate fudge with walnuts mixed in by hand and placed on top as a garnish.',
    img: '/images/flavors/FlavorImages/chocolate-walnut.jpg',
    focal: '50% 19%',
    cats: ['chocolate', 'nutty'],
  },
  {
    id: 'chocolate-toffee',
    name: 'Chocolate Toffee',
    desc: 'Creamy chocolate fudge with Skor bits mixed in, then garnished on top.',
    img: '/images/flavors/chocolate-toffee.jpeg',
    focal: '50% 63%',
    cats: ['chocolate', 'vanilla'],
    soldOut: true,
  },
  {
    id: 'coffee-cream',
    name: 'Coffee & Cream',
    desc: 'Our creamy chocolate fudge with real coffee mixed in. Yum, if you like coffee, that is.',
    img: '/images/flavors/coffee-cream.jpeg',
    focal: '50% 67%',
    cats: ['coffee'],
    soldOut: true,
  },
  {
    id: 'cookies-cream',
    name: 'Cookies & Cream',
    desc: 'Creamy vanilla fudge with Oreo bits hand-mixed in.',
    img: '/images/flavors/FlavorImages/cookies-cream.jpg',
    focal: '50% 11%',
    cats: ['vanilla'],
    note: 'Contains gluten',
  },
  {
    id: 'lemon-cream',
    name: 'Lemon Cream',
    desc: 'A great balance of tart and sweet in a delicate lemon cream fudge.',
    img: '/images/flavors/FlavorImages/lemon-cream.jpg',
    focal: '50% 20%',
    cats: ['fruity'],
  },
  {
    id: 'lemon-dark-chocolate',
    name: 'Lemon & Dark Chocolate',
    desc: 'Sweet-and-tart lemon cream layered with our classic creamy chocolate.',
    img: '/images/flavors/lemon-dark-chocolate.jpeg',
    focal: '50% 53%',
    cats: ['fruity', 'chocolate'],
    soldOut: true,
  },
  {
    id: 'mint-mocha',
    name: 'Mint Mocha',
    desc: 'Andes-mint cool with a touch of chocolate-coffee fudge. Contains coffee.',
    img: '/images/flavors/mint-mocha.jpeg',
    focal: '50% 75%',
    cats: ['mint', 'coffee'],
    soldOut: true,
    note: 'Ships separately',
  },
  {
    id: 'peanut-butter',
    name: 'Peanut Butter',
    desc: 'Real creamy peanut butter, nothing fake. Smooth, rich, and dangerous to leave unattended.',
    img: '/images/flavors/peanut-butter.jpeg',
    focal: '50% 62%',
    cats: ['nutty'],
    soldOut: true,
  },
  {
    id: 'penuchi-pecan',
    name: 'Penuchi & Pecan',
    desc: 'Brown-sugar fudge with pecans hand-mixed in and on top. Tastes like a maple donut.',
    img: '/images/flavors/FlavorImages/penuchi-pecan.jpg',
    focal: '50% 14%',
    cats: ['nutty'],
  },
  {
    id: 'rocky-road',
    name: 'Rocky Road',
    desc: 'Creamy chocolate fudge with walnuts and mini marshmallows hand-mixed in.',
    img: '/images/flavors/FlavorImages/rocky-road.jpg',
    focal: '50% 11%',
    cats: ['chocolate', 'nutty'],
  },
]

export const flavorById = (id) => FLAVORS.find((f) => f.id === id)

// Sold-out flavors stay in the list but sink below the in-stock ones so the
// case leads with what can actually be bought. Array#sort is stable, so the
// catalog order still holds inside each group.
export const stockFirst = (list) =>
  [...list].sort((a, b) => Number(Boolean(a.soldOut)) - Number(Boolean(b.soldOut)))
