# Fabulous Fudge — Landing Page Redesign

A single-page React redesign of [fabfreshfudge.com](https://www.fabfreshfudge.com), built with Vite.
Design notes live in [PRODUCT.md](PRODUCT.md) and [DESIGN.md](DESIGN.md).

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
```

## What's real vs. placeholder

**Real (pulled from the client's live Square store):**

- All 20 flavor names, descriptions, and product photos (hot-linked from their
  Square CDN — see `src/data/flavors.js`)
- Brand name, dietary notes (gluten / mint-ships-separately)

**Placeholder (client to confirm/replace):**

- Prices — `SQUARE_PRICE` and `BOX_PRICE` in `src/data/flavors.js`
- Reviews, events/show schedule, monthly special, corporate tiers —
  all in `src/data/site.js`
- Our Story copy — `src/components/Story.jsx`
- Contact email + social URLs — `CONTACT` in `src/data/site.js`
- Hero / story / corporate atmosphere photos are licensed Unsplash stock;
  swap for the client's own photography when available
- The Butterfinger flavor has no photo on the old site, so it renders a
  styled "fresh off the slab" tile — replace `img: null` when one exists

## Before launch

- "Add box to cart" is a front-end simulation — wire it to the client's
  Square checkout (their store backend is Square Online)
- Re-host the flavor photos (currently hot-linked to the Square CDN at
  full resolution) as optimized WebP, ~600px wide
- Confirm the six-pack price and the per-square price
