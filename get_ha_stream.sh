#!/usr/bin/env bash

set -eu

HA_TOKEN="${HA_TOKEN:?"HA_TOKEN is not set, make sure to have this environment variable set with your Home Assisant long-lived token."}"
entity_id="${1}"

exec curl -fsSL -H "Authorization: Bearer ${HA_TOKEN}" "http://10.0.0.252:8123/api/camera_stream_source/${entity_id}"
