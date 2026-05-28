#!/usr/bin/env python3
"""Aggregate eddi hourly CSV to daily totals and write to InfluxDB myenergi_daily."""

import csv
import sys
from datetime import datetime, timezone, date
from zoneinfo import ZoneInfo
from collections import defaultdict
import urllib.request
import urllib.error

CSV_PATH = "/mnt/c/Users/colfi/Downloads/23323250_eddi_report (1).csv"
INFLUX_URL = "http://10.0.0.254:30115"
INFLUX_TOKEN = "ZTDJ84HNA2kX4Pt53ndnll2ayO_OdAwHelM22AyxjZ4PlwVqg0PmkpTmJnYo8jbibcSjihPOg6WHHAFn2klEMw=="
INFLUX_ORG = "homelab"
INFLUX_BUCKET = "homeassistant"
MEASUREMENT = "myenergi_daily"

DUBLIN = ZoneInfo("Europe/Dublin")

def parse_ts(ts_str):
    ts_str = ts_str.strip()
    for fmt in ("%Y-%m-%d %H:%M:%S.%f UTC", "%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ"):
        try:
            dt = datetime.strptime(ts_str, fmt).replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    raise ValueError(f"Cannot parse: {ts_str!r}")

def safe_float(s):
    s = s.strip()
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None

# Accumulate daily totals in Dublin timezone
daily = defaultdict(lambda: {
    "solar_wh": 0.0,
    "import_wh": 0.0,
    "export_wh": 0.0,
    "divert_wh": 0.0,
    "boost_wh": 0.0,
    "hours": 0,
})

with open(CSV_PATH, newline="", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    for row in reader:
        ts_raw = row.get("Timestamp", "").strip()
        if not ts_raw:
            continue
        try:
            utc_dt = parse_ts(ts_raw)
        except ValueError as e:
            print(f"Skip bad ts: {e}", file=sys.stderr)
            continue

        dublin_dt = utc_dt.astimezone(DUBLIN)
        day = dublin_dt.date()

        solar  = safe_float(row.get("Total Generation (Wh)", ""))
        imp    = safe_float(row.get("Net Grid Import (Wh)", ""))
        exp    = safe_float(row.get("Net Grid Export (Wh)", ""))
        div_l1 = safe_float(row.get("Diverter Energy (L1) (Wh)", ""))
        bst_l1 = safe_float(row.get("Boosted Energy (L1) (Wh)", ""))

        # Skip rows with no energy data
        if all(v is None for v in [solar, imp, exp, div_l1, bst_l1]):
            continue

        d = daily[day]
        d["solar_wh"]  += solar  or 0.0
        d["import_wh"] += imp    or 0.0
        d["export_wh"] += exp    or 0.0
        d["divert_wh"] += div_l1 or 0.0
        d["boost_wh"]  += bst_l1 or 0.0
        d["hours"]     += 1

print(f"Aggregated {len(daily)} days (first: {min(daily)}, last: {max(daily)})")

# Build line protocol
lines = []
for day in sorted(daily):
    d = daily[day]
    if d["hours"] == 0:
        continue

    # Midnight Dublin time = start of that day in Dublin tz → convert to UTC nanoseconds
    midnight_dublin = datetime(day.year, day.month, day.day, 0, 0, 0, tzinfo=DUBLIN)
    ts_ns = int(midnight_dublin.timestamp() * 1_000_000_000)

    solar_kwh  = round(d["solar_wh"]  / 1000, 4)
    import_kwh = round(d["import_wh"] / 1000, 4)
    export_kwh = round(d["export_wh"] / 1000, 4)
    green_kwh  = round(d["divert_wh"] / 1000, 4)
    eddi_kwh   = round((d["divert_wh"] + d["boost_wh"]) / 1000, 4)

    lines.append(
        f"{MEASUREMENT},source=eddi_csv "
        f"solar_generated_kwh={solar_kwh},"
        f"grid_import_kwh={import_kwh},"
        f"grid_export_kwh={export_kwh},"
        f"green_energy_kwh={green_kwh},"
        f"eddi_energy_kwh={eddi_kwh} "
        f"{ts_ns}"
    )

print(f"Writing {len(lines)} daily points to InfluxDB...")

# Write in batches
BATCH = 200
errors = 0
for i in range(0, len(lines), BATCH):
    batch = lines[i:i+BATCH]
    payload = "\n".join(batch).encode()
    req = urllib.request.Request(
        f"{INFLUX_URL}/api/v2/write?org={INFLUX_ORG}&bucket={INFLUX_BUCKET}&precision=ns",
        data=payload,
        headers={
            "Authorization": f"Bearer {INFLUX_TOKEN}",
            "Content-Type": "text/plain; charset=utf-8",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            pass  # 204 = success
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"Batch {i//BATCH} error {e.code}: {body[:200]}", file=sys.stderr)
        errors += 1

if errors == 0:
    print(f"Done — {len(lines)} days written successfully.")
else:
    print(f"Done with {errors} batch errors.")
