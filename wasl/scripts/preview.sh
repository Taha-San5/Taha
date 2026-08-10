#!/usr/bin/env bash
# One command to see Wasl running on your own machine.
#
#   ./scripts/preview.sh
#
# Sets up .env with fresh secrets if needed, prepares the database, seeds the
# demo account and template gallery, builds, and serves on http://localhost:3000
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v node > /dev/null; then
  echo "Node 20+ is required: https://nodejs.org"
  exit 1
fi

MAJOR=$(node -v | sed 's/^v\([0-9]*\).*/\1/')
if [ "$MAJOR" -lt 20 ]; then
  echo "Node 20+ is required (found $(node -v))"
  exit 1
fi

rand() { node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"; }

if [ ! -f .env ]; then
  echo "· writing .env with fresh secrets"
  cat > .env <<EOF
DATABASE_URL="file:./dev.db"
AUTH_SECRET="$(rand)"
ENCRYPTION_KEY="$(rand)"
OPENAI_API_KEY=""
OPENAI_BASE_URL="https://api.openai.com/v1"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
EOF
fi

echo "· installing dependencies (a minute or two the first time)"
npm install --no-audit --no-fund --silent

echo "· preparing the database"
npx prisma db push --skip-generate > /dev/null
npx tsx prisma/seed.ts

echo "· building"
npx next build > /dev/null

cat <<'EOF'

  ───────────────────────────────────────────────
   Wasl is starting on  http://localhost:3000

   Sign in:   demo@wasl.app
   Password:  wasl1234

   Worth a look:
     /                    the landing page
     /app                 your flows
     /app/flows/<id>      the builder — hit "Test run"
     /templates           10 installable templates
     /docs                node reference

   No API key needed: AI nodes use a simulated model,
   badged in the UI. Add your own key under
   /app/credentials to run against a real model.

   Ctrl+C to stop.
  ───────────────────────────────────────────────

EOF

exec npx next start
