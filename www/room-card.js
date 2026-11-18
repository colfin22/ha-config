/* room-card — one universal card for every room tab (desktop + phone), built 18-11-2026 from the accepted Room Card mock (v5).
 * Source: ~/homelab/room-mock/card/room-card.js -> /config/www/room-card.js (resource /local/room-card.js?v=N, bump on every edit)
 * Lights first (All Lights bar + slim rows), scenes under them; middle = Media / Devices / Security / Climate; right = the room's OWN
 * remote card (his existing firemote-card / media-control config, embedded as-is). Sections the room hasn't got don't appear.
 * Config: layout, name, photo, lights:[{e,n}] (first = the "All Lights" group), scenes, media, devices, security, sensors: [{e,n}],
 *         remote: <card config>, remote_inline: true (show under Media instead of its own column), remote_name,
 *         photo_tap: path the room photo opens (default /smart-home/home, as his old picture cards).
 */
const RC_VERSION = "2";
const RC_BULB = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-4 12.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26A7 7 0 0 0 12 2Zm-3 18a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-1H9Z"/></svg>';
const RC_SI = { Bright: "☀️", Dimmed: "🌗", Night: "🌙", Movie: "🎬", Tropical: "🦋", Sunset: "🌅", "Lake Placid": "🏞", "Rolling Hills": "⛰", "Ceiling Only": "💡", Bedside: "🛏", "Kitchen 1 & 2": "💡" };
const RC_ST = { playing: "Playing", paused: "Paused", idle: "Idle", off: "Off", on: "On", standby: "Standby", unavailable: "Offline", unknown: "Unknown" };
const rEsc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const RC_CSS = `
:host{--rc-card:var(--ha-card-background,var(--card-background-color,#121826));--rc-deep:var(--secondary-background-color,#0e1420);
 --rc-ink:var(--primary-text-color,#e8eef7);--rc-sec:var(--secondary-text-color,#7d8aa6);--rc-bd:var(--divider-color,#1d2740);
 --rc-cy:#35c9e6;--rc-gr:#3ddc84;--rc-am:#ffc94d;--rc-warm:#ffcf6e;--rc-trk:rgba(127,140,170,.25);display:block;color:var(--rc-ink)}
.lt-theme{--rc-cy:#0a7fa0;--rc-gr:#18864b;--rc-am:#b26b00;--rc-warm:#f0a500}
*{box-sizing:border-box}button{font:inherit;color:inherit}
ha-card{overflow:hidden}
.top{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr) auto}
.top.norem{grid-template-columns:minmax(0,1.25fr) minmax(0,1fr)}
.col{padding:16px 18px;min-width:0}.col+.col{border-left:1px solid var(--rc-bd)}
.dk .card-h{height:calc(100vh - var(--header-height,56px) - 48px);min-height:640px}
.dk .top{height:100%}.dk .col{display:flex;flex-direction:column;overflow:auto;scrollbar-width:thin}
.hero{cursor:pointer;position:relative;height:clamp(150px,24vh,260px);flex:0 0 auto;border-radius:12px;overflow:hidden;margin-bottom:14px;background:#000}
.hero img{width:100%;height:100%;object-fit:cover;display:block;filter:brightness(.55)}
.hero .nm{position:absolute;left:16px;top:12px;font-size:26px;color:#fff;text-shadow:0 1px 6px #000}
.hero .chips{position:absolute;left:12px;right:12px;bottom:10px;display:flex;gap:6px;flex-wrap:wrap}
.chip{display:flex;align-items:center;gap:5px;background:rgba(10,14,23,.72);backdrop-filter:blur(4px);border-radius:999px;padding:4px 10px;font-size:12.5px;color:#e8eef7}
.chip.a{color:#ffc94d}.chip.g{color:#3ddc84}
h3{margin:0 0 10px;font-size:12px;letter-spacing:.08em;color:var(--rc-sec);font-weight:600;text-transform:uppercase;display:flex;align-items:center;gap:8px}
h3 .r{margin-left:auto;text-transform:none;letter-spacing:0;font-weight:400}
.sect+.sect{margin-top:18px}
.master{position:relative;height:clamp(80px,11vh,120px);border-radius:18px;background:var(--rc-deep);border:1px solid var(--rc-bd);overflow:hidden;cursor:pointer;user-select:none}
.ph .master{height:74px}
.master .fill{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,rgba(255,207,110,.35),rgba(255,207,110,.18));transition:width .15s}
.master .in{position:relative;display:flex;align-items:center;gap:14px;height:100%;padding:0 18px}
.bulb{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:var(--rc-trk);color:var(--rc-sec);flex:none;transition:all .15s;cursor:pointer}
.on .bulb{background:var(--rc-warm);color:#3a2a00;box-shadow:0 0 18px rgba(255,207,110,.45)}
.master .t{font-size:20px}.ph .master .t{font-size:17px}.master .s{color:var(--rc-sec);font-size:12.5px}
.tgl{margin-left:auto;width:52px;height:30px;border-radius:999px;background:var(--rc-trk);position:relative;flex:none;transition:background .15s;cursor:pointer}
.tgl:after{content:"";position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff;transition:left .15s;box-shadow:0 1px 3px rgba(0,0,0,.3)}
.on .tgl{background:var(--rc-warm)}.on .tgl:after{left:25px}
.lights{display:flex;flex-direction:column;gap:6px;margin-top:10px}
.lt{display:grid;grid-template-columns:auto minmax(80px,140px) 1fr 46px;align-items:center;gap:12px;padding:8px 12px;border-radius:999px;background:var(--rc-deep);border:1px solid var(--rc-bd);min-height:clamp(46px,6vh,62px);user-select:none}
.ph .lt{min-height:0}
.lt .bulb{width:30px;height:30px}.lt .bulb svg{width:16px;height:16px}
.lt .n{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ph .lt .n{font-size:14px}
.trk{height:6px;border-radius:3px;background:var(--rc-trk);position:relative;overflow:hidden;cursor:pointer}
.lt .trk{height:8px;border-radius:4px}
.trk i{position:absolute;inset:0 auto 0 0;background:var(--rc-warm);border-radius:3px}
.lt .pc{font-size:12.5px;color:var(--rc-sec);text-align:right}.lt.on .pc{color:var(--rc-ink)}
.lt.na{opacity:.5}
.scrow{margin-top:14px}.scrow .sl{display:block;font-size:12px;letter-spacing:.08em;color:var(--rc-sec);font-weight:600;text-transform:uppercase;margin-bottom:8px}
.scenes{display:flex;flex-wrap:wrap;gap:8px}
.sc{display:flex;align-items:center;gap:7px;padding:9px 14px;border-radius:999px;font-size:13.5px;background:var(--rc-deep);border:1px solid var(--rc-bd);cursor:pointer}
.sc:hover,.sc.hit{border-color:var(--rc-warm);color:var(--rc-warm)}.sc .i{font-size:17px}
.bigm{position:relative;border-radius:14px;overflow:hidden;background:#0e1420;border:1px solid var(--rc-bd);color:#e8eef7}
.bgb{position:absolute;inset:-30px;background-size:cover;background-position:center;filter:blur(30px) brightness(.35)}
.bmin{position:relative;display:flex;gap:16px;padding:14px;align-items:center}
.bart{width:clamp(150px,22vh,260px);height:clamp(150px,22vh,260px);border-radius:10px;object-fit:cover;flex:none;box-shadow:0 8px 24px rgba(0,0,0,.5)}
.bart.phd{display:grid;place-items:center;background:#1f2a44;font-size:46px;color:#7d8aa6}
.binfo{min-width:0;flex:1}.bst{font-size:12px;color:#9aa7c2}.btt{font-size:22px;line-height:1.25;margin-top:2px;overflow-wrap:anywhere}.bar2{font-size:14px;color:#c7d0e0}.bal{font-size:12.5px;color:#9aa7c2}
.bctl{display:flex;gap:10px;margin-top:12px;align-items:center}.bctl button{background:rgba(255,255,255,.1);border:0;color:#e8eef7;width:40px;height:40px;border-radius:50%;cursor:pointer;font-size:15px}
.bctl button.pp{width:50px;height:50px;background:#e8eef7;color:#0a0e17;font-size:18px}
.bvol{display:flex;align-items:center;gap:8px;margin-top:12px;font-size:12px;color:#9aa7c2}.bvol .trk{flex:1;height:6px;background:rgba(255,255,255,.15)}.bvol .trk i{background:#35c9e6}
.ph .bmin{flex-direction:column;align-items:stretch;text-align:center}.ph .bart{width:100%;height:auto;aspect-ratio:1}.ph .bctl{justify-content:center}
.others{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.pl{background:var(--rc-deep);border:1px solid var(--rc-bd);border-radius:999px;padding:5px 11px;font-size:12.5px;color:var(--rc-sec);cursor:pointer}.pl b{color:var(--rc-ink);font-weight:500}.pl.cur{border-color:var(--rc-cy)}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.it{display:flex;align-items:center;gap:9px;background:var(--rc-deep);border:1px solid var(--rc-bd);border-radius:10px;padding:8px 10px;min-width:0;cursor:pointer}
.it:hover{border-color:var(--rc-cy)}
.it .d{width:8px;height:8px;border-radius:50%;background:var(--rc-trk);flex:none}.it.ok .d{background:var(--rc-gr)}.it.wa .d{background:var(--rc-am)}.it.on .d{background:var(--rc-cy)}
.it>div{min-width:0}.it .n{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.it .s{font-size:11.5px;color:var(--rc-sec);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.remcol{width:290px;display:flex;flex-direction:column;align-items:stretch}.top.norem .remcol{display:none}
.inrem{margin-top:10px}
.empty{color:var(--rc-sec);font-size:12.5px}
.ph .top,.ph .top.norem{grid-template-columns:1fr}.ph .col+.col{border-left:0;border-top:1px solid var(--rc-bd)}.ph .remcol{width:auto}
.ph .hero{height:120px}
`;

class RoomCard extends HTMLElement {
  setConfig(c) {
    if (!c || !Array.isArray(c.lights) || !c.lights.length) throw new Error("room-card: lights (first = All Lights group) required");
    this._c = Object.assign({ layout: "desktop", scenes: [], media: [], devices: [], security: [], sensors: [] }, c);
    this._sel = null; this._remEl = null;
    if (this._root) this._build();
  }
  getCardSize() { return 12; }
  getGridOptions() { return { columns: "full" }; }
  set hass(h) {
    this._hass = h;
    if (!this._root) { this._root = this.attachShadow({ mode: "open" }); this._build(); }
    if (this._remEl) this._remEl.hass = h;
    const c = this._c;
    const ids = [...c.lights, ...c.media, ...c.devices, ...c.security, ...c.sensors].map((x) => x.e);
    const sig = ids.map((e) => { const s = h.states[e]; if (!s) return "-"; const a = s.attributes;
      return s.state + "|" + (a.brightness || "") + "|" + (a.rgb_color || "") + "|" + (a.media_title || "") + "|" + (a.volume_level || "") + "|" + (a.entity_picture || "") + "|" + (a.current_activity || ""); }).join(";");
    if (sig !== this._sig) { this._sig = sig; this._render(); }
  }

  _s(e) { return this._hass.states[e]; }
  _svc(d, s, data) { return this._hass.callService(d, s, data); }
  _more(e) { this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: e }, bubbles: true, composed: true })); }
  _pct(e) { const s = this._s(e); if (!s || s.state !== "on") return 0; return s.attributes.brightness != null ? Math.max(1, Math.round(s.attributes.brightness / 2.55)) : 100; }

  _build() {
    const ph = this._c.layout === "phone";
    this._root.innerHTML = `<style>${RC_CSS}</style><ha-card class="${ph ? "ph" : "dk"}"><div class="card-h"><div class="top" id="top">
      <div class="col"><div class="hero" data-a="home" title="Back to Home"><img id="hi"><div class="nm" id="hn"></div><div class="chips" id="hc"></div></div>
        <div class="sect"><h3>💡 Lights <span class="r" id="lr"></span></h3><div id="master"></div><div class="lights" id="lights"></div></div>
        <div class="scrow" id="scw"><span class="sl">✨ Scenes</span><div class="scenes" id="scenes"></div></div></div>
      <div class="col" id="side"><div id="sideM"></div><div class="inrem" id="inremw" style="display:none"><div style="font-size:12px;color:var(--rc-sec);margin-bottom:4px" id="inreml"></div><div id="inrem"></div></div><div id="sideR"></div></div>
      <div class="col remcol" id="remcol"></div></div></div></ha-card>`;
    this._root.addEventListener("click", (ev) => this._click(ev));
    this._remEl = null; this._sig = "";
    if (this._c.remote) this._makeRemote();
    if (this._hass) this._render();
  }
  async _makeRemote() {
    try {
      const helpers = await window.loadCardHelpers();
      const el = await helpers.createCardElement(this._c.remote);
      if (this._hass) el.hass = this._hass;
      this._remEl = el; this._placeRemote();
    } catch (e) { this._remEl = null; }
  }
  _placeRemote() {
    if (!this._remEl) return;
    const inline = this._c.remote_inline, host = inline ? this._root.getElementById("inrem") : this._root.getElementById("remslot");
    if (host && this._remEl.parentNode !== host) host.appendChild(this._remEl);
  }
  _click(ev) {
    const path = ev.composedPath(); if (this._remEl && path.includes(this._remEl)) return; // the remote card handles its own taps
    const t = path.find((n) => n.dataset && n.dataset.a); if (!t) return;
    const d = t.dataset, c = this._c, all = c.lights[0].e;
    const frac = () => { const r = t.getBoundingClientRect(); return Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)); };
    if (d.a === "alltgl") { ev.stopPropagation(); const on = (this._s(all) || {}).state === "on"; return this._svc("light", on ? "turn_off" : "turn_on", { entity_id: all }); }
    if (d.a === "allbar") return this._svc("light", "turn_on", { entity_id: all, brightness_pct: Math.max(5, Math.round(frac() * 100)) });
    if (d.a === "tgl") return this._svc("light", "toggle", { entity_id: d.e });
    if (d.a === "bri") return this._svc("light", "turn_on", { entity_id: d.e, brightness_pct: Math.max(5, Math.round(frac() * 100)) });
    if (d.a === "scene") { t.classList.add("hit"); setTimeout(() => t.classList.remove("hit"), 900); return this._svc("scene", "turn_on", { entity_id: d.e }); }
    if (d.a === "mp") return this._svc("media_player", d.s, { entity_id: d.e });
    if (d.a === "vol") return this._svc("media_player", "volume_set", { entity_id: d.e, volume_level: Math.round(frac() * 100) / 100 });
    if (d.a === "sel") { this._sel = d.e; return this._render(); }
    if (d.a === "more") return this._more(d.e);
    if (d.a === "home") { const p = c.photo_tap || "/smart-home/home"; history.pushState(null, "", p); window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } })); }
  }
  _pickMedia() {
    const ms = this._c.media.filter((m) => this._s(m.e));
    if (this._sel) { const m = ms.find((x) => x.e === this._sel); if (m) return m; }
    const st = (m) => this._s(m.e);
    return ms.find((m) => st(m).state === "playing") || ms.find((m) => st(m).state === "paused") || ms.find((m) => st(m).attributes.media_title) || ms[0];
  }
  _render() {
    if (!this._hass || !this._root.getElementById("top")) return;
    const c = this._c, $ = (id) => this._root.getElementById(id), ph = c.layout === "phone";
    { const ink = getComputedStyle(this).getPropertyValue("--primary-text-color").trim(), m = ink.match(/^#?([0-9a-f]{6})$/i);
      const lum = m ? (parseInt(m[1].slice(0, 2), 16) * .299 + parseInt(m[1].slice(2, 4), 16) * .587 + parseInt(m[1].slice(4, 6), 16) * .114) : 255;
      this._root.querySelector("ha-card").classList.toggle("lt-theme", lum < 128); }
    // hero
    const img = $("hi"), src = c.photo ? this._hass.hassUrl(c.photo) : ""; if (img.getAttribute("src") !== src) img.setAttribute("src", src);
    $("hn").textContent = c.name || "";
    const kids = c.lights.slice(1), allE = c.lights[0].e, allS = this._s(allE);
    const onk = kids.filter((l) => (this._s(l.e) || {}).state === "on");
    const ch = [];
    const t = c.sensors.find((s) => (this._s(s.e) || {}).attributes && this._s(s.e).attributes.device_class === "temperature");
    const hm = c.sensors.find((s) => (this._s(s.e) || {}).attributes && this._s(s.e).attributes.device_class === "humidity");
    if (t) ch.push(`<span class="chip">🌡 ${(+this._s(t.e).state).toFixed(1)}°${hm ? ` · 💧 ${Math.round(+this._s(hm.e).state)}%` : ""}</span>`);
    c.security.forEach((x) => { const s = this._s(x.e); if (!s) return; const pres = /presence|occupancy|motion/.test(x.e), on = s.state === "on";
      ch.push(pres ? `<span class="chip ${on ? "a" : ""}">${on ? "🟡 Someone here" : "Nobody here"}</span>` : `<span class="chip ${on ? "a" : "g"}">${rEsc(x.n)} ${on ? "open" : "closed"}</span>`); });
    if (onk.length) ch.push(`<span class="chip a">💡 ${onk.length} on</span>`);
    const playing = c.media.find((m) => (this._s(m.e) || {}).state === "playing");
    if (playing) ch.push(`<span class="chip">🎵 ${rEsc(this._s(playing.e).attributes.media_title || playing.n)}</span>`);
    $("hc").innerHTML = ch.join("");
    // lights
    $("lr").textContent = onk.length ? `${onk.length} of ${kids.length} on` : "all off";
    const allOn = allS ? allS.state === "on" : onk.length > 0, allP = allOn ? this._pct(allE) : 0;
    $("master").innerHTML = `<div class="master ${allOn ? "on" : ""}" data-a="allbar"><div class="fill" style="width:${allP}%"></div><div class="in"><div class="bulb" data-a="alltgl">${RC_BULB}</div><div><div class="t">${rEsc(c.lights[0].n)}</div><div class="s">${allOn ? "On · " + allP + " %" : "Off"} · tap along the bar to set brightness</div></div><div class="tgl" data-a="alltgl"></div></div></div>`;
    $("lights").innerHTML = kids.map((l) => { const s = this._s(l.e), on = s && s.state === "on", p = this._pct(l.e), rgb = on && s.attributes.rgb_color, na = !s || s.state === "unavailable";
      return `<div class="lt ${on ? "on" : ""} ${na ? "na" : ""}"><div class="bulb" data-a="tgl" data-e="${l.e}" ${rgb ? `style="background:rgb(${rgb});box-shadow:0 0 12px rgba(${rgb},.5)"` : ""}>${RC_BULB}</div><div class="n">${rEsc(l.n)}</div><div class="trk" data-a="bri" data-e="${l.e}"><i style="width:${p}%"></i></div><div class="pc">${na ? "Offline" : on ? p + " %" : "Off"}</div></div>`; }).join("");
    $("scw").style.display = c.scenes.length ? "" : "none";
    $("scenes").innerHTML = c.scenes.map((s) => `<div class="sc" data-a="scene" data-e="${s.e}"><span class="i">${RC_SI[s.n] || "✦"}</span>${rEsc(s.n)}</div>`).join("");
    // side
    let h = "";
    const m = this._pickMedia();
    if (m) {
      const s = this._s(m.e), a = s.attributes, pic = a.entity_picture_local || a.entity_picture, pc = pic ? rEsc(this._hass.hassUrl(pic)) : "";
      const others = c.media.filter((x) => x.e !== m.e && this._s(x.e));
      const playingNow = s.state === "playing";
      h += `<div class="sect"><h3>🎵 Media <span class="r">${rEsc(m.n)}</span></h3><div class="bigm">${pc ? `<div class="bgb" style="background-image:url('${pc}')"></div>` : ""}<div class="bmin">${pc ? `<img class="bart" src="${pc}">` : '<div class="bart phd">♪</div>'}
        <div class="binfo"><div class="bst">${RC_ST[s.state] || rEsc(s.state)}${a.media_title && !playingNow ? " · last played" : ""}</div><div class="btt">${rEsc(a.media_title || "Nothing playing")}</div>${a.media_artist ? `<div class="bar2">${rEsc(a.media_artist)}</div>` : ""}${a.media_album_name ? `<div class="bal">${rEsc(a.media_album_name)}</div>` : ""}
        <div class="bctl"><button data-a="mp" data-s="media_previous_track" data-e="${m.e}">⏮</button><button class="pp" data-a="mp" data-s="media_play_pause" data-e="${m.e}">${playingNow ? "⏸" : "▶"}</button><button data-a="mp" data-s="media_next_track" data-e="${m.e}">⏭</button></div>
        ${a.volume_level != null ? `<div class="bvol"><span>🔈</span><div class="trk" data-a="vol" data-e="${m.e}"><i style="width:${Math.round(a.volume_level * 100)}%"></i></div><span>${Math.round(a.volume_level * 100)}%</span></div>` : ""}</div></div></div>
        ${others.length ? `<div class="others"><span style="font-size:12px;color:var(--rc-sec);align-self:center">Also here:</span>${others.map((o) => `<span class="pl" data-a="sel" data-e="${o.e}"><b>${rEsc(o.n)}</b> · ${RC_ST[this._s(o.e).state] || rEsc(this._s(o.e).state)}</span>`).join("")}</div>` : ""}
        </div>`;
    }
    $("sideM").innerHTML = h; h = "";
    $("inremw").style.display = c.remote && c.remote_inline ? "" : "none"; $("inreml").textContent = "🎮 Remote · " + (c.remote_name || "");
    if (c.devices.length) h += `<div class="sect"><h3>🔌 Devices</h3><div class="grid2">${c.devices.map((d) => { const s = this._s(d.e); if (!s) return "";
      const u = s.attributes.unit_of_measurement, act = s.attributes.current_activity, on = s.state === "on";
      const v = act != null ? act : u ? `${Math.round(+s.state)} ${u}` : RC_ST[s.state] || s.state;
      return `<div class="it ${on || u ? "on" : ""}" data-a="more" data-e="${d.e}"><span class="d"></span><div><div class="n">${rEsc(d.n)}</div><div class="s">${rEsc(v)}</div></div></div>`; }).join("")}</div></div>`;
    if (c.security.length) h += `<div class="sect"><h3>🛡 Security</h3><div class="grid2">${c.security.map((x) => { const s = this._s(x.e); if (!s) return "";
      const pres = /presence|occupancy|motion/.test(x.e), on = s.state === "on";
      return `<div class="it ${on ? "wa" : "ok"}" data-a="more" data-e="${x.e}"><span class="d"></span><div><div class="n">${rEsc(x.n)}</div><div class="s">${pres ? (on ? "Detected" : "Clear") : (on ? "Open" : "Closed")}</div></div></div>`; }).join("")}</div></div>`;
    if (c.sensors.length) h += `<div class="sect"><h3>🌡 Climate</h3><div class="grid2">${c.sensors.map((x) => { const s = this._s(x.e); if (!s) return "";
      return `<div class="it" data-a="more" data-e="${x.e}"><span class="d" style="background:var(--rc-cy)"></span><div><div class="n">${rEsc(x.n)}</div><div class="s">${isNaN(+s.state) ? rEsc(s.state) : (+s.state).toFixed(1)} ${rEsc(s.attributes.unit_of_measurement || "")}</div></div></div>`; }).join("")}</div></div>`;
    $("sideR").innerHTML = h ? (m ? '<div style="margin-top:18px"></div>' : "") + h : "";
    const hasCol = !!c.remote && !c.remote_inline;
    $("top").classList.toggle("norem", !hasCol);
    if (hasCol && !$("remslot")) $("remcol").innerHTML = `<h3>🎮 Remote <span class="r">${rEsc(c.remote_name || "")}</span></h3><div id="remslot"></div>`;
    this._placeRemote();
  }
}
customElements.define("room-card", RoomCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "room-card", name: "Room Card", description: "Universal room card: lights, scenes, media, devices, security, climate, remote" });
console.info("%c ROOM-CARD %c v" + RC_VERSION + " ", "background:#ffcf6e;color:#3a2a00", "background:#121826;color:#fff");
