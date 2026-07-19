/* alarm-activity-card — Security "Recent activity" replica with true who-badges (ha-config #39).
 * Stock multi-entity logbook rendering (layout/colours measured from the live card):
 * timeline + state dots, name/area rows, state + HH:MM:SS. The badge on alarm rows
 * resolves by priority:
 *   1. the panel's changed_by attribute (Alarmo per-user codes — dormant until codes
 *      are enabled, wired now so enabling them later needs no card change)
 *   2. the recorded initiator helper (NFC tag scans, written by the nfc engine)
 *   3. the event's native user context (app arm/disarm — a real person's photo)
 *   4. a non-person user context = the automation -> Node-RED logo
 *   5. nothing known -> no badge (state-machine completions like arming->armed)
 * Sensor rows never carry a badge. */
class AlarmActivityCard extends HTMLElement {
  setConfig(config) {
    this._config = Object.assign({
      entities: [
        "alarm_control_panel.house", "alarm_control_panel.shed",
        "binary_sensor.front_door_contact", "binary_sensor.back_door_contact",
        "binary_sensor.patio_door_contact", "binary_sensor.sitting_room_window_contact",
        "binary_sensor.back_window_contact", "binary_sensor.colm_window_contact",
        "binary_sensor.cian_window_contact", "binary_sensor.aoife_window_contact",
        "binary_sensor.office_window_contact", "binary_sensor.shed_door_contact",
        "binary_sensor.sitting_room_presence_occupancy", "binary_sensor.office_presence_occupancy",
        "binary_sensor.doorbell_person_occupancy", "binary_sensor.front_van_person_occupancy",
        "binary_sensor.front_car_person_occupancy", "binary_sensor.rear_door_person_occupancy",
        "binary_sensor.rear_shed_person_occupancy",
      ],
      by_entity: "input_text.alarm_status_by",
      hours: 24,
      max_items: 50,
      title: null,
    }, config);
    this._built = false;
    this._lastHash = null;
    this._lastFetch = 0;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._built) this._build();
    const hash = this._config.entities.map((e) => (hass.states[e] || {}).state).join("|");
    const now = Date.now();
    if (hash !== this._lastHash || now - this._lastFetch > 60000) {
      this._lastHash = hash;
      this._lastFetch = now;
      this._fetch();
    }
  }

  _build() {
    const card = document.createElement("ha-card");
    card.innerHTML = `
      <style>
        .wrap { padding: 4px 0 10px; }
        .title { color: var(--primary-text-color); font-size:16px; font-weight:500; padding:12px 14px 0; }
        .day { color: var(--primary-text-color); font-size:13.5px; font-weight:600; padding:13px 14px 8px; }
        .row { position:relative; display:flex; align-items:center; min-height:56px; padding:2px 12px 2px 26px; }
        .tl { position:absolute; left:31px; top:-4px; bottom:-4px; width:2px; background: var(--divider-color, #1d2740); }
        .dot { width:7px; height:7px; border-radius:50%; flex:0 0 7px; margin-right:14px;
               position:relative; z-index:1; outline:4px solid var(--card-background-color, #121826); }
        .mid { flex:1 1 auto; min-width:0; }
        .nm { color: var(--primary-text-color); font-size:14.5px; font-weight:600;
              white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .sub { color: var(--secondary-text-color); font-size:12.5px; margin-top:2px; }
        .right { text-align:right; }
        .st { color: var(--primary-text-color); font-size:14px; font-weight:600; }
        .meta { display:flex; align-items:center; justify-content:flex-end; gap:8px; margin-top:2px; }
        .badge { width:22px; height:22px; border-radius:50%; overflow:hidden;
                 background: var(--light-primary-color, #7fdcee); color: var(--card-background-color, #121826);
                 display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:500; }
        .badge img { width:100%; height:100%; object-fit:cover; }
        .badge.nr { background:#8f0000; }
        .badge.hand { font-size:13px; }
        .tm { color: var(--secondary-text-color); font-size:12.5px; }
        .empty { color: var(--secondary-text-color); font-size:13px; padding:10px 14px; }
      </style>
      <div class="wrap">
        <div class="title" hidden></div>
        <div class="list"><div class="empty">Loading…</div></div>
      </div>`;
    if (this._config.title) {
      const t = card.querySelector(".title");
      t.textContent = this._config.title;
      t.hidden = false;
    }
    this._list = card.querySelector(".list");
    this.replaceChildren(card);
    this._built = true;
  }

  _cssVar(names, fallback) {
    const cs = getComputedStyle(this);
    for (const n of names) {
      const v = cs.getPropertyValue(n).trim();
      if (v) return v;
    }
    return fallback;
  }

  _dot(eid, state) {
    if (eid.startsWith("binary_sensor.")) {
      return state === "on"
        ? this._cssVar(["--state-binary-sensor-active-color", "--state-active-color"], "#ffc107")
        : this._cssVar(["--state-binary-sensor-color", "--state-inactive-color"], "#9a9b9b");
    }
    if (state === "triggered") return this._cssVar(["--state-alarm-control-panel-triggered-color", "--error-color"], "#ff5a5a");
    if (state === "arming" || state === "pending") return this._cssVar(["--state-alarm-control-panel-arming-color"], "#ffc107");
    if (state && state.startsWith("armed")) return this._cssVar(["--state-alarm-control-panel-armed-away-color", "--state-alarm-control-panel-armed-color"], "#a880ff");
    return this._cssVar(["--state-alarm-control-panel-disarmed-color"], "#7985a1");
  }

  _label(eid, state) {
    if (eid.startsWith("alarm_control_panel.")) {
      const s = state.replace(/_/g, " ");
      return s[0].toUpperCase() + s.slice(1);
    }
    const dc = ((this._hass.states[eid] || {}).attributes || {}).device_class || "";
    if (["door", "window", "opening", "garage_door"].includes(dc)) return state === "on" ? "Open" : "Closed";
    if (["motion", "occupancy", "presence"].includes(dc)) return state === "on" ? "Detected" : "Clear";
    return state === "on" ? "On" : state === "off" ? "Off" : state;
  }

  _name(eid) {
    const st = this._hass.states[eid];
    let n = (st && st.attributes.friendly_name) || eid;
    const ent = this._hass.entities && this._hass.entities[eid];
    const dev = ent && this._hass.devices && this._hass.devices[ent.device_id];
    if (dev && dev.name && n.startsWith(dev.name + " ") && n.length > dev.name.length + 1) {
      n = n.slice(dev.name.length + 1);
    }
    return n;
  }

  _sub(eid) {
    const ent = this._hass.entities && this._hass.entities[eid];
    if (ent) {
      const areaId = ent.area_id ||
        (this._hass.devices && this._hass.devices[ent.device_id] || {}).area_id;
      const area = areaId && this._hass.areas && this._hass.areas[areaId];
      if (area && area.name) return area.name;
      if (ent.platform) return ent.platform[0].toUpperCase() + ent.platform.slice(1);
    }
    return "";
  }

  _personByUserId(uid) {
    return Object.values(this._hass.states).find((s) =>
      s && (s.entity_id || "").startsWith("person.") && s.attributes &&
      s.attributes.user_id === uid);
  }

  _personByName(name) {
    return Object.values(this._hass.states).find((s) =>
      s && (s.entity_id || "").startsWith("person.") && s.attributes &&
      ((s.attributes.friendly_name || "").split(" ")[0].toLowerCase() === name.toLowerCase()));
  }

  _personBadge(person, nameFallback) {
    const el = document.createElement("span");
    el.className = "badge";
    if (person && person.attributes.entity_picture) {
      const img = document.createElement("img");
      img.src = person.attributes.entity_picture;
      el.replaceChildren(img);
    } else {
      el.textContent = (nameFallback || "?")[0].toUpperCase();
    }
    return el;
  }

  _nrBadge() {
    const el = document.createElement("span");
    el.className = "badge nr";
    const img = document.createElement("img");
    img.src = "/local/node-red-icon.svg";
    img.onerror = () => { el.className = "badge"; el.replaceChildren(); el.textContent = "N"; };
    el.replaceChildren(img);
    return el;
  }

  _handBadge() {
    const el = document.createElement("span");
    el.className = "badge hand";
    el.textContent = "✋";
    return el;
  }

  _badge(row, byRows, cbRows) {
    if (!row.entity_id.startsWith("alarm_control_panel.")) return null;
    const t = new Date(row.when).getTime();
    // 1. Alarmo per-user code (changed_by) — dormant until codes are enabled
    const cb = cbRows.find((c) => Math.abs(c.t - t) <= 5000);
    if (cb) return this._personBadge(this._personByName(cb.by), cb.by);
    // 2. recorded initiator (NFC tag scans)
    let best = null, bestD = 10000;
    for (const b of byRows) {
      const d = Math.abs(b.t - t);
      if (d < bestD) { bestD = d; best = b.by; }
    }
    if (best) {
      if (best === "hand") return this._handBadge();
      return this._personBadge(this._personByName(best), best);
    }
    // 3./4. native event context
    const uid = row.context_user_id;
    if (!uid) return null;
    const person = this._personByUserId(uid);
    if (person) return this._personBadge(person, person.attributes.friendly_name);
    return this._nrBadge(); // a non-person user = the automation account
  }

  async _fetch() {
    if (!this._hass) return;
    const end = new Date();
    const start = new Date(end.getTime() - this._config.hours * 3600 * 1000);
    const panels = this._config.entities.filter((e) => e.startsWith("alarm_control_panel."));
    const lbUrl = "logbook/" + start.toISOString() +
      "?entity=" + this._config.entities.join(",") +
      "&end_time=" + encodeURIComponent(end.toISOString());
    const histUrl = (eids, minimal) => "history/period/" + start.toISOString() +
      "?filter_entity_id=" + eids.join(",") +
      "&end_time=" + encodeURIComponent(end.toISOString()) +
      (minimal ? "&minimal_response&no_attributes" : "");
    let lb, byHist, cbHist;
    try {
      [lb, byHist, cbHist] = await Promise.all([
        this._hass.callApi("GET", lbUrl),
        this._hass.callApi("GET", histUrl([this._config.by_entity], true)).catch(() => [[]]),
        this._hass.callApi("GET", histUrl(panels, false)).catch(() => []),
      ]);
    } catch (e) {
      this._list.innerHTML = '<div class="empty">Couldn’t load activity</div>';
      return;
    }
    const ok = (s) => s && s !== "unknown" && s !== "unavailable";
    const byRows = ((byHist && byHist[0]) || []).filter((h) => ok(h.state))
      .map((h) => ({ t: new Date(h.last_changed).getTime(), by: h.state }));
    const cbRows = [];
    for (const series of (cbHist || [])) {
      for (const h of (series || [])) {
        const cb = h.attributes && h.attributes.changed_by;
        if (cb) cbRows.push({ t: new Date(h.last_changed || h.last_updated).getTime(), by: cb });
      }
    }
    const rows = (lb || []).filter((r) => r.entity_id && ok(r.state))
      .reverse().slice(0, this._config.max_items);
    if (!rows.length) {
      this._list.innerHTML = '<div class="empty">No activity in the last ' + this._config.hours + "h</div>";
      return;
    }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yest = new Date(today.getTime() - 86400000);
    const dayLabel = (t) => {
      const date = t.toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" });
      if (t >= today) return "Today · " + date;
      if (t >= yest) return "Yesterday · " + date;
      return date;
    };
    const out = [];
    let curDay = null;
    for (const r of rows) {
      const t = new Date(r.when);
      const lbl = dayLabel(t);
      if (lbl !== curDay) {
        curDay = lbl;
        const day = document.createElement("div");
        day.className = "day"; day.textContent = lbl;
        out.push(day);
      }
      const row = document.createElement("div");
      row.className = "row";
      const tl = document.createElement("span"); tl.className = "tl";
      const dot = document.createElement("span");
      dot.className = "dot"; dot.style.background = this._dot(r.entity_id, r.state);
      const mid = document.createElement("div"); mid.className = "mid";
      const nm = document.createElement("div"); nm.className = "nm"; nm.textContent = this._name(r.entity_id);
      const sub = document.createElement("div"); sub.className = "sub"; sub.textContent = this._sub(r.entity_id);
      mid.append(nm, sub);
      const right = document.createElement("div"); right.className = "right";
      const st = document.createElement("div"); st.className = "st"; st.textContent = this._label(r.entity_id, r.state);
      const meta = document.createElement("div"); meta.className = "meta";
      const badge = this._badge(r, byRows, cbRows);
      if (badge) meta.append(badge);
      const tm = document.createElement("span"); tm.className = "tm";
      tm.textContent = t.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      meta.append(tm);
      right.append(st, meta);
      row.append(tl, dot, mid, right);
      out.push(row);
    }
    this._list.replaceChildren(...out);
  }

  getCardSize() { return 6; }
}
customElements.define("alarm-activity-card", AlarmActivityCard);
