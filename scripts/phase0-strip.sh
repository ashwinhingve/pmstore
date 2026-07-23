#!/usr/bin/env bash
#
# PMStore Phase 0 — strip Tapti modules and rebrand.
# Run from the root of a FRESH clone. Review `git diff` before committing.
#
#   git clone https://github.com/ashwinhingve/taptifs.git pmstore
#   cd pmstore && rm -rf .git && git init
#   bash scripts/phase0-strip.sh
#
set -euo pipefail

say() { printf '\033[1;36m▸ %s\033[0m\n' "$1"; }

[ -f package.json ] || { echo "Run this from the repo root."; exit 1; }

say "Removing wholesale / B2B portal"
rm -rf src/app/\(wholesale\) src/app/api/wholesale src/models/WholesaleApplication.ts

say "Removing production slides and team modules"
rm -rf src/app/api/production-slides src/app/admin/production \
       src/app/api/admin/production-slides src/app/api/team \
       src/app/api/admin/team src/app/admin/team \
       src/models/ProductionSlide.ts src/models/TeamMember.ts

say "Removing Tapti marketing content and media"
rm -rf public/images/tapti public/videos documents docs/superpowers
rm -f src/data/products.json 2>/dev/null || true

say "Clearing home page sections for redesign"
rm -rf src/components/home
mkdir -p src/components/home
cat > src/components/home/.gitkeep <<'EOF'
EOF

say "Rebranding string references"
grep -rl --include='*.ts' --include='*.tsx' --include='*.json' --include='*.md' \
  -e 'Tapti' -e 'taptifs' -e 'TAPTIFS' . 2>/dev/null \
  | grep -v node_modules | grep -v package-lock.json \
  | xargs -r sed -i \
      -e 's/Tapti Food & Spices/PMStore/g' \
      -e 's/Tapti Foods/PMStore/g' \
      -e 's/Tapti/PMStore/g' \
      -e 's/taptifs\.com/pratigyamedicalstore.com/g' \
      -e 's/taptifs/pmstore/g' \
      -e 's/TAPTIFS/PMSTORE/g'

say "Renaming cart storage key"
sed -i 's/tapti-cart-storage/pmstore-cart/g' src/store/useCartStore.ts 2>/dev/null || true

say "Updating package name"
sed -i 's/"name": "taptifs"/"name": "pmstore"/' package.json

say "Removing stale docs"
rm -f README.md
cat > README.md <<'EOF'
# PMStore

Pharmacy eCommerce platform for Pratigya Medical Store.
Next.js 16 (App Router) · MongoDB Atlas · Cloudinary · Expo (Android).

    npm install
    cp .env.example .env.local   # fill in credentials
    npm run dev

See PMStore-Build-Plan.md for scope and architecture.
EOF

say "Scaffolding new directories"
mkdir -p src/lib/pharma src/components/strip src/app/api/v1 \
         src/app/\(shop\)/prescriptions tests/integration

cat <<'EOF'

Phase 0 automated pass complete.

Still to do by hand (see PHASE-0-PATCHES.md):
  1. next.config.js       — replace Access-Control-Allow-Origin: * with an allow-list
  2. src/lib/auth.ts      — remove the hardcoded admin email, switch to DB-driven roles
  3. src/models/User.ts   — add the `role` enum: client | staff | admin
  4. src/models/Product.ts— add the pharma fields
  5. src/lib/payment/     — swap the gateway if the client uses Razorpay
  6. Delete leftover Tapti images under public/ that the script could not identify

Then: npm install && npm run build

EOF
