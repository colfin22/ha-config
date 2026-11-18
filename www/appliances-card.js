/* appliances-card — the Appliances tab as one card (desktop + phone), built 18-11-2026 from the accepted Appliances mock.
 * Source ~/homelab/appliances-mock/card/appliances-card.js -> /config/www/appliances-card.js (resource ?v=N, bump on every edit).
 * His three custom:washing-machine-card configs are embedded VERBATIM (config `cards:`), created with loadCardHelpers().
 * Around them: status line + 7-day chips, per-appliance "Last 7 days" cycle list, 14-day stacked energy bars, 7-day split.
 * No Energy today / This month / Total / This week tiles (his word, 18-11). Display-only apart from his own cards.
 */
const AP_VERSION = "1";
const AP_DEF = [
  { k: "washing_machine", n: "Washing Machine", hex: "#2196F3", i: "🧺" },
  { k: "dishwasher", n: "Dishwasher", hex: "#4CAF50", i: "🍽" },
  { k: "tumble_dryer", n: "Tumble Dryer", hex: "#FF5722", i: "🌀" },
];
const a2 = (n) => String(n).padStart(2, "0"), aHM = (d) => a2(d.getHours()) + ":" + a2(d.getMinutes()), aDM = (d) => a2(d.getDate()) + "-" + a2(d.getMonth() + 1);
const aDN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const aEsc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const AP_CSS = `
:host{--a-card:var(--ha-card-background,var(--card-background-color,#121826));--a-deep:var(--secondary-background-color,#0e1420);--a-ink:var(--primary-text-color,#e8eef7);
 --a-sec:var(--secondary-text-color,#7d8aa6);--a-bd:var(--divider-color,#1d2740);--cy:#35c9e6;display:block;color:var(--a-ink)}
.lt{--cy:#0a7fa0}
*{box-sizing:border-box}
.card{background:var(--a-card);border:1px solid var(--a-bd);border-radius:16px;padding:16px 18px;min-width:0}
h3{margin:0 0 12px;font-size:12px;letter-spacing:.08em;color:var(--a-sec);font-weight:600;text-transform:uppercase;display:flex;align-items:center;gap:8px}
h3 .r{margin-left:auto;text-transform:none;letter-spacing:0;font-weight:400}
.hero{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:14px;background:linear-gradient(90deg,rgba(53,201,230,.08),transparent 60%)}
.hero.run{background:linear-gradient(90deg,rgba(53,201,230,.18),transparent 60%);border-color:rgba(53,201,230,.5)}
.hero .ic{width:50px;height:50px;border-radius:50%;display:grid;place-items:center;border:2px solid var(--cy);font-size:24px;flex:none;color:var(--cy)}
.hero .t{font-size:22px}.hero .s{color:var(--a-sec)}
.chips{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap}
.chip{background:var(--a-deep);border:1px solid var(--a-bd);border-radius:999px;padding:6px 12px;font-size:13px;color:var(--a-sec)}.chip b{color:var(--a-ink);font-weight:500}
.ph .chips{margin-left:0}.ph .hero .t{font-size:18px}.ph .hero{gap:12px;margin-bottom:10px}
.apps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.ph .apps{grid-template-columns:1fr;gap:10px}
.app{display:flex;flex-direction:column;gap:12px;border-top:3px solid var(--c)}.app.run{box-shadow:0 0 0 1px var(--c) inset}
.cyc{display:grid;grid-template-columns:auto 1fr auto auto;gap:4px 10px;font-size:12.5px;align-items:center}.cyc .d{color:var(--a-sec)}.cyc .h{font-size:11px;color:var(--a-sec);text-transform:uppercase;letter-spacing:.06em}
.empty{color:var(--a-sec);font-size:12.5px}
.bottom{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:14px;margin-top:14px}.ph .bottom{grid-template-columns:1fr;gap:10px;margin-top:10px}
svg.ch{width:100%;height:auto;display:block}.sc{overflow-x:auto}.ph .sc svg.ch{width:640px;max-width:none}
.lg{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--a-sec);margin-top:6px}.lg span{display:flex;align-items:center;gap:6px}.lg i{display:inline-block;width:12px;height:12px;border-radius:3px}
.split{display:flex;gap:16px;align-items:center}.split svg{width:150px;height:150px;flex:none}
.split .rows{flex:1;display:grid;gap:8px}.split .row{display:flex;justify-content:space-between;gap:8px;font-size:13px;border-bottom:1px solid var(--a-bd);padding-bottom:6px}
`;
class AppliancesCard extends HTMLElement {
  setConfig(c) {
    if (!c || !Array.isArray(c.cards) || c.cards.length !== 3) throw new Error("appliances-card: cards (his 3 washing-machine-card configs) required");
    this._c = Object.assign({ layout: "desktop", rate: "sensor.solarcost_current_import_rate" }, c);
    this._A = AP_DEF.map((a, i) => Object.assign({}, a, { card: c.cards[i], running: (c.cards[i].running_states || []).map((s) => String(s).toLowerCase()) }));
    this._els = null; if (this._root) this._build();
  }
  getCardSize() { return 16; }
  getGridOptions() { return { columns: "full" }; }
  set hass(h) {
    const first = !this._hass; this._hass = h;
    if (!this._root) { this._root = this.attachShadow({ mode: "open" }); this._build(); }
    (this._els || []).forEach((e) => e && (e.hass = h));
    if (first) this._load();
    const ids = this._A.flatMap((a) => [`input_select.${a.k}_run_status`, `sensor.${a.k}_socket_power`, `input_datetime.${a.k}_last_cycle_start`, `sensor.${a.k}_socket_${a.k}_7_day_energy`]);
    const sig = ids.map((e) => (h.states[e] || {}).state).join("|");
    if (sig !== this._sig) { const ls = this._A.map((a) => (h.states[`input_datetime.${a.k}_last_cycle_start`] || {}).state).join("|"); if (this._lsSig && ls !== this._lsSig) this._loadLater(); this._lsSig = ls; this._sig = sig; this._render(); }
  }
  connectedCallback() { this._t = setInterval(() => this._load(), 30 * 60000); }
  disconnectedCallback() { clearInterval(this._t); }
  _st(e) { return (this._hass.states[e] || {}).state; } _n(e) { const v = parseFloat(this._st(e)); return isNaN(v) ? null : v; }
  _run(a) { return a.running.includes(String(this._st(`input_select.${a.k}_run_status`) || "").toLowerCase()); }
  _loadLater() { clearTimeout(this._lt); this._lt = setTimeout(() => this._load(), 20000); } // the cycle helpers are written in a burst at the end of a cycle
  async _load() {
    if (!this._hass) return; const now = new Date(), d0 = new Date(); d0.setHours(0, 0, 0, 0);
    const ids = this._A.flatMap((a) => ["input_datetime", "input_number", "input_number", "input_number"].map((d, i) => `${d}.${a.k}_last_cycle_${["start", "duration", "energy", "cost"][i]}`));
    const s14 = new Date(d0); s14.setDate(d0.getDate() - 13); const s7 = new Date(d0); s7.setDate(d0.getDate() - 7);
    try {
      const [h, st] = await Promise.all([
        this._hass.callWS({ type: "history/history_during_period", start_time: s7.toISOString(), end_time: new Date(now.getTime() + 60000).toISOString(), entity_ids: ids, minimal_response: true, no_attributes: true, significant_changes_only: false }),
        this._hass.callWS({ type: "recorder/statistics_during_period", start_time: s14.toISOString(), period: "day", statistic_ids: this._A.map((a) => `sensor.${a.k}_socket_energy`), types: ["change"] })]);
      this._hist = h; this._stats = st;
    } catch (e) { this._hist = this._hist || {}; this._stats = this._stats || {}; }
    this._render();
  }
  _cycles(a) { // distinct cycle starts in the last 7 days, joined to the duration/energy/cost written after each start
    const H = this._hist || {}, ser = (e) => (H[e] || []).map((x) => [Math.round((x.lc || x.lu) * 1000), x.s]).filter((x) => x[1] && x[1] !== "unknown" && x[1] !== "unavailable");
    const t7 = Date.now() - 7 * 86400000;
    const starts = [...new Set(ser(`input_datetime.${a.k}_last_cycle_start`).map((x) => x[1]))].map((s) => new Date(s.replace(" ", "T"))).filter((t) => !isNaN(t) && t.getTime() >= t7).sort((p, q) => q - p);
    return starts.map((t, i) => { const nxt = i > 0 ? starts[i - 1] : null;
      const pick = (e) => { const r = ser(e).filter((x) => x[0] > t.getTime() && (!nxt || x[0] < nxt.getTime())); return r.length ? r[r.length - 1][1] : null; };
      return { t, dur: pick(`input_number.${a.k}_last_cycle_duration`), kwh: pick(`input_number.${a.k}_last_cycle_energy`), eur: pick(`input_number.${a.k}_last_cycle_cost`) }; });
  }
  _build() {
    const ph = this._c.layout === "phone";
    this._root.innerHTML = `<style>${AP_CSS}</style><div class="${ph ? "ph" : "dk"}" id="w"><div class="card hero" id="hero"></div>
      <div class="apps">${this._A.map((a) => `<div class="card app" id="app-${a.k}" style="--c:${a.hex}"><div class="wm" id="wm-${a.k}"></div><div class="wk" id="wk-${a.k}"></div></div>`).join("")}</div>
      <div class="bottom"><div class="card"><h3>⚡ Energy · last 14 days <span class="r">kWh per day</span></h3><div class="sc" id="bars"></div><div class="lg" id="lg"></div></div>
      <div class="card"><h3>🥧 Split · last 7 days</h3><div class="split" id="split"></div></div></div></div>`;
    this._els = [null, null, null]; this._sig = "";
    (async () => { try { const helpers = await window.loadCardHelpers();
      this._A.forEach(async (a, i) => { const el = await helpers.createCardElement(a.card); if (this._hass) el.hass = this._hass; this._els[i] = el; const host = this._root.getElementById("wm-" + a.k); if (host) host.appendChild(el); });
    } catch (e) { /* card helpers unavailable */ } })();
  }
  _render() {
    if (!this._hass || !this._root.getElementById("hero")) return;
    const R = this._root, A = this._A;
    { const ink = getComputedStyle(this).getPropertyValue("--primary-text-color").trim(), m = ink.match(/^#?([0-9a-f]{6})$/i);
      const lum = m ? parseInt(m[1].slice(0, 2), 16) * .299 + parseInt(m[1].slice(2, 4), 16) * .587 + parseInt(m[1].slice(4, 6), 16) * .114 : 255; R.getElementById("w").classList.toggle("lt", lum < 128); }
    const running = A.filter((a) => this._run(a));
    const allC = this._hist ? A.flatMap((a) => this._cycles(a)) : [];
    const wkK = A.reduce((s, a) => s + (this._n(`sensor.${a.k}_socket_${a.k}_7_day_energy`) || 0), 0), wkE = allC.reduce((s, c) => s + (+c.eur || 0), 0), rate = this._n(this._c.rate);
    const lastStart = (a) => { const s = this._st(`input_datetime.${a.k}_last_cycle_start`); const d = s ? new Date(s.replace(" ", "T")) : null; return d && !isNaN(d) ? d : null; };
    const ld = A.map((a) => [a, lastStart(a)]).filter((x) => x[1]).sort((p, q) => q[1] - p[1])[0];
    const since = (a) => { const s = this._hass.states[`input_select.${a.k}_run_status`]; return s ? aHM(new Date(s.last_changed)) : ""; };
    const pw = (a) => { const w = this._n(`sensor.${a.k}_socket_power`); return w == null ? "" : w >= 1000 ? (w / 1000).toFixed(1) + " kW" : Math.round(w) + " W"; };
    const hero = R.getElementById("hero"); hero.className = "card hero" + (running.length ? " run" : "");
    hero.innerHTML = `<div class="ic">${running.length ? running[0].i : "✓"}</div><div><div class="t">${running.length ? running.map((a) => a.n + " running").join(" · ") : "Nothing running"}</div>
      <div class="s">${running.length ? running.map((a) => `${pw(a)} · since ${since(a)}`).join(" · ") : ld ? `Last used: ${ld[0].n}, ${aDN[ld[1].getDay()]} ${aDM(ld[1])} ${aHM(ld[1])}` : ""}</div></div>
      <div class="chips">${this._hist ? `<span class="chip">Last 7 days <b>${allC.length} cycle${allC.length === 1 ? "" : "s"}</b></span>` : ""}<span class="chip"><b>${wkK.toFixed(1)} kWh</b> · 7 days</span>${this._hist ? `<span class="chip">Cycle cost <b>€${wkE.toFixed(2)}</b> · 7 days</span>` : ""}${rate != null ? `<span class="chip">Rate now <b>${(rate * 100).toFixed(1)}c</b></span>` : ""}</div>`;
    A.forEach((a) => {
      R.getElementById("app-" + a.k).classList.toggle("run", this._run(a));
      if (!this._hist) return;
      const cs = this._cycles(a);
      R.getElementById("wk-" + a.k).innerHTML = `<h3 style="margin:0 0 6px">Last 7 days</h3>` + (cs.length ? `<div class="cyc"><span class="h">Start</span><span class="h"></span><span class="h">kWh</span><span class="h">Cost</span>${cs.map((c) => `<span>${aDN[c.t.getDay()]} ${aDM(c.t)}</span><span class="d">${aHM(c.t)}${c.dur ? " · " + Math.round(c.dur) + " min" : ""}</span><span>${c.kwh != null ? (+c.kwh).toFixed(2) : "–"}</span><span>${c.eur != null ? "€" + (+c.eur).toFixed(2) : "–"}</span>`).join("")}</div>` : `<div class="empty">No cycles in the last 7 days</div>`);
    });
    // 14-day stacked bars
    if (this._stats) {
      const days = [], d0 = new Date(); d0.setHours(0, 0, 0, 0); for (let k = 13; k >= 0; k--) { const t = new Date(d0); t.setDate(d0.getDate() - k); days.push(t); }
      const val = (a, t) => { const r = (this._stats[`sensor.${a.k}_socket_energy`] || []).find((x) => { const s = new Date(x.start > 1e10 ? x.start : x.start * 1000); return s.toDateString() === t.toDateString(); }); return r ? Math.max(0, r.change || 0) : 0; };
      const W = 900, H = 220, L = 34, B = 24, T = 14, cw = W - L - 8, ch = H - T - B, tot = days.map((t) => A.reduce((s, a) => s + val(a, t), 0)), mx = Math.max(1, Math.ceil(Math.max(...tot) * 2) / 2), bw = cw / 14;
      let s = `<svg class="ch" viewBox="0 0 ${W} ${H}">`; for (let v = 0; v <= mx; v += mx > 3 ? 1 : .5) s += `<line x1="${L}" x2="${W - 8}" y1="${T + ch - ch * v / mx}" y2="${T + ch - ch * v / mx}" stroke="var(--a-bd)"/><text x="${L - 5}" y="${T + ch - ch * v / mx + 4}" text-anchor="end" font-size="10" fill="var(--a-sec)">${v}</text>`;
      days.forEach((t, i) => { let y = T + ch; A.forEach((a) => { const v = val(a, t), hh = ch * v / mx; if (v > 0) { y -= hh; s += `<rect x="${L + i * bw + bw * .18}" y="${y}" width="${bw * .64}" height="${hh}" fill="${a.hex}" rx="2"/>`; } });
        if (tot[i] > 0) s += `<text x="${L + i * bw + bw / 2}" y="${y - 4}" text-anchor="middle" font-size="10" fill="var(--a-ink)">${tot[i].toFixed(1)}</text>`;
        s += `<text x="${L + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle" font-size="10" fill="var(--a-sec)">${i === 13 ? "Today" : aDM(t)}</text>`; });
      const el = R.getElementById("bars"); el.innerHTML = s + "</svg>"; if (this._c.layout === "phone") requestAnimationFrame(() => (el.scrollLeft = el.scrollWidth));
      R.getElementById("lg").innerHTML = A.map((a) => `<span><i style="background:${a.hex}"></i>${a.n}</span>`).join("") + `<span style="margin-left:auto">14 days: ${tot.reduce((p, q) => p + q, 0).toFixed(1)} kWh</span>`;
    }
    // 7-day split (his *_7_day_energy sensors)
    const sp = A.map((a) => [a, this._n(`sensor.${a.k}_socket_${a.k}_7_day_energy`) || 0]), sum = sp.reduce((p, q) => p + q[1], 0); let ang = -90, svg = '<svg viewBox="0 0 150 150">';
    if (sum > 0) sp.forEach(([a, v]) => { if (!v) return; const a1 = ang, a2_ = ang + 360 * v / sum; ang = a2_; const P = (t) => [75 + 60 * Math.cos(t * Math.PI / 180), 75 + 60 * Math.sin(t * Math.PI / 180)]; const [x1, y1] = P(a1), [x2, y2] = P(a2_ - .01);
      svg += `<path d="M${x1} ${y1} A60 60 0 ${a2_ - a1 > 180 ? 1 : 0} 1 ${x2} ${y2}" stroke="${a.hex}" stroke-width="22" fill="none"/>`; });
    else svg += `<circle cx="75" cy="75" r="60" stroke="var(--a-bd)" stroke-width="22" fill="none"/>`;
    svg += `<text x="75" y="72" text-anchor="middle" font-size="20" fill="var(--a-ink)">${sum.toFixed(1)}</text><text x="75" y="90" text-anchor="middle" font-size="11" fill="var(--a-sec)">kWh</text></svg>`;
    R.getElementById("split").innerHTML = svg + `<div class="rows">${sp.map(([a, v]) => `<div class="row"><span><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${a.hex};margin-right:6px"></i>${aEsc(a.n)}</span><span>${v.toFixed(2)} kWh${sum ? ` · ${Math.round(v / sum * 100)}%` : ""}</span></div>`).join("")}</div>`;
  }
}
customElements.define("appliances-card", AppliancesCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "appliances-card", name: "Appliances Card", description: "Appliances tab: his washing-machine-cards + status, cycles, energy" });
console.info("%c APPLIANCES-CARD %c v" + AP_VERSION + " ", "background:#4CAF50;color:#fff", "background:#121826;color:#fff");
