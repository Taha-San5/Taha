#!/bin/sh
# Container entrypoint: makes sure the schema matches the target database,
# applies it, seeds the template gallery on first boot, then serves the app.
set -e

: "${DATABASE_URL:?DATABASE_URL must be set}"
: "${AUTH_SECRET:?AUTH_SECRET must be set (32+ characters)}"
: "${ENCRYPTION_KEY:?ENCRYPTION_KEY must be set (32+ characters)}"

PROVIDER=${DATABASE_PROVIDER:-sqlite}

echo "· database provider: $PROVIDER"
node scripts/set-db-provider.mjs "$PROVIDER"
npx prisma generate

echo "· applying schema"
npx prisma db push --skip-generate --accept-data-loss

# Seed only when the gallery is empty, so redeploys never clobber real data.
if [ "${SKIP_SEED:-0}" != "1" ]; then
  echo "· seeding if empty"
  npx tsx prisma/seed.ts || echo "! seed skipped (already populated or failed non-fatally)"
fi

echo "· starting Wasl on port ${PORT:-3000}"
exec npx next start -p "${PORT:-3000}" -H 0.0.0.0
