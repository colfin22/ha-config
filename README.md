<div align="center">

# 🏠 Colm's Home Assistant Config

[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2026.6.0-41BDF5?logo=homeassistant&logoColor=white)](https://www.home-assistant.io/)
[![Automations](https://img.shields.io/badge/Automations-62-success?logo=homeassistant&logoColor=white)](automations.yaml)
[![License](https://img.shields.io/badge/Repo-Public-brightgreen)](https://github.com/colfin22/ha-config)

*A family smart home in Ireland — built for reliability, not demos.*

</div>

---

## 🏗️ Infrastructure

| Component | Detail |
|---|---|
| **PVE** | Proxmox VE — 2× Beelink S12 Mini PC (Intel N100, 16GB DDR4, 500GB SSD) |
| **HA** | Home Assistant OS — Proxmox VM |
| **NAS** | TrueNAS SCALE — TRIGKEY N100 Mini PC (32GB DDR4, 500GB SSD), MainPool (2× mirror, 3× WD Purple 6TB + 1× WD Red 8TB, ~10.88 TiB usable — upgrading to full 8TB as disks are replaced) |
| **Network** | MikroTik router + 6× managed switches/APs; wireless managed via MikroTik CAPsMAN |
| **VLANs** | Home · IoT · Work · Guest · Mgmt · Stack |
| **DNS** | Pi-hole × 2 (Proxmox LXC primary + TrueNAS app replica) |
| **Cameras** | Frigate NVR — Proxmox LXC, recordings on USB 3.0 RAID 0 enclosure |
| **Monitoring** | Zabbix — TrueNAS hosted; InfluxDB + Grafana — TrueNAS apps |
| **Offsite PVE (Daire's)** | Intel NUC7i3BNK (i3-7100U, 4GB RAM, 256GB SSD) running encrypted Proxmox — connected via WireGuard |

---

## 🔌 Integrations

### Core
| Integration | Purpose |
|---|---|
| [Alarmo](https://github.com/nielsfaber/alarmo) | Multi-zone alarm with Zigbee sensors |
| [Philips Hue](https://www.philips-hue.com/) | Hue lights — slowly migrating to Zigbee2MQTT (WIP) |
| [Zigbee2MQTT](https://www.zigbee2mqtt.io/) | Zigbee device bridge (lights, motion, contact sensors) |
| [Music Assistant](https://music-assistant.io/) | Multi-room audio — TuneIn (radio), Subsonic/Navidrome (local music), gPodder (podcasts) |
| [Frigate](https://frigate.video/) | Local AI camera NVR — person/cat/fox/vehicle detection |
| [go2rtc](https://github.com/AlexxIT/go2rtc) | Low-latency camera stream server (built into Frigate) |
| [Reolink](https://reolink.com/) | Doorbell camera — doorbell press events only; recording and detections handled by Frigate |
| [Immich](https://immich.app/) | Self-hosted photo library — Proxmox LXC, data in TrueNAS dataset |
| [LLM Vision](https://github.com/valentinfrlch/ha-llmvision) | AI camera analysis via Google Gemini |

### Network & Infrastructure
| Integration | Purpose |
|---|---|
| [MikroTik Router](https://github.com/tomaae/homeassistant-mikrotik_router) | Router stats, interface monitoring |
| [Proxmox VE](https://github.com/doudz/homeassistant-proxmoxve) | VM/LXC status monitoring |
| [TrueNAS](https://github.com/tomaae/homeassistant-truenas) | Pool health, disk temps, dataset usage |
| [Pi-hole](https://pi-hole.net) | DNS query stats for two instances |
| [MQTT](https://mqtt.org) | Message broker — Proxmox LXC, underpins Z2M, Frigate and Alarmo |
| [Nextcloud](https://nextcloud.com/) | Self-hosted cloud — Proxmox VM, data in TrueNAS dataset |
| [Collabora Online](https://www.collaboraoffice.com/) | Self-hosted office suite — Ubuntu Docker, WOPI integration with Nextcloud for in-browser document editing |
| [InfluxDB](https://www.influxdata.com/) | Long-term time-series store — all HA entities written continuously; energy/solar history back to 2025, ESBN meter data back to 2024 |

### Energy & Environment
| Integration | Purpose |
|---|---|
| [Autarco](https://www.autarco.com/) | Solar inverter — cloud stats (slower polling) |
| [myenergi](https://myenergi.com/) | Solar production, Eddi diverter — preferred for live stats (faster updates) |
| [Netatmo](https://www.netatmo.com/) | Smart thermostat — heating control |
| [Met Éireann](https://www.met.ie/) | Weather warnings — custom REST sensor polling the Met Éireann open data API; automation fires immediately on new alerts |
| [Forecast.Solar](https://forecast.solar/) | Solar production forecast |
| [Electricity Maps](https://www.electricitymaps.com/) | Grid CO2 intensity |
| [esbn-to-mqtt](https://github.com/omgapuppy/esbn-to-mqtt) | HA add-on — ESB Networks smart meter data via HDF; MQTT discovery sensors for import/export totals; feeds Solar dashboard and InfluxDB |

### Media & Lifestyle
| Integration | Purpose |
|---|---|
| NVIDIA Shield TV | Living room media player — IoT VLAN |
| Google Cast | Kitchen display, Google Home & Chromecast Audio devices — whole-home audio — IoT VLAN |
| Samsung TV | 65" sitting room TV — IoT VLAN |
| Android TV | Aoife MiBox S + Cian MiTV + Kitchen MiBox — IoT VLAN |
| Logitech Harmony | 2 hubs — IoT VLAN |
| [Navidrome](https://navidrome.org/) | Self-hosted music streaming — Proxmox LXC, data in TrueNAS dataset |
| [Calibre-Web](https://github.com/janeczku/calibre-web) | Self-hosted ebook library — Proxmox LXC, data in TrueNAS dataset |
| [Paperless-ngx](https://docs.paperless-ngx.com/) | Document management — Ubuntu Docker, data in TrueNAS dataset |
| [Wallabag](https://wallabag.org/) | Read-it-later — Ubuntu Docker, data in TrueNAS dataset |
| [Stremio](https://www.stremio.com/) | Streaming media |
| [Dawarich](https://dawarich.app/) | Location & travel tracking — TrueNAS app, fed from HA Companion App on Android |
| [Waste Collection Schedule](https://github.com/mampfes/hacs_waste_collection_schedule) | Panda Waste bin collection — calendar alerts for upcoming collections |
| [CalDAV](https://www.home-assistant.io/integrations/caldav/) | Calendar integration |
| [HA Companion App](https://companion.home-assistant.io/) | Mobile app on all phones — presence, notifications, location |

---

## 🤖 Automations

62 automations across the home. Key highlights:

### 💡 Lighting
- **Occupancy lighting** — hallway, landing, and rooms via Zigbee motion sensors + lux thresholds; scene-based (bright/dimmed), fade-to-off on exit
- **Sunrise/sunset** — scene transitions throughout the day

### 🔒 Security
- **Alarm** — Alarmo multi-zone; NFC tag to disarm on entry; strobe all lights on trigger (saves/restores state), notifies all phones
- **Cameras** — person detection notifications from all cameras to Colm & Olivia with animated GIF preview
- **Doorbell** — Frigate snapshot cast to kitchen display & Shield TV on ring
- **Cat alarm** — protects Cian's cockatiel when cage is outside; NFC-toggled, Frigate cat detection → TTS alert
- **Morning security report** — summary of overnight person detections delivered at 07:00; also notes any cats, foxes, dogs or birds spotted overnight
- **Patio door** — NFC-toggled gate suppresses Frigate rear door & shed alerts when patio door is open; auto-disarms on door close

### 🌤️ Weather
- **Morning forecast** — daily weather summary pushed to all phones at 08:30 with emoji-coded conditions; if Colm or Olivia is more than 100km from home a second block is added for their away location
- **Evening forecast** — tomorrow's forecast pushed at 21:00 each night with the same away-location logic

### 📦 Alerts
- **Parcel delivery** — Smart Parcel Box sensor triggers mobile notification on delivery
- **Courier van** — Frigate van detection at front → TTS announcement with courier name
- **Postman** — Doorbell Frigate detects post van → TTS announcement
- **Person at car** — Frigate person detection at front car camera → mobile alert (night only)
- **Low battery** — monitors all Zigbee devices, notifies when battery low
- **Weather warning** — Met Éireann official warnings → immediate mobile alert

### 🎉 Fun
- **Hello Olivia** — Frigate face recognition detects Olivia at the doorbell on weekdays 1–2pm; greets her on all speakers at full volume after a short delay
- **Colm's Grand Return** — Frigate face recognition detects Colm at the doorbell after 3+ days away; plays a trumpet fanfare and announces his return on all speakers

### 🎵 Audio
- **TTS** — queued announcements with volume save/restore (`script.tts_announce`)
- **Today FM** — one-tap play on kitchen display via Music Assistant

### 🌡️ Climate
- **Heating away mode** — at 09:00 sets Netatmo thermostat to away preset if both Colm and Olivia are out; reverts to schedule at 12:45 or immediately when either returns home. Olivia's tracker requires 15 min stable `not_home` before trusting it. Uses a flag so the 12:45 reset only fires if this automation set it away
- **Seasonal schedule** — switches Netatmo thermostat schedule to Summer Schedule on 1st June and back to Winter Schedule on 1st September

### ⚡ Energy
- **Top days** — solar production and grid export top 5 best days tracked independently; both leaderboards update automatically each evening at 23:59 using myenergi sensors
- **Morning energy stats** — daily solar and energy summary pushed each morning

### 🏠 Infrastructure Monitoring
- **Overnight alerts** — infrastructure alerts held until 07:00 with triggered-time in notification title
- **8 infrastructure automations** — MikroTik, Pi-hole, Proxmox, TrueNAS, Netatmo; quiet hours 22:00–07:00
- **Zigbee2MQTT watchdog** — auto-restart with 2 attempts, notifies on outcome
- **Zabbix alerts** — webhook receiver → mobile push

---

## 📊 Dashboards

| Tab | Contents |
|---|---|
| **Home** | Room summary, security status, motion, presence |
| **Climate** | Heating, Netatmo thermostat, temperature sensors |
| **Weather** | Met Éireann warnings, forecast, outdoor conditions |
| **Security** | Alarm panel, camera feeds, activity logbook |
| **Solar** | Solar production, import/export, Eddi diverter, top 5 solar days & top 5 export days, ESB Networks official meter (esbn-to-mqtt) |
| **Floorplan** | SVG-based downstairs + upstairs with live entity overlays |
| **Appliances** | Washing machine, dishwasher and other appliance monitoring |
| **Map** | Device tracker map — household presence |
| **Network** | MikroTik stats, Pi-hole, infrastructure status |

---

## 📈 Long-term Data (InfluxDB + Grafana)

HA's recorder purges after 7 days. InfluxDB (TrueNAS app) stores everything long-term; Grafana (TrueNAS app) provides dashboards on top of it with Zabbix as a second data source.

### What's stored

| Measurement | Source | Range | Fields |
|---|---|---|---|
| `myenergi_daily` | myenergi Eddi CSV exports | 11-06-2025 → present | Solar generated, grid import, grid export, green energy, Eddi divert |
| `autarco_daily` | Autarco inverter | 11-06-2025 → present | Solar production, export, import, consumption |
| `esbn_daily` | ESB Networks HDF (official meter) | 28-05-2024 → present | Import, export (3–4 day lag; recent days gap-filled from Autarco) |
| `esbn_halfhourly` | ESB Networks HDF | 28-05-2024 → ~3 days ago | Half-hourly import/export profile |
| All HA entities | HA InfluxDB integration | 28-05-2026 → present | Every entity state written continuously — preserves history beyond recorder purge |

### Grafana dashboards

**Energy — Current** — Live solar and import/export running totals; latest complete day summary stats.

**Energy — History** — Daily energy timeseries, half-hourly profile, monthly summary, top days leaderboard.

**Network** — Infrastructure services, network metrics, Zabbix-sourced host stats.

---

## 👨‍👩‍👦 Household

| Person | Phone | Notification priority |
|---|---|---|
| Colm | `notify.mobile_app_np3` | All alerts |
| Olivia | `notify.mobile_app_pixel_6a` | Security + presence |
| Cian | `notify.mobile_app_pixel_7a` | Selected |

All alert automations respect a **07:00–22:00 quiet window** — overnight events are held and delivered with the original trigger time in the title.

---

## 💾 Backup Strategy

| System | Method | Repo |
|---|---|---|
| Home Assistant | Git — selective `.storage` files | `colfin22/ha-config` (this repo) |
| Home Assistant VM | Proxmox hourly + daily snapshots — 24h/7d retention | — |
| MikroTik | Proxmox cron → API export nightly at 02:00 | `colfin22/mikrotik-config` |
| TrueNAS | Proxmox cron → API `config/save` weekly Sunday 02:00 | `colfin22/truenas-config` |
| Frigate | Git — `config.yml` | `colfin22/frigate-config` |
| Immich | Git — `docker-compose.yml` | `colfin22/immich-config` |
| Ubuntu Docker | Git — all `docker-compose.yml` and env files, systemd timer daily 02:00 | `colfin22/ubuntu-docker-config` |
| InfluxDB + Grafana | Git — dashboards + provisioning config | `colfin22/influxdb-grafana-config` |
| InfluxDB | rsync — TrueNAS dataset → offsite Proxmox (Daire's), 9am daily | — |
| Proxmox VMs & LXCs | Proxmox Backup Server (PBS) — nightly snapshot sync to remote PBS at Daire's house | — |
| TrueNAS Datasets | rsync — critical datasets synced to encrypted Proxmox at Daire's house | — |
| Claude Memory | rsync every 6h → TrueNAS encrypted dataset (AES-256-GCM) → encrypted offsite Proxmox (Daire's) daily | — |

This repo (`ha-config`) is **public**. All other config repos (MikroTik, TrueNAS, Frigate, Immich, InfluxDB+Grafana, Ubuntu Docker) are **private**. HA backup includes: dashboards, helpers, Alarmo, zones, persons, tags, energy config, areas.

---

## 🧩 Custom Components (via HACS)

- [alarmo](https://github.com/nielsfaber/alarmo) — alarm management
- [area_occupancy](https://github.com/constructiverobotics/ha-area-occupancy) — area occupancy detection
- [browser_mod](https://github.com/thomasloven/hass-browser_mod) — browser control
- [frigate](https://github.com/blakeblackshear/frigate-hass-integration) — camera NVR
- [immich](https://github.com/outadoc/immich-home-assistant) — photo library
- [LLM Vision](https://github.com/valentinfrlch/ha-llmvision) — AI camera analysis
- [mikrotik_router](https://github.com/tomaae/homeassistant-mikrotik_router) — network monitoring
- [Music Assistant](https://music-assistant.io/) — multi-room audio engine (integration + Jukebox addon)
- [myenergi](https://github.com/CJNE/ha-myenergi) — solar diverter (Eddi)
- [proxmoxve](https://github.com/doudz/homeassistant-proxmoxve) — hypervisor monitoring
- [truenas](https://github.com/tomaae/homeassistant-truenas) — NAS monitoring
- [waste_collection_schedule](https://github.com/mampfes/hacs_waste_collection_schedule) — bin collection
- [vserver_ssh_stats](https://github.com/404GamerNotFound/vserver-ssh-stats) — SSH-based stats collection from VPS/remote servers
- [webrtc](https://github.com/AlexxIT/WebRTC) — low-latency camera streams

---

<div align="center">
<sub>Running on Proxmox · TrueNAS SCALE · MikroTik · Ireland 🇮🇪</sub><br>
<sub>Built by Colm, with Claude as a hands-on assistant for code, config, and debugging.</sub>
</div>
