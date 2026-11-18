/* cctv-where-card — the CCTV "Where" map (desktop), built 18-11-2026 from the accepted CCTV Map mock.
 * Source ~/homelab/cctv-map-new/card/cctv-where-card.js -> /config/www/cctv-where-card.js (resource ?v=N, bump on every edit).
 * Same space as before (height = --cctv-live-height published by his cctv-card); his 5 button-card snapshot boxes are created
 * from config `elements:` VERBATIM (same style left/top/width, same tap-to-open snapshot). Between them: his ground floor
 * (Home.xml plan) with room colours, doors/windows, camera dots + beams from HIS markup (beam turns per his corrections), and
 * dashed lines from each box to its camera, recomputed on resize.
 */
const CW_VERSION = "17";
const CW_OCC = { "Front Van": "binary_sensor.front_van_all_occupancy", Doorbell: "binary_sensor.doorbell_all_occupancy", "Front Car": "binary_sensor.front_car_all_occupancy", "Rear Door": "binary_sensor.rear_door_all_occupancy", "Rear Shed": "binary_sensor.rear_shed_all_occupancy" }; // his cctv-card occupancy sensors (Frigate)
const CW_PLAN = `<svg viewBox="10 20 290 530" class="plan" id="pl"><text class="fl" x="30" y="22">GROUND</text><text class="fl" x="330" y="22">FIRST</text><text class="fl" x="630" y="22">YARD</text><polygon class="room mot" data-m="binary_sensor.sitting_room_presence_occupancy" points="30.0,72.0 84.4,72.0 84.4,41.4 176.2,41.4 176.2,72.0 206.8,72.0 206.8,196.1 159.2,243.7 30.0,243.7"/>
<text class="rl" x="118.4" y="142.6">Sitting Room</text>
<polygon class="room mot" data-m="binary_sensor.hallway_motion_sensor_occupancy" points="206.8,72.0 274.8,72.0 274.8,243.7 221.8,243.7 201.4,264.1 201.4,281.1 30.0,281.1 30.0,243.7 159.2,243.7 206.8,196.1"/>
<text class="rl" x="240.8" y="140.0">Hallway</text>
<polygon class="room"  points="221.8,243.7 274.8,243.7 274.8,320.9 201.4,320.9 201.4,264.1"/>
<text class="rl" x="238.1" y="282.3">Toilet</text>
<polygon class="room"  points="30.0,281.1 201.4,281.1 201.4,320.9 274.8,320.9 274.8,475.9 161.2,475.9 161.2,412.0 30.0,412.0"/>
<text class="rl" x="118.4" y="357.6">Kitchen</text>
<polygon class="room"  points="161.2,475.9 274.8,475.9 274.8,531.0 161.2,531.0"/>
<text class="rl" x="218.0" y="503.5">Utility</text>
<line class="we" x1="30.0" y1="72.0" x2="84.4" y2="72.0"/>
<line class="we" x1="84.4" y1="72.0" x2="84.4" y2="41.4"/>
<line class="we" x1="84.4" y1="41.4" x2="176.2" y2="41.4"/>
<line class="we" x1="176.2" y1="41.4" x2="176.2" y2="72.0"/>
<line class="we" x1="176.2" y1="72.0" x2="274.8" y2="72.0"/>
<line class="we" x1="274.8" y1="72.0" x2="274.8" y2="531.0"/>
<line class="we" x1="274.8" y1="531.0" x2="161.2" y2="531.0"/>
<line class="we" x1="161.2" y1="531.0" x2="161.2" y2="412.0"/>
<line class="we" x1="161.2" y1="412.0" x2="30.0" y2="412.0"/>
<line class="we" x1="30.0" y1="412.0" x2="30.0" y2="72.0"/>
<line class="wi" x1="206.8" y1="72.0" x2="206.8" y2="196.1"/>
<line class="wi" x1="206.8" y1="196.1" x2="159.2" y2="243.7"/>
<line class="wi" x1="30.0" y1="243.7" x2="159.2" y2="243.7"/>
<line class="wi" x1="30.0" y1="281.1" x2="201.4" y2="281.1"/>
<line class="wi" x1="221.8" y1="243.7" x2="274.8" y2="243.7"/>
<line class="wi" x1="201.4" y1="264.1" x2="201.4" y2="320.9"/>
<line class="wi" x1="201.4" y1="320.9" x2="274.8" y2="320.9"/>
<line class="wi" x1="161.2" y1="475.9" x2="274.8" y2="475.9"/>
<line class="wi" x1="201.4" y1="264.1" x2="223.2" y2="242.2"/><polygon class="room"  points="330.0,72.0 384.4,72.0 384.4,41.4 476.2,41.4 476.2,72.0 473.5,72.0 473.5,201.9 425.2,201.9 425.2,166.5 330.0,166.5"/>
<text class="rl" x="418.4" y="106.0">Colm</text>
<polygon class="room"  points="330.0,166.5 425.2,166.5 425.2,201.9 330.0,201.9"/>
<polygon class="room"  points="473.5,72.0 574.8,72.0 574.8,201.9 473.5,201.9"/>
<text class="rl" x="524.1" y="136.9">Aoife</text>
<polygon class="room mot" data-m="binary_sensor.landing_motion_sensor_occupancy" points="330.0,201.9 499.0,201.9 499.0,316.8 460.2,316.8 460.2,243.7 359.2,243.7 359.2,276.0 330.0,276.0"/>
<text class="rl" x="398.0" y="221.6">Landing</text>
<polygon class="room"  points="499.0,201.9 574.8,201.9 574.8,274.6 499.0,274.6"/>
<text class="rl" x="536.9" y="238.3">Bathroom</text>
<polygon class="room mot" data-m="binary_sensor.office_presence_occupancy" points="499.0,274.6 574.8,274.6 574.8,412.0 481.3,412.0 481.3,350.8 499.0,350.8"/>
<text class="rl" x="530.6" y="344.0">Office</text>
<polygon class="room"  points="460.2,316.8 499.0,316.8 499.0,350.8 460.2,350.8"/>
<text class="rl sm" x="479.6" y="342.3">Hot Press</text>
<polygon class="room"  points="330.0,276.0 460.2,276.0 460.2,350.8 481.3,350.8 481.3,412.0 330.0,412.0"/>
<text class="rl" x="391.2" y="357.6">Cian</text>
<line class="we" x1="330.0" y1="72.0" x2="384.4" y2="72.0"/>
<line class="we" x1="384.4" y1="72.0" x2="384.4" y2="41.4"/>
<line class="we" x1="384.4" y1="41.4" x2="476.2" y2="41.4"/>
<line class="we" x1="476.2" y1="41.4" x2="476.2" y2="72.0"/>
<line class="we" x1="476.2" y1="72.0" x2="574.8" y2="72.0"/>
<line class="we" x1="574.8" y1="72.0" x2="574.8" y2="412.0"/>
<line class="we" x1="574.8" y1="412.0" x2="330.0" y2="412.0"/>
<line class="we" x1="330.0" y1="412.0" x2="330.0" y2="72.0"/>
<line class="wi" x1="331.2" y1="166.4" x2="425.1" y2="166.4"/>
<line class="wi" x1="425.1" y1="164.8" x2="425.1" y2="202.2"/>
<line class="wi" x1="330.0" y1="201.9" x2="574.8" y2="201.9"/>
<line class="wi" x1="473.5" y1="72.6" x2="473.5" y2="202.5"/>
<line class="wi" x1="499.0" y1="201.9" x2="499.0" y2="350.8"/>
<line class="wi" x1="499.0" y1="274.6" x2="574.8" y2="274.6"/>
<line class="wi" x1="460.2" y1="316.8" x2="499.0" y2="316.8"/>
<line class="wi" x1="330.0" y1="276.0" x2="460.2" y2="276.0"/>
<line class="wi" x1="460.2" y1="276.0" x2="460.2" y2="350.8"/>
<line class="wi" x1="460.2" y1="350.8" x2="499.0" y2="350.8"/>
<line class="wi" x1="481.3" y1="350.8" x2="481.3" y2="412.0"/><rect class="room" x="630" y="90" width="81" height="102"/><rect class="shedwall" x="630" y="90" width="81" height="102"/><text class="rl" x="670" y="145">Shed</text><g class="sn door" data-e="binary_sensor.front_door_contact"><line class="hit" x1="217.0" y1="72.0" x2="247.6" y2="72.0"/><line class="op" x1="217.0" y1="72.0" x2="247.6" y2="72.0"/></g><g class="sn door" data-e="binary_sensor.back_door_contact"><line class="hit" x1="161.2" y1="429.0" x2="161.2" y2="459.6"/><line class="op" x1="161.2" y1="429.0" x2="161.2" y2="459.6"/></g><g class="sn door" data-e="binary_sensor.patio_door_contact"><line class="hit" x1="74.2" y1="412.0" x2="135.4" y2="412.0"/><line class="op" x1="74.2" y1="412.0" x2="135.4" y2="412.0"/></g><g class="sn win" data-e="binary_sensor.back_window_contact"><line class="hit" x1="210.2" y1="531.0" x2="244.2" y2="531.0"/><line class="op" x1="210.2" y1="531.0" x2="244.2" y2="531.0"/></g><g class="sn win" data-e="binary_sensor.sitting_room_window_contact"><line class="hit" x1="98.0" y1="41.4" x2="162.6" y2="41.4"/><line class="op" x1="98.0" y1="41.4" x2="162.6" y2="41.4"/></g><g class="sn win" data-e="binary_sensor.colm_window_contact"><line class="hit" x1="398.0" y1="41.4" x2="462.6" y2="41.4"/><line class="op" x1="398.0" y1="41.4" x2="462.6" y2="41.4"/></g><g class="sn win" data-e="binary_sensor.aoife_window_contact"><line class="hit" x1="500.0" y1="72.0" x2="554.4" y2="72.0"/><line class="op" x1="500.0" y1="72.0" x2="554.4" y2="72.0"/></g><g class="sn win" data-e="binary_sensor.cian_window_contact"><line class="hit" x1="360.6" y1="412.0" x2="411.6" y2="412.0"/><line class="op" x1="360.6" y1="412.0" x2="411.6" y2="412.0"/></g><g class="sn win" data-e="binary_sensor.office_window_contact"><line class="hit" x1="513.6" y1="412.0" x2="554.4" y2="412.0"/><line class="op" x1="513.6" y1="412.0" x2="554.4" y2="412.0"/></g><g class="sn door" data-e="binary_sensor.shed_door_contact"><line class="hit" x1="655.5" y1="192.0" x2="686.1" y2="192.0"/><line class="op" x1="655.5" y1="192.0" x2="686.1" y2="192.0"/></g></svg>`;
const CW_CAMS = {"M": {"Front Van": [33.5, 64.7, -60, true], "Doorbell": [211.3, 64.7, -65, true], "Front Car": [268.3, 64.7, -128, true], "Rear Door": [38.7, 417.0, 40, true], "Rear Shed": [234.0, 412.0, 95, true]}, "BEAM": {"Rear Door": [160, 38], "Rear Shed": [160, 38], "Front Van": [130, 38], "Front Car": [130, 38]}};   // M: name -> [x, y, angle°, known] in plan units; BEAM: name -> [radius, half-angle]
const CW_RC = { "Sitting Room": "#2b3a5c", Hallway: "#33405a", Toilet: "#2d4a55", Kitchen: "#3b3a2c", Utility: "#3a3342" };
const CW_RC_LT = { "Sitting Room": "#dfe6f5", Hallway: "#e4e8f0", Toilet: "#dcecef", Kitchen: "#efecdc", Utility: "#ece4ef" };
const CW_CSS = `
:host{display:block}
ha-card{position:relative;overflow:hidden;height:calc(var(--cctv-live-height, 751px) - 2px);min-height:600px}
.el{position:absolute;transform:translate(-50%,-50%);z-index:3}
.map{position:absolute;left:0;right:0;top:136px;bottom:136px;display:flex;justify-content:center;align-items:center;z-index:1}
.map svg.plan{height:80%;width:auto;aspect-ratio:290/530;overflow:visible;transform:translateY(22px)}
.links{position:absolute;left:0;top:0;width:100%;height:100%;z-index:2;pointer-events:none;overflow:visible}
.plan .room{stroke:none}.plan .we{stroke:#9fb0c8;stroke-width:6;stroke-linecap:round}.plan .wi{stroke:#9fb0c8;stroke-opacity:.6;stroke-width:2.5}
.plan .rl{fill:#c7d0e0;font-size:10.5px;text-anchor:middle;font-weight:500;letter-spacing:.03em}.plan .rl.sm{font-size:8px}
.plan .fl,.plan .shedwall{display:none}.plan .sn .hit{stroke:transparent}
.plan .sn.door .op{stroke:#ffc94d;stroke-width:6;stroke-linecap:round}.plan .sn.win .op{stroke:#35c9e6;stroke-width:4;stroke-linecap:round}
 .plan .cone{fill:rgba(255,201,77,.13);stroke:rgba(255,201,77,.55);stroke-width:1;transition:fill .4s,stroke .4s}
.plan .cone.det{fill:rgba(255,201,77,.42);stroke:#ffc94d;stroke-width:2;animation:cwpulse 1.2s ease-in-out infinite}
.plan circle.cam.det{animation:cwpulse 1.2s ease-in-out infinite}
@keyframes cwpulse{50%{opacity:.45}}
.lt .plan .we,.lt .plan .wi{stroke:#7d8aa6}.lt .plan .rl{fill:#46536e}.lt .plan .sn.door .op{stroke:#e0a100}.lt .plan .sn.win .op{stroke:#1e9fc0}
`;
class CctvWhereCard extends HTMLElement {
  setConfig(c) { if (!c || !Array.isArray(c.elements)) throw new Error("cctv-where-card: elements (his 5 button-card boxes) required"); this._c = c; this._els = []; if (this._root) this._build(); }
  getCardSize() { return 12; }
  getGridOptions() { return { columns: "full" }; }
  set hass(h) { this._hass = h; if (!this._root) { this._root = this.attachShadow({ mode: "open" }); this._build(); } this._els.forEach((e) => (e.hass = h)); this._theme(); this._detect(); }
  _detect() { const svg = this._root && this._root.querySelector("svg.plan"); if (!svg || !this._hass) return; // beam + dot light up while that camera is detecting
    Object.entries(CW_OCC).forEach(([n, e]) => { const on = (this._hass.states[e] || {}).state === "on"; svg.querySelectorAll(`[data-cone="${n}"],circle[data-n="${n}"]`).forEach((x) => x.classList.toggle("det", on)); }); }
  connectedCallback() { if (this._root && !this._ro) this._observe(); }
  disconnectedCallback() { if (this._ro) { this._ro.disconnect(); this._ro = null; } }
  _theme() {
    const ink = getComputedStyle(this).getPropertyValue("--primary-text-color").trim(), m = ink.match(/^#?([0-9a-f]{6})$/i);
    const lt = m ? parseInt(m[1].slice(0, 2), 16) * .299 + parseInt(m[1].slice(2, 4), 16) * .587 + parseInt(m[1].slice(4, 6), 16) * .114 < 128 : false;
    if (lt === this._lt) return; this._lt = lt; const hc = this._root.querySelector("ha-card"); if (hc) hc.classList.toggle("lt", lt); this._colour();
  }
  _build() {
    this._root.innerHTML = `<style>${CW_CSS}</style><ha-card><div class="map">${CW_PLAN}</div><svg class="links" id="lk"></svg></ha-card>`;
    const card = this._root.querySelector("ha-card"), svg = this._root.querySelector("svg.plan"), NS = "http://www.w3.org/2000/svg";
    svg.setAttribute("viewBox", "10 20 290 530");
    // ground floor only: drop the first floor and the yard from the shared plan
    requestAnimationFrame(() => {
      [...svg.querySelectorAll("polygon,line,text,g,rect")].forEach((el) => { try { const b = el.getBBox(); if (b.x > 300) el.remove(); } catch (e) { /* not rendered */ } });
      const defs = document.createElementNS(NS, "defs"); defs.innerHTML = '<pattern id="cwgrain" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 6 L6 0" stroke="rgba(255,255,255,.035)" stroke-width="1"/></pattern>'; svg.prepend(defs);
      svg.querySelectorAll("polygon.room").forEach((p) => { const b = p.getBBox(); const lab = [...svg.querySelectorAll(".rl")].find((t) => { const x = +t.getAttribute("x"), y = +t.getAttribute("y"); return x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height; });
        p.dataset.room = lab ? lab.textContent : ""; const g = p.cloneNode(); g.setAttribute("fill", "url(#cwgrain)"); g.removeAttribute("class"); g.removeAttribute("data-room"); p.after(g); });
      this._colour();
      Object.entries(CW_CAMS.M).forEach(([n, [x, y, a]]) => { const [r, hh] = (CW_CAMS.BEAM && CW_CAMS.BEAM[n]) || [70, 28];
        const P = (t) => [x + r * Math.cos(t * Math.PI / 180), y + r * Math.sin(t * Math.PI / 180)], [x1, y1] = P(a - hh), [x2, y2] = P(a + hh);
        const cone = document.createElementNS(NS, "path"); cone.setAttribute("d", `M${x} ${y} L${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2} Z`); cone.setAttribute("class", "cone"); cone.dataset.cone = n; svg.appendChild(cone);
        const dot = document.createElementNS(NS, "circle"); dot.setAttribute("cx", x); dot.setAttribute("cy", y); dot.setAttribute("r", 5); dot.setAttribute("fill", "#ffc94d"); dot.setAttribute("stroke", "#0e1420"); dot.setAttribute("stroke-width", "2"); dot.setAttribute("class", "cam"); dot.dataset.n = n; svg.appendChild(dot); });
      this._lines(); this._detect();
    });
    // his 5 snapshot boxes, verbatim
    this._els = [];
    (async () => { const helpers = await window.loadCardHelpers();
      for (const e of this._c.elements) { const cfg = Object.assign({}, e); const style = cfg.style || {}; delete cfg.style;
        const wrap = document.createElement("div"); wrap.className = "el"; Object.entries(style).forEach(([k, v]) => wrap.style.setProperty(k, v)); wrap.dataset.n = cfg.name || "";
        const el = await helpers.createCardElement(cfg); if (this._hass) el.hass = this._hass; this._els.push(el); wrap.appendChild(el); card.appendChild(wrap); }
      setTimeout(() => this._lines(), 400); setTimeout(() => this._lines(), 1500);
    })();
    this._observe();
  }
  _colour() { const svg = this._root && this._root.querySelector("svg.plan"); if (!svg) return; const RC = this._lt ? CW_RC_LT : CW_RC;
    svg.querySelectorAll("polygon.room").forEach((p) => p.setAttribute("fill", RC[p.dataset.room] || (this._lt ? "#e7ecf5" : "#2a3348"))); }
  _observe() { const card = this._root.querySelector("ha-card"); if (!card || !window.ResizeObserver) return; this._ro = new ResizeObserver(() => this._lines()); this._ro.observe(card); }
  _lines() {
    const card = this._root.querySelector("ha-card"), lk = this._root.getElementById("lk"), svg = this._root.querySelector("svg.plan"); if (!card || !lk || !svg) return;
    const wr = card.getBoundingClientRect(); let s = "";
    this._root.querySelectorAll(".el").forEach((b) => { const n = b.dataset.n, d = svg.querySelector(`circle[data-n="${n}"]`); if (!d) return; const br = b.getBoundingClientRect(), dr = d.getBoundingClientRect(); if (!br.width || !dr.width) return;
      const top = br.top - wr.top < wr.height / 2, bx = br.left + br.width / 2 - wr.left, by = (top ? br.bottom : br.top) - wr.top, dx = dr.left + dr.width / 2 - wr.left, dy = dr.top + dr.height / 2 - wr.top;
      s += `<path d="M${bx} ${by} C${bx} ${(by + dy) / 2} ${dx} ${(by + dy) / 2} ${dx} ${dy}" fill="none" stroke="rgba(255,201,77,.6)" stroke-width="1.5" stroke-dasharray="4 4"/>`; });
    lk.innerHTML = s;
  }
}
customElements.define("cctv-where-card", CctvWhereCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "cctv-where-card", name: "CCTV Where Card", description: "CCTV camera map: plan, camera beams, snapshot boxes" });
console.info("%c CCTV-WHERE-CARD %c v" + CW_VERSION + " ", "background:#ffc94d;color:#3a2a00", "background:#121826;color:#fff");
