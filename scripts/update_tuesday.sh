#!/bin/bash
# Update Tuesday launcher - runs from HA SSH addon context
set -e

LOG="/config/www/update_tuesday/last_run.log"
mkdir -p /config/www/update_tuesday

exec > >(tee "$LOG") 2>&1

echo "=== Update Tuesday $(date) ==="

# Ensure python3 is available (SSH addon: Alpine Linux)
if ! command -v python3 >/dev/null 2>&1; then
  echo "Installing python3..."
  apk add -q python3 2>/dev/null || true
fi

# Ensure known_hosts doesn't block new hosts
mkdir -p /root/.ssh
touch /root/.ssh/known_hosts

echo "Running report script..."
cd /config && PYTHONPATH=/config python3 /config/scripts/update_tuesday.py

echo "=== Complete $(date) ==="
