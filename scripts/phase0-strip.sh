#!/usr/bin/env bash
#
# PMStore Phase 0 — strip Tapti modules and rebrand.
#
# Run from the repo root, AFTER the PMStore docs bundle has been copied in.
# Commit first: this rewrites files in place. `git status` afterwards is your review.
#
#   git add -A && git commit -m "checkpoint: before strip"
#   bash scripts/phase0-strip.sh
#   git status && git diff
#
set -euo pipefail

say() { printf '\033[1;36m▸ %s\033[0m\n' "$1"; }

[ -f package.json ] || { echo "Run this from the repo root."; exit 1; }

say "Removing wholesale / B2B portal"
rm -rf "src/app/(wholesale)" src/app/api/wholesale src/models/WholesaleApplication.ts

say "Removing production slides and team modules"
rm -rf src/app/api/production-slides src/app/admin/production \
       src/app/api/admin/production-slides src/app/api/team \
       src/app/api/admin/team src/app/admin/team \
       src/models/ProductionSlide.ts src/models/TeamMember.ts

say "Removing Tapti marketing content, media and legacy docs"
rm -rf public/images/tapti public/videos documents docs/superpowers
rm -f src/data/products.json

say "Clearing home page sections for redesign"
rm -rf src/components/home
mkdir -p src/components/home
touch src/components/home/.gitkeep

# ---------------------------------------------------------------------------
# Rebrand — code and config only.
#
# The PMStore docs deliberately reference "Taptifs" and the original repo URL:
# they explain what we forked and what carried over. Rewriting them would turn
# accurate history into nonsense, so they are excluded here.
# ---------------------------------------------------------------------------
say "Rebranding string references (docs excluded)"

PROTECTED='^\./(docs/|templates/|mobile/|CLAUDE\.md|README\.md|PMStore-Build-Plan\.md|src/app/api/CLAUDE\.md|src/components/CLAUDE\.md)'

grep -rl --include='*.ts' --include='*.tsx' --include='*.json' --include='*.md' \
  -e 'Tapti' -e 'taptifs' -e 'TAPTIFS' . 2>/dev/null \
  | grep -v node_modules \
  | grep -v package-lock.json \
  | grep -vE "$PROTECTED" \
  | tee /tmp/pmstore-rebrand-files.txt \
  | xargs -r sed -i \
      -e 's/Tapti Food & Spices/PMStore/g' \
      -e 's/Tapti Foods/PMStore/g' \
      -e 's/Tapti/PMStore/g' \
      -e 's/taptifs\.com/pratigyamedicalstore.com/g' \
      -e 's/taptifs/pmstore/g' \
      -e 's/TAPTIFS/PMSTORE/g'

say "Renaming cart storage key"
sed -i 's/tapti-cart-storage/pmstore-cart/g' src/store/useCartStore.ts

say "Updating package name"
sed -i 's/"name": "taptifs"/"name": "pmstore"/' package.json

cat <<EOF

Rebranded $(wc -l < /tmp/pmstore-rebrand-files.txt) files (list: /tmp/pmstore-rebrand-files.txt).
Docs, templates and mobile/ were left untouched by design.

Automated pass complete. Now review:

    git status
    git diff --stat
    grep -ri "tapti" src/ public/ --include='*.ts*' -l    # should be empty

Then do the manual patches in docs/PHASE-0-PATCHES.md:
  1. next.config.js  — remove Access-Control-Allow-Origin: *, scope CORS to /api/v1
  2. src/lib/auth.ts — remove the hardcoded admin email, DB-driven roles
  3. src/models/User.ts    — add role enum: client | staff | admin
  4. src/models/Product.ts — add pharma fields + the derive hook
  5. src/models/Product.ts — category: String -> ObjectId ref Category
  6. src/lib/payment/      — swap gateway if the client uses Razorpay

Then: npm install && npm run build

EOF
