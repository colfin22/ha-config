#!/bin/sh
# Fetches today's Frigate person events (with snapshots) as JSON on stdout, for
# the four "Frigate Overnight ..." command_line sensors to parse.
#  - Logs the homeassistant user in (password from /config/.frigate_pw, gitignored),
#    so no credential lives in the tracked config.
#  - Computes local midnight with "YYYY-MM-DD 00:00", which both BusyBox (the HA
#    core container) and GNU date accept — unlike "today 00:00", which is GNU-only
#    and silently produced an empty timestamp, breaking these sensors.
FRIGATE="http://10.0.0.246:8971"
curl -s -c /tmp/fg_cookie.txt -X POST "$FRIGATE/api/login" \
  -H 'Content-Type: application/json' \
  -d "{\"user\":\"homeassistant\",\"password\":\"$(cat /config/.frigate_pw)\"}" \
  -o /dev/null
MIDNIGHT=$(date -d "$(date +%Y-%m-%d) 00:00" +%s)
curl -s -b /tmp/fg_cookie.txt \
  "$FRIGATE/api/events?label=person&after=${MIDNIGHT}&has_snapshot=1&limit=100"
