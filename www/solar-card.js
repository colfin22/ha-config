/* solar-card — the Energy tab as one card: Now (side-view house) → Today (chart + totals) → Next (tariff/solar advice) → History.
 * Built 18-11-2026 from the accepted Solar mock (v5 house). Source ~/homelab/solar-mock/card/solar-card.js -> /config/www/solar-card.js
 * (resource /local/solar-card.js?v=N — bump on every edit). Read-only: nothing here controls anything.
 * Config: layout: desktop | phone. Tariff times/rates below = his automations (peak 17–19, night 23–08); rate NOW comes from SolarCost.
 */
const SO_VERSION = "2";
const SO = {
  pvE: "sensor.solis_pv_power_east", pvW: "sensor.solis_pv_power_west", pv: "sensor.solis_pv_total_power", soc: "sensor.solis_battery_soc", socMin: "sensor.solis_battery_minimum_soc",
  bOut: "sensor.solis_battery_output_energy", bIn: "sensor.solis_battery_input_energy", imp: "sensor.grid_import_power", exp: "sensor.grid_export_power", house: "sensor.solis_house_load",
  eddi: "sensor.myenergi_eddi_23323250_status", hw: "input_boolean.hot_water_ready_today",
  solT: "sensor.solis_power_generation_today", eT: "sensor.solis_pv_energy_east_today", wT: "sensor.solis_pv_energy_west_today", impT: "sensor.solis_grid_import_today", expT: "sensor.solis_grid_export_today",
  houseT: "sensor.solis_house_load_today", bcT: "sensor.solis_battery_charge_today", bdT: "sensor.solis_battery_discharge_today", soh: "sensor.solis_battery_soh",
  costT: "sensor.solarcost_today_estimated_bill", credT: "sensor.solarcost_today_export_credit", rate: "sensor.solarcost_current_import_rate",
  fcT: "sensor.solcast_pv_forecast_forecast_today", fcTm: "sensor.solcast_pv_forecast_forecast_tomorrow", zeusTm: "sensor.aion_ems_zeus_forecast_solar_tomorrow", zeusSoc: "sensor.aion_ems_zeus_forecast_battery_soc_end_tomorrow",
  best: "input_number.solar_top_5_1st_kwh", bestD: "input_text.solar_top_5_1st_date",
  sc: (p, k) => `sensor.solarcost_this_${p}_${k}`,
  rule_kwh: 14,
  bands: [[0, 8, "night"], [8, 17, "day"], [17, 19, "peak"], [19, 23, "day"], [23, 24, "night"]],
  rates: { night: 21.3, day: 40.5, peak: 43.3 },
};
const so2 = (n) => String(n).padStart(2, "0");
const soF = (x, d = 1) => (x == null || isNaN(+x) ? "–" : (+x).toFixed(d));
const soDM = (d) => so2(d.getDate()) + "-" + so2(d.getMonth() + 1);

const SO_CSS = `
:host{--c-card:var(--ha-card-background,var(--card-background-color,#121826));--c-deep:var(--secondary-background-color,#0e1420);--c-ink:var(--primary-text-color,#e8eef7);
 --c-sec:var(--secondary-text-color,#7d8aa6);--c-bd:var(--divider-color,#1d2740);--sol:#ffc94d;--grid:#ff6b6b;--bat:#3ddc84;--house:#35c9e6;--exp:#a880ff;--gr:#3ddc84;--am:#ffc94d;--or:#ff8100;--cy:#35c9e6;
 display:block;color:var(--c-ink)}
.lt{--gr:#18864b;--am:#b26b00;--or:#c25e00}
*{box-sizing:border-box}button{font:inherit;color:inherit}
.grid{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.6fr);gap:14px}
.ph .grid{grid-template-columns:1fr;gap:10px}
.card{background:var(--c-card);border:1px solid var(--c-bd);border-radius:16px;padding:16px 18px;min-width:0}
.span2{grid-column:1/-1}
h3{margin:0 0 12px;font-size:12px;letter-spacing:.08em;color:var(--c-sec);font-weight:600;text-transform:uppercase;display:flex;align-items:center;gap:8px}
h3 .r{margin-left:auto;text-transform:none;letter-spacing:0;font-weight:400}
.flow svg{width:100%;height:auto;display:block}
@keyframes flow{to{stroke-dashoffset:-12}}
.chart svg{width:100%;height:auto;display:block}
.sc{overflow-x:auto;scrollbar-width:thin}.ph .sc svg{width:720px;max-width:none}
.lg{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--c-sec);margin-top:6px}.lg span{display:flex;align-items:center;gap:6px}.lg i{display:inline-block;width:16px;height:4px;border-radius:2px}
.kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:12px}.ph .kpis{grid-template-columns:1fr 1fr}
.kpi{background:var(--c-deep);border-radius:12px;padding:10px 12px;border-left:3px solid var(--c,#33415f)}
.kpi .v{font-size:20px}.kpi .v small{font-size:12px;color:var(--c-sec)}.kpi .k{font-size:12px;color:var(--c-sec)}.kpi .s{font-size:11.5px;color:var(--c-sec);margin-top:2px}
.next{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.ph .next{grid-template-columns:1fr}
.nx{background:var(--c-deep);border-radius:12px;padding:12px 14px;border:1px solid var(--c-bd)}
.nx .t{font-size:12px;color:var(--c-sec);text-transform:uppercase;letter-spacing:.06em;font-weight:600}.nx .b{font-size:17px;margin:4px 0 2px}.nx .s{font-size:12.5px;color:var(--c-sec)}
.nx.warn{border-color:rgba(255,129,0,.55)}.nx.warn .b{color:var(--or)}.nx.good .b{color:var(--gr)}
.tbar{position:relative;display:flex;height:10px;border-radius:5px;overflow:hidden;margin-top:8px}.tbar div{height:100%}.tbar i{position:absolute;top:-2px;bottom:-2px;width:2px;background:var(--c-ink)}
.tl{display:flex;justify-content:space-between;font-size:10.5px;color:var(--c-sec);margin-top:3px}
.tabs{display:flex;gap:4px;background:var(--c-deep);border-radius:10px;padding:3px;margin-left:auto}
.tabs button{background:none;border:0;color:var(--c-sec);padding:5px 12px;border-radius:8px;font-size:12.5px;cursor:pointer}.tabs button.on{background:rgba(127,140,170,.3);color:var(--c-ink)}
.hist{display:grid;grid-template-columns:240px minmax(0,1fr);gap:16px}.ph .hist{grid-template-columns:1fr}
.bill .v{font-size:34px;font-weight:300}.bill .k{color:var(--c-sec);font-size:12.5px}
.hrow{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--c-bd);font-size:13px}.hrow:last-child{border-bottom:0}
.rec{margin-top:10px;font-size:12.5px;color:var(--c-sec)}.rec b{color:var(--am);font-weight:500}
.empty{color:var(--c-sec);font-size:13px;padding:20px 0}
`;

class SolarCard extends HTMLElement {
  setConfig(c) { this._c = Object.assign({ layout: "desktop" }, c || {}); this._tab = "Month"; this._stats = null; this._hist = {}; if (this._root) this._build(); }
  getCardSize() { return 16; }
  getGridOptions() { return { columns: "full" }; }
  set hass(h) {
    const first = !this._hass; this._hass = h;
    if (!this._root) { this._root = this.attachShadow({ mode: "open" }); this._build(); }
    if (first) { this._loadToday(); this._loadHist(); }
    const ids = [SO.pvE, SO.pvW, SO.soc, SO.bOut, SO.bIn, SO.imp, SO.exp, SO.house, SO.eddi, SO.hw, SO.solT, SO.impT, SO.houseT, SO.costT, SO.rate, SO.fcTm, SO.zeusSoc];
    const sig = ids.map((e) => (h.states[e] || {}).state).join("|");
    if (sig !== this._sig) { this._sig = sig; this._drawHouse(); this._kpis(); this._next(); }
  }
  connectedCallback() { this._t = setInterval(() => { this._loadToday(); this._next(); }, 5 * 60000); this._t2 = setInterval(() => this._loadHist(), 60 * 60000); }
  disconnectedCallback() { clearInterval(this._t); clearInterval(this._t2); }
  _s(e) { return this._hass.states[e]; }
  _v(e) { const s = this._s(e); return s ? s.state : null; }
  _n(e) { const v = parseFloat(this._v(e)); return isNaN(v) ? null : v; }

  _build() {
    const ph = this._c.layout === "phone";
    this._root.innerHTML = `<style>${SO_CSS}</style><div class="${ph ? "ph" : "dk"}" id="w"><div class="grid">
      <div class="card flow"><h3>⚡ Now <span class="r" id="nowr"></span></h3><div id="flow"></div></div>
      <div class="card chart"><h3>📈 Today <span class="r">solar vs forecast · house · grid · battery</span></h3><div class="sc" id="chart"><div class="empty">Loading today…</div></div>
        <div class="lg"><span><i style="background:var(--sol)"></i>Solar</span><span><i style="background:transparent;border-top:2px dashed var(--c-sec)"></i>Solcast forecast</span><span><i style="background:var(--house)"></i>House</span><span><i style="background:rgba(255,107,107,.5)"></i>From grid</span><span><i style="background:var(--bat)"></i>Battery %</span><span><i style="background:linear-gradient(90deg,#24456b,#3a4560,#6b3a1a)"></i>Night / day / peak rate</span></div>
        <div class="kpis" id="kpis"></div></div>
      <div class="card span2"><h3>🧭 Next</h3><div class="next" id="next"></div></div>
      <div class="card span2"><h3>📅 History <div class="tabs" id="tabs"></div></h3><div class="hist" id="hist"><div class="empty">Loading history…</div></div></div>
    </div></div>`;
    this._root.addEventListener("click", (ev) => { const t = ev.composedPath().find((n) => n.dataset && n.dataset.tab); if (t) { this._tab = t.dataset.tab; this._renderHist(); } });
    this._sig = "";
  }
  _theme() {
    const ink = getComputedStyle(this).getPropertyValue("--primary-text-color").trim(), m = ink.match(/^#?([0-9a-f]{6})$/i);
    const lum = m ? parseInt(m[1].slice(0, 2), 16) * .299 + parseInt(m[1].slice(2, 4), 16) * .587 + parseInt(m[1].slice(4, 6), 16) * .114 : 255;
    this._root.getElementById("w").classList.toggle("lt", lum < 128);
  }

  /* ---------- NOW: side-view house (front left, rear right) ---------- */
  _drawHouse() {
    this._theme();
    const n = (e) => this._n(e) || 0;
    const pvE = n(SO.pvE), pvW = n(SO.pvW), pv = pvE + pvW, soc = Math.round(n(SO.soc)), socMin = this._n(SO.socMin) || 20;
    const bOut = n(SO.bOut), bIn = n(SO.bIn), imp = n(SO.imp), exp = n(SO.exp), house = Math.round(n(SO.house));
    const eddi = this._v(SO.eddi) || "", hw = this._v(SO.hw) === "on";
    const day = pv > 20, now = new Date();
    this._root.getElementById("nowr").textContent = day ? "solar producing" : "no solar · " + so2(now.getHours()) + ":" + so2(now.getMinutes());
    const LN = "#3d5a80", TX = "#9fb0c8", DIM = "#5b6f91";
    const F = (d, col, on, rev) => `<path d="${d}" fill="none" stroke="${on ? col + "33" : "#1f2a44"}" stroke-width="${on ? 7 : 2}" stroke-linecap="round" stroke-linejoin="round"/>` + (on ? `<path d="${d}" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round" stroke-dasharray="3 9" style="animation:flow 0.8s linear infinite${rev ? " reverse" : ""};filter:drop-shadow(0 0 4px ${col})"/>` : "");
    const panelRow = (x1, y1, x2, y2, on, k) => { let g = ""; for (let i = 0; i < k; i++) { const t0 = i / k + 0.012, t1 = (i + 1) / k - 0.012;
      const ax = x1 + (x2 - x1) * t0, ay = y1 + (y2 - y1) * t0, bx = x1 + (x2 - x1) * t1, by = y1 + (y2 - y1) * t1;
      const nx = y2 - y1, ny = -(x2 - x1), L = Math.hypot(nx, ny), ox = nx / L * 8, oy = ny / L * 8;
      g += `<polygon points="${ax},${ay} ${bx},${by} ${bx + ox},${by + oy} ${ax + ox},${ay + oy}" fill="${on ? "#35c9e633" : "#0e1420"}" stroke="${on ? "#35c9e6" : "#4a6286"}" stroke-width="1.2"/>`; } return g; };
    const X0 = 60, X1 = 320, XE = 400, G = 392, F1 = 302, F2 = 214, RX = (X0 + X1) / 2, RY = 110, EXT = G - 84;
    let s = `<svg viewBox="0 0 460 470">`;
    s += `<rect x="0" y="0" width="460" height="392" rx="14" fill="${day ? "#13304f" : "#0b1226"}"/>`;
    s += day ? `<circle cx="36" cy="44" r="15" fill="#ffd166"/><circle cx="36" cy="44" r="25" fill="#ffd16622"/>` : `<circle cx="420" cy="44" r="13" fill="#e7ecf5"/><circle cx="426" cy="39" r="11" fill="#0b1226"/>`;
    s += `<rect x="0" y="392" width="460" height="78" fill="#0d121c"/><line x1="0" y1="392" x2="460" y2="392" stroke="${LN}" stroke-width="2"/>`;
    for (let x = 10; x < 460; x += 22) s += `<line x1="${x}" y1="398" x2="${x - 8}" y2="406" stroke="#1d2740" stroke-width="1"/>`;
    s += `<g fill="none" stroke="${LN}" stroke-width="2.2"><path d="M${X0} ${G} L${X0} ${F2} L${RX} ${RY} L${X1} ${F2} L${X1} ${EXT}"/><path d="M${X1} ${EXT} L${XE} ${EXT} L${XE} ${G}"/><line x1="${X0}" y1="${F1}" x2="${X1}" y2="${F1}"/><line x1="${X0}" y1="${F2}" x2="${X1}" y2="${F2}"/></g>`;
    s += `<path d="M${X0 - 12} ${F2 + 9} L${RX} ${RY - 11} L${X1 + 12} ${F2 + 9}" fill="none" stroke="${LN}" stroke-width="2.2"/>`;
    const fl = (x, y, t) => `<text x="${x}" y="${y}" font-size="10" fill="${DIM}" letter-spacing=".12em">${t}</text>`;
    s += fl(RX + 30, F2 - 8, "ATTIC") + fl(X0 + 8, F1 - 6, "FIRST FLOOR") + fl(X0 + 8, G - 6, "GROUND FLOOR") + fl(X1 + 6, G - 6, "KITCHEN");
    s += `<text x="${X0}" y="${G + 16}" font-size="10.5" fill="${TX}" text-anchor="middle">FRONT</text><text x="${XE}" y="${G + 16}" font-size="10.5" fill="${TX}" text-anchor="middle">REAR</text>`;
    s += panelRow(X0 + 8, F2 - 5, RX - 12, RY + 5, day && pvE > 20, 4);
    s += panelRow(RX + 12, RY + 5, X1 - 8, F2 - 5, day && pvW > 20, 5);
    const mx = (X0 + RX) / 2, my = (F2 + RY) / 2, nx2 = (RX + X1) / 2;
    s += `<text x="${mx - 24}" y="${my - 18}" text-anchor="middle" font-size="12" fill="#ffc94d" transform="rotate(-38 ${mx - 24} ${my - 18})">East · front · ${Math.round(pvE)} W</text>`;
    s += `<text x="${nx2 + 24}" y="${my - 18}" text-anchor="middle" font-size="12" fill="#ffc94d" transform="rotate(38 ${nx2 + 24} ${my - 18})">West · rear · ${Math.round(pvW)} W</text>`;
    const bw = 46, bh = 24, bx = RX - bw / 2, by = 172, low = soc <= socMin;
    s += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="6" fill="#0e1420" stroke="#3ddc84" stroke-width="2"/><rect x="${bx + 3}" y="${by + 3}" width="${(bw - 6) * Math.min(100, soc) / 100}" height="${bh - 6}" rx="4" fill="${low ? "#ffc94d" : "#3ddc84"}" opacity=".8"/><rect x="${bx + bw}" y="${by + 8}" width="4" height="8" rx="2" fill="#3ddc84"/>`;
    s += `<text x="${bx + bw / 2}" y="${by + 16.5}" text-anchor="middle" font-size="11.5" font-weight="600" fill="#fff">${soc}%</text><text x="${bx + bw / 2}" y="${by - 8}" text-anchor="middle" font-size="11" fill="#3ddc84">Battery ${bOut > 20 ? "· ↓ " + Math.round(bOut) + " W" : bIn > 20 ? "· ↑ " + Math.round(bIn) + " W" : ""}</text>`;
    if (low) s += `<text x="${bx + bw / 2}" y="${by - 21}" text-anchor="middle" font-size="10" fill="#ffc94d">minimum ${Math.round(socMin)} %</text>`;
    const hx = X1 - 50, hy = F2 + 22;
    s += `<rect x="${hx}" y="${hy}" width="22" height="56" rx="10" fill="${hw ? "#8a3b2b" : "#1f2a44"}" stroke="#c7d0e0" stroke-width="1"/><text x="${hx - 8}" y="${hy + 22}" text-anchor="end" font-size="11" fill="${TX}">Hot Press</text><text x="${hx - 8}" y="${hy + 36}" text-anchor="end" font-size="10.5" fill="${hw ? "#3ddc84" : TX}">${hw ? "hot water ✓" : "heating"} · Eddi ${eddi}</text>`;
    s += `<text x="${RX + 14}" y="${F1 + 46}" text-anchor="middle" font-size="26" font-weight="500" fill="#fff">${house} W</text><text x="${RX + 14}" y="${F1 + 63}" text-anchor="middle" font-size="11" fill="#35c9e6">House now</text>`;
    const mxm = X0 - 22;
    s += `<rect x="${mxm - 13}" y="${G - 58}" width="26" height="34" rx="4" fill="#0e1420" stroke="#ff6b6b" stroke-width="1.5"/><text x="${mxm}" y="${G - 36}" text-anchor="middle" font-size="12" fill="#ff6b6b">⚡</text><text x="${mxm}" y="${G - 64}" text-anchor="middle" font-size="10" fill="#ff6b6b">Meter</text>`;
    const gc = imp >= exp ? "#ff6b6b" : "#a880ff", gon = imp > 20 || exp > 20;
    s += F(`M${RX} ${RY + 28} L${RX} ${by}`, "#ffc94d", day);
    s += F(`M${bx + 10} ${by + bh} L${bx + 10} ${F2 - 7} L${X0 + 40} ${F2 - 7} L${X0 + 40} ${F1 + 40} L${RX - 60} ${F1 + 40}`, bOut > 20 ? "#3ddc84" : "#ffc94d", bOut > 20 || (day && pv > bIn));
    s += F(`M${mxm} 460 L${mxm} ${G - 24}`, gc, gon, exp > imp);
    s += F(`M${mxm + 13} ${G - 41} L${X0 + 40} ${G - 41} L${RX - 60} ${G - 41}`, gc, gon, exp > imp);
    s += F(`M${bx + bw} ${by + bh / 2} L${hx + 11} ${by + bh / 2} L${hx + 11} ${hy}`, "#ff8100", eddi === "Diverting" || eddi === "Boosting");
    s += `<text x="${mxm + 20}" y="436" font-size="15" font-weight="500" fill="#fff">${Math.round(imp > exp ? imp : exp)} W</text><text x="${mxm + 20}" y="452" font-size="11" fill="${exp > imp ? "#a880ff" : "#ff6b6b"}">${imp > exp ? "from the grid" : exp > 0 ? "to the grid" : "grid idle"}</text>`;
    s += `<text x="${RX}" y="${RY - 26}" text-anchor="middle" font-size="18" font-weight="500" fill="#fff">${Math.round(pv)} W</text><text x="${RX}" y="${RY - 12}" text-anchor="middle" font-size="11" fill="#ffc94d">Solar</text>`;
    this._root.getElementById("flow").innerHTML = s + "</svg>";
  }

  /* ---------- TODAY ---------- */
  async _loadToday() {
    if (!this._hass) return;
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    try {
      const r = await this._hass.callWS({ type: "recorder/statistics_during_period", start_time: d0.toISOString(), period: "5minute",
        statistic_ids: [SO.pv, SO.house, SO.imp, SO.soc], types: ["mean"] });
      this._today = { d0: d0.getTime(), r };
    } catch (e) { this._today = { d0: d0.getTime(), r: {} }; }
    this._chart();
  }
  _band(h) { return SO.bands.find((b) => h >= b[0] && h < b[1])[2]; }
  _chart() {
    const el = this._root.getElementById("chart"); if (!this._today) return;
    const { d0, r } = this._today, W = 900, H = 300, L = 44, R = 40, T = 10, B = 48, cw = W - L - R, ch = H - T - B, X = (h) => L + cw * h / 24;
    const ser = (id) => (r[id] || []).map((p) => [(p.start - d0) / 3600000 + 1 / 24, p.mean || 0]);
    const pv = ser(SO.pv), hl = ser(SO.house), gi = ser(SO.imp), soc = ser(SO.soc);
    const fcA = (this._s(SO.fcT) || { attributes: {} }).attributes.detailedHourly || [];
    const fc = fcA.map((p) => [(Date.parse(p.period_start) - d0) / 3600000 + 0.5, (p.pv_estimate || 0) * 1000]);
    const maxW = Math.max(2500, ...pv.map((p) => p[1]), ...hl.map((p) => p[1]), ...gi.map((p) => p[1]));
    const step = maxW > 6000 ? 2000 : maxW > 3000 ? 1000 : 500, top = Math.ceil(maxW / step) * step;
    const Y = (w) => T + ch - ch * w / top, YS = (v) => T + ch - ch * v / 100;
    const line = (a, y) => a.map((p, i) => (i ? "L" : "M") + X(p[0]).toFixed(1) + " " + y(p[1]).toFixed(1)).join(" ");
    const area = (a, y) => a.length ? line(a, y) + ` L${X(a[a.length - 1][0])} ${T + ch} L${X(a[0][0])} ${T + ch} Z` : "";
    const nowH = (Date.now() - d0) / 3600000, sec = "var(--c-sec)", gl = "var(--c-bd)";
    let s = `<svg viewBox="0 0 ${W} ${H}">`;
    const BC = { night: "#24456b", day: "#3a4560", peak: "#6b3a1a" }, BL = { night: "Night", day: "Day", peak: "Peak" };
    SO.bands.forEach((b) => { s += `<rect x="${X(b[0])}" y="${T + ch + 6}" width="${X(b[1]) - X(b[0])}" height="12" fill="${BC[b[2]]}"/>`;
      if (b[1] - b[0] >= 2) s += `<text x="${(X(b[0]) + X(b[1])) / 2}" y="${T + ch + 15.5}" text-anchor="middle" font-size="9.5" fill="#e8eef7">${BL[b[2]]} ${SO.rates[b[2]]}c</text>`; });
    for (let w = 0; w <= top; w += step) s += `<line x1="${L}" x2="${W - R}" y1="${Y(w)}" y2="${Y(w)}" stroke="${gl}"/><text x="${L - 6}" y="${Y(w) + 4}" text-anchor="end" font-size="10" fill="${sec}">${w ? w / 1000 + "kW" : "0"}</text>`;
    [0, 25, 50, 75, 100].forEach((v) => (s += `<text x="${W - R + 6}" y="${YS(v) + 4}" font-size="10" fill="var(--bat)">${v}%</text>`));
    for (let h = 0; h <= 24; h += 3) s += `<text x="${X(h)}" y="${H - 6}" text-anchor="middle" font-size="10" fill="${sec}">${so2(h % 24)}:00</text>`;
    s += `<path d="${area(gi, Y)}" fill="rgba(255,107,107,.22)"/>`;
    s += `<path d="${area(pv, Y)}" fill="rgba(255,201,77,.45)" stroke="#ffc94d" stroke-width="1.5"/>`;
    s += `<path d="${line(fc, Y)}" fill="none" stroke="${sec}" stroke-width="1.6" stroke-dasharray="5 4"/>`;
    s += `<path d="${line(hl, Y)}" fill="none" stroke="#35c9e6" stroke-width="1.6"/>`;
    s += `<path d="${line(soc, YS)}" fill="none" stroke="#3ddc84" stroke-width="2"/>`;
    s += `<line x1="${X(nowH)}" x2="${X(nowH)}" y1="${T}" y2="${T + ch}" stroke="#35c9e6" stroke-width="1.5"/><text x="${X(nowH) + 4}" y="${T + 12}" font-size="10.5" fill="#35c9e6">now</text>`;
    s += `<rect x="${X(nowH)}" y="${T}" width="${Math.max(0, X(24) - X(nowH))}" height="${ch}" fill="rgba(127,140,170,.12)"/>`;
    el.innerHTML = s + "</svg>";
    if (this._c.layout === "phone") requestAnimationFrame(() => (el.scrollLeft = Math.max(0, el.scrollWidth * nowH / 24 - el.clientWidth * 0.7)));
  }
  _kpis() {
    const sol = this._n(SO.solT), fcd = this._n(SO.fcT), diff = sol != null && fcd ? Math.round((sol / fcd - 1) * 100) : null;
    const K = [["var(--sol)", "Solar", `${soF(sol)} <small>kWh</small>`, `forecast ${soF(fcd)}${diff != null ? " · " + (diff >= 0 ? "+" : "") + diff + "%" : ""} · E ${soF(this._n(SO.eT))} / W ${soF(this._n(SO.wT))}`],
      ["var(--house)", "House", `${soF(this._n(SO.houseT))} <small>kWh</small>`, "used today"],
      ["var(--grid)", "Grid", `${soF(this._n(SO.impT))} <small>kWh in</small>`, `${soF(this._n(SO.expT))} kWh out`],
      ["var(--bat)", "Battery", `${soF(this._n(SO.bcT))} <small>in</small> / ${soF(this._n(SO.bdT))} <small>out</small>`, `health ${soF(this._n(SO.soh), 0)}%`],
      ["var(--am)", "Cost today", `€${soF(this._n(SO.costT), 2)}`, `export credit €${soF(this._n(SO.credT), 2)}`]];
    this._root.getElementById("kpis").innerHTML = K.map((k) => `<div class="kpi" style="--c:${k[0]}"><div class="k">${k[1]}</div><div class="v">${k[2]}</div><div class="s">${k[3]}</div></div>`).join("");
  }

  /* ---------- NEXT: same rules as his automations ---------- */
  _next() {
    const now = new Date(), h = now.getHours() + now.getMinutes() / 60, band = this._band(h), rateNow = this._n(SO.rate), R = SO.rates;
    const rn = rateNow != null ? (rateNow * 100).toFixed(2) + "c" : R[band] + "c";
    const BC = { night: "#24456b", day: "#3a4560", peak: "#b4561c" };
    const bar = `<div class="tbar">${SO.bands.map((b) => `<div style="flex:${b[1] - b[0]};background:${BC[b[2]]}"></div>`).join("")}<i style="left:${h / 24 * 100}%"></i></div><div class="tl"><span>00</span><span>08</span><span>17</span><span>19</span><span>23</span></div>`;
    let c1;
    if (band === "peak") c1 = ["warn", "Right now", `Peak rate · ${rn}`, "Avoid the washer, dryer and dishwasher until 19:00 (your evening nudge window runs to 23:00)." + bar];
    else if (band === "night") c1 = ["good", "Right now", `Night rate · ${rn}`, "Cheapest time of the day: good for the washer, dryer and dishwasher until 08:00." + bar];
    else c1 = ["", "Right now", `Day rate · ${rn}`, (h < 17 ? "Peak rate 17:00–19:00 is coming: run big appliances before 17:00 or after 23:00." : "Night rate from 23:00 is half this.") + bar];
    const c2 = band === "night" ? ["good", "Cheapest next", "Now, until 08:00", `${R.night}c, half the day rate. Day rate ${R.day}c from 08:00.`]
      : ["good", "Cheapest next", "Night rate from 23:00", `${R.night}c until 08:00, half the day rate. Best time for big appliances tonight.`];
    const tom = this._n(SO.fcTm), zt = this._n(SO.zeusTm), over = tom != null && tom >= SO.rule_kwh;
    const c3 = ["", "Tomorrow", `${soF(tom)} kWh solar`, `Solcast ${soF(tom)} · Zeus ${soF(zt)}. ${over ? `Above your ${SO.rule_kwh} kWh rule, so waiting for the sun beats the night rate.` : `Below your ${SO.rule_kwh} kWh rule, so the night rate beats waiting for sun.`}`];
    const soc = this._n(SO.soc), mn = this._n(SO.socMin) || 20, hw = this._v(SO.hw) === "on";
    const c4 = ["", "Battery & hot water", `${soF(soc, 0)}%${soc != null && soc <= mn ? " · minimum reached" : ""}`, `Zeus expects ${soF(this._n(SO.zeusSoc), 0)}% at the end of tomorrow. Hot water: ${hw ? "done today" : "not yet"}.`];
    this._root.getElementById("next").innerHTML = [c1, c2, c3, c4].map((c) => `<div class="nx ${c[0]}"><div class="t">${c[1]}</div><div class="b">${c[2]}</div><div class="s">${c[3]}</div></div>`).join("");
  }

  /* ---------- HISTORY ---------- */
  async _loadHist() {
    if (!this._hass) return;
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    const ids = [SO.solT, SO.impT];
    try {
      const [day, mon] = await Promise.all([
        this._hass.callWS({ type: "recorder/statistics_during_period", start_time: new Date(d0.getTime() - 30 * 86400000).toISOString(), period: "day", statistic_ids: ids, types: ["change"] }),
        this._hass.callWS({ type: "recorder/statistics_during_period", start_time: new Date(d0.getFullYear() - 1, d0.getMonth() + 1, 1).toISOString(), period: "month", statistic_ids: ids, types: ["change"] }),
      ]);
      this._stats = { day, mon };
    } catch (e) { this._stats = { day: {}, mon: {} }; }
    this._renderHist();
  }
  _renderHist() {
    this._root.getElementById("tabs").innerHTML = ["Week", "Month", "Year"].map((t) => `<button data-tab="${t}" class="${t === this._tab ? "on" : ""}">${t}</button>`).join("");
    if (!this._stats) return;
    const tab = this._tab, yr = tab === "Year", src = yr ? this._stats.mon : this._stats.day;
    const take = (id) => { const a = (src[id] || []).map((p) => [p.start, Math.max(0, p.change || 0)]); return tab === "Week" ? a.slice(-7) : a; };
    const sol = take(SO.solT), imp = take(SO.impT), n = sol.length;
    const W = 900, H = 200, L = 34, B = 24, T = 8, cw = W - L - 8, ch = H - T - B;
    let s = `<svg viewBox="0 0 ${W} ${H}">`, best = null;
    if (n) {
      const mxv = Math.max(10, ...sol.map((p) => p[1]), ...imp.map((p) => p[1])), stp = mxv > 400 ? 200 : mxv > 100 ? 50 : 10, mx = Math.ceil(mxv / stp) * stp;
      for (let v = 0; v <= mx; v += stp) s += `<line x1="${L}" x2="${W - 8}" y1="${T + ch - ch * v / mx}" y2="${T + ch - ch * v / mx}" stroke="var(--c-bd)"/><text x="${L - 5}" y="${T + ch - ch * v / mx + 4}" text-anchor="end" font-size="10" fill="var(--c-sec)">${v}</text>`;
      const bw = cw / n, every = n > 20 ? 5 : 1;
      sol.forEach((p, i) => { const x = L + i * bw, sv = p[1], iv = (imp[i] || [0, 0])[1];
        s += `<rect x="${x + bw * .12}" y="${T + ch - ch * iv / mx}" width="${bw * .36}" height="${ch * iv / mx}" fill="rgba(255,107,107,.55)" rx="2"/><rect x="${x + bw * .5}" y="${T + ch - ch * sv / mx}" width="${bw * .36}" height="${ch * sv / mx}" fill="#ffc94d" rx="2"/>`;
        if (!best || sv > best[1]) best = p;
        const d = new Date(p[0]); if (i % every === 0 || i === n - 1) s += `<text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle" font-size="10" fill="var(--c-sec)">${yr ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()] : soDM(d)}</text>`; });
    }
    s += "</svg>";
    const P = tab === "Week" ? "week" : tab === "Month" ? "month" : "year", now = new Date();
    const lbl = tab === "Week" ? "this week" : tab === "Month" ? `01-${so2(now.getMonth() + 1)} to ${soDM(now)}` : `this year`;
    const bd = best && new Date(best[0]);
    const bestTxt = best ? `Best ${yr ? "month" : "day"} in the last ${tab === "Week" ? 7 : yr ? 12 : 30}${yr ? " months" : ""}: <b>${yr ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][bd.getMonth()] : soDM(bd)} · ${soF(best[1])} kWh</b><br>` : "";
    const at = this._n(SO.best); let atd = this._v(SO.bestD) || "";
    { const m = atd.match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/), M = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      if (m && M.includes(m[2].toLowerCase())) atd = so2(m[1]) + "-" + so2(M.indexOf(m[2].toLowerCase()) + 1) + "-" + m[3]; } // his helper says "Tue 14 Jul 2026" -> 14-07-2026
    this._root.getElementById("hist").innerHTML = `<div class="bill"><div class="k">Estimated bill · ${lbl}</div><div class="v">€${soF(this._n(SO.sc(P, "estimated_bill")), 2)}</div>
      <div class="hrow"><span>Solar</span><span>${soF(this._n(SO.sc(P, "solar_generation")))} kWh</span></div>
      <div class="hrow"><span>House used</span><span>${soF(this._n(SO.sc(P, "energy_usage")))} kWh</span></div>
      <div class="hrow"><span>Rate now</span><span>${this._n(SO.rate) != null ? (this._n(SO.rate) * 100).toFixed(2) : "–"} c/kWh</span></div>
      <div class="rec">${bestTxt}${at ? `All-time best: <b>${atd || ""} · ${soF(at)} kWh</b>` : ""}</div></div>
      <div style="min-width:0"><div style="font-size:12px;color:var(--c-sec);margin-bottom:4px">${yr ? "Last 12 months" : tab === "Week" ? "Last 7 days" : "Last 30 days"} · <span style="color:#ffc94d">■</span> solar <span style="color:#ff6b6b">■</span> from grid (kWh)</div><div class="sc">${n ? s : '<div class="empty">No statistics yet</div>'}</div></div>`;
    if (this._c.layout === "phone") requestAnimationFrame(() => { const e = this._root.querySelector("#hist .sc"); if (e) e.scrollLeft = e.scrollWidth; });
  }
}
customElements.define("solar-card", SolarCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "solar-card", name: "Solar Card", description: "Energy tab: Now house, Today chart, Next advice, History" });
console.info("%c SOLAR-CARD %c v" + SO_VERSION + " ", "background:#ffc94d;color:#3a2a00", "background:#121826;color:#fff");
