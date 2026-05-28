#!/usr/bin/env python3
"""Aggregate myenergi graph CSV to daily totals and write gap period to InfluxDB."""

import csv
import sys
from datetime import datetime, date, timezone
from zoneinfo import ZoneInfo
from collections import defaultdict
import urllib.request
import urllib.error

CSV_PATH = "/mnt/c/Users/colfi/Downloads/myenergi-graph-consumed-exported-20_03_2026-28_05_2026.csv"
INFLUX_URL = "http://10.0.0.254:30115"
INFLUX_TOKEN = "ZTDJ84HNA2kX4Pt53ndnll2ayO_OdAwHelM22AyxjZ4PlwVqg0PmkpTmJnYo8jbibcSjihPOg6WHHAFn2klEMw=="
INFLUX_ORG = "homelab"
INFLUX_BUCKET = "homeassistant"
MEASUREMENT = "myenergi_daily"

# Only write the gap period — eddi_csv already covers up to 2026-03-24
GAP_START = date(2026, 3, 25)
# Today is 2026-05-28 — last complete day is yesterday
GAP_END   = date(2026, 5, 27)

DUBLIN = ZoneInfo("Europe/Dublin")

daily = defaultdict(lambda: {"consumed": 0.0, "exported": 0.0, "imported": 0.0, "hours": 0})

with open(CSV_PATH, newline="", encoding="utf-8-sig") as f:
    reader = csv.reader(f)
    next(reader)  # skip header
    for row in reader:
        if len(row) < 4:
            continue
        ts = row[0].strip().strip('"')
        try:
            dt = datetime.strptime(ts, "%d/%m/%Y %H:%M")
        except ValueError:
            continue
        day = dt.date()
        if not (GAP_START <= day <= GAP_END):
            continue
        c = abs(float(row[1].strip('"') or 0))
        e = abs(float(row[2].strip('"') or 0))
        i = abs(float(row[3].strip('"') or 0))
        daily[day]["consumed"] += c
        daily[day]["exported"] += e
        daily[day]["imported"] += i
        daily[day]["hours"] += 1

print(f"Aggregated {len(daily)} days ({GAP_START} → {GAP_END})")

lines = []
for day in sorted(daily):
    d = daily[day]
    if d["hours"] < 20:  # skip days with too few hours
        print(f"  Skip {day}: only {d['hours']} hours", file=sys.stderr)
        continue

    midnight_dublin = datetime(day.year, day.month, day.day, 0, 0, 0, tzinfo=DUBLIN)
    ts_ns = int(midnight_dublin.timestamp() * 1_000_000_000)

    solar_kwh  = round(d["consumed"] + d["exported"], 4)
    export_kwh = round(d["exported"], 4)
    import_kwh = round(d["imported"], 4)

    # eddi was offline from cloud — diversion data unavailable, write 0
    lines.append(
        f"{MEASUREMENT},source=myenergi_graph "
        f"solar_generated_kwh={solar_kwh},"
        f"grid_import_kwh={import_kwh},"
        f"grid_export_kwh={export_kwh},"
        f"green_energy_kwh=0.0,"
        f"eddi_energy_kwh=0.0 "
        f"{ts_ns}"
    )

print(f"Writing {len(lines)} daily points...")

BATCH = 200
errors = 0
for i in range(0, len(lines), BATCH):
    batch = lines[i:i+BATCH]
    payload = "\n".join(batch).encode()
    req = urllib.request.Request(
        f"{INFLUX_URL}/api/v2/write?org={INFLUX_ORG}&bucket={INFLUX_BUCKET}&precision=ns",
        data=payload,
        headers={"Authorization": f"Bearer {INFLUX_TOKEN}", "Content-Type": "text/plain; charset=utf-8"},
        method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=30)
    except urllib.error.HTTPError as e:
        print(f"Batch error {e.code}: {e.read().decode()[:200]}", file=sys.stderr)
        errors += 1

print("Done." if not errors else f"Done with {errors} errors.")
