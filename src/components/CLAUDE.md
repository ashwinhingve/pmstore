# Components

Applies in addition to the root `CLAUDE.md`. Design rules in `docs/03-DESIGN-SYSTEM.md`.

## Server vs client

Server Components by default. Add `'use client'` only for state, effects, or event handlers,
and push it as far down the tree as possible — a client boundary at the page level ships the
whole page to the browser.

The Strip is a Server Component. It fetches and ranks on the server and renders complete. No
loading state, no client fetch.

## Rules

- **Never hardcode a color.** Use the tokens in `src/styles/tokens.css`.
- **The mono rule:** every value with a unit renders in `--font-data` with tabular numerals.
  Strengths, pack sizes, prices, quantities, order numbers, dates. Prose stays in Public Sans.
- **`unitPrice` is the headline price** wherever brands are compared. Pack price goes below it,
  smaller. Never the other way round.
- **`--rx` red is for prescription flags only.** Not discounts, not errors, not sales.
- No `localStorage` for tokens or anything sensitive. The cart only, under `pmstore-cart`.
- Every image through `next/image` with a correct `sizes` prop.
- Real `<label>` on every input. Placeholder-as-label is not acceptable.
- Touch targets 44px minimum. Body text 16px minimum, never below 14px for medical content.
- Visible keyboard focus on everything. Never remove an outline without replacing it.
- Loading states are skeletons matching the final layout, not spinners — spinners cause layout
  shift and hurt CLS.

## Copy

Sentence case. Active voice, verb first. An action keeps its name through the flow.
Errors say what happened and what to do — no apology, no "Error:" prefix, no raw exception text.
Never "successfully", "simply", "just", or "easy".

## Before calling a component done

Keyboard-only pass · 320px viewport · 200% zoom · `prefers-reduced-motion` respected · a real
empty state and a real error state, not a blank div.
