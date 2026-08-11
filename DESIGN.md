# Design

## Visual Theme

A corner fudge shop: warm cocoa/cream base with the logo's Fresh Blue as the single brand pop. Dark Cocoa drenched sections (the chocolate IS the interior) with Milk Chocolate raised surfaces, Vanilla cream for text-on-dark and tinted cards, white reserved for product browsing. Fresh Blue carries every interactive element; Buttercream is the warm accent on badges/stars/specials. The logo's blue appears at full brightness once, as the flavor-marquee band. Arched "shop-window" photo frames. No script fonts, no florals, no SaaS gradients.

## Color (OKLCH)

Client swatches: Vanilla `#FFF6E6` · Buttercream `#F3D9A4` · Milk Chocolate `#7A4A2A` · Dark Cocoa `#3D2418` · Fresh Blue `#2B99D1`.

| Token | Value | Role |
|---|---|---|
| `--bg` | `oklch(1 0 0)` | page background (shop/browse sections) |
| `--surface` | `oklch(0.975 0.018 85)` | Vanilla — tinted cards/section bands |
| `--ink` | `oklch(0.29 0.045 50)` | Dark Cocoa — body text on light |
| `--muted` | `oklch(0.45 0.075 52)` | Milk Chocolate — secondary text on light |
| `--cocoa-deep` | `oklch(0.29 0.045 50)` | Dark Cocoa drench (header, hero, reviews, corporate) |
| `--cocoa-deepest` | `oklch(0.23 0.04 47)` | footer, floating pill, ink-on-accent |
| `--cocoa` | `oklch(0.45 0.075 52)` | Milk Chocolate raised surface (review cards, slots) |
| `--cream` | `oklch(0.975 0.018 85)` | Vanilla — text on dark |
| `--cream-muted` | `oklch(0.84 0.045 80)` | soft buttercream — secondary text on dark |
| `--blue` | `oklch(0.52 0.13 240)` | primary brand: CTAs, active chips — white text (deepened for AA) |
| `--blue-deep` | `oklch(0.45 0.12 242)` | hover, links on light |
| `--blue-pale` | `oklch(0.93 0.04 235)` | chips, event tags — `--blue-ink` text |
| `--sky` | `oklch(0.66 0.13 238)` | Fresh Blue #2B99D1 at full brightness: marquee band — cocoa text |
| `--butter` | `oklch(0.885 0.062 82)` | Buttercream accent: badges, stars, specials band — cocoa text |
| `--butter-deep` | `oklch(0.46 0.10 68)` | deep amber — accent text on light (flavor notes) |

Strategy: **Committed** — Dark Cocoa + Milk Chocolate carry the drenched sections; Vanilla/white the browsing surface; Fresh Blue is the lone interactive pop; Buttercream the warm accent. Fresh Blue #2B99D1 is too light for white text at body size, so filled buttons/links use the deepened `--blue`/`--blue-deep`; the literal swatch lives in `--sky` (marquee band, dark text). All shadows and dark gradients are warm cocoa-hued (hue ~45–55), never cool gray.

## Typography

- Display: **Young Serif** (400) — warm, chunky, 70s-cookbook; headings + wordmark.
- Body/UI: **Figtree** (400/500/600/700) — friendly humanist sans.
- Scale ≥1.25 modular, fluid clamp() heads, hero ≤ 4.5rem.

## Components

- Pill buttons (radius 999): Fresh Blue filled / cream outline on dark.
- Photo frames: plain rounded rectangles (`--radius` 18px, or `--radius-sm` 12px for the full-width Our Story letterbox) over a warm cocoa drop shadow. The earlier shop-window arch and its buttercream offset frame were retired with the Our Story rebuild.
- Date chips in Events styled as little fudge squares (cocoa block, cream text, buttercream month).
- Circular badge logo (`public/images/Logos/Fab Fresh Color.png`) in header (44px) and footer (76px).
- Flavor cards: surface bg, 4:3 photo, Young Serif name, 2-line desc clamp, price + round add button.
- Build-a-Box: 6 visual slots that fill with flavor photos; chip list to add; floating progress pill.

## Motion

- One orchestrated hero load (staggered rise + fade, 600ms, ease-out-quint).
- Scroll reveals via IntersectionObserver, additive only (content visible without JS).
- Slow flavor-name marquee under hero (Fresh Blue band); paused + static under `prefers-reduced-motion`.
- Build-a-Box slot fill: small scale-in pop.

## Layout

- Max content width 1180px; fluid section padding `clamp(4rem, 9vw, 7.5rem)`.
- Nav: exactly the client's tabs — Shop, Build a Box, Our Story, Reviews, Events, Corporate Gifts.
- Single page, anchor navigation, sticky cocoa header.
