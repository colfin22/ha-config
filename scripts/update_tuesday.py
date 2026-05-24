#!/usr/bin/env python3
"""Update Tuesday Report - generates HTML update report for homelab."""

import subprocess
import json
import urllib.request
import urllib.error
import ssl
import datetime
import os
import re
import sys

# ─── CONFIGURATION ───────────────────────────────────────────────────────────

SSH_KEY = "/config/.ssh/update_report"
SSH_OPTS = [
    "-i", SSH_KEY,
    "-o", "StrictHostKeyChecking=no",
    "-o", "BatchMode=yes",
    "-o", "ConnectTimeout=10",
    "-o", "LogLevel=ERROR",
]

OUTPUT_DIR = "/config/www/update_tuesday"
OUTPUT_FILE = f"{OUTPUT_DIR}/report.html"

SUPERVISOR_TOKEN = os.environ.get("SUPERVISOR_TOKEN", "")

PVE_API = {
    "host": "10.0.0.251",
    "port": 8006,
    "token": "ha@pve!homeassistant=f015ab59-7235-4d78-ba44-9c2ed93eb376",
    "nodes": ["proxmox", "proxmox2"],
}

TRUENAS = {
    "host": "10.0.0.254",
    "port": 80,
    "token": "5-OCVPw4x7QfTKo0zLa1d0VNb1p6TQFM4JxKLzSY8xTnCxjRJ55V1fO6l4qC2vjjT4",
}

MIKROTIK_DEVICES = [
    {"name": "RB5009 Gateway",    "ip": "10.0.0.1",  "user": "admin"},
    {"name": "CRS125 Core Switch","ip": "10.0.0.2",  "user": "admin"},
    {"name": "RB951G Kitchen",    "ip": "10.0.0.3",  "user": "admin"},
    {"name": "wAP Landing",       "ip": "10.0.0.4",  "user": "admin"},
    {"name": "wAP Living Room",   "ip": "10.0.0.5",  "user": "admin"},
    {"name": "RB750GL Sitting Rm","ip": "10.0.0.10", "user": "admin"},
    {"name": "RB751G Office",     "ip": "10.0.0.11", "user": "admin"},
]

SSH_HOSTS = [
    {"label": "PVE1 (proxmox)",   "ip": "10.0.0.251", "user": "root",   "type": "proxmox"},
    {"label": "PVE2 (proxmox2)",  "ip": "10.0.0.228", "user": "root",   "type": "proxmox"},
    {"label": "PVE3 (remote)",    "ip": "10.0.10.5",  "user": "root",   "type": "proxmox"},
    {"label": "PBS1",             "ip": "10.0.0.215", "user": "root",   "type": "pbs"},
    {"label": "PBS2 (remote)",    "ip": "10.0.10.6",  "user": "root",   "type": "pbs"},
    {"label": "Docker VM",        "ip": "10.0.0.221", "user": "cfinn",  "type": "ubuntu"},
    {"label": "Nextcloud VM",     "ip": "10.0.0.226", "user": "cfinn",  "type": "ubuntu"},
    {"label": "Frigate LXC",      "ip": "10.0.0.246", "user": "hassio", "type": "ubuntu"},
    {"label": "Immich LXC",       "ip": "10.0.0.253", "user": "root",   "type": "ubuntu"},
]

# ─── HELPERS ─────────────────────────────────────────────────────────────────

def ssh_run(user, host, cmd, timeout=20):
    try:
        r = subprocess.run(
            ["ssh"] + SSH_OPTS + [f"{user}@{host}", cmd],
            capture_output=True, text=True, timeout=timeout,
        )
        return r.stdout.strip(), r.returncode == 0
    except subprocess.TimeoutExpired:
        return "TIMEOUT", False
    except Exception as e:
        return str(e), False


def http_get(url, headers=None, timeout=15):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=timeout) as resp:
            return json.loads(resp.read().decode())
    except Exception:
        return None


def http_post(url, headers=None, data=None, timeout=15):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    body = json.dumps(data).encode() if data else b""
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, data=body, headers=h, method="POST")
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=timeout) as resp:
            return json.loads(resp.read().decode())
    except Exception:
        return None


def supervisor_get(path):
    return http_get(
        f"http://supervisor/{path}",
        headers={"Authorization": f"Bearer {SUPERVISOR_TOKEN}"},
    )


def github_latest_release(repo):
    """Return (tag_name, html_url) for latest GitHub release."""
    data = http_get(
        f"https://api.github.com/repos/{repo}/releases/latest",
        headers={"Accept": "application/vnd.github+json"},
    )
    if data:
        return data.get("tag_name", "?"), data.get("html_url", "#")
    return None, None


def parse_apt_output(raw):
    """Parse `apt list --upgradable` output into list of package names."""
    pkgs = []
    for line in raw.splitlines():
        line = line.strip()
        if not line or line == "Listing..." or line.startswith("WARNING"):
            continue
        pkgs.append(line.split("/")[0])
    return pkgs


def log(msg):
    print(f"  {msg}", flush=True)

# ─── DATA COLLECTORS ─────────────────────────────────────────────────────────

def collect_ssh_hosts():
    results = []
    for host in SSH_HOSTS:
        label, ip, user, htype = host["label"], host["ip"], host["user"], host["type"]
        log(f"SSH → {label} ({ip})...")

        # Run apt-get update first (silently), then list upgradable
        cmd = "sudo apt-get update -qq 2>/dev/null; apt list --upgradable 2>/dev/null"
        if user == "root":
            cmd = "apt-get update -qq 2>/dev/null; apt list --upgradable 2>/dev/null"

        raw, ok = ssh_run(user, ip, cmd, timeout=45)
        if not ok:
            # Try without apt-get update (read cached data)
            raw, ok = ssh_run(user, ip, "apt list --upgradable 2>/dev/null", timeout=15)

        if not ok:
            results.append({"label": label, "ip": ip, "type": htype,
                            "status": "error", "packages": [],
                            "error": raw or "SSH failed"})
            continue

        pkgs = parse_apt_output(raw)

        # Get OS/software version
        version = ""
        if htype == "proxmox":
            v, _ = ssh_run(user, ip, "pveversion 2>/dev/null | head -1", timeout=10)
            version = v
        elif htype == "pbs":
            v, _ = ssh_run(user, ip, "proxmox-backup-manager version 2>/dev/null | head -1", timeout=10)
            if not v:
                v, _ = ssh_run(user, ip, "dpkg -l proxmox-backup-server 2>/dev/null | grep ^ii | awk '{print $3}'", timeout=10)
            version = v
        else:
            v, _ = ssh_run(user, ip, "lsb_release -rs 2>/dev/null || cat /etc/debian_version 2>/dev/null | head -1", timeout=10)
            version = v

        results.append({"label": label, "ip": ip, "type": htype,
                        "status": "ok", "packages": pkgs, "version": version})
    return results


def collect_truenas():
    log("TrueNAS API...")
    token = TRUENAS["token"]
    base = f"http://{TRUENAS['host']}"
    headers = {"Authorization": f"Bearer {token}"}

    current_raw = http_get(f"{base}/api/v2.0/system/version", headers=headers)
    current = str(current_raw).strip('"') if current_raw else "Unknown"

    # Trigger update check+download (safe for monthly run — pre-downloads if available)
    update_available = False
    update_version = None
    job_id = http_post(f"{base}/api/v2.0/update/download", headers=headers)

    if job_id and isinstance(job_id, int):
        import time
        for _ in range(15):
            time.sleep(3)
            jobs = http_get(f"{base}/api/v2.0/core/get_jobs?id={job_id}", headers=headers)
            if jobs and isinstance(jobs, list):
                job = jobs[0]
                state = job.get("state", "")
                if state in ("SUCCESS", "FAILED"):
                    if state == "SUCCESS" and job.get("result") is True:
                        update_available = True
                        desc = job.get("progress", {}).get("description", "")
                        m = re.search(r"([\d]+\.[\d]+\.[\d]+)", desc)
                        if m:
                            update_version = m.group(1)
                    break

    release_notes_url = "https://www.truenas.com/docs/scale/scalereleasenotes/"

    return {
        "status": "ok",
        "current_version": current,
        "update_available": update_available,
        "update_version": update_version,
        "release_notes_url": release_notes_url,
    }


def http_get_text(url, timeout=15):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=timeout) as resp:
            return resp.read().decode().strip()
    except Exception:
        return None


def collect_frigate():
    log("Frigate version check...")
    current = http_get_text("http://10.0.0.246:5000/api/version")
    if not current:
        raw, _ = ssh_run("hassio", "10.0.0.246",
            "docker inspect frigate 2>/dev/null | python3 -c \"import sys,json; d=json.load(sys.stdin); print(d[0]['Config']['Image'])\" 2>/dev/null", timeout=15)
        current = raw or "Unknown"

    current_str = str(current)
    # Extract version number (e.g. "0.17.1-416a9b7" → "0.17.1")
    cur_base = current_str.split("-")[0] if "-" in current_str else current_str

    latest_tag, release_url = github_latest_release("blakeblackshear/frigate")
    lat_base = re.sub(r"^v", "", str(latest_tag or "")).split("-")[0]

    update_available = bool(lat_base and cur_base and cur_base not in ("Unknown", "?") and lat_base != cur_base)

    return {
        "status": "ok",
        "current_version": current_str,
        "latest_version": latest_tag or "Unknown",
        "update_available": update_available,
        "release_notes_url": release_url or "https://github.com/blakeblackshear/frigate/releases",
    }


def collect_immich():
    log("Immich version check...")
    data = http_get("http://10.0.0.253:2283/api/server/version")
    if data and isinstance(data, dict):
        current = f"{data.get('major',0)}.{data.get('minor',0)}.{data.get('patch',0)}"
    else:
        current = "Unknown"

    latest_tag, release_url = github_latest_release("immich-app/immich")
    lat_clean = re.sub(r"^v", "", str(latest_tag or ""))
    cur_clean = re.sub(r"^v", "", str(current))

    return {
        "status": "ok",
        "current_version": current,
        "latest_version": lat_clean or "Unknown",
        "update_available": bool(lat_clean and cur_clean and lat_clean != cur_clean and current != "Unknown"),
        "release_notes_url": release_url or "https://github.com/immich-app/immich/releases",
    }


def ssh_mikrotik(user, ip, cmd, timeout=15):
    """Run a RouterOS SSH command, stripping pq-warning lines."""
    out, ok = ssh_run(user, ip, cmd, timeout=timeout)
    # Filter MikroTik's post-quantum warning lines
    lines = [l for l in out.splitlines() if not l.startswith("**")]
    return "\n".join(lines).strip(), ok


def collect_mikrotik():
    log("MikroTik update check...")
    results = []
    # Check for updates and get firmware info in one SSH call per device
    cmd = (
        ":put [/system/package/update get installed-version];"
        ":put [/system/package/update get latest-version];"
        ":put [/system/package/update get channel];"
        ":put [/system/routerboard get current-firmware];"
        ":put [/system/routerboard get upgrade-firmware];"
        ":put [/system/identity get name]"
    )
    for dev in MIKROTIK_DEVICES:
        name, ip, user = dev["name"], dev["ip"], dev["user"]
        out, ok = ssh_mikrotik(user, ip, cmd)
        if not ok or not out:
            # Try triggering update check first
            ssh_mikrotik(user, ip, "/system/package/update check-for-updates", timeout=20)
            out, ok = ssh_mikrotik(user, ip, cmd)

        if ok and out:
            lines = out.splitlines()
            installed = lines[0].strip() if len(lines) > 0 else "?"
            latest    = lines[1].strip() if len(lines) > 1 else installed
            channel   = lines[2].strip() if len(lines) > 2 else "stable"
            fw_cur    = lines[3].strip() if len(lines) > 3 else "?"
            fw_upg    = lines[4].strip() if len(lines) > 4 else fw_cur
            identity  = lines[5].strip() if len(lines) > 5 else name
            ros_update = bool(latest and latest != "?" and latest != installed)
            fw_update  = bool(fw_cur != fw_upg and fw_upg and fw_cur != "?")
            results.append({
                "name": name, "ip": ip, "identity": identity,
                "installed_version": installed, "latest_version": latest,
                "firmware_current": fw_cur, "firmware_upgrade": fw_upg,
                "channel": channel, "update_available": ros_update,
                "firmware_update": fw_update, "status": "ok",
            })
        else:
            results.append({
                "name": name, "ip": ip, "identity": name,
                "installed_version": "?", "latest_version": "?",
                "firmware_current": "?", "firmware_upgrade": "?",
                "channel": "?", "update_available": False,
                "firmware_update": False, "status": out or "SSH failed",
            })

    return results


def collect_homeassistant():
    log("Home Assistant update check...")
    version = "Unknown"
    latest = "Unknown"
    update_available = False

    # Supervisor API: http://supervisor/homeassistant/info (works from SSH addon)
    data = http_get(
        "http://supervisor/homeassistant/info",
        headers={"Authorization": f"Bearer {SUPERVISOR_TOKEN}"},
    )
    if data and data.get("result") == "ok":
        info = data.get("data", {})
        version = info.get("version", "Unknown")
        latest = info.get("version_latest", "Unknown")
        update_available = info.get("update_available", False)

    # Fallback: `ha core info` CLI
    if version == "Unknown":
        try:
            r = subprocess.run(["ha", "core", "info"], capture_output=True, text=True, timeout=10)
            for line in r.stdout.splitlines():
                k, _, v = line.partition(":")
                k, v = k.strip(), v.strip()
                if k == "version":
                    version = v
                elif k == "version_latest":
                    latest = v
                elif k == "update_available":
                    update_available = v.lower() == "true"
        except Exception:
            pass

    if version and version != "Unknown":
        parts = version.split(".")
        if len(parts) >= 2:
            release_url = f"https://www.home-assistant.io/blog/{parts[0]}/{parts[1].zfill(2)}/03/home-assistant-{parts[0]}-{parts[1]}-released/"
        else:
            release_url = "https://www.home-assistant.io/blog/"
    else:
        release_url = "https://www.home-assistant.io/blog/"

    return {
        "status": "ok",
        "current_version": version,
        "latest_version": latest,
        "update_available": update_available,
        "release_notes_url": release_url,
    }


# ─── HTML REPORT ─────────────────────────────────────────────────────────────

CSS = """
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0f1117; color: #e1e4e8; font-size: 14px; line-height: 1.5;
}
.page { max-width: 1100px; margin: 0 auto; padding: 24px 16px; }
h1 { font-size: 24px; font-weight: 700; color: #f0f6fc; margin-bottom: 4px; }
.subtitle { color: #8b949e; margin-bottom: 28px; font-size: 13px; }
.section { margin-bottom: 24px; border: 1px solid #30363d; border-radius: 8px; }
.section-header {
  background: #161b22; padding: 12px 16px; display: flex; align-items: center;
  justify-content: space-between; border-bottom: 1px solid #30363d;
  border-radius: 8px 8px 0 0;
}
.section-title { font-weight: 600; font-size: 15px; color: #f0f6fc; }
.badge {
  display: inline-flex; align-items: center; padding: 2px 10px;
  border-radius: 12px; font-size: 12px; font-weight: 600;
}
.badge-ok   { background: #1a4731; color: #3fb950; border: 1px solid #238636; }
.badge-warn { background: #4b2a00; color: #d29922; border: 1px solid #9e6a03; }
.badge-crit { background: #3d1a1a; color: #f85149; border: 1px solid #da3633; }
.badge-err  { background: #21262d; color: #8b949e; border: 1px solid #30363d; }
.section-body { padding: 12px 16px; }
.table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; padding: 6px 12px; color: #8b949e; font-size: 12px;
     font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;
     border-bottom: 1px solid #21262d; }
td { padding: 8px 12px; border-bottom: 1px solid #21262d; vertical-align: top; }
tr:last-child td { border-bottom: none; }
tr:hover { background: #161b22; }
.status-ok   { color: #3fb950; font-weight: 600; }
.status-warn { color: #d29922; font-weight: 600; }
.status-err  { color: #f85149; }
.pkg-list { font-size: 12px; color: #8b949e; margin-top: 4px; }
.pkg-list span { background: #21262d; border-radius: 4px; padding: 1px 6px;
                  display: inline-block; margin: 1px; }
a { color: #58a6ff; text-decoration: none; }
a:hover { text-decoration: underline; }
.update-link { font-size: 12px; }
.version { font-size: 12px; color: #8b949e; font-family: monospace; }
.summary-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px; margin-bottom: 24px;
}
.summary-card {
  background: #161b22; border: 1px solid #30363d; border-radius: 8px;
  padding: 16px; text-align: center;
}
.summary-num { font-size: 32px; font-weight: 700; }
.summary-label { font-size: 12px; color: #8b949e; margin-top: 4px; }
.num-ok   { color: #3fb950; }
.num-warn { color: #d29922; }
.num-err  { color: #f85149; }
@media (max-width: 768px) {
  .page { padding: 12px 8px; }
  .section-body { padding: 8px 0; }
  .table-scroll { padding: 0 8px; }
  table { min-width: 540px; }
  .summary-grid { grid-template-columns: repeat(2, 1fr); }
  .summary-num { font-size: 24px; }
  td, th { padding: 6px 8px; }
}
@media print {
  body { background: white; color: #24292f; }
  .section { border-color: #d0d7de; page-break-inside: avoid; }
  .section-header { background: #f6f8fa; }
  a { color: #0969da; }
  .pkg-list span { background: #f6f8fa; }
}
"""


def badge(count_or_bool, labels=("Up to date", "Updates available", "Error")):
    if isinstance(count_or_bool, bool):
        if count_or_bool:
            return f'<span class="badge badge-warn">{labels[1]}</span>'
        return f'<span class="badge badge-ok">{labels[0]}</span>'
    n = count_or_bool
    if n == 0:
        return f'<span class="badge badge-ok">0 updates</span>'
    if n <= 5:
        return f'<span class="badge badge-warn">{n} update{"s" if n != 1 else ""}</span>'
    return f'<span class="badge badge-crit">{n} updates</span>'


def err_badge():
    return '<span class="badge badge-err">Unreachable</span>'


def pkg_pills(pkgs, limit=15):
    if not pkgs:
        return ""
    shown = pkgs[:limit]
    rest = len(pkgs) - limit
    pills = "".join(f"<span>{p}</span>" for p in shown)
    if rest > 0:
        pills += f"<span>+{rest} more</span>"
    return f'<div class="pkg-list">{pills}</div>'


def generate_report(ssh_results, truenas, frigate, immich, mikrotik, ha):
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=1)))
    date_str = now.strftime("%A %-d %B %Y, %H:%M IST")

    total_updates = 0
    total_errors = 0
    hosts_with_updates = 0

    for r in ssh_results:
        if r["status"] == "error":
            total_errors += 1
        elif r["packages"]:
            total_updates += len(r["packages"])
            hosts_with_updates += 1

    if truenas.get("update_available"):
        hosts_with_updates += 1
        total_updates += 1
    if frigate.get("update_available"):
        hosts_with_updates += 1
        total_updates += 1
    if immich.get("update_available"):
        hosts_with_updates += 1
        total_updates += 1
    if ha.get("update_available"):
        hosts_with_updates += 1
        total_updates += 1

    mk_updates = sum(1 for d in mikrotik if d.get("update_available") or d.get("firmware_update"))
    if mk_updates:
        hosts_with_updates += mk_updates
        total_updates += mk_updates

    # ── Summary cards ──────────────────────────────────────────────────────
    summary_num_class = "num-ok" if total_updates == 0 else ("num-warn" if total_updates < 10 else "num-crit")
    err_class = "num-ok" if total_errors == 0 else "num-warn"

    summary = f"""
<div class="summary-grid">
  <div class="summary-card">
    <div class="summary-num {summary_num_class}">{total_updates}</div>
    <div class="summary-label">Total updates available</div>
  </div>
  <div class="summary-card">
    <div class="summary-num {'num-warn' if hosts_with_updates else 'num-ok'}">{hosts_with_updates}</div>
    <div class="summary-label">Systems needing updates</div>
  </div>
  <div class="summary-card">
    <div class="summary-num {err_class}">{total_errors}</div>
    <div class="summary-label">Unreachable hosts</div>
  </div>
  <div class="summary-card">
    <div class="summary-num num-ok">{len(ssh_results) + len(mikrotik) + 4}</div>
    <div class="summary-label">Systems checked</div>
  </div>
</div>
"""

    # ── Linux hosts (SSH) ─────────────────────────────────────────────────
    def host_type_label(t):
        return {"proxmox": "Proxmox VE", "pbs": "Proxmox BS", "ubuntu": "Ubuntu/Debian"}.get(t, t)

    # Group by type
    proxmox_hosts = [r for r in ssh_results if r["type"] == "proxmox"]
    pbs_hosts = [r for r in ssh_results if r["type"] == "pbs"]
    ubuntu_hosts = [r for r in ssh_results if r["type"] == "ubuntu"]

    def host_table_rows(hosts):
        rows = ""
        for r in hosts:
            if r["status"] == "error":
                rows += f"""<tr>
<td><strong>{r['label']}</strong><br><span class="version">{r['ip']}</span></td>
<td>{err_badge()}</td>
<td class="status-err">{r.get('error','SSH failed')}</td>
</tr>"""
            else:
                ver = r.get("version", "")
                n = len(r["packages"])
                rows += f"""<tr>
<td><strong>{r['label']}</strong><br><span class="version">{r['ip']}{(' · ' + ver) if ver else ''}</span></td>
<td>{badge(n)}</td>
<td>{pkg_pills(r['packages']) if r['packages'] else '<span class="status-ok">Nothing to update</span>'}</td>
</tr>"""
        return rows

    def make_section(title, rows, icon=""):
        all_ok = "badge-ok" not in rows.replace("badge-ok", "XX") or "badge-warn" not in rows and "badge-crit" not in rows and "badge-err" not in rows
        return f"""
<div class="section">
  <div class="section-header">
    <span class="section-title">{icon} {title}</span>
  </div>
  <div class="section-body">
    <div class="table-scroll"><table>
      <thead><tr><th>Host</th><th>Status</th><th>Packages / Details</th></tr></thead>
      <tbody>{rows}</tbody>
    </table></div>
  </div>
</div>"""

    proxmox_section = make_section("Proxmox VE Nodes", host_table_rows(proxmox_hosts), "🖥")
    pbs_section = make_section("Proxmox Backup Server", host_table_rows(pbs_hosts), "💾")
    ubuntu_section = make_section("Ubuntu VMs & LXCs", host_table_rows(ubuntu_hosts), "🐧")

    # ── TrueNAS ────────────────────────────────────────────────────────────
    if truenas["status"] == "error":
        tn_row = f'<tr><td><strong>TrueNAS SCALE</strong><br><span class="version">10.0.0.254</span></td><td>{err_badge()}</td><td class="status-err">API error</td></tr>'
    else:
        upd = truenas["update_available"]
        upd_ver = truenas.get("update_version") or ""
        ver_detail = f"Version {upd_ver} available" if upd_ver else "Update available (pre-downloaded)"
        detail = f'{ver_detail} · <a class="update-link" href="{truenas["release_notes_url"]}" target="_blank">Release notes ↗</a>' if upd else '<span class="status-ok">Up to date</span>'
        tn_row = f"""<tr>
<td><strong>TrueNAS SCALE</strong><br><span class="version">10.0.0.254 · {truenas['current_version']}</span></td>
<td>{badge(upd)}</td>
<td>{detail}</td>
</tr>"""
    truenas_section = make_section("TrueNAS SCALE", tn_row, "📦")

    # ── Frigate ────────────────────────────────────────────────────────────
    if frigate["status"] == "error":
        fr_row = f'<tr><td><strong>Frigate NVR</strong><br><span class="version">10.0.0.246</span></td><td>{err_badge()}</td><td class="status-err">API error</td></tr>'
    else:
        upd = frigate["update_available"]
        detail = f'<span class="version">{frigate["current_version"]}</span> → <strong>{frigate["latest_version"]}</strong> · <a class="update-link" href="{frigate["release_notes_url"]}" target="_blank">Release notes ↗</a>' if upd else f'<span class="version">{frigate["current_version"]}</span> · <span class="status-ok">Latest</span>'
        fr_row = f'<tr><td><strong>Frigate NVR</strong><br><span class="version">10.0.0.246</span></td><td>{badge(upd)}</td><td>{detail}</td></tr>'

    # ── Immich ─────────────────────────────────────────────────────────────
    if immich["status"] == "error":
        im_row = f'<tr><td><strong>Immich</strong><br><span class="version">10.0.0.253</span></td><td>{err_badge()}</td><td class="status-err">API error</td></tr>'
    else:
        upd = immich["update_available"]
        detail = f'<span class="version">{immich["current_version"]}</span> → <strong>{immich["latest_version"]}</strong> · <a class="update-link" href="{immich["release_notes_url"]}" target="_blank">Release notes ↗</a>' if upd else f'<span class="version">{immich["current_version"]}</span> · <span class="status-ok">Latest</span>'
        im_row = f'<tr><td><strong>Immich</strong><br><span class="version">10.0.0.253</span></td><td>{badge(upd)}</td><td>{detail}</td></tr>'

    apps_section = make_section("Applications", fr_row + im_row, "🐳")

    # ── MikroTik ────────────────────────────────────────────────────────────
    mk_rows = ""
    for dev in mikrotik:
        ros_upd = dev.get("update_available", False)
        fw_upd = dev.get("firmware_update", False)
        has_any_update = ros_upd or fw_upd
        status_val = dev.get("status", "")
        is_err = dev["installed_version"] == "?" and ("Error" in status_val or "unreachable" in status_val.lower() or "not installed" in status_val.lower())
        identity = dev.get("identity", dev["name"])
        if is_err:
            mk_rows += f'<tr><td><strong>{dev["name"]}</strong><br><span class="version">{dev["ip"]} · {identity}</span></td><td>{err_badge()}</td><td class="status-err">{status_val}</td></tr>'
        else:
            details = []
            if ros_upd:
                details.append(f'RouterOS: <span class="version">{dev["installed_version"]}</span> → <strong>{dev["latest_version"]}</strong>')
            if fw_upd:
                details.append(f'Firmware: <span class="version">{dev["firmware_current"]}</span> → <strong>{dev["firmware_upgrade"]}</strong>')
            if not details:
                details.append('<span class="status-ok">Up to date</span>')
            details_str = " &nbsp;·&nbsp; ".join(details)
            if has_any_update:
                details_str += f' &nbsp;<a class="update-link" href="https://mikrotik.com/download/changelogs" target="_blank">Changelog ↗</a>'
            b = badge(has_any_update)
            mk_rows += f'<tr><td><strong>{dev["name"]}</strong><br><span class="version">{dev["ip"]} · {identity} · RouterOS {dev["installed_version"]} ({dev["channel"]})</span></td><td>{b}</td><td>{details_str}</td></tr>'
    mikrotik_section = make_section("MikroTik Devices", mk_rows, "📡")

    # ── Home Assistant ─────────────────────────────────────────────────────
    upd = ha["update_available"]
    ha_detail = f'<span class="version">{ha["current_version"]}</span> → <strong>{ha["latest_version"]}</strong> · <a class="update-link" href="{ha["release_notes_url"]}" target="_blank">Release notes ↗</a>' if upd else f'<span class="version">{ha["current_version"]}</span> · <span class="status-ok">Latest ({ha["latest_version"]})</span>'
    ha_row = f'<tr><td><strong>Home Assistant Core</strong><br><span class="version">10.0.0.252</span></td><td>{badge(upd)}</td><td>{ha_detail}</td></tr>'
    ha_section = make_section("Home Assistant", ha_row, "🏠")

    # ── Full page ──────────────────────────────────────────────────────────
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Update Tuesday Report — {now.strftime('%d %b %Y')}</title>
<style>{CSS}</style>
</head>
<body>
<div class="page">
  <h1>Update Tuesday Report</h1>
  <p class="subtitle">Generated {date_str} &nbsp;·&nbsp; <button onclick="window.print()" style="background:#238636;color:#fff;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:12px">Print / Save PDF</button></p>
  {summary}
  {ha_section}
  {truenas_section}
  {proxmox_section}
  {pbs_section}
  {ubuntu_section}
  {apps_section}
  {mikrotik_section}
</div>
</body>
</html>"""
    return html


# ─── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    print("Update Tuesday Report Generator", flush=True)
    print(f"Started: {datetime.datetime.now()}", flush=True)
    print("", flush=True)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("Collecting data...", flush=True)
    ssh_results = collect_ssh_hosts()
    truenas = collect_truenas()
    frigate = collect_frigate()
    immich = collect_immich()
    mikrotik = collect_mikrotik()
    ha = collect_homeassistant()

    print("", flush=True)
    print("Generating HTML report...", flush=True)
    html = generate_report(ssh_results, truenas, frigate, immich, mikrotik, ha)

    with open(OUTPUT_FILE, "w") as f:
        f.write(html)

    print(f"Report saved to {OUTPUT_FILE}", flush=True)
    print("DONE", flush=True)


if __name__ == "__main__":
    main()
