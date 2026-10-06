# Fab Fresh Fudge (v1)

Single-page React landing-site redesign of fabfreshfudge.com for Fab Fresh Fudge (site copy still says
"Fabulous Fudge") — the Ragle family's small-batch fudge business near Mt. Shasta, Northern California.
Built by West Wave Creative. Static Vite 5 + React 18, plain JSX (no TypeScript), plus ONE serverless
function (`api/checkout.js`) that turns the cart into a Square hosted-checkout payment link. Hosting is
Vercel (decided 2026-09-16; not yet deployed).

**This is the OLDER v1 iteration; `..\Fab Fresh Fudge 2` is the active/newer build** (Vite 6 + TS,
rebuilt 2026-06-15 as a deliberately different "editorial counter" design). Same brand and flavor data
in both; this repo keeps the original "corner fudge shop" design.

## Commands

- `npm run dev` — Vite dev server (port = `PORT` env or 5173; `.claude/launch.json` config: `fudge-dev`).
  Public site at `/`, staff dashboard at `/admin/`.
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the production build

## Layout

- `index.html` — Google Fonts (Young Serif display, Figtree body), meta
- `src/App.jsx` — section order: Header → Hero → Shop → Specials → BuildABox → Story → Reviews →
  Events → Corporate → Footer, plus a floating BoxPill, the CartDrawer and the OrderPlaced dialog.
  The in-progress box (six flavor ids) lives here; the cart lives in `useCart`
- `src/components/*.jsx` — one component per section; `src/hooks/useReveal.js` = scroll-reveal
- `src/data/flavors.js` — 20-flavor catalog (real names/descriptions harvested from the client's
  Square store) + `SQUARE_PRICE` / `BOX_PRICE` / `BOX_SIZE`
- `src/data/site.js` — reviews, events, specials, corporate tiers, contact (all drafted placeholders)
- Cart & checkout (added 2026-09-16; README "Cart & checkout" has the setup steps):
  - `src/data/checkout.js` — `SHIPPING_FEE` (placeholder $12), Oct–Apr `SHIPPING_SEASON`,
    `checkoutSeason()`, quantity limits
  - `src/lib/cart.js` — pure cart rules (line keys, totals in cents, `parseLines`, `findProblems`).
    Imported by BOTH the browser and the server, so displayed and charged totals can't drift
  - `src/hooks/useCart.js` — cart state, persisted to localStorage `fff-cart/v1`, synced across tabs
  - `src/components/CartDrawer.jsx`, `OrderPlaced.jsx`, `Overlay.jsx` (native `<dialog>` wrapper,
    the public-site twin of the admin's `ui/Dialog.jsx`, kept separate so no admin code ships)
  - `server/checkout.js` — host-agnostic Request→Response handler that calls Square
    `CreatePaymentLink`; `api/checkout.js` is the thin Vercel wrapper; `vite.config.js`'s
    `apiDev` plugin mounts every handler in `DEV_API` during `npm run dev`
  - `src/components/QuoteForm.jsx` + `server/quote.js` + `api/quote.js` — the out-of-season
    shipping quote form, emailed to the shop via Web3Forms (`WEB3FORMS_ACCESS_KEY`)
- `src/styles.css` — ALL styling and the design tokens for the PUBLIC SITE in this one file
  (no CSS Modules). The admin has its own stylesheet; see below.
- `admin/index.html` + `src/admin/` — the staff dashboard, a second Vite entry (added
  2026-09-04). Vite serves it at `/admin/` in dev and builds it to `dist/admin/index.html`,
  so the URL is a real file on any static host — no SPA rewrite rule needed — and the
  marketing bundle never ships admin code. Inside `/admin/`, sections ride on the hash
  (`/admin/#/events`) for the same reason. Structure:
  - `backend/adapter.js` — THE SEAM. Every screen talks to `backend` and nothing else.
    The contract is documented there. It picks `firebaseAdapter` when
    `VITE_FIREBASE_API_KEY` is set, else `localAdapter`
  - `backend/firebaseAdapter.js` — the real backend (2026-10-06): Firebase Auth +
    Firestore (+ Storage once on Blaze). Its header documents the collection layout
  - `backend/localAdapter.js` — the sample-data demo: localStorage, with deliberate
    latency so loading/error states are real code paths. Still used by Vercel previews
    and any checkout without Firebase env vars
  - `backend/seed.js` — starting content built from `src/data/`, shared by both adapters
  - `state/` — AuthContext (session gate), DataContext (all CRUD), ToastContext
  - `ui/` — the shared vocabulary: Button, Field, Dialog (native `<dialog>`), Drawer,
    ConfirmDialog, Toaster, Icon (one hand-rolled SVG set), States (empty/error/skeleton)
  - `lib/` — `useDragSort` (reorder-by-drag, no library), `eventDate`, `slug`, `image`,
    `router`, `useClosing`, `price` (parse/validate money, used by the screen AND the adapter)
  - `screens/` — Login, Shell, FlavorsScreen + FlavorEditor, EventsScreen + EventEditor,
    PackagesScreen + PackageEditor, PricingScreen, ImageField
  - `admin.css` — ALL admin styling and its own token set (prefixed `--a-*`)
- `public/favicon-32.png`, `favicon-192.png`, `apple-touch-icon.png` (180px, logo on white because iOS
  fills transparency with black) — generated 2026-10-06 from `public/images/Logos/Fab Fresh Color.png`
  (padded square, Lanczos downscale). Regenerate from that logo if it changes. Both
  `index.html` and `admin/index.html` link them.
- `public/images/` — self-hosted photos: `flavors/` (19 original jpegs) plus
  `flavors/FlavorImages/` (client's 2026-08-10 reshoot — 10 flavors now point here), hero/story/
  corporate shots, client logo in `Logos/Fab Fresh Color.png`
- `originals/images/flavors/` — the uncompressed camera masters (51 MB), moved out of `public/` on
  2026-08-10 so they're preserved but never shipped. Re-run compression from here, not from `public/`.
- `research/` — raw harvest of the old Square site (sitemap, og-meta descriptions, reference photos)
- `PRODUCT.md` / `DESIGN.md` — brief + design-system docs; DESIGN.md matches the current tokens

## Deployment

LIVE on Vercel since 2026-09-28: project `fab-fresh-fudge`, https://fab-fresh-fudge.vercel.app,
auto-deploying from `main` of jordanwits/Fab_Fresh_Fudge. No `vercel.json`: the Vite preset builds
`dist/` and `api/checkout.js` becomes the function. The custom domain is NOT attached —
fabfreshfudge.com still serves the client's old Square Online store.

Production environment variables (see `.env.example`): `SQUARE_ACCESS_TOKEN` (Secret type, the
client's production token, entered by Jordan — Claude never handles Square tokens),
`SQUARE_LOCATION_ID` = `LVDVGM2FJK8K4` (Churn Creek, the fudge kitchen; the client wants to switch to
Redding Mall `L9NRMTK7SGZAH` for December at the mall, which is this variable plus a redeploy), and
`SQUARE_ENVIRONMENT` = `production`. Preview/Development have NO variables, so checkout there answers
503 rather than touching the real account. `VITE_CHECKOUT_SEASON` is absent on purpose: it was added
as `open` only to test before the season starts, then deleted.

Other production location IDs: Fabulous Fudge (Main) `L3ANY0KMHNWMF` (what the old Square Online
store ships from), Redding Mall `L9NRMTK7SGZAH`.

## Conventions / gotchas

- Palette is "Mt. Shasta alpine" BLUE (2026-10-06): the client asked to lean into blue and okayed
  dropping brown, so the UI has no cocoa/cream at all — night-navy ink and footer, ice-blue
  `--surface` (cards, Build a Box, scrolled header, phone menu, drawers), a deep Fresh Blue drench on
  Reviews + Corporate (`--blue-drench`: the client rejected a much lighter #85C6E9, then asked for
  a touch softer/less vibrant — now oklch(0.46 0.085 243). It still carries snow text, and
  `--snow-muted` is down to 4.6:1 on it, so it can't get much lighter), and Buttercream #F3D9A4 as the ONE warm accent (stars, badges, prices and the
  quote button on blue). The fudge photos supply the chocolate. Filled buttons/links use a deepened
  `--blue` because literal Fresh Blue #2B99D1 fails white-text AA; the literal swatch lives in
  `--sky` and `--sky-light` is the lifted blue for small text on navy. The header is transparent
  over the hero and ice once scrolled; `Header.jsx` adds `is-menu-open` so its text flips to navy
  while the phone menu is open even at the top of the page. The footer's Mt. Shasta ridge is two
  masked pseudo-elements (`.site-footer::before/::after`) sitting in Corporate's bottom padding —
  shrink that padding and the ridge will overlap content. The admin dashboard has its own palette
  in `admin.css` and was NOT changed. Don't reintroduce the earlier pistachio palette.
- Client hard constraints: clean but never empty (no big white space), no clutter, no flowery/script
  fonts, lean nav, no clashing brights.
- Naming is unresolved: the logo reads "Fab Fresh Fudge" but site title/copy still says "Fabulous Fudge".
- README's "hot-linked from the Square CDN" note is stale — flavor photos are self-hosted in
  `public/images/flavors/`.
- All 30 flavor photos were compressed on 2026-08-10: long edge 1400px, mozjpeg q80 (51.2 MB -> 5.6 MB).
  1400px is ~4x the largest on-screen render — `.flavor-photo` caps at 349x261 CSS px even at a 1920
  viewport. Re-compressing an already-compressed file will visibly degrade it; start from `originals/`.
- The camera files carry EXIF orientation, so the "4000x3000" masters actually display portrait.
  Compression baked the rotation in (browsers already applied it, so nothing changed on screen) —
  the served files are genuinely 1050x1400. Don't "fix" the apparent rotation.
- `FlavorImages/Orange Cream.jpg` has no matching entry in `flavors.js` — the catalog has no orange
  flavor. Unused until the client confirms whether it's a new flavor.
- The `img: null` path in Shop/BuildABox still renders a styled "fresh off the slab" tile, but no
  flavor uses it now (Butterfinger got a photo in the reshoot).
- Stock is the `soldOut: true` flag in `flavors.js` (set 2026-08-10 from the client's in-stock list —
  the 10 flavors in `flavors/FlavorImages/`). Sold-out flavors stay visible but greyed and
  unselectable, sorted to the end via `stockFirst()`; `addToBox` in App.jsx rejects them as a backstop.
  Side effect: the "Coffee & caramel" filter is currently 4-for-4 sold out.
- The live client site is client-rendered Square Online — curl gets no page content; product data comes
  from `sitemap.xml` + per-product `og:` meta (how `research/` was collected).
- Reviews, events, specials, corporate tiers, Our Story copy, and contact details are
  placeholders awaiting client confirmation. PRICES ARE NOT: the client confirmed them 2026-09-28 —
  $7 per approximately-quarter-pound square, buy five get the sixth free, so `BOX_PRICE` is $35 and
  the box saves exactly one square. The Specials band still advertises a made-up "buy three get a
  fourth free / FABFOUR" deal that now contradicts the real offer, and `CORPORATE_TIERS` still says
  "from $42" for a six-pack; both need the client's real wording.
- Shipping season is NOVEMBER 1 - April 30 (client, 2026-09-28; their Square store's own policy said
  Oct-April). They CAN ship in summer but have to add ice packs and charge more, so May-Oct orders
  go through the quote form (cart's closed-season panel, plus a footer link that only appears
  out of season). It POSTs to `/api/quote`, which emails the shop through Web3Forms with the
  customer's cart written out and priced. The key is held SERVER-side on purpose: Web3Forms
  says it is safe in a browser, but a key in the bundle is a key bots can scrape and use to
  flood the inbox. With no key the endpoint answers 503 `not_configured` and the form offers a
  prefilled mailto instead, so it degrades rather than breaks.
- Git repo on `main`, pushed to https://github.com/jordanwits/Fab_Fresh_Fudge — a PUBLIC repo, so
  anything committed (including the admin demo credentials) is world-readable. `.gitignore` keeps
  `node_modules/`, `dist/`, and the 51 MB `originals/` tree out of version control.
- `dist/` is a fresh 2026-09-16 build; both entries (`dist/index.html` and
  `dist/admin/index.html`) come out of one `npm run build`.

### Checkout gotchas

- The browser sends ONLY `{ type, flavorId | flavors, qty }` lines. `server/checkout.js` re-parses
  them, re-checks stock/limits with `findProblems`, recomputes prices from `flavors.js` and the fee
  from `checkout.js`, and enforces the season. Never accept a price from the request.
- Line items are AD HOC (name + price), not Square catalog ids. So Square inventory is NOT
  decremented and item reports group by name; prices and stock come from this repo. Squares are named
  `1/4 lb square - <Flavor>` to match the client's existing Square items. A box is one
  `Six-Pack Box` line with a $0 modifier per flavor named `3 x Classic Chocolate` (ASCII x on purpose:
  receipt printers).
- No sales tax is added anywhere. If the client needs tax, add it to the order in
  `buildPaymentLinkRequest`, and the drawer's totals will need the same number.
- The admin dashboard's stock/flavor edits live in Firestore and reach nothing else; checkout reads
  the static `flavors.js` bundled at deploy time. Connecting the site must also feed the server.
- Season is decided on `America/Los_Angeles` time. The browser evaluates it at BUILD time for
  `VITE_CHECKOUT_SEASON`, the function at request time, so changing that variable needs a redeploy.
  In September you must set it to `open` to test checkout at all.
- Square appends its own query params to the redirect, so App matches `?order=` by prefix
  (`placed…`) and then strips the query with `history.replaceState`. Landing on `/?order=placed`
  clears the cart by design.
- Payment links are pinned to `Square-Version: 2026-08-19` (`SQUARE_VERSION` in `server/checkout.js`).
- PRODUCTION verified 2026-09-28: the deployed function created a real payment link on the client's
  account (merchant MLF48BP5G30BZ) for a $7 square + $35 box + $12 shipping = $54.00, with the
  shipping address form, card, Google Pay and Cash App Pay. Nobody paid it, so an unpaid DRAFT order
  sits in their Square account from that test. The season gate was briefly opened to run it and is
  closed again; checkout opens by itself on Nov 1 with no redeploy, because only the override is
  build-time.
- Verified end to end against Square SANDBOX on 2026-09-16: Square accepted the payment link
  (including the $0 box modifiers), recorded the exact totals the drawer shows, no tax, a SHIPMENT
  fulfillment, and after a simulated payment the order went OPEN, the receipt email was sent, and the
  return to `/?order=placed` showed the thank-you and emptied the cart. In Sandbox, payment links open
  Square's "Checkout API Sandbox Testing Panel" (a Test Payment button, no card form) rather than the
  real checkout page. Production has NOT been exercised.
- Square developer app: "Fab Fresh Fudge Website", created under the Fabulous Fudge account. That
  account has THREE locations (Churn Creek, Fabulous Fudge, Redding Mall); the production location ID
  for web orders is still undecided. Jordan's team-member login can see Sandbox but gets "You do not
  have the permissions required" on Production, so the owner has to grant developer access or supply
  the production values.
- `Overlay.jsx` handles Escape on `keydown` as well as `cancel`, and resyncs on `close`: in the Claude
  desktop app's embedded Chrome the `<dialog>` never fired `cancel` for a trusted Escape, and real
  Chrome can skip `cancel` under its close-watcher abuse rule. Don't reduce it to `cancel` alone.
- The header now holds wordmark + cart button + toggle. Below 420px the toggle's "Menu" word is
  visually hidden; between 1021 and 1100px the nav/header gaps tighten, or the nav links wrap.
### Admin dashboard gotchas

- FIREBASE (wired 2026-10-06). Project `fab-fresh-site` ("Fab Fresh site"), owned by the
  client's Google account; Jordan is a project Owner. Spark (free) plan. Firestore is
  Standard edition in `us-west1` (permanent). Web app "Fab Fresh Fudge Website". Config is
  the `VITE_FIREBASE_*` vars (`.env.example`) — public by design. Locally they live in
  `.env.local`; Vercel Production needs the same six; Preview deliberately has none, so
  previews run the sample-data demo and can't touch real data.
- SECURITY IS `firestore.rules` (and `storage.rules`), published in the console — the
  adapter's checks are courtesy only. Public read on flavors/events/packages/pricing;
  writes only for uids with a doc in `admins/{uid}` (`{ email, name }`), which only the
  console can write. Verified 2026-10-06 with anonymous REST calls (read 200, every write
  403). Edit the repo file first, then paste it into Firestore -> Rules and Publish; the
  editor is CodeMirror 6 and can be filled via `.cm-content`.cmView.view.dispatch.
- Logins are FIXED and made by hand: Authentication -> Users -> Add user, then a matching
  `admins/{uid}` doc. Self sign-up is OFF in Auth settings (User actions), and the
  dashboard has no sign-up or forgot-password flow — Jordan's call: it's an internal tool.
  A login missing from `admins/` is signed straight back out ("doesn't have access").
  As of 2026-10-06 only Jordan's login exists; the client's is pending her password choice.
- First admin sign-in IMPORTS `seed.js` into Firestore once, inside a transaction keyed on
  `settings/meta` — the marker, not an empty collection, decides, so deleting every
  flavor on purpose doesn't bring them back. Done 2026-10-06.
- Lists are sorted in JS by `sortOrder`, not `orderBy()`: Firestore's orderBy silently
  drops docs missing the field, so a doc added by hand in the console would vanish.
  `ignoreUndefinedProperties` is on because editors hand over drafts with undefined fields.
- Pricing rules accept cents with a tolerance (`7.95 * 100` isn't exactly 795 in floating
  point); verified by saving $7.95 and back.
- Demo sign-in (sample-data mode only): `owner@fabfreshfudge.com` / `fudge2026`, shown
  behind `backend.isMock`. The adapter choice is a bare `import.meta.env` test so Rollup
  drops the unused adapter — a Firebase build does NOT contain these credentials (checked
  by grepping `dist/`). The demo's edits live in localStorage `fff-admin/v1`.
- The public site still reads its static `src/data/` modules, not Firestore.
  `backend.feedsSite` is false, which shows "Not on the website yet" in the sidebar and
  on the Pricing screen. Connecting them is the open "publish on save vs live reads"
  decision.
- A flavor's `id` is write-once: generated from the name on create, locked afterwards.
  It is surfaced as "Reference ID", NOT as a web address — the site is one page with
  anchor nav, so no per-flavor URL exists and calling it one misleads.
  Build-a-Box stores ids in customer state and photo filenames follow them, so renaming
  one would empty boxes. The display name stays freely editable.
- Events are edited as real ISO dates (`startDate`/`endDate`); the site's `month`/`day`
  chip strings are DERIVED on save by `lib/eventDate.js`, so records stay drop-in
  compatible with `src/components/Events.jsx`. `parseISO` splits the string by hand
  rather than using `new Date('YYYY-MM-DD')`, which parses as UTC and lands a day early
  in California.
- The four seeded events carry no year in `site.js` and the site calls them "upcoming",
  so `seed.js` puts them in 2027. Nothing lands in the Past group until the
  client enters their real schedule.
- Flavor order is changed by dragging a row's grip handle (`lib/useDragSort.js`),
  hand-rolled on pointer events rather than pulling in dnd-kit for one list. Drag is
  unreachable by keyboard, so the same handle doubles as a keyboard control: space to
  pick up, arrows to move, space to drop, escape to cancel, every step announced through
  a live region. Reordering is disabled unless the table is unfiltered and in "Site
  order", because an index in a filtered slice is not a catalog index. There is no
  visible how-to under the table; the handles carry an off-screen `#dragsort-help`
  description instead, since a grip icon tells a keyboard user nothing about space.
- "Site order" shows `stockFirst(flavors)` — the exact list `Shop.jsx` renders, in-stock
  group then sold-out group, with a heading over each. Dragging is penned inside a group
  (`bounds` in `useDragSort`) because the site re-sorts across that line anyway, so
  letting a row cross it would promise an order the site cannot produce. This made the
  old "In stock first" sort option a duplicate of "Site order"; it was removed.
- `reorderFlavors` maps that grouped display order back onto the catalog WITHOUT
  flattening it: it walks the stored array and refills each in-stock slot from the new
  in-stock sequence and each sold-out slot from the new sold-out sequence, leaving the
  interleaving intact. That interleaving is what returns a flavor to its old
  neighbourhood when it comes back in stock — normalise the catalog into two blocks and
  every returning flavor reappears at the end of the in-stock run instead.
- Below 700px the flavors table stops being a table: `thead` is dropped, each row becomes
  its own card (`tr:not(.group-row)` — grid, border, radius, shadow, gap) and the
  `.table-wrap` container goes transparent, so the phone shows a stack of cards rather
  than one tall card full of hairline-separated rows. The stock-group headings become
  plain labels on the canvas between the stacks. Left as a scrolling table, the stock
  toggle and the edit/delete buttons sat off the right edge — which is what the client
  came to a phone to do.
- On phones reordering is a MODE, not an always-live affordance: a "Reorder" button above
  the list toggles `.table-wrap.is-reordering`, which is what reveals the handles. A grip
  that is always live on a list you scroll with your thumb collects grabs you didn't
  mean. Entering the mode also drops the stock toggle and the row actions, which removes
  the mis-tap targets a drag crosses and roughly halves the card (about 160px to 74px),
  so far more of the list is reachable without scrolling mid-drag; the flavor name goes
  `pointer-events: none` for the same reason. `useEffect` clears the mode whenever
  `canReorder` goes false, so filtering can't strand a "Done" button over a list that no
  longer drags. Desktop ignores all of it and shows the handles permanently — every
  `.is-reordering` rule lives inside the 700px media query.
- The handle is 40x48 in that mode, and `touch-action: none` is scoped to the handle
  alone, so a drag starting on it moves the row while every other part of the card still
  scrolls the page.
- Overlay scroll-lock is reference-counted in `ui/Dialog.jsx`. It has to be: the delete
  confirm opens on top of the editor drawer, and per-instance save/restore stranded
  `<html>` at `overflow: hidden` with no dialog open, depending on teardown order.
- Uploaded photos are downscaled in-browser (`lib/image.js`): to a 1400px JPEG Blob for
  Firebase Storage (matching the shipped photos; camera files are ~4x what the site can
  show), or to a 1000px data URL for the demo's ~5 MB localStorage. Storage needs the Blaze
  plan, so `VITE_FIREBASE_STORAGE_BUCKET` stays BLANK until it's on; while blank, upload
  says "not switched on yet" immediately instead of retrying against a missing bucket.
  Turning it on: Blaze, create the bucket in `us-west1` (free-tier region), publish
  `storage.rules` (allow its Firestore access), set the bucket var locally and on Vercel.
- The Corporate Gifts screen (added 2026-09-08) edits `CORPORATE_TIERS` — the gift
  package ladder in `src/components/Corporate.jsx`. Records are
  `{ id, name, size, blurb, price }`; `size` and `price` stay FREE TEXT ("from $42")
  because the site prints them verbatim and real corporate jobs are quoted by email.
  Only the packages are editable — the section's heading, lede, footnote and photo are
  still hard-coded in the component.
- Packages reorder with the same `useDragSort` handle the flavors table uses, including
  the phone-only "Reorder" mode and the keyboard fallback. What does NOT carry over is
  grouping: `Corporate.jsx` prints the tiers in plain array order, so there is no
  boundary for a drag to promise across and `bounds` is left unset. `reorderPackages` is
  correspondingly plain — the dragged order IS the stored order, with none of the
  slot-refilling `reorderFlavors` needs.
- Shows are deliberately NOT drag-reorderable (asked and confirmed 2026-09-08). They have
  no stored manual order at all: `events.list()` sorts by date on read and DataContext
  re-sorts on create/update. Adding drag would mean introducing a manual order that
  competes with the date sort — note that `src/components/Events.jsx` renders EVENTS in
  ARRAY order, so the site's order and the admin's date order are not the same thing
  today.
- `localAdapter.load()` BACKFILLS a stored blob that predates a collection instead of
  discarding it. The shape guard only checks `flavors`/`events`, so a browser holding a
  pre-packages `fff-admin/v1` blob passes it and would then hand the screen an undefined
  array. Any future collection has to be added to that backfill list too — `pricing` is
  there already but checked separately, since it is an object and `Array.isArray` would
  call a perfectly good record missing.
- The Pricing screen (added 2026-09-28) edits `{ squarePrice, boxPrice, shippingFee }` —
  plain dollars, matching `SQUARE_PRICE`/`BOX_PRICE` in `flavors.js` and `SHIPPING_FEE` in
  `checkout.js`. It saves to Firestore but says on screen (while `!backend.feedsSite`) that the site and
  `server/checkout.js` still read the constants compiled into `src/data/`, so saving here
  changes no price a customer pays. Finishing it means three things landing together —
  `cart.js` taking prices as input, the checkout function reading the same stored record at
  request time, and security rules plus server-side `validatePricing` on writes. The seam
  doc at the top of `backend/adapter.js` spells it out under "PRICING, WHEN THE BACKEND IS
  REAL".
- Prices are deliberately GLOBAL, not per-flavor: every square sells for the same price,
  and a mixed six-pack would need a pricing rule (flat? cheapest free? sum minus one?) that
  nobody has decided. Don't add a per-flavor price field without settling that first.
