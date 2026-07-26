# Design system

## The idea

Dr Morepen and PlatinumRx — the client's references — both look like Flipkart with pills: dense
grids, red discount badges, festival banners. That's the wrong register. Buying medicine isn't
shopping. It's an errand, usually slightly anxious, often for a parent, and usually the same
errand every month.

**PMStore reads as a prescription counter, not a store.** Calm, precise, legible, fast. The
visual language comes from Indian pharmacy packaging — carton navy, blister foil, prescription-pad
paper — not from stock medical-website teal.

---

## Tokens

Defined in `src/styles/tokens.css`. Never hardcode a hex value in a component.

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#16233A` | carton navy — primary text, dark surfaces |
| `--ink-70` | `#56607A` | secondary text |
| `--ink-40` | `#9AA2B4` | tertiary, placeholders |
| `--paper` | `#FBFAF7` | page background |
| `--paper-card` | `#FFFFFF` | cards |
| `--foil` | `#C9CFD6` | dividers, strip edges |
| `--foil-soft` | `#E9ECEF` | hairline borders |
| `--mint` | `#0E8F6E` | in stock, savings, verified |
| `--mint-soft` | `#E4F3ED` | savings backgrounds |
| `--rx` | `#B23A34` | **prescription flags only** |
| `--rx-soft` | `#FAECEA` | Rx badge background |

**`--rx` is never used for discounts, sales, or errors.** On a pharmacy, red means "this needs a
doctor." Diluting that is a safety problem, not a style choice. Use `--ink-70` for destructive
confirmations and `--mint` for savings.

### Surfaces and tints

| Token | Value | Use |
|---|---|---|
| `--ink-deep` | `#0F1A2E` | gradient end for navy bands |
| `--ink-10` | `#E4E7ED` | hairlines and subtle fills on dark surfaces |
| `--surface-hero` | navy 140° gradient | hero and closing CTA bands, footer |
| `--surface-mint` | mint 140° gradient | rare emphasis surfaces (savings feature) |
| `--paper-tint` | `#F4F2ED` | warm alternating-section background |
| `--paper-tint-mint` | `#F0F8F5` | mint-washed section background |

These are the only sanctioned gradients. Text on `--surface-hero` is `--paper`; hairlines on it
are `--ink-10`. Never invent a new gradient in a component.

### Category tints (decorative)

`--tint-{sage,sky,teal,amber,violet,slate,plum,clay}` each pair a soft background (`-soft`) with a
deeper accent. They exist for **designed medicine tiles** (the catalogue no longer repeats one stock
photo per dosage form) and category cards — a product with no real photo shows a category-tinted
tile with its dosage-form glyph, so every card reads as distinct. Assigned per category in
`src/lib/categories.ts` (`getCategoryTint`). They are muted, low-saturation, and **never in the red
hue** — `--rx` red must keep its exclusive "needs a doctor" meaning. Decorative only: never carry
state or meaning through a tint.

### Elevation

| Token | Use |
|---|---|
| `--shadow-xs` | pressed / resting chips |
| `--shadow-sm` | resting cards, sticky header after scroll |
| `--shadow-md` | raised cards, dropdowns, hovered interactive cards |
| `--shadow-feature` | premium feature surfaces (hero card, featured, detail buy-box) |
| `--shadow-lg` | drawers, dialogs, sticky order summaries |
| `--shadow-hero` | the hero search card and nothing else |

`--shadow-card` remains as a legacy alias; new work picks from the scale. An interactive card may
raise one step on hover (`sm → md`) over `--dur-fast`. No scale transforms on hover.

---

## Typography

| Role | Face | Used for |
|---|---|---|
| Display | Bricolage Grotesque | headings, product names, section titles |
| Body | Public Sans | everything else |
| Data | Martian Mono | **every measured value** |

All three are free on Google Fonts. Load through `next/font/google` with `display: 'swap'`,
subset `latin`, and preload the display and body faces only.

### The mono rule

Any value with a unit renders in Martian Mono with `font-variant-numeric: tabular-nums`:

- strengths — `650 mg`, `12.5 mcg`
- pack sizes — `15 tablets`, `100 ml`
- prices — `₹30.50`, `₹1.90/tab`
- quantities, order numbers, dates

This is the type signature of the whole product. It makes the page read like packaging, and it
makes a column of prices comparable at a glance because the digits line up. Prose stays in
Public Sans. If you're unsure: does it have a unit? Then mono.

### Scale

`--step--1` through `--step-3`, fluid via `clamp()`, plus `--step-4` for the premium hero display
only (up to 4rem). Display weights 600 and 800 with `letter-spacing: -0.022em`. Body 400 and 500.
Never go below 12px, and never below 14px for anything a customer must read to take a medicine
correctly.

---

## Components

### Strip — the signature

`src/components/strip/Strip.tsx`. The alternatives module, drawn as a blister pack. This is both
the price-comparison feature and the visual identity of the product.

```
┌──────────────────────────────────────────────────────────────┐
│  Same salt, 5 brands                        priced per tablet │
│ ┌──────────┬──────────┬──────────┬──────────┬──────────┐     │
│ │ VIEWING  │ CHEAPEST │TOP RATED │          │OUT OF ST.│     │
│ │ Dolo 650 │Calpol 650│Crocin 650│Pacimol   │Sumo 650  │     │
│ │  ₹2.03   │  ₹1.46   │  ₹1.83   │  ₹1.71   │  ₹1.58   │     │
│ │ 15 tab   │ 15 tab   │ 20 tab   │ 10 tab   │ 15 tab   │     │
│ │ ₹30.50   │ ₹21.90   │ ₹36.60   │ ₹17.10   │ ₹23.70   │     │
│ └──────────┴──────────┴──────────┴──────────┴──────────┘     │
│  ↘ Switch to Calpol 650 and save ₹8.60 on this strip          │
└──────────────────────────────────────────────────────────────┘
```

Rules:
- **`unitPrice` is the headline number.** Pack size and pack price sit below it, smaller. Never
  lead with pack price — a ₹28 strip of 15 costs more per tablet than a ₹52 strip of 30, and
  leading with the pack price tells the customer the opposite of the truth.
- Current product: 2px `--ink` border, `VIEWING` eyebrow.
- Cheapest: `--mint-soft` fill, `--mint` text.
- Top rated: only when that product has ≥5 reviews. Otherwise omit the badge.
- Out of stock: shown, dimmed to 60%, sorted last. Knowing a cheaper option exists but is
  unavailable is still useful.
- Rendered server-side from the RSC page. No client fetch, no loading state.
- Mobile: horizontal scroll with snap points, current product scrolled into view on mount.
- Each pill is a link. Keyboard navigable with arrow keys.

### PriceBlock

```
₹30.50   MRP ₹36.00   Save 15%
₹2.03 per tablet · 15 tablets
```

Price in mono at `--step-1`. MRP struck through in `--ink-40`. Savings in `--mint`, never red.
The per-unit line is always present, never optional.

### RxBadge

Pill, `--rx-soft` background, `--rx` text, prescription icon. Label by schedule: `Schedule H`,
`Schedule H1`, `Schedule X`. Above the fold on the product page, on the card in listings, and on
the cart line. A customer should never reach checkout surprised.

### ProductCard

Image (square, `next/image`, `sizes` set), name in display, composition in mono at `--step--1`,
PriceBlock, stock state, RxBadge if applicable. On hover the card raises one elevation step
(`--shadow-sm → --shadow-md`) over `--dur-fast`; no scale, no translate. One card style
everywhere.

### SearchBar

Full width on mobile, prominent on the home page — it's the primary navigation. Debounce 200 ms,
suggestions in a listbox with proper ARIA, arrow-key navigation, Enter to select, Escape to
close. Show recent searches on focus when empty. Placeholder is a real example:
`Dolo 650, paracetamol, blood pressure` — not "Search products".

### EmptyState

An invitation, not an apology. Headline names the space, one line explains, one verb CTA.
"No saved medicines yet / Save the ones you buy often and reorder in one tap / Browse medicines".
Never "Nothing here." Prefer the `illustration` prop with a piece from
`src/components/illustrations` over a bare icon.

### Shared primitives (added in the premium pass)

| Component | Where | Use |
|---|---|---|
| `Card` | `ui/card.tsx` | surface/elevated/interactive/flat variants on the elevation scale |
| `Skeleton` | `ui/skeleton.tsx` | shimmer loading blocks — every `loading.tsx` builds from these |
| `Drawer` | `ui/drawer.tsx` | the one slide-in panel: mobile nav, product filters, admin nav. Focus trap, Escape, scroll lock built in — never hand-roll another drawer |
| `Container` | `shared/Container.tsx` | 1200px page width + standard padding |
| `SectionHeading` | `shared/SectionHeading.tsx` | eyebrow + display title + description; `onDark` for navy bands |
| `AccountShell` | `account/AccountShell.tsx` | signed-in account chrome (sidebar / pill nav) |
| Illustrations | `illustrations/index.tsx` | 8 inline-SVG pieces in token colors — the only imagery besides product photos |

Buttons support a `loading` prop (spinner + `aria-busy`); default height is 44px.

---

## Layout

Home page is **search-first**. The hero is a `--surface-hero` navy band whose primary element is
the search card (`--shadow-hero`) — not a promotion. Three doors, in this order:

1. Search
2. Order again — last order, one tap, only when signed in with order history
3. Upload prescription

No carousels, no smiling pharmacist stock photos, no festival banners. Illustration is inline SVG
in token colors only. Below the fold, sections alternate `--paper` / `--paper-tint` backgrounds
instead of hairline dividers. Categories and offers go below the fold.

Container max-width 1200px. Mobile-first — build the 360px layout, then widen.

---

## Motion

Restrained. Durations come from tokens: `--dur-fast` (120 ms) for hovers and fades, `--dur-base`
(180 ms) for the Strip's brand switch and step transitions, `--dur-slow` (240 ms) for drawers.
Nothing slower. Easing is `--ease-out`.

The one orchestrated moment is switching brands in the Strip: 180 ms ease-out on the active
border and the price crossfade. Entrance reveals (stagger, fade-up) are allowed only on marketing
surfaces (home, about, wholesale), fire once, and never move content more than 16px.

Respect `prefers-reduced-motion` — the global kill-switch lives in `tokens.css`, and
framer-motion components must also check `useReducedMotion`. No parallax anywhere; customers are
here to buy medicine, often in a hurry, sometimes worried.

---

## Copy voice

Plain, direct, second person. Sentence case everywhere. Contractions are fine.

- Buttons name the action: `Add to cart`, `Upload prescription`, `Order again`. Not `Submit`, not `Click here`.
- An action keeps its name through the flow. `Order again` produces a toast that says `Added to cart`.
- Errors say what happened and what to do, with no apology and no "Error:" prefix.
  `That pincode isn't in our delivery area yet. Try another, or call us on <number>.`
- Never "successfully". The confirmation is the confirmation.
- Never "simply", "just", "easy". Some customers are old, ill, or worried.
- Medical copy is never softened or embellished. Side effects and contraindications are printed
  as supplied, never summarized or paraphrased by us.

---

## Accessibility floor

Not optional. A meaningful share of this customer base is over 60.

- Body text 16px minimum. Never below 14px for anything medically relevant.
- Contrast 4.5:1 for text, 3:1 for interactive borders. `--ink` on `--paper` is ~13:1.
- Visible keyboard focus on everything — 2px `--ink` outline, 2px offset. Already in tokens.
- Touch targets 44×44px minimum.
- Every image has alt text; product images use the product name.
- Forms have real `<label>` elements. No placeholder-as-label anywhere.
- Test with keyboard only and with a screen reader before calling a page done.
- Layout must hold at 200% browser zoom.
