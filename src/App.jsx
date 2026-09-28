import { useCallback, useEffect, useMemo, useState } from 'react'
import { BOX_SIZE, flavorById } from './data/flavors.js'
import { checkoutSeason } from './data/checkout.js'
import { useCart } from './hooks/useCart.js'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import Shop from './components/Shop.jsx'
import BuildABox from './components/BuildABox.jsx'
import Story from './components/Story.jsx'
import Reviews from './components/Reviews.jsx'
import Events from './components/Events.jsx'
import Corporate from './components/Corporate.jsx'
import Footer from './components/Footer.jsx'
import BoxPill from './components/BoxPill.jsx'
import CartDrawer from './components/CartDrawer.jsx'
import OrderPlaced from './components/OrderPlaced.jsx'
import QuoteForm from './components/QuoteForm.jsx'

// Square appends its own parameters to the redirect URL, so match the prefix
// rather than the whole value.
const returnedFromCheckout = () =>
  new URLSearchParams(window.location.search).get('order')?.startsWith('placed') ?? false

export default function App() {
  // The six-pack box being built: an ordered list of flavor ids (duplicates
  // allowed). Finished boxes move into the cart.
  const [box, setBox] = useState([])
  const [bump, setBump] = useState(0) // pulses the floating pill on add

  const { lines, count, problems, addSquare, addBox, setQty, removeLine, clear } = useCart()
  const [cartOpen, setCartOpen] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(returnedFromCheckout)
  const [announcement, setAnnouncement] = useState('')

  // `cartOpen` isn't read inside; it's there so the date is re-checked each
  // time the drawer opens, and a tab left open across Sept 30 sees October.
  // The server re-checks regardless.
  const season = useMemo(
    () => checkoutSeason(new Date(), import.meta.env.VITE_CHECKOUT_SEASON),
    [cartOpen]
  )

  const announce = useCallback((message) => {
    // A trailing no-break space makes a repeat of the same sentence a change,
    // so screen readers announce the second "added" too.
    setAnnouncement((prev) => (prev === message ? `${message} ` : message))
  }, [])

  // Back from Square after paying: the cart has been bought, so empty it, and
  // drop Square's query string so a refresh doesn't say thank you twice.
  useEffect(() => {
    if (!orderPlaced) return
    clear()
    window.history.replaceState(null, '', window.location.pathname + window.location.hash)
  }, [orderPlaced, clear])

  const addToBox = useCallback((id) => {
    // Single chokepoint for the box, so a sold-out flavor can never land in it
    // no matter which surface asked.
    if (flavorById(id)?.soldOut) return false
    let added = false
    setBox((prev) => {
      if (prev.length >= BOX_SIZE) return prev
      added = true
      return [...prev, id]
    })
    setBump((b) => b + 1)
    return added
  }, [])

  const removeFromBox = useCallback((index) => {
    setBox((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const clearBox = useCallback(() => setBox([]), [])

  const addSquareToCart = useCallback(
    (id) => {
      const added = addSquare(id)
      if (added) announce(`${flavorById(id).name} square added to your cart.`)
      return added
    },
    [addSquare, announce]
  )

  const addBoxToCart = useCallback(() => {
    if (!addBox(box)) return
    setBox([])
    setCartOpen(true)
  }, [addBox, box])

  // Out of season the cart hands over to the quote form; one overlay at a
  // time, so the drawer closes on the way.
  const openQuote = useCallback(() => {
    setCartOpen(false)
    setQuoteOpen(true)
  }, [])

  const openCart = useCallback(() => setCartOpen(true), [])
  const closeCart = useCallback(() => setCartOpen(false), [])
  const closeOrderPlaced = useCallback(() => setOrderPlaced(false), [])

  const cart = { lines, problems, setQty, removeLine }

  return (
    <>
      <Header cartCount={count} onOpenCart={openCart} />
      <main id="main">
        <Hero />
        <Shop
          onAddToBox={addToBox}
          onAddToCart={addSquareToCart}
          boxFull={box.length >= BOX_SIZE}
        />
        <BuildABox
          box={box}
          onAdd={addToBox}
          onRemove={removeFromBox}
          onClear={clearBox}
          onAddToCart={addBoxToCart}
        />
        <Story />
        <Reviews />
        <Events />
        <Corporate />
      </main>
      <Footer season={season} onRequestQuote={openQuote} />
      <BoxPill count={box.length} bump={bump} />
      <CartDrawer
        open={cartOpen}
        onClose={closeCart}
        cart={cart}
        season={season}
        onRequestQuote={openQuote}
      />
      <QuoteForm open={quoteOpen} onClose={() => setQuoteOpen(false)} lines={lines} />
      <OrderPlaced open={orderPlaced} onClose={closeOrderPlaced} />
      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>
    </>
  )
}
