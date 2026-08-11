# Fab Fresh Fudge (v1)

Single-page React landing-site redesign of fabfreshfudge.com for Fab Fresh Fudge (site copy still says
"Fabulous Fudge") — the Ragle family's small-batch fudge business near Mt. Shasta, Northern California.
Built by West Wave Creative. Static Vite 5 + React 18, plain JSX (no TypeScript), no backend — checkout
hands off to the client's existing Square Online store. No deploy target is recorded in this repo.

**This is the OLDER v1 iteration; `..\Fab Fresh Fudge 2` is the active/newer build** (Vite 6 + TS,
rebuilt 2026-06-15 as a deliberately different "editorial counter" design). Same brand and flavor data
in both; this repo keeps the original "corner fudge shop" design.

## Commands

- `npm run dev` — Vite dev server (port = `PORT` env or 5173; `.claude/launch.json` config: `fudge-dev`)
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
- `src/styles.css` — ALL styling and the design tokens in this one file (no CSS Modules)
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
- Not a git repo and no `.gitignore` (add one before `git init` — `node_modules/`, `dist/`, and the
  51 MB `originals/` tree are all present and none belong in version control as-is).
- `dist/` is a fresh 2026-08-10 build (6.7 MB, mostly images).
