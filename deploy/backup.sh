#!/usr/bin/env bash
# Saves a consistent copy of the TabCabin database and keeps the newest $KEEP copies.
# Run from anywhere; schedule it with cron, e.g.
#   15 3 * * * /opt/tabcabin/deploy/backup.sh >> /var/log/tabcabin-backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."
BACKUP_DIR=${BACKUP_DIR:-./backups}
KEEP=${KEEP:-7}
stamp=$(date +%Y%m%d-%H%M%S)
file="tabcabin-$stamp.db"

mkdir -p "$BACKUP_DIR"
docker compose exec -T tabcabin tabcabin backup "/data/$file"
docker compose cp "tabcabin:/data/$file" "$BACKUP_DIR/$file"
docker compose exec -T tabcabin rm -f "/data/$file"

# Remove old copies beyond the newest $KEEP.
ls -1t "$BACKUP_DIR"/tabcabin-*.db | tail -n +"$((KEEP + 1))" | xargs -r rm --
echo "$(date -Is) saved $BACKUP_DIR/$file"
