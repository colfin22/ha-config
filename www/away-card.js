// away-card — "While you were away" (23-11-2026). Source: ~/homelab/away-mock/card/away-card.js
// Shows while input_select.house_mode = Away; after you're back it stays until Dismiss. Only shows what happened
// during the Away (v5, 24-11: "Right now" live tiles removed). Security-tile link stays 6 h after Dismiss.
// (shared via input_datetime.away_summary_dismissed). Looks back 7 days at most (recorder keeps 7).
// Home card's Security tile listens for the "away-summary" window event and fires "away-summary-open".
const AW_VER = 5;
const AW_DEF = {
  mode: "input_select.house_mode",
  dismissed: "input_datetime.away_summary_dismissed",
  frigate_instance: "frigate",
  alarms: [["alarm_control_panel.house", "House alarm", "🛡️"], ["alarm_control_panel.shed", "Shed alarm", "🛖"]],
  doors: [["binary_sensor.front_door_contact", "Front door"], ["binary_sensor.back_door_contact", "Back door"],
    ["binary_sensor.patio_door_contact", "Patio door"], ["binary_sensor.shed_door_contact", "Shed door"]],
  windows: [["binary_sensor.sitting_room_window_contact", "Sitting Room window"], ["binary_sensor.back_window_contact", "Back window"],
    ["binary_sensor.colm_window_contact", "Colm's Room window"], ["binary_sensor.cian_window_contact", "Cian's Room window"],
    ["binary_sensor.aoife_window_contact", "Aoife's Room window"], ["binary_sensor.office_window_contact", "Office window"]],
  door_camera: { "binary_sensor.front_door_contact": "Doorbell", "binary_sensor.back_door_contact": "Rear_Door",
    "binary_sensor.patio_door_contact": "Rear_Door", "binary_sensor.shed_door_contact": "Rear_Shed" },
  climate: "climate.netatmo_smart_thermostat",
  hot_water: "input_boolean.hot_water_ready_today",
  cameras: ["camera.doorbell", "camera.front_car", "camera.front_van", "camera.rear_door", "camera.rear_shed"],
  camera_names: { Doorbell: "Doorbell", Front_Car: "Front Car", Front_Van: "Front Van", Rear_Door: "Rear Door", Rear_Shed: "Rear Shed" },
  person_place: { Doorbell: "at the door", Rear_Door: "at the back door", Rear_Shed: "in the yard", Front_Car: "on the drive", Front_Van: "on the drive" },
  max_days: 7,
  link_hours: 6, // Home card Security-tile line stays this long after Dismiss
};
const AW_ST = { disarmed: "Disarmed", armed_away: "Away", armed_night: "Night", armed_home: "Home", arming: "Arming…", pending: "Entry delay…", triggered: "TRIGGERED" };
const awEsc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const aw2 = (n) => String(n).padStart(2, "0");
const awT = (d) => aw2(d.getHours()) + ":" + aw2(d.getMinutes());
const awDM = (d) => aw2(d.getDate()) + "-" + aw2(d.getMonth() + 1);
const awDay = (d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
const awDur = (ms) => { const m = Math.round(ms / 60000); if (m < 60) return m + " min"; const h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d >= 1) return d + (d === 1 ? " day" : " days") + (h % 24 ? " " + (h % 24) + " h" : ""); return h + " h" + (m % 60 ? " " + (m % 60) + " min" : ""); };
const awCap = (s) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const AW_CSS = `
:host{--aw-card:var(--ha-card-background,var(--card-background-color,#121826));--aw-deep:var(--secondary-background-color,#0e1420);
 --aw-ink:var(--primary-text-color,#e8eef7);--aw-sec:var(--secondary-text-color,#7d8aa6);--aw-bd:var(--divider-color,#1d2740);
 --aw-cy:#35c9e6;--aw-gr:#3ddc84;--aw-am:#ffc94d;--aw-rd:#ff5a5a;--aw-pu:#a880ff;display:block}
ha-card{color:var(--aw-ink);container-type:inline-size;padding:16px}
ha-card.lt{--aw-am:#b26b00;--aw-gr:#18864b;--aw-pu:#6f42e0;--aw-cy:#0a7fa0;--aw-rd:#d32f2f}
*{box-sizing:border-box}button{font:inherit;color:inherit}
.hd{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}.tt{font-size:17px;font-weight:600}.sb{color:var(--aw-sec);font-size:13px;margin-top:2px}
.mode{border:1px solid var(--aw-pu);color:var(--aw-pu);border-radius:999px;padding:3px 10px;font-size:12px;white-space:nowrap}.mode.home{border-color:var(--aw-gr);color:var(--aw-gr)}
.h2{color:var(--aw-sec);font-size:11px;letter-spacing:.08em;text-transform:uppercase;margin:14px 0 8px}
.sts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.st{display:flex;gap:10px;background:var(--aw-deep);border:1px solid var(--aw-bd);border-radius:10px;padding:9px 10px;min-width:0}
.si{font-size:20px}.sl{color:var(--aw-sec);font-size:12px}.sv{font-size:15px;font-weight:600}.ss{color:var(--aw-sec);font-size:11px}
.st.gr .sv{color:var(--aw-gr)}.st.pu .sv{color:var(--aw-pu)}.st.pu{border-color:color-mix(in srgb,var(--aw-pu) 35%,transparent)}.st.am .sv{color:var(--aw-am)}.st.rd .sv{color:var(--aw-rd)}.st.rd{border-color:var(--aw-rd)}
.chips{display:flex;flex-wrap:wrap;gap:6px}.chip{background:var(--aw-deep);border:1px solid var(--aw-bd);border-radius:999px;padding:4px 10px;font-size:12px;color:var(--aw-sec)}.chip b{color:var(--aw-ink)}
.evs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.ev{display:flex;align-items:center;gap:9px;background:var(--aw-deep);border:1px solid var(--aw-bd);border-radius:10px;padding:6px 8px;min-width:0}.ev.clk{cursor:pointer}
.et{width:52px;text-align:center;font-size:12px;flex:none;white-space:nowrap}.et span{display:block;color:var(--aw-sec);font-size:11px}
.ed{width:3px;align-self:stretch;border-radius:2px;background:var(--aw-am);flex:none}.ed.cy{background:var(--aw-cy)}.ed.rd{background:var(--aw-rd)}
.ev img,.ni{width:56px;height:42px;object-fit:cover;border-radius:6px;flex:none}.ni{display:flex;align-items:center;justify-content:center;background:var(--aw-bd);font-size:18px}
.ex{min-width:0}.en{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ee{color:var(--aw-sec);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.more{color:var(--aw-sec);font-size:12px;margin-top:8px}.more u{cursor:pointer;color:var(--aw-cy);text-decoration:none}
.quiet{background:var(--aw-deep);border:1px solid color-mix(in srgb,var(--aw-gr) 35%,transparent);border-radius:10px;padding:14px;color:var(--aw-gr)}
.ft{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:10px;border-top:1px solid var(--aw-bd)}
.lnk{color:var(--aw-cy);cursor:pointer;font-size:13px;background:none;border:0;padding:0}
.dis{background:var(--aw-deep);border:1px solid var(--aw-gr);color:var(--aw-gr);border-radius:999px;padding:6px 14px;font-size:13px;cursor:pointer}
.load{color:var(--aw-sec);font-size:13px;padding:8px 0}
.vid{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}
.vid video{max-width:94vw;max-height:80vh;border-radius:8px}.vid button{background:#121826;color:#e8eef7;border:1px solid #35c9e6;border-radius:999px;padding:8px 18px;cursor:pointer}
@container (max-width:600px){ha-card{padding:14px}.sts{grid-template-columns:1fr 1fr}.evs{grid-template-columns:1fr}}
`;

class AwayCard extends HTMLElement {
  setConfig(c) { this._c = Object.assign({}, AW_DEF, c || {}); this._all = false; }
  getCardSize() { return 8; }
  getGridOptions() { return { columns: 18 }; }
  connectedCallback() { // listeners stay while the card is hidden (HA detaches a hidden card); a newer instance replaces an older one
    if (!this._onOpen) {
      this._onOpen = () => { if (window.__awayCard === this) this._reopen(); };
      this._onAsk = () => { if (window.__awayCard === this) this._publish(); };
      window.addEventListener("away-summary-open", this._onOpen);
      window.addEventListener("away-summary-ask", this._onAsk);
    }
    window.__awayCard = this;
  }
  set hass(h) {
    this._hass = h;
    if (!this._root) { this._root = this.attachShadow({ mode: "open" }); this._root.innerHTML = `<style>${AW_CSS}</style><ha-card></ha-card>`;
      this._root.addEventListener("click", (e) => this._click(e)); }
    const mode = h.states[this._c.mode]?.state, dis = h.states[this._c.dismissed]?.state;
    const key = mode + "|" + dis;
    if (key !== this._key) { this._key = key; this._load(); }          // mode/dismiss change -> reload period + events
    else if (this._data && Date.now() - this._loadedAt > 5 * 60000) this._load(); // refresh every 5 min
    else this._render();
  }
  _sec() { return Math.floor(Date.now() / 1000); }
  async _load() {
    if (this._loading) { this._again = true; return; }
    this._loading = true;
    try { await this._fetch(); } catch (e) { console.warn("away-card", e); this._err = String(e && e.message || e); }
    this._loading = false; this._loadedAt = Date.now();
    this._render(); this._publish();
    if (this._again) { this._again = false; this._load(); }
  }
  async _fetch() {
    const h = this._hass, c = this._c, now = Date.now(), from = new Date(now - c.max_days * 86400000);
    // 1) last Away period from House Mode history
    const hm = await h.callWS({ type: "history/history_during_period", start_time: from.toISOString(), end_time: new Date(now + 60000).toISOString(),
      entity_ids: [c.mode], minimal_response: true, no_attributes: true, significant_changes_only: false });
    const rows = (hm[c.mode] || []).map((r) => ({ s: r.s, t: (r.lu || r.lc) * 1000 }));
    let start = null, end = null, clipped = false;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].s === "Away") { start = rows[i].t; end = i + 1 < rows.length ? rows[i + 1].t : null;
        while (i > 0 && rows[i - 1].s === "Away") { i--; start = rows[i].t; }
        if (i === 0 && start <= from.getTime() + 1000) { clipped = true; start = from.getTime(); }
        break; }
    }
    if (start === null) { this._data = { none: true }; return; }
    const winEnd = end || now;
    // 2) doors & windows opened in the period
    const ids = [...c.doors, ...c.windows].map((x) => x[0]);
    const dh = await h.callWS({ type: "history/history_during_period", start_time: new Date(start).toISOString(), end_time: new Date(winEnd).toISOString(),
      entity_ids: ids, minimal_response: true, no_attributes: true, significant_changes_only: false, include_start_time_state: false });
    const opens = [];
    for (const id of ids) {
      const r = dh[id] || [];
      for (let i = 0; i < r.length; i++) if (r[i].s === "on") {
        const t = (r[i].lu || r[i].lc) * 1000, nx = r.slice(i + 1).find((x) => x.s !== "on");
        opens.push({ id, t, secs: nx ? Math.round(((nx.lu || nx.lc) * 1000 - t) / 1000) : null });
      }
    }
    // 3) heating range in the period
    let tmin = null, tmax = null;
    try {
      const ch = await h.callWS({ type: "history/history_during_period", start_time: new Date(start).toISOString(), end_time: new Date(winEnd).toISOString(),
        entity_ids: [c.climate], minimal_response: false, no_attributes: false, significant_changes_only: false });
      for (const r of ch[c.climate] || []) { const v = r.a && r.a.current_temperature; if (typeof v === "number") { tmin = tmin === null ? v : Math.min(tmin, v); tmax = tmax === null ? v : Math.max(tmax, v); } }
    } catch (e) { /* range is optional */ }
    // 4) Frigate events in the period
    let ev = [];
    try {
      const r = await h.callWS({ type: "frigate/events/get", instance_id: c.frigate_instance, after: Math.floor(start / 1000), before: Math.ceil(winEnd / 1000), limit: 500 });
      ev = (typeof r === "string" ? JSON.parse(r) : r) || [];
    } catch (e) { this._ferr = true; }
    this._data = { start, end, clipped, opens, tmin, tmax, ev };
  }
  _build() { // events -> chips + timeline rows
    const c = this._c, d = this._data, rows = [], used = new Set();
    const people = d.ev.filter((e) => e.label === "person").sort((a, b) => a.start_time - b.start_time);
    // cluster person events within 2 min into one visit
    const visits = [];
    for (const e of people) { const v = visits[visits.length - 1];
      if (v && e.start_time - v.last <= 120) { v.ev.push(e); v.last = Math.max(v.last, e.end_time || e.start_time); } else visits.push({ ev: [e], first: e.start_time, last: e.end_time || e.start_time }); }
    const rank = { Doorbell: 0, Rear_Door: 1, Rear_Shed: 2, Front_Car: 3, Front_Van: 4 };
    for (const v of visits) {
      const named = v.ev.find((e) => e.sub_label), main = named && named.camera === "Doorbell" ? named
        : [...v.ev].sort((a, b) => (rank[a.camera] ?? 9) - (rank[b.camera] ?? 9))[0];
      const who = named ? awCap(Array.isArray(named.sub_label) ? named.sub_label[0] : named.sub_label) : "Person";
      const place = c.person_place[main.camera] || "seen";
      const cams = [...new Set(v.ev.map((e) => c.camera_names[e.camera] || e.camera))];
      // door opened around this visit?
      const op = d.opens.find((o) => !used.has(o) && c.door_camera[o.id] && v.ev.some((e) => e.camera === c.door_camera[o.id]) && o.t / 1000 >= v.first - 120 && o.t / 1000 <= v.last + 180);
      if (op) used.add(op);
      const dn = op ? (c.doors.find((x) => x[0] === op.id) || [0, ""])[1] : "";
      rows.push({ t: v.first * 1000, title: who + " " + place, sub: cams.join(" · ") + (op ? " · " + dn.toLowerCase() + " opened" + (op.secs !== null ? " " + op.secs + " s" : "") : ""),
        img: main.id, clip: main.has_clip ? main.id : null, col: "am" });
    }
    const cars = d.ev.filter((e) => e.label === "car"), named = cars.filter((e) => e.sub_label);
    for (const e of named) rows.push({ t: e.start_time * 1000, title: awCap(Array.isArray(e.sub_label) ? e.sub_label[0] : e.sub_label) + " van",
      sub: (c.camera_names[e.camera] || e.camera), img: e.id, clip: e.has_clip ? e.id : null, col: "cy" });
    for (const o of d.opens) if (!used.has(o)) {
      const isDoor = c.doors.some((x) => x[0] === o.id), nm = ([...c.doors, ...c.windows].find((x) => x[0] === o.id) || [0, o.id])[1];
      rows.push({ t: o.t, title: nm + " opened", sub: (o.secs !== null ? "open " + (o.secs < 120 ? o.secs + " s" : Math.round(o.secs / 60) + " min") : "still open") + " · nobody on camera", img: null, icon: isDoor ? "🚪" : "🪟", col: "rd" });
    }
    rows.sort((a, b) => b.t - a.t);
    const cnt = (f) => d.ev.filter(f).length, chips = [];
    for (const [id, nm] of c.doors) { const n = d.opens.filter((o) => o.id === id).length; if (n) chips.push([n + "×", nm]); }
    const wn = d.opens.filter((o) => c.windows.some((x) => x[0] === o.id)).length; if (wn) chips.push([wn + "×", "Windows"]);
    if (visits.length) chips.push([visits.length, visits.length === 1 ? "Visitor" : "Visitors"]);
    const nm = {}; for (const e of named) { const k = awCap(Array.isArray(e.sub_label) ? e.sub_label[0] : e.sub_label); nm[k] = (nm[k] || 0) + 1; }
    for (const k in nm) chips.push([nm[k], k]);
    const nc = cnt((e) => e.label === "car"), cats = cnt((e) => e.label === "cat");
    if (nc) chips.push([nc, nc === 1 ? "Car" : "Cars"]); if (cats) chips.push([cats, cats === 1 ? "Cat" : "Cats"]);
    const heat = d.tmin !== null && d.tmin !== undefined ? [d.tmin === d.tmax ? d.tmin + " °C" : d.tmin + "–" + d.tmax + " °C", "Heating"] : null;
    const hid = [cats && cats + (cats === 1 ? " cat" : " cats"), (nc - named.length) && (nc - named.length) + " passing car" + (nc - named.length === 1 ? "" : "s")].filter(Boolean);
    return { rows, chips, heat, visits: visits.length, hidden: hid.length ? "+ " + hid.join(", ") + " (counted, not listed)" : "" };
  }
  _visible() {
    const h = this._hass, d = this._data; if (!h) return false;
    if (h.states[this._c.mode]?.state === "Away") return true;
    if (!d || d.none) return false;
    const ds = h.states[this._c.dismissed], dt = ds && ds.attributes.timestamp != null ? ds.attributes.timestamp * 1000 : 0;
    return dt < d.start;
  }
  _linkOn() { // Security-tile line: while the card shows, then link_hours after Dismiss
    if (this._visible()) return true;
    const d = this._data, ds = this._hass.states[this._c.dismissed], dt = ds && ds.attributes.timestamp != null ? ds.attributes.timestamp * 1000 : 0;
    return !!d && !d.none && dt >= d.start && Date.now() - dt < this._c.link_hours * 3600000;
  }
  _setHidden(hide) {
    if (this._hid === hide) return; this._hid = hide; this.hidden = hide;
    this.dispatchEvent(new CustomEvent("card-visibility-changed", { detail: { value: !hide }, bubbles: true, composed: true }));
  }
  _publish() { // tell the Home card's Security tile what to show
    const d = this._data, s = d && !d.none ? this._build() : null;
    window.__awaySummary = d && !d.none ? { start: d.start, end: d.end, clipped: d.clipped, visible: this._visible(), link: this._linkOn(), visits: s.visits, events: s.rows.length } : null;
    window.dispatchEvent(new CustomEvent("away-summary", { detail: window.__awaySummary }));
  }
  _render() {
    if (!this._root) return;
    const hc = this._root.querySelector("ha-card");
    { const ink = getComputedStyle(this).getPropertyValue("--primary-text-color").trim(), m = ink.match(/^#?([0-9a-f]{6})$/i);
      const lum = m ? (parseInt(m[1].slice(0, 2), 16) * .299 + parseInt(m[1].slice(2, 4), 16) * .587 + parseInt(m[1].slice(4, 6), 16) * .114) : 255;
      hc.classList.toggle("lt", lum < 128); }
    if (this._c.preview) { this._setHidden(false); } else this._setHidden(!this._visible());
    if (this._hid) { hc.innerHTML = ""; return; }
    const h = this._hass, c = this._c, d = this._data;
    if (!d) { hc.innerHTML = `<div class="tt">🏡 While you were away</div><div class="load">Loading…</div>`; return; }
    if (d.none) { hc.innerHTML = `<div class="tt">🏡 While you were away</div><div class="load">No Away in the last ${c.max_days} days.</div>`; return; }
    const away = h.states[c.mode]?.state === "Away", st0 = new Date(d.start), endT = d.end || Date.now();
    const left = (d.clipped ? "more than " + c.max_days + " days ago" : awDay(st0) + " " + awDM(st0) + " " + awT(st0));
    const dur = d.clipped ? c.max_days + "+ days · showing the last " + c.max_days : awDur(endT - d.start);
    const sub = away ? "Since you left " + left + " · " + dur : "Welcome back · left " + left + " · away " + dur;
    const b = this._build();
    const narrow = this.getBoundingClientRect().width && this.getBoundingClientRect().width <= 600;
    const lim = this._all ? b.rows.length : narrow ? 4 : 8, shown = b.rows.slice(0, lim);
    const row = (r) => { const dt = new Date(r.t), today = new Date().toDateString() === dt.toDateString();
      return `<div class="ev${r.clip ? " clk" : ""}" ${r.clip ? `data-clip="${awEsc(r.clip)}"` : ""}><div class="et"><b>${awT(dt)}</b><span>${today ? "Today" : awDay(dt) + " " + awDM(dt)}</span></div><div class="ed ${r.col}"></div>`
        + (r.img ? `<img loading="lazy" src="/api/frigate/notifications/${encodeURIComponent(r.img)}/thumbnail.jpg" alt="">` : `<div class="ni">${r.icon || "🚪"}</div>`)
        + `<div class="ex"><div class="en">${awEsc(r.title)}</div><div class="ee">${awEsc(r.sub)}</div></div></div>`; };
    const chip = ([v, l]) => `<span class="chip"><b>${awEsc(v)}</b> ${awEsc(l)}</span>`;
    const body = !b.rows.length && !b.chips.length
      ? `<div class="quiet">✅ All quiet — no doors or windows opened, nobody on camera${this._ferr ? " (camera events couldn't be read)" : ""}</div>`
        + (b.heat ? `<div class="chips" style="margin-top:8px">${chip(b.heat)}</div>` : "")
      : `<div class="chips">${[...b.chips, ...(b.heat ? [b.heat] : [])].map(([v, l]) => `<span class="chip"><b>${awEsc(v)}</b> ${awEsc(l)}</span>`).join("")}</div>`
        + (shown.length ? `<div class="evs">${shown.map(row).join("")}</div>` : "")
        + `<div class="more">${awEsc(b.hidden)}${b.rows.length > lim ? (b.hidden ? " · " : "") + `<u data-act="all">Show all ${b.rows.length}</u>` : this._all && b.rows.length > (narrow ? 4 : 8) ? (b.hidden ? " · " : "") + `<u data-act="less">Show less</u>` : ""}</div>`;
    hc.innerHTML = `<div class="hd"><div><div class="tt">🏡 While you were away</div><div class="sb">${awEsc(sub)}</div></div><span class="mode${away ? "" : " home"}">${away ? "Away" : "Home"}</span></div>
      <div class="h2">Since you left</div>${body}
      <div class="ft"><button class="lnk" data-act="sec">🛡️ Security tab ›</button>${away ? "" : `<button class="dis" data-act="dismiss">✓ Dismiss</button>`}</div>`;
  }
  _click(e) {
    const a = e.target.closest("[data-act]"), cl = e.target.closest("[data-clip]");
    if (a) { const k = a.dataset.act;
      if (k === "all" || k === "less") { this._all = k === "all"; this._render(); }
      if (k === "sec") { history.pushState(null, "", "/smart-home/security"); window.dispatchEvent(new CustomEvent("location-changed")); }
      if (k === "dismiss") this._hass.callService("input_datetime", "set_datetime", { entity_id: this._c.dismissed, timestamp: this._sec() });
      return; }
    if (cl) this._play(cl.dataset.clip);
  }
  _play(id) {
    const o = document.createElement("div"); o.className = "vid";
    o.innerHTML = `<video controls autoplay playsinline src="/api/frigate/notifications/${encodeURIComponent(id)}/clip.mp4"></video><button>Close</button>`;
    o.addEventListener("click", (e) => { if (e.target === o || e.target.tagName === "BUTTON") o.remove(); });
    this._root.appendChild(o);
  }
  async _reopen() { // from the Security tile: show the last summary again and scroll to it
    if (this._data && !this._data.none && !this._visible())
      await this._hass.callService("input_datetime", "set_datetime", { entity_id: this._c.dismissed, timestamp: 0 });
    let n = 0; const go = () => { if (this.isConnected && !this._hid) this.scrollIntoView({ behavior: "smooth", block: "start" }); else if (n++ < 30) setTimeout(go, 100); };
    setTimeout(go, 100);
  }
}
customElements.define("away-card", AwayCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "away-card", name: "While you were away", description: "What happened while the house was Away (last 7 days max), until dismissed" });
console.info("away-card v" + AW_VER);
