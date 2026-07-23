# PMStore — documentation and starter bundle

Everything Claude Code needs to build the PMStore pharmacy platform end to end, weeks 1 to 10.

## How to use this

This bundle is an **overlay**. Unzip it over a fresh fork of the Taptifs repo and every file
lands where it belongs.

```bash
git clone https://github.com/ashwinhingve/taptifs.git pmstore
cd pmstore
rm -rf .git && git init

unzip ~/Downloads/pmstore-docs.zip -d /tmp/
cp -r /tmp/pmstore/. .

git add -A && git commit -m "chore: fork from taptifs, add PMStore docs"
```

Then point Claude Code at the repo and start with:

```
Read CLAUDE.md and docs/04-ROADMAP.md week 1.
Give me a task-by-task plan before writing any code.
```

## What's here

```
CLAUDE.md                    ← Claude Code reads this every session
PMStore-Build-Plan.md        ← scope, budget, timeline (the client-facing plan)
.env.example                 ← free-tier stack

docs/
  00-ARCHITECTURE.md         system design, request flows, why each decision
  01-DATA-MODEL.md           collections, fields, indexes, derived-value rules
  02-API-CONTRACT.md         routes, shapes, auth, errors, rate limits
  03-DESIGN-SYSTEM.md        tokens, type rules, component specs, copy voice
  04-ROADMAP.md              ← weeks 1–10, tasks + acceptance criteria
  05-SETUP.md                local dev, Atlas, Atlas Search, deployment
  06-MOBILE-APP.md           Expo app plan, weeks 7–10
  07-TESTING.md              what to test, in priority order
  08-LAUNCH-CHECKLIST.md     security, SEO, performance, compliance, go-live
  09-PROMPTS.md              paste-ready prompts for each task
  PHASE-0-PATCHES.md         week 1 manual patches (CORS, RBAC, Product schema)

src/
  lib/pharma/composition.ts  compositionKey, unit pricing, alternative ranking
  models/Prescription.ts     new collection
  styles/tokens.css          design tokens
  app/api/CLAUDE.md          API-specific rules
  components/CLAUDE.md       component-specific rules
mobile/CLAUDE.md             mobile-specific rules

scripts/
  phase0-strip.sh            removes Tapti modules, rebrands
  atlas-search-index.json    Atlas Search index definition

templates/
  product-import-template.csv    the catalogue import contract
  IMPORT-NOTES.md                column rules and the no-salt-data fallback

.github/workflows/
  ci.yml                     lint + test + build on push
  cron.yml                   refill reminders, payment reconciliation
```

## The four rules that matter most

Everything else is detail. These cause real harm if broken:

1. **Compare `unitPrice`, never `price`.** A ₹28 strip of 15 costs more per tablet than a ₹52
   strip of 30. Leading with pack price tells customers the opposite of the truth about their
   medication costs.
2. **`compositionKey` and `unitPrice` are derived in a pre-save hook.** Any write path that
   bypasses `.save()` silently breaks the comparison feature.
3. **Prescription enforcement is server-side.** A disabled button is not access control.
4. **Roles are re-read from the database for destructive actions.** A stale JWT must not be able
   to delete products.

## Before week 2

The client must supply a catalogue export **including salt composition per SKU**. Formula search,
price comparison and alternatives all depend on it. If that data doesn't exist, weeks 2–3 stall
no matter how fast the code goes. See `templates/IMPORT-NOTES.md` for the fallback.
