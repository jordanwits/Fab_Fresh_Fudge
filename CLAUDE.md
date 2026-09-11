# Fab Fresh Fudge (v1)

Single-page React landing-site redesign of fabfreshfudge.com for Fab Fresh Fudge (site copy still says
"Fabulous Fudge") — the Ragle family's small-batch fudge business near Mt. Shasta, Northern California.
Built by West Wave Creative. Static Vite 5 + React 18, plain JSX (no TypeScript), no backend — checkout
hands off to the client's existing Square Online store. No deploy target is recorded in this repo.

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
  Events → Corporate → Footer, plus a floating BoxPill; box state (six flavor ids) lives here
- `src/components/*.jsx` — one component per section; `src/hooks/useReveal.js` = scroll-reveal
- `src/data/flavors.js` — 20-flavor catalog (real names/descriptions harvested from the client's
  Square store) + `SQUARE_PRICE` / `BOX_PRICE` / `BOX_SIZE`
- `src/data/site.js` — reviews, events, specials, corporate tiers, contact (all drafted placeholders)
- `src/styles.css` — ALL styling and the design tokens for the PUBLIC SITE in this one file
  (no CSS Modules). The admin has its own stylesheet; see below.
- `admin/index.html` + `src/admin/` — the staff dashboard, a second Vite entry (added
  2026-09-04). Vite serves it at `/admin/` in dev and builds it to `dist/admin/index.html`,
  so the URL is a real file on any static host — no SPA rewrite rule needed — and the
  marketing bundle never ships admin code. Inside `/admin/`, sections ride on the hash
  (`/admin/#/events`) for the same reason. Structure:
  - `backend/adapter.js` — THE SEAM. Every screen talks to `backend` and nothing else;
    swapping in Firebase or Supabase means writing one sibling file and changing one
    import. The contract and sketches for both providers are documented in that file.
  - `backend/localAdapter.js` — the current implementation: localStorage, seeded from
    `src/data/`, with deliberate latency so loading/error states are real code paths
  - `state/` — AuthContext (session gate), DataContext (all CRUD), ToastContext
  - `ui/` — the shared vocabulary: Button, Field, Dialog (native `<dialog>`), Drawer,
    ConfirmDialog, Toaster, Icon (one hand-rolled SVG set), States (empty/error/skeleton)
  - `lib/` — `useDragSort` (reorder-by-drag, no library), `eventDate`, `slug`, `image`,
    `router`, `useClosing`
  - `screens/` — Login, Shell, FlavorsScreen + FlavorEditor, EventsScreen + EventEditor,
    PackagesScreen + PackageEditor, ImageField
  - `admin.css` — ALL admin styling and its own token set (prefixed `--a-*`)
- `public/images/` — self-hosted photos: `flavors/` (19 original jpegs) plus
  `flavors/FlavorImages/` (client's 2026-08-10 reshoot — 10 flavors now point here), hero/story/
  corporate shots, client logo in `Logos/Fab Fresh Color.png`
- `originals/images/flavors/` — the uncompressed camera masters (51 MB), moved out of `public/` on
  2026-08-10 so they're preserved but never shipped. Re-run compression from here, not from `public/`.
- `research/` — raw harvest of the old Square site (sitemap, og-meta descriptions, reference photos)
- `PRODUCT.md` / `DESIGN.md` — brief + design-system docs; DESIGN.md matches the current tokens

## Deployment

Not determinable from the repo (no deploy config; README covers only local dev/build).

## Conventions / gotchas

- Palette is COMMITTED to client swatches (all authored in OKLCH): Vanilla #FFF6E6, Buttercream
  #F3D9A4, Milk Chocolate #7A4A2A, Dark Cocoa #3D2418, Fresh Blue #2B99D1. Filled buttons/links use a
  deepened `--blue` because literal Fresh Blue fails white-text AA; the literal swatch lives in `--sky`
  (marquee band, dark text). Don't reintroduce the earlier pistachio or navy palettes.
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
- "Add box to cart" is a front-end simulation; real checkout is the client's Square store.
- Prices, reviews, events, specials, corporate tiers, Our Story copy, and contact details are
  placeholders awaiting client confirmation.
- Git repo on `main`, pushed to https://github.com/jordanwits/Fab_Fresh_Fudge — a PUBLIC repo, so
  anything committed (including the admin demo credentials) is world-readable. `.gitignore` keeps
  `node_modules/`, `dist/`, and the 51 MB `originals/` tree out of version control.
- `dist/` is a fresh 2026-09-08 build; both entries (`dist/index.html` and
  `dist/admin/index.html`) come out of one `npm run build`.

### Admin dashboard gotchas

- The dashboard is UI-only. `localAdapter` sign-in compares strings in the browser, so it
  is a stub, NOT security — anyone can read the credentials in the bundle or edit
  localStorage directly. Real access control has to be enforced server-side (Supabase RLS
  or Firebase security rules) before `/admin/` is exposed to the internet.
- Demo sign-in: `owner@fabfreshfudge.com` / `fudge2026`, shown on the login screen behind
  `backend.isMock` so it disappears the moment a real adapter is wired in.
- Edits persist in localStorage under `fff-admin/v1` and reach nothing else. The public
  site still reads its static `src/data/` modules — connecting the two is the backend job.
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
  so `localAdapter` seeds them into 2027. Nothing lands in the Past group until the
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
- Uploaded photos are downscaled to 1000px in-browser and stored as base64 data URLs,
  purely to survive the ~5 MB localStorage budget. A real adapter uploads the original
  File to storage and `lib/image.js` goes away.
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
  array. Any future collection has to be added to that backfill list too.
