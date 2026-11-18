/* cars-card — the Cars tab as one card (desktop + phone), built 18-11-2026 from the accepted Cars mock (his ask: last fuel price displayed).
 * Source ~/homelab/cars-mock/card/cars-card.js -> /config/www/cars-card.js (resource ?v=N, bump on every edit). Display-only; photo tap = config `app_url` (his Car Costs app; kept in the dashboard, not in this public file).
 * Last fuel price: sensor.<car>_car_fuel_price; "since" = the hour the price changed (HA has no fill date) from HOURLY long-term statistics.
 */
const CA_VERSION = "5";
const CA_CARS = [{ p: "olivias", n: "Olivia's Car", img: "/api/infra_private/car_costs/car1.jpg", col: "#35c9e6" }, { p: "colms", n: "Colm's Car", img: "/api/infra_private/car_costs/car2.jpg", col: "#ffb300" }];
const CA_CSS = `
:host{--card:var(--ha-card-background,var(--card-background-color,#121826));--deep:var(--secondary-background-color,#0e1420);--bd:var(--divider-color,#1d2740);--ink:var(--primary-text-color,#e8eef7);--sec:var(--secondary-text-color,#7d8aa6);--cy:#35c9e6;--gr:#3ddc84;--am:#ffc94d;--rd:#ff5a5a;--fuel:#ffb300;display:block;color:var(--ink)}
.lt{--gr:#18864b;--am:#b26b00;--rd:#d32f2f;--fuel:#c47f00;--cy:#0a7fa0}
*{box-sizing:border-box}




.card{background:var(--card);border:1px solid var(--bd);border-radius:16px;padding:16px 18px;min-width:0}
h3{margin:0 0 10px;font-size:12px;letter-spacing:.08em;color:var(--sec);font-weight:600;text-transform:uppercase;display:flex;align-items:center;gap:8px}
h3 .r{margin-left:auto;text-transform:none;letter-spacing:0;font-weight:400}
.top{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:14px}
.top .ic{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;border:2px solid var(--am);color:var(--am);font-size:20px;flex:none}
.top .t{font-size:20px}.top .s{color:var(--sec)}
.chips{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap}.ph .chips{margin-left:0}
.chip{background:var(--deep);border:1px solid var(--bd);border-radius:999px;padding:5px 12px;font-size:12.5px;color:var(--sec)}.chip b{color:var(--ink);font-weight:500}
.cars{display:grid;grid-template-columns:1fr 1fr;gap:14px}.ph .cars{grid-template-columns:1fr;gap:10px}
.car{display:flex;flex-direction:column;gap:14px}
.photo{position:relative;border-radius:12px;overflow:hidden;aspect-ratio:4/3;background:#000;cursor:pointer}
.photo img{width:100%;height:100%;object-fit:cover;display:block;filter:brightness(.92)}
.photo:after{content:"";position:absolute;inset:0 0 auto 0;height:90px;background:linear-gradient(rgba(0,0,0,.55),transparent);pointer-events:none}.photo .nm,.photo .rg,.photo .nx{z-index:1}
.photo .nm{position:absolute;left:14px;top:10px;font-size:24px;color:#fff;text-shadow:0 1px 6px #000}.photo .rg{position:absolute;left:14px;top:44px;font-size:12.5px;color:#fff;background:rgba(0,0,0,.55);border-radius:6px;padding:2px 8px;letter-spacing:.06em}
.photo .nx{position:absolute;right:12px;bottom:10px;background:rgba(10,14,23,.75);border-radius:999px;padding:5px 11px;font-size:12.5px;color:#fff}.photo .nx.a{color:var(--am)}
/* fuel */
.big2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.bg{background:var(--deep);border:1px solid rgba(255,179,0,.35);border-radius:14px;padding:14px 16px}.bg .k{font-size:12px;letter-spacing:.08em;color:var(--fuel);font-weight:600;text-transform:uppercase}.bg .v{font-size:38px;font-weight:300;line-height:1.15}.bg .v small{font-size:15px;color:var(--sec)}.ph .bg .v{font-size:30px}
.hd{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:6px}.hd .lp{font-size:32px;font-weight:300}.hd .lp small{font-size:14px;color:var(--sec)}.hd .s{font-size:12.5px;color:var(--sec)}.hd .dn{color:var(--gr)}.hd .up{color:var(--rd)}
.fuel{display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px;align-items:center;background:var(--deep);border:1px solid rgba(255,179,0,.35);border-radius:14px;padding:14px 16px}
.ph .fuel{grid-template-columns:1fr}
.fuel .k{font-size:12px;letter-spacing:.08em;color:var(--fuel);font-weight:600;text-transform:uppercase}
.fuel .v{font-size:40px;font-weight:300;line-height:1.1}.fuel .v small{font-size:16px;color:var(--sec)}
.fuel .s{font-size:12.5px;color:var(--sec)}.fuel .dn{color:var(--gr)}.fuel .up{color:var(--rd)}
.fuel svg{width:100%;height:auto;display:block}
.kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.ph .kpis{grid-template-columns:1fr 1fr}
.kpi{background:var(--deep);border-radius:10px;padding:9px 11px}.kpi .v{font-size:18px}.kpi .v small{font-size:12px;color:var(--sec)}.kpi .k{font-size:11.5px;color:var(--sec)}
.cost{display:flex;height:12px;border-radius:6px;overflow:hidden;margin-top:4px}.cost div{height:100%}
.clg{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px;color:var(--sec);margin-top:8px}.clg span{display:flex;align-items:center;gap:6px}.clg i{width:10px;height:10px;border-radius:2px;display:inline-block}.clg b{color:var(--ink);font-weight:500}
.dues{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ph .dues{grid-template-columns:1fr 1fr}
.due{display:flex;align-items:center;gap:10px;background:var(--deep);border:1px solid var(--bd);border-radius:10px;padding:8px 10px}
.due .d{width:8px;height:30px;border-radius:4px;background:var(--gr);flex:none}.due.a .d{background:var(--am)}.due.r .d{background:var(--rd)}
.due .n{font-size:13px}.due .s{font-size:11.5px;color:var(--sec)}.due .x{margin-left:auto;font-size:13px;white-space:nowrap}.due.a .x{color:var(--am)}.due.r .x{color:var(--rd)}
.cmp svg{width:100%;height:auto;display:block}.lg{display:flex;gap:14px;font-size:12px;color:var(--sec);margin-top:6px}.lg i{display:inline-block;width:16px;height:3px;border-radius:2px;margin-right:6px;vertical-align:middle}


`;
const c2_ = (n) => String(n).padStart(2, "0"), cdm = (d) => c2_(d.getDate()) + "-" + c2_(d.getMonth() + 1), cdmy = (d) => cdm(d) + "-" + d.getFullYear();
const CAT = { fuel: "#ffb300", insurance: "#4c9be8", tax: "#a880ff", nct: "#3ddc84", service: "#35c9e6", repair: "#ff6b6b", tyres: "#9aa7c2", misc: "#5b6f91" };
const DUE = [["service", "Service", "🔧"], ["tax", "Tax", "📄"], ["insurance", "Insurance", "🛡"], ["nct", "NCT", "✅"], ["timing_belt", "Timing belt", "⚙️"]];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
class CarsCard extends HTMLElement {
  setConfig(c) { this._c = Object.assign({ layout: "desktop", since: "2026-07-25T00:00:00" }, c || {}); this._img = {}; if (this._root) this._build(); }
  getCardSize() { return 16; }
  getGridOptions() { return { columns: "full" }; }
  set hass(h) {
    const first = !this._hass; this._hass = h;
    if (!this._root) { this._root = this.attachShadow({ mode: "open" }); this._build(); }
    if (first) { this._load(); this._signImgs(); }
    const sig = Object.keys(h.states).filter((e) => e.startsWith("sensor.olivias_car_") || e.startsWith("sensor.colms_car_") || e === "sensor.car_costs_next_due").map((e) => h.states[e].state).join("|");
    if (sig !== this._sig) { const fp = CA_CARS.map((c) => (h.states[`sensor.${c.p}_car_fuel_price`] || {}).state).join("|"); if (this._fp && fp !== this._fp) this._load(); this._fp = fp; this._sig = sig; this._render(); }
  }
  connectedCallback() { this._t = setInterval(() => this._load(), 60 * 60000); }
  disconnectedCallback() { clearInterval(this._t); }
  _st(e) { return (this._hass.states[e] || {}).state; } _n(e) { const v = parseFloat(this._st(e)); return isNaN(v) ? null : v; } _at(e, k) { return ((this._hass.states[e] || {}).attributes || {})[k]; }
  async _signImgs() { for (const c of CA_CARS) { try { const r = await this._hass.callWS({ type: "auth/sign_path", path: c.img, expires: 86400 }); this._img[c.p] = this._hass.hassUrl(r.path); } catch (e) { /* no photo */ } } this._render(); setTimeout(() => this._signImgs(), 20 * 3600000); }
  async _load() {
    try { const r = await this._hass.callWS({ type: "recorder/statistics_during_period", start_time: new Date(this._c.since).toISOString(), period: "hour", statistic_ids: CA_CARS.map((c) => `sensor.${c.p}_car_fuel_price`), types: ["mean"] });
      this._pr = {}; CA_CARS.forEach((c) => { const v = (r[`sensor.${c.p}_car_fuel_price`] || []).filter((x) => x.mean != null).map((x) => [new Date(x.start), Math.round(x.mean * 1000) / 1000]);
        const ch = v.filter((x, i) => !i || x[1] !== v[i - 1][1]); this._pr[c.p] = ch; });
    } catch (e) { this._pr = this._pr || {}; }
    this._render();
  }
  _prices(c) { const a = (this._pr || {})[c.p] || [], now = this._n(`sensor.${c.p}_car_fuel_price`); const out = a.slice(); if (now != null && (!out.length || out[out.length - 1][1] !== now)) out.push([new Date(), now]); return out; }
  _fills(c) { // price changes; a one-hour blended mean between two prices is merged into the change
    const out = this._prices(c), res = [];
    for (let j = 0; j < out.length; j++) { const x = out[j], pv = out[j - 1], nx = out[j + 1]; if (pv && nx && nx[0] - x[0] <= 86400000 && (x[1] - pv[1]) * (nx[1] - x[1]) > 0) { res.push([x[0], nx[1]]); j++; } else res.push(x); }
    return res;
  }
  _build() {
    this._root.innerHTML = `<style>${CA_CSS}</style><div class="${this._c.layout === "phone" ? "ph" : "dk"}" id="w"><div class="card top" id="top"></div><div class="cars" id="cars"></div>
      <div class="card cmp" style="margin-top:14px"><h3>⛽ Fuel price <span class="r">€ per litre since July</span></h3><div class="hd" id="lastp"></div><div id="cmp"></div><div class="lg" id="clg"></div></div></div>`;
    this._root.addEventListener("click", (ev) => { if (ev.composedPath().some((n) => n.classList && n.classList.contains("photo"))) this._c.app_url && window.open(this._c.app_url, "_blank"); });
    this._sig = "";
  }
  _render() {
    if (!this._hass || !this._root.getElementById("w")) return;
    const R = this._root;
    { const ink = getComputedStyle(this).getPropertyValue("--primary-text-color").trim(), m = ink.match(/^#?([0-9a-f]{6})$/i);
      const lum = m ? parseInt(m[1].slice(0, 2), 16) * .299 + parseInt(m[1].slice(2, 4), 16) * .587 + parseInt(m[1].slice(4, 6), 16) * .114 : 255; R.getElementById("w").classList.toggle("lt", lum < 128); }
    const dues = (this._at("sensor.car_costs_next_due", "dues") || []).filter((d) => d.item !== "Timing belt" || d.days <= 183).slice().sort((a, b) => a.days - b.days), n0 = dues[0];
    const nm = (s) => s.replace("Olivias Car", "Olivia's car").replace("Colms Car", "Colm's car");
    R.getElementById("top").innerHTML = n0 ? `<div class="ic">📅</div><div><div class="t">${nm(n0.car)}: ${n0.item} in ${n0.days} days</div><div class="s">${n0.item} due ${cdmy(new Date(n0.date))}</div></div>
      <div class="chips">${dues.slice(1, 4).map((d) => `<span class="chip">${nm(d.car)} · ${d.item} <b>${d.days} d</b></span>`).join("")}</div>` : "";
    const cars = this._at("sensor.car_costs_next_due", "cars") || [];
    R.getElementById("cars").innerHTML = CA_CARS.map((c) => {
      const I = cars.find((x) => x.name.toLowerCase().startsWith(c.p.replace(/s$/, ""))) || {}, pe = `sensor.${c.p}_car_`;
      const pr = this._n(pe + "fuel_price"), F = this._fills(c), last = F[F.length - 1], prev = F[F.length - 2], diff = prev && last ? (last[1] - prev[1]) * 100 : null;
      const a = this._prices(c); let sp = "";
      if (a.length) { const W = 360, H = 90, lo = Math.min(...a.map((x) => x[1])) - .02, hi = Math.max(...a.map((x) => x[1])) + .02, t0 = a[0][0].getTime(), t1 = Date.now(), X = (t) => 6 + (W - 12) * (t - t0) / Math.max(1, t1 - t0), Y = (v) => 8 + (H - 26) * (1 - (v - lo) / (hi - lo));
        sp = `<svg viewBox="0 0 ${W} ${H}"><path d="${a.map((x, i) => (i ? `L${X(x[0].getTime())} ${Y(a[i - 1][1])} L` : "M") + X(x[0].getTime()) + " " + Y(x[1])).join(" ")} L${X(t1)} ${Y(a[a.length - 1][1])}" fill="none" stroke="var(--fuel)" stroke-width="2"/>`;
        F.forEach((f, i) => (sp += `<circle cx="${X(f[0].getTime())}" cy="${Y(f[1])}" r="${i === F.length - 1 ? 4.5 : 3}" fill="${i === F.length - 1 ? "var(--fuel)" : "var(--deep)"}" stroke="var(--fuel)" stroke-width="1.5"/>`));
        sp += `<text x="6" y="${H - 4}" font-size="10" fill="var(--sec)">${cdm(a[0][0])}</text><text x="${W - 6}" y="${H - 4}" font-size="10" fill="var(--sec)" text-anchor="end">today</text><text x="${W - 6}" y="12" font-size="10" fill="var(--sec)" text-anchor="end">high €${Math.max(...a.map((x) => x[1])).toFixed(3)}</text></svg>`; }
      const k = (l, v, u) => `<div class="kpi"><div class="k">${l}</div><div class="v">${v}${u ? ` <small>${u}</small>` : ""}</div></div>`;
      const f2 = (e, d) => { const v = this._n(pe + e); return v == null ? "–" : v.toLocaleString("en-IE", { minimumFractionDigits: d, maximumFractionDigits: d }); };
      const bc = I.by_category || {}, tot = Object.values(bc).reduce((p, q) => p + q, 0), nd = I.next_due, cats = Object.entries(bc).filter((x) => x[1] > 0).sort((p, q) => q[1] - p[1]);
      return `<div class="card car"><div class="photo">${this._img[c.p] ? `<img src="${this._img[c.p]}">` : ""}<div class="nm">${c.n}</div><div class="rg">${I.reg || ""}</div>${nd ? `<div class="nx ${nd.days <= 30 ? "a" : ""}">📅 ${nd.item} in ${nd.days} d</div>` : ""}</div>
        <div class="big2"><div class="bg"><div class="k">⛽ Efficiency</div><div class="v">${f2("fuel_efficiency", 1)}<small> L/100km</small></div></div><div class="bg"><div class="k">💶 Fuel per 100 km</div><div class="v">€${f2("fuel_cost_per_100_km", 2)}</div></div></div>
        <div class="kpis">${k("Cost this year", "€" + f2("year_cost", 0))}${k("Fuel this year", "€" + f2("fuel_spend", 0))}${k("Driven this year", f2("km_driven", 0), "km")}${k("Mileage", f2("mileage", 0), "km")}
          ${k("Cost per km", "€" + f2("cost_per_km", 2))}${k("Next due", nd ? nd.item + " · " + nd.days + " d" : "–")}</div>
        <div><h3>💶 Where this year's €${Math.round(tot).toLocaleString("en-IE")} went</h3><div class="cost">${cats.map(([kk, v]) => `<div style="flex:${v};background:${CAT[kk] || "#5b6f91"}"></div>`).join("")}</div>
          <div class="clg">${cats.map(([kk, v]) => `<span><i style="background:${CAT[kk] || "#5b6f91"}"></i>${kk === "nct" ? "NCT" : kk[0].toUpperCase() + kk.slice(1)} <b>€${Math.round(v)}</b></span>`).join("")}</div></div>
        <div><h3>📅 Due</h3><div class="dues">${DUE.map(([e, l, ic]) => { const d = this._n(pe + e + "_due"), dt = this._at(pe + e + "_due", "date"); if (d == null) return "";
          if (e === "timing_belt") { const kl = this._at(pe + e + "_due", "km_left"); if (d > 183 && !(kl != null && kl <= 10000)) return ""; } /* his rule 18-11: belt only within 6 months of the date or 10,000 km */ const cl = d <= 7 ? "r" : d <= 30 ? "a" : "";
          return `<div class="due ${cl}"><span class="d"></span><div><div class="n">${ic} ${l}</div><div class="s">${dt ? cdmy(new Date(dt)) : ""}</div></div><div class="x">${d} d</div></div>`; }).join("")}</div></div></div>`;
    }).join("");
    // both cars' fuel price
    const all = CA_CARS.flatMap((c) => this._prices(c));
    if (all.length) {
      const W = 900, H = 200, L = 44, Rm = 12, T = 10, B = 24, cw = W - L - Rm, ch = H - T - B, lo = Math.floor(Math.min(...all.map((x) => x[1])) * 20) / 20, hi = Math.ceil(Math.max(...all.map((x) => x[1])) * 20) / 20;
      const t0 = Math.min(...all.map((x) => x[0].getTime())), t1 = Date.now(), X = (t) => L + cw * (t - t0) / Math.max(1, t1 - t0), Y = (v) => T + ch - ch * (v - lo) / Math.max(.05, hi - lo);
      let s = `<svg viewBox="0 0 ${W} ${H}">`; for (let v = lo; v <= hi + 1e-9; v += .05) s += `<line x1="${L}" x2="${W - Rm}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--bd)"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="10" fill="var(--sec)">€${v.toFixed(2)}</text>`;
      const m0 = new Date(t0); m0.setDate(1); m0.setHours(0, 0, 0, 0); for (const m = new Date(m0); m.getTime() <= t1; m.setMonth(m.getMonth() + 1)) { if (m.getTime() >= t0) s += `<text x="${X(m.getTime())}" y="${H - 6}" font-size="10" fill="var(--sec)">${MON[m.getMonth()]}</text>`; }
      CA_CARS.forEach((c) => { const a = this._prices(c); if (!a.length) return; s += `<path d="${a.map((x, i) => (i ? `L${X(x[0].getTime())} ${Y(a[i - 1][1])} L` : "M") + X(x[0].getTime()) + " " + Y(x[1])).join(" ")} L${X(t1)} ${Y(a[a.length - 1][1])}" fill="none" stroke="${c.col}" stroke-width="2"/>`;
        this._fills(c).forEach((f) => (s += `<circle cx="${X(f[0].getTime())}" cy="${Y(f[1])}" r="3" fill="${c.col}"/>`)); });
      R.getElementById("cmp").innerHTML = s + "</svg>";
      { const L2 = CA_CARS.map((c) => { const F = this._fills(c); return { c, last: F[F.length - 1], prev: F[F.length - 2] }; }).filter((x) => x.last).sort((p, q) => q.last[0] - p.last[0])[0];
        if (L2) { const d = L2.prev ? (L2.last[1] - L2.prev[1]) * 100 : null;
          R.getElementById("lastp").innerHTML = `<span class="lp">€${L2.last[1].toFixed(3)}<small> /L last price</small></span><span class="s">${L2.c.n} · ${cdm(L2.last[0])}${d != null && Math.abs(d) >= .05 ? ` · <span class="${d < 0 ? "dn" : "up"}">${d < 0 ? "↓" : "↑"} ${Math.abs(d).toFixed(1)}c</span> on €${L2.prev[1].toFixed(3)}` : ""}</span>`; } }
      R.getElementById("clg").innerHTML = CA_CARS.map((c) => `<span><i style="background:${c.col}"></i>${c.n} · now €${(this._n(`sensor.${c.p}_car_fuel_price`) || 0).toFixed(3)}</span>`).join("") + "<span>dots = price changed</span>";
    }
  }
}
customElements.define("cars-card", CarsCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "cars-card", name: "Cars Card", description: "Cars tab: last fuel price, costs, dues, fuel price history" });
console.info("%c CARS-CARD %c v" + CA_VERSION + " ", "background:#ffb300;color:#3a2a00", "background:#121826;color:#fff");
