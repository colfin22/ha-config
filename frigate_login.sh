#!/usr/bin/env bash
# Logs the homeassistant user into Frigate (auth on port 8971) and writes the
# session cookie the Frigate command_line sensors reuse. Reads the password from
# /config/.frigate_pw (gitignored) so no credential lives in the tracked config.
curl -s -c /tmp/fg_cookie.txt -X POST http://10.0.0.246:8971/api/login \
  -H 'Content-Type: application/json' \
  -d "{\"user\":\"homeassistant\",\"password\":\"$(cat /config/.frigate_pw)\"}" \
  -o /dev/null
