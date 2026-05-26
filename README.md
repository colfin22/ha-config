<div align="center">

# 🏠 Colm's Home Assistant Config

[![HA Version](https://img.shields.io/badge/Home%20Assistant-2026.5.4-41BDF5?logo=homeassistant&logoColor=white)](https://www.home-assistant.io/)
[![Automations](https://img.shields.io/badge/Automations-60-success?logo=homeassistant&logoColor=white)](automations.yaml)
[![License](https://img.shields.io/badge/License-Private-red)](.)

*A family smart home in Ireland — built for reliability, not demos.*

</div>

---

## 🏗️ Infrastructure

| Component | Detail |
|---|---|
| **Host** | Proxmox VE — bare metal |
| **HA** | Home Assistant OS — Proxmox LXC |
| **NAS** | TrueNAS SCALE — MainPool (2× mirror, WD Purple 6TB) |
| **Network** | MikroTik router + 7× managed switches/APs |
| **VLANs** | Main · IoT · Work · Guest |
| **DNS** | Pi-hole × 2 (primary + TrueNAS replica) |
| **Cameras** | Frigate NVR — LXC 107, recordings on USB at `/cctv_clips` |
| **Monitoring** | Zabbix — TrueNAS hosted |

---

## 🔌 Integrations

### Core
| Integration | Purpose |
|---|---|
| [Alarmo](https://github.com/nielsfaber/alarmo) | Multi-zone alarm with Zigbee sensors |
| [Zigbee2MQTT](https://www.zigbee2mqtt.io/) | Zigbee device bridge (lights, motion, contact sensors) |
| [Music Assistant](https://music-assistant.io/) | Multi-room audio — Today FM, Spotify, local library |
| [Frigate](https://frigate.video/) | Local AI camera NVR — person/cat/vehicle detection |
| [Immich](https://immich.app/) | Self-hosted photo library, ML model cache on TrueNAS NFS |

### Network & Infrastructure
| Integration | Purpose |
|---|---|
| [MikroTik Router](https://github.com/tomaae/homeassistant-mikrotik_router) | Router stats, interface monitoring |
| [Proxmox VE](https://github.com/doudz/homeassistant-proxmoxve) | VM/LXC status monitoring |
| [TrueNAS](https://github.com/tomaae/homeassistant-truenas) | Pool health, disk temps, dataset usage |
| [Pi-hole](https://pi-hole.net) | DNS query stats for two instances |

### Energy & Environment
| Integration | Purpose |
|---|---|
| [Autarco](https://www.autarco.com/) | Solar inverter — cloud stats (slower polling) |
| [myenergi](https://myenergi.com/) | Solar production, Eddi diverter — preferred for live stats (faster updates) |
| [Netatmo](https://www.netatmo.com/) | Smart thermostat — heating control |
| [Met Éireann](https://www.met.ie/) | Irish national weather warnings |

### Media & Lifestyle
| Integration | Purpose |
|---|---|
| NVIDIA Shield TV | Living room media player — IoT VLAN |
| Google Cast | Kitchen display + whole-home audio |
| [Navidrome](https://navidrome.org/) | Self-hosted music streaming |
| [Calibre-Web](https://github.com/janeczku/calibre-web) | Self-hosted ebook library |
| [Stremio](https://www.stremio.com/) | Streaming media |

---

## 🤖 Automations

60 automations across the home. Key highlights:

### 💡 Lighting
- **Occupancy lighting** — hallway, landing, and rooms via Zigbee motion sensors + lux thresholds; scene-based (bright/dimmed), fade-to-off on exit
- **Sunrise/sunset** — scene transitions throughout the day

### 🔒 Security
- **Alarm** — Alarmo multi-zone; strobe all lights on trigger (saves/restores state), notifies all phones
- **Doorbell** — Frigate snapshot cast to kitchen display on ring
- **Cat alarm** — NFC-toggled; Frigate detects cat at rear door/shed → TTS announcement on home audio group
- **Patio door** — Frigate person detection at rear; conditional notifications to Colm and Olivia

### 🎵 Audio
- **TTS** — queued announcements with volume save/restore (`script.tts_announce`)
- **Today FM** — one-tap play on kitchen display via Music Assistant

### ⚡ Energy
- **Solar top 5** — best production days tracked on Energy dashboard
- **Overnight alerts** — held until 07:00 with triggered-time in notification title

### 🏠 Infrastructure Monitoring
- **8 infrastructure automations** — MikroTik, Pi-hole, Proxmox, TrueNAS, Netatmo; quiet hours 22:00–07:00
- **Zigbee2MQTT watchdog** — auto-restart with 2 attempts, notifies on outcome
- **Zabbix alerts** — webhook receiver → mobile push

---

## 📊 Dashboards

| Tab | Contents |
|---|---|
| **Home** | Room summary, security status, motion, presence |
| **Rooms** | Per-room tiles — lights, sensors, media |
| **Security** | Alarm panel, camera feeds, activity logbook |
| **Energy** | Solar production, import/export, top-5 solar days |
| **Floorplan** | SVG-based downstairs + upstairs with live entity overlays |
| **Garden** | Outdoor sensors, weather warnings |

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
| MikroTik | Proxmox cron → API export nightly at 02:00 | `colfin22/mikrotik-config` |
| TrueNAS | Proxmox cron → API `config/save` weekly Sunday 02:00 | `colfin22/truenas-config` |
| Frigate | Git — `config.yml` | `colfin22/frigate-config` |
| Immich | Git — `docker-compose.yml` | `colfin22/immich-config` |
| Proxmox VMs & LXCs | Proxmox Backup Server (PBS) — nightly snapshot sync to remote PBS | — |
| TrueNAS Datasets | rsync — critical datasets synced to offsite server (son's house) | — |

All repos are **private**. HA backup includes: dashboards, helpers, Alarmo, zones, persons, tags, energy config, areas.

---

## 🧩 Custom Components (via HACS)

- [alarmo](https://github.com/nielsfaber/alarmo) — alarm management
- [browser_mod](https://github.com/thomasloven/hass-browser_mod) — browser control
- [frigate](https://github.com/blakeblackshear/frigate-hass-integration) — camera NVR
- [immich](https://github.com/outadoc/immich-home-assistant) — photo library
- [mikrotik_router](https://github.com/tomaae/homeassistant-mikrotik_router) — network monitoring
- [Music Assistant](https://music-assistant.io/) — multi-room audio engine (integration + Jukebox addon)
- [myenergi](https://github.com/CJNE/ha-myenergi) — solar diverter (Eddi)
- [proxmoxve](https://github.com/doudz/homeassistant-proxmoxve) — hypervisor monitoring
- [truenas](https://github.com/tomaae/homeassistant-truenas) — NAS monitoring
- [webrtc](https://github.com/AlexxIT/WebRTC) — low-latency camera streams

---

<div align="center">
<sub>Running on Proxmox · TrueNAS SCALE · MikroTik · Ireland 🇮🇪</sub>
</div>
