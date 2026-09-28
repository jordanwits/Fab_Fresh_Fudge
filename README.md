# Fabulous Fudge — Landing Page Redesign

A single-page React redesign of [fabfreshfudge.com](https://www.fabfreshfudge.com), built with Vite.
Design notes live in [PRODUCT.md](PRODUCT.md) and [DESIGN.md](DESIGN.md).

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
```

Two pages come out of one build:

| URL | What it is |
|---|---|
| `/` | the public landing page |
| `/admin/` | staff dashboard for editing flavors and the show schedule |

## Admin dashboard

`/admin/` lets the client add, edit, delete and reorder flavors, mark them sold out, and
manage the show schedule — without a developer.

It is **UI only**. No backend is connected yet, so it runs against a mock adapter that
saves to browser localStorage and seeds itself from `src/data/`. Sign in with
`owner@fabfreshfudge.com` / `fudge2026`.

**That sign-in is not security.** It compares strings in the browser. Before `/admin/`
goes anywhere public, wire up a real backend and enforce access server-side:

1. Write one file next to `src/admin/backend/adapter.js` implementing the contract
   documented at the top of it (Supabase and Firebase sketches are both in there).
2. Change the single import at the bottom of `adapter.js`.
3. Lock writes down with Supabase RLS or Firebase security rules.

No screen touches the backend directly, so nothing else has to change.

## Cart & checkout

Customers fill a cart on the site (single ¼ lb squares and finished Build-a-Box
six-packs), then pay on **Square's hosted checkout page**. Square collects the shipping
address, takes the card / Apple Pay / Google Pay / Cash App Pay payment, emails the
receipt, and files the order in the client's Square Dashboard. Afterwards it sends the
buyer back to `/?order=placed`, where the site says thank you and empties the cart.

How it fits together:

| Piece | File |
|---|---|
| Prices per item, box size | `src/data/flavors.js` |
| Shipping fee, Oct–Apr season, quantity limits | `src/data/checkout.js` |
| Cart rules: line merging, totals, sold-out checks (shared by browser and server) | `src/lib/cart.js` |
| Cart state, saved to localStorage | `src/hooks/useCart.js` |
| Cart drawer, thank-you dialog | `src/components/CartDrawer.jsx`, `OrderPlaced.jsx` |
| Creates the Square payment link | `server/checkout.js` |
| Vercel function wrapper → `POST /api/checkout` | `api/checkout.js` |

The browser only sends flavor ids and quantities. The server recomputes every price,
re-checks stock and the shipping season, then calls Square's `CreatePaymentLink`, so a
doctored request can't change what gets charged. Square's access token lives only in
server environment variables.

**Shipping season.** The client only ships November through April (heat-sensitive fudge).
Outside those months the cart still works but checkout is closed, with a note saying it
reopens November 1. Summer orders are possible but need ice packs and cost more, so the
client quotes those by email rather than selling them here. `VITE_CHECKOUT_SEASON=open` or `closed` overrides the calendar, for
testing in summer or pausing orders early.

### Square setup

1. Sign in at [developer.squareup.com](https://developer.squareup.com/apps) and create an
   application **under the client's Square account**. A team-member login only sees
   that account if the owner gave it a permission set that includes developer
   permissions; otherwise the owner creates the app and shares the credentials.
2. From the app's **Credentials** page take the Sandbox access token, and later the
   Production one. From **Locations**, take the matching location IDs; Sandbox and
   Production have different ones.

### Local development (Sandbox)

```bash
cp .env.example .env.local   # then fill in the Sandbox token + Sandbox location ID
npm run dev
```

`npm run dev` serves `/api/checkout` itself (a dev-only plugin in `vite.config.js` runs
`server/checkout.js`), so the whole flow works without the Vercel CLI. Add
`VITE_CHECKOUT_SEASON=open` to `.env.local` to test between May and September.
Sandbox checkout pages accept the test card numbers listed in Square's Sandbox docs;
no real money moves.

### Deploying on Vercel

Import the repo; Vercel detects Vite and turns `api/checkout.js` into a function with no
extra config. Under **Settings → Environment Variables**:

| Variable | Production | Preview |
|---|---|---|
| `SQUARE_ACCESS_TOKEN` | production token | Sandbox token |
| `SQUARE_LOCATION_ID` | production location ID | Sandbox location ID |
| `SQUARE_ENVIRONMENT` | `production` | `sandbox` |
| `VITE_CHECKOUT_SEASON` | leave unset | `open` if testing out of season |

`VITE_CHECKOUT_SEASON` is read by both the site build and the function, so redeploy
after changing it. Never give the token a `VITE_` prefix; Vite would publish it inside
the site's JavaScript. This repository is public, and `.env*` files are gitignored for
that reason.

If checkout fails, customers see a generic message. Square's actual error (a bad token,
a location that doesn't match the environment, and so on) is written to the function
log in Vercel.

## What's real vs. placeholder

**Real (pulled from the client's live Square store):**

- All 20 flavor names, descriptions, and product photos (hot-linked from their
  Square CDN — see `src/data/flavors.js`)
- Brand name, dietary notes (gluten / mint-ships-separately)
- Prices (confirmed 2026-09-28): $7 per ~¼ lb square; buy five, get the sixth free,
  so a six-pack box is $35 — `SQUARE_PRICE` / `BOX_PRICE` in `src/data/flavors.js`
- Shipping season: November 1 – April 30 — `SHIPPING_SEASON` in `src/data/checkout.js`

**Placeholder (client to confirm/replace):**

- Flat shipping fee ($12) — `SHIPPING_FEE` in `src/data/checkout.js`
- Reviews, events/show schedule, monthly special, corporate tiers —
  all in `src/data/site.js`
- Our Story copy — `src/components/Story.jsx`
- Contact email + social URLs — `CONTACT` in `src/data/site.js`
- Hero / story / corporate atmosphere photos are licensed Unsplash stock;
  swap for the client's own photography when available
- The Butterfinger flavor has no photo on the old site, so it renders a
  styled "fresh off the slab" tile — replace `img: null` when one exists

## Before launch

- Run one real Sandbox checkout end to end, then set the Production variables in
  Vercel and place one small live order to confirm it lands in the Square Dashboard
- Confirm the shipping fee, and whether any sales tax should be charged — checkout
  currently adds none
- Re-host the flavor photos (currently hot-linked to the Square CDN at
  full resolution) as optimized WebP, ~600px wide
- Confirm the six-pack price and the per-square price
