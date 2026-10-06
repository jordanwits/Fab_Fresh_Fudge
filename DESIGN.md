# Design

## Visual Theme

"Mt. Shasta alpine." The shop sits under the mountain on its logo, so the chrome is sky, snow and night navy, like a vintage national-park poster; the fudge photography carries all the chocolate. White for product browsing, an ice-blue wash for cards and the Build a Box band, deep Fresh Blue drenched sections (Reviews, Corporate) with snow text, and a night-navy footer that rises out of the page as Mt. Shasta's silhouette, snowcap on top. Fresh Blue carries every interactive element; Buttercream is the single warm accent (stars, badges, prices and the quote button on blue). Brown was retired from the UI on 2026-10-06 when the client asked to lean into blue. No script fonts, no florals, no SaaS gradients.

## Color (OKLCH)

Client swatches in play: Fresh Blue `#2B99D1` (the brand) · Buttercream `#F3D9A4` (warm accent). Vanilla, Milk Chocolate and Dark Cocoa are no longer used on the public site.

| Token | Value | Role |
|---|---|---|
| `--bg` | `oklch(1 0 0)` | page background (shop/browse sections) |
| `--surface` | `oklch(0.971 0.012 231)` | ice — Fresh Blue washed 8% onto white, opaque: flavor cards, Build a Box, scrolled header, phone menu, drawers/dialogs |
| `--ink` | `oklch(0.27 0.06 252)` | night navy — body text on light |
| `--muted` | `oklch(0.45 0.07 248)` | slate blue — secondary text on light |
| `--line` | `oklch(0.9 0.025 238)` | hairlines |
| `--placeholder` | `oklch(0.86 0.04 236)` | photo placeholder while a flavor shot loads; empty thumbs |
| `--night` | `oklch(0.31 0.08 252)` | cart drawer header, closed-season panel, box tray |
| `--night-deep` | `oklch(0.23 0.065 255)` | footer + Shasta ridge, floating box pill, sold-out badge, text on Buttercream |
| `--snow` | `oklch(0.985 0.008 235)` | text on dark; the ridge's snowcap |
| `--snow-muted` | `oklch(0.86 0.04 235)` | secondary text on dark |
| `--blue-drench` | `oklch(0.46 0.085 243)` | deep Fresh Blue drench — Reviews + Corporate (client-approved 2026-10-06, then softened a touch: "too vibrant") |
| `--blue-raised` | `oklch(0.52 0.085 241)` | review cards on the drench |
| `--blue` | `oklch(0.52 0.13 240)` | primary brand: CTAs, active chips, event date chips — white text (deepened for AA) |
| `--blue-deep` | `oklch(0.45 0.12 242)` | hover, links on light |
| `--blue-pale` | `oklch(0.93 0.04 235)` | chips, event tags — `--blue-ink` text |
| `--sky` | `oklch(0.66 0.13 238)` | Fresh Blue #2B99D1 at full brightness: rules, borders, hover lines on dark |
| `--sky-light` | `oklch(0.82 0.08 236)` | lifted Fresh Blue for small text on navy (wordmark over the hero, footer headings) |
| `--butter` | `oklch(0.885 0.062 82)` | Buttercream accent: badges, stars, prices on blue — navy text |
| `--butter-deep` | `oklch(0.46 0.10 68)` | deep amber — accent text on light (flavor notes) |
| `--scrim` | `0 0 0` | plain black scrim channels for the hero photo (scrim, header wash, text shadows) — client chose black over navy; dialogs dim with a navy backdrop instead |

Strategy: **Committed** — blue owns the page: ice surfaces, a deep Fresh Blue drench twice, night navy at the base. Buttercream is the one warm counterweight, used sparingly so it reads as butter next to the photos. Fresh Blue #2B99D1 is too light for white text at body size, so filled buttons/links use the deepened `--blue`/`--blue-deep`; the literal swatch lives in `--sky`. All shadows and dark gradients are navy-hued (hue ~250), never neutral gray or warm brown — except the hero photo's scrim, which is plain black by client choice.

## Typography

- Display: **Young Serif** (400) — warm, chunky, 70s-cookbook; headings + wordmark. (Sans alternatives Archivo and Bricolage Grotesque were tried 2026-10-06; the client went back to Young Serif.)
- Body/UI: **Figtree** (400/500/600/700) — friendly humanist sans.
- Scale ≥1.25 modular, fluid clamp() heads, hero ≤ 4.5rem.

## Components

- Pill buttons (radius 999): Fresh Blue filled / snow outline on dark / Buttercream filled on the blue drench.
- Photo frames: plain rounded rectangles (`--radius` 18px, or `--radius-sm` 12px for the full-width Our Story letterbox) over a navy drop shadow. The earlier shop-window arch and its buttercream offset frame were retired with the Our Story rebuild.
- Date chips in Events styled as little squares in Fresh Blue (blue block, white text, deeper-blue base).
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
- Single page, anchor navigation, fixed header: transparent over the hero photo, ice-blue once scrolled.
- Footer: night navy with Mt. Shasta's ridge (`.site-footer::before/::after`, CSS masks so it stays on the tokens) rising into the Corporate section's bottom padding.
