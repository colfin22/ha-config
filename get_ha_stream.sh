#!/usr/bin/env bash

set -eu

HA_TOKEN="${HA_TOKEN:?"HA_TOKEN is not set, make sure to have this environment variable set with your Home Assisant long-lived token."}"
entity_id="${1}"

HA_URL="${HA_URL:?"HA_URL is not set, e.g. http://homeassistant.local:8123"}"
exec curl -fsSL -H "Authorization: Bearer ${HA_TOKEN}" "${HA_URL%/}/api/camera_stream_source/${entity_id}"
