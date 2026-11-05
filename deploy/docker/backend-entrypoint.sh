#!/usr/bin/env bash
set -euo pipefail

export DATABASE_URL="${DATABASE_URL:-file:/app/data/dev.db}"

mkdir -p /app/data
chown -R canteen:canteen /app/data

if [[ ! -f /app/data/dev.db ]]; then
  echo "No SQLite database found in the mounted volume. Prisma will create one."
fi

su -p -s /bin/sh canteen -c "cd /app && node /usr/local/bin/canteen-normalize-merchant-user-uniques.cjs"
su -p -s /bin/sh canteen -c "cd /app && npx prisma db push --skip-generate --accept-data-loss"
su -p -s /bin/sh canteen -c "cd /app && node /usr/local/bin/canteen-seed-if-empty.cjs"

exec su -p -s /bin/sh canteen -c "cd /app && exec $*"
