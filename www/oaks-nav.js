// oaks-nav v34 = v33 + Home v2 bar (gated by V2 / V2_LIVE, his 26-11)
/* oaks-nav.js — banner + section tabs for the 6-section layout (mock ha-sidebar-mock-v2, accepted 25-11-2026).
 * Loaded as a Lovelace resource. On the dashboards listed in SECTIONS it draws, above the page:
 *   phone only: a ☰ bar (HA's header is hidden by kiosk-mode on these dashboards)
 *   the critical-info banner (one ha-card, the Security page's pill style)
 *   the section's tabs (hidden tabs are reachable but not shown, like HA visible:false)
 * and pushes the page down by its height. Elsewhere it does nothing.
 * Also defines custom:oaks-rooms-card (the Rooms overview tiles).
 */
const ON_VERSION = "33";
const HOME_DASH = "smart-home";
const V2_LIVE = true;   // his switch (26-11): true = Home v2 bar for everyone; false = only on the test dashboard
const V2_TEST = "home-test";
const V2 = () => V2_LIVE || location.pathname.split("/")[1] === V2_TEST;
const V2_HOME_TABS = [["lighting", "Lighting", "mdi:lightbulb-group-outline"], ["cctv", "CCTV", "mdi:cctv"], ["alarm", "Alarm", "mdi:shield-home"], ["heating", "Heating", "mdi:thermometer"]];
let V2_ROW = null, V2_PTAB = null;   // which section's row is open (phone), the Home card's selected tab
window.addEventListener("home-v2-state", (e) => { V2_PTAB = e.detail && e.detail.ptab; const f = document.querySelector("oaks-fbar"); if (f) { f._sig = ""; const h = document.querySelector("home-assistant"); if (h && h.hass) f.update(h.hass, document.querySelector("oaks-nav") && document.querySelector("oaks-nav")._where()); } });
// old smart-home pages (bookmarks, Node-RED doorbell + other notification taps) -> their new place
const ALIASES = { cctv: "house-security/cctv", security: "house-security/alarm", doorbell: "house-security/doorbell",
  climate: "house-energy/climate", kitchen: "house-map/kitchen", "sitting-room": "house-map/sitting-room", "colm-bedroom": "house-map/colm-bedroom",
  "cian-bedroom": "house-map/cian-bedroom", "aoife-bedroom": "house-map/aoife-bedroom", office: "house-map/office",
  energy: "house-energy/solar", appliances: "house-energy/appliances", cars: "house-energy/cars",
  floorplan: "house-map/floorplan", map: "house-map/floorplan", sky: "house-sky/sky", network: "house-infra/network" };
// addresses that moved between the new dashboards
const MOVED = { "house-security/security": "house-security/cctv", "house-energy/power": "house-energy/solar", "house-energy/energy": "house-energy/solar", "house-map/map": "house-map/floorplan", "house-map/sky": "house-sky/sky",
  "house-rooms": "house-map/rooms", "house-rooms/rooms": "house-map/rooms", "house-rooms/climate": "house-energy/climate",
  ...Object.fromEntries(["kitchen", "sitting-room", "colm-bedroom", "cian-bedroom", "aoife-bedroom", "office"].map((r) => ["house-rooms/" + r, "house-map/" + r])) };
const SECTIONS = [
  { id: "home", dash: HOME_DASH, tabs: [
      { p: "home", n: "Home", i: "mdi:home" },
      { p: "weather-detail", n: "Weather", i: "mdi:weather-cloudy", hidden: true },
      { p: "calendar-month", n: "Calendar", i: "mdi:calendar", hidden: true } ] },
  // his 25-11: Map section renamed House = Map (3D) + Rooms; People deleted; Night sky moved to More; Rooms section deleted
  { id: "house", dash: "house-map", tabs: [
      { p: "floorplan", n: "Floorplan", i: "mdi:floor-plan" },   // address stays /house-map/floorplan (his 25-11 "you can use floorplan")
      { p: "rooms", n: "Rooms", i: "mdi:sofa" },
      { p: "calendar", n: "Calendar", i: "mdi:calendar", v2: true, url: "/calendar" },   // his 26-11: Household gets Calendar + To-do
      { p: "todo", n: "To-do", i: "mdi:format-list-checkbox", v2: true, url: "/todo" },
      ...["kitchen", "sitting-room", "colm-bedroom", "cian-bedroom", "aoife-bedroom", "office"].map((p) => ({ p, n: p, hidden: true, parent: "rooms" })) ] },
  { id: "energy", dash: "house-energy", tabs: [   // his 25-11: Heating first; solar page address /house-energy/solar
      { p: "climate", n: "Heating", i: "mdi:radiator" },
      { p: "solar", n: "Solar & battery", i: "mdi:solar-power" },
      { p: "appliances", n: "Appliances", i: "mdi:washing-machine" },
      { p: "cars", n: "Cars & fuel", i: "mdi:car" } ] },
  { id: "security", dash: "house-security", tabs: [
      { p: "cctv", n: "CCTV", i: "mdi:cctv" },          // his 25-11: CCTV first, address /house-security/cctv
      { p: "alarm", n: "Alarm", i: "mdi:shield-check" },   // alarm page at /house-security/alarm
      { p: "doorbell", n: "Doorbell", i: "mdi:doorbell-video" } ] },
  // Infrastructure: one HA view; its tabs drive the infra page's own tabs inside the iframe
  { id: "infra", dash: "house-infra", inner: true, tabs: [
      { p: "Overview", n: "Overview", i: "mdi:view-dashboard" }, { p: "Compute", n: "Compute", i: "mdi:chip" },
      { p: "Storage", n: "Storage", i: "mdi:harddisk" }, { p: "Network", n: "Network", i: "mdi:lan" },
      { p: "IPs", n: "IPs", i: "mdi:ip-network" }, { p: "Apps", n: "Apps", i: "mdi:apps" },
      { p: "Updates", n: "Updates", i: "mdi:update" }, { p: "Homepage", n: "Homepage", i: "mdi:home-circle" },
      { p: "Household Config", n: "Household Config", i: "mdi:home-account" } ] },   // his 25-11: tab shows the household dashboard now
];
const BANNER = {
  mode: "input_select.house_mode", house: "alarm_control_panel.house", shed: "alarm_control_panel.shed",
  weather: "weather.forecast_home", solar: "sensor.solis_pv_total_power", load: "sensor.solis_house_load",
  soc: "sensor.solis_battery_soc", imp: "sensor.grid_import_power", exp: "sensor.grid_export_power",
};
const PHONE_MAX = 870;
// phone layout: "tall" = as live 25-11 (☰ bar + 2-line pills + icon tabs); "A"/"B" = compact proposals
const PHONE_STYLE = window.OAKS_PHONE_STYLE || "B";          // his pick 25-11: C + E
// phone: show the energy row (Solar/House/Battery/Grid) only on Home
const ENERGY_HOME_ONLY = window.OAKS_ENERGY_HOME_ONLY ?? true;
// phone: banner folds away while scrolling down, comes back on scroll up
const FOLD = window.OAKS_FOLD ?? true;          // HA's own narrow breakpoint (sidebar becomes a drawer)
const COL_MAX = 1564;           // your 3-column sections width (measured 25-11 at 2220 px)

const deep = (root, sel) => { const st = [root]; while (st.length) { const n = st.pop(); const f = n.querySelector && n.querySelector(sel); if (f) return f; (n.querySelectorAll ? n.querySelectorAll("*") : []).forEach((e) => e.shadowRoot && st.push(e.shadowRoot)); } return null; };
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const go = (path) => { history.pushState(null, "", path); window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } })); };
const kw = (w) => (w >= 1000 ? (w / 1000).toFixed(1) + " kW" : Math.round(w) + " W");
const WX_ICON = { "clear-night": "mdi:weather-night", cloudy: "mdi:weather-cloudy", exceptional: "mdi:alert-circle-outline", fog: "mdi:weather-fog", hail: "mdi:weather-hail",
  lightning: "mdi:weather-lightning", "lightning-rainy": "mdi:weather-lightning-rainy", partlycloudy: "mdi:weather-partly-cloudy", pouring: "mdi:weather-pouring", rainy: "mdi:weather-rainy",
  snowy: "mdi:weather-snowy", "snowy-rainy": "mdi:weather-snowy-rainy", sunny: "mdi:weather-sunny", windy: "mdi:weather-windy", "windy-variant": "mdi:weather-windy-variant" };
const ALARM = { disarmed: "Disarmed", armed_away: "Armed away", armed_night: "Armed night", armed_home: "Armed home", arming: "Arming", pending: "Pending", triggered: "TRIGGERED" };

const CSS = `
:host{position:fixed;top:0;z-index:5;display:none;font-family:var(--ha-font-family-body,Roboto,Noto,sans-serif);-webkit-font-smoothing:antialiased;color:var(--primary-text-color)}
:host(.on){display:block}
.wrap{background:var(--app-header-background-color,var(--primary-background-color))}
.menu{display:none;align-items:center;gap:20px;height:52px;padding:0 14px;font-size:18px;color:var(--primary-text-color)}
.menu ha-icon{color:var(--secondary-text-color);cursor:pointer;--mdc-icon-size:24px}
.btop{padding:10px 0}
.wxw{display:flex;align-items:center;gap:8px;margin:6px auto 0;padding:7px 12px;border-radius:10px;font-size:13px;line-height:1.3;text-decoration:none;cursor:pointer;box-sizing:border-box;background:#ffd23f;color:#2b2100}
.wxw[hidden]{display:none}.wxw ha-icon{--mdc-icon-size:18px;flex:none}.wxw .wt{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wxw .go{flex:none;font-weight:500;opacity:.8}
.wxw.orange{background:#ff8c1a;color:#2b1300}.wxw.red{background:#d32f2f;color:#fff}
:host(.phone) .wxw{margin-top:4px;padding:6px 10px;font-size:12px}
.banner{margin:0 auto;background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:12px;padding:10px 12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;box-sizing:border-box}
.chip{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid var(--divider-color);border-radius:999px;background:var(--secondary-background-color);color:var(--secondary-text-color);font-size:13px;white-space:nowrap;cursor:pointer;text-decoration:none}
.chip b{color:var(--primary-text-color);font-weight:500}
.chip .x{font-weight:400;color:var(--secondary-text-color)}
.chip .dot{width:8px;height:8px;border-radius:50%;flex:none}
.chip:hover{border-color:var(--primary-color)}
.chip.alert{border-color:var(--error-color)} .chip.alert b{color:var(--error-color)}
.sp{flex:1}
.wi{display:none}
.tabs{display:flex;height:48px;padding:0 8px;border-bottom:1px solid var(--divider-color);overflow-x:auto;scrollbar-width:none}
.tabs.none{display:none}
.tab{text-decoration:none;display:flex;align-items:center;gap:8px;padding:0 20px;color:var(--secondary-text-color);font-size:14px;font-weight:500;border-bottom:2px solid transparent;white-space:nowrap;cursor:pointer;margin-bottom:-1px;--mdc-icon-size:22px}
.tab.sel{color:var(--primary-color);border-bottom-color:var(--primary-color)}
.tab:hover{color:var(--primary-text-color)}
.tl{display:block}
/* phone */
:host(.phone) .menu{display:flex}
:host(.phone) .btop{padding:6px 8px}
:host(.v2home) .wrap{background:transparent!important}
:host(.v2all) .btop{padding:14px 0 0}
:host(.v2all.phone) .banner{margin:0 10px!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:4px!important;padding:0!important}
:host(.v2all.phone) .btop{padding:8px 0 0}
:host(.v2all.phone) .banner .sp, :host(.v2all.phone) .banner .sp ~ *{display:none!important}
:host(.v2all) .banner{width:auto!important;margin:0 24px;background:transparent;border:0;border-radius:0;box-shadow:none;padding:4px 0;justify-content:flex-start} :host(.v2all) .banner .sp{flex:1 1 auto!important;min-width:24px}
:host(.v2home) .btop{padding:14px 0 0}
:host(.v2home.phone) .banner{margin:0 10px!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:4px!important;padding:0!important}
:host(.v2home.phone) .btop{padding:8px 0 0}
:host(.v2home.phone) .banner .sp, :host(.v2home.phone) .banner .sp ~ *{display:none!important}
:host(.v2home) .banner{width:auto!important;margin:0 24px;background:transparent;border:0;border-radius:0;box-shadow:none;padding:4px 0;justify-content:flex-start} :host(.v2home) .banner .sp{flex:1 1 auto!important;min-width:24px}
:host(.phone) .banner{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:1fr;gap:4px;padding:6px;align-items:stretch}
:host(.phone) .wi{display:inline-block;--mdc-icon-size:15px;margin-left:3px;vertical-align:-2px;color:var(--secondary-text-color)}
:host(.phone) .sp{display:none}
:host(.phone) .chip{display:grid;grid-template-columns:7px minmax(0,1fr);column-gap:4px;align-items:center;border-radius:10px;padding:5px 5px;font-size:10.5px;line-height:1.25;white-space:normal;min-width:0}
:host(.phone) .chip .dot{width:7px;height:7px;grid-row:1 / span 2}
:host(.phone) .chip b{font-size:min(11.5px,2.7vw);grid-column:2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
:host(.phone) .chip > span:not(.dot){white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
:host(.phone) .chip .x{display:none}
:host(.phone) .tabs{height:auto;padding:0;overflow:visible}
:host(.phone) .tab{flex:1 1 0;min-width:0;flex-direction:column;justify-content:center;gap:2px;padding:7px 2px 6px;font-size:11px;text-align:center;--mdc-icon-size:20px}
:host(.phone) .tl{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
:host(.phone) .tabs.many{display:grid;grid-template-columns:repeat(5,1fr)}
.pi{display:none}
.btop{transition:max-height .2s ease,padding .2s ease,opacity .2s;max-height:400px;overflow:hidden}
:host(.folded) .btop{max-height:0;padding-top:0;padding-bottom:0;opacity:0}
:host(.enhome) .chip.en{display:none}
:host(.fb) .tabs,:host(.phone) .tabs{display:none!important}
/* compact phone A + B: no ☰ bar (☰ sits in the tab row), label-only tabs 40 px */
:host(.ps-A) .menu,:host(.ps-B) .menu{display:none}
:host(.ps-A) .tabs,:host(.ps-B) .tabs{display:flex;height:40px}
:host(.ps-A) .tab,:host(.ps-B) .tab{flex-direction:row;padding:0 4px;font-size:12.5px}
:host(.ps-A) .tab ha-icon:not(.hi),:host(.ps-B) .tab ha-icon{display:none}
:host(.ps-A) .tab.ham,:host(.ps-B) .tab.ham{flex:0 0 44px}
:host(.ps-A) .tab.ham ha-icon,:host(.ps-B) .tab.ham ha-icon{display:inline-block;--mdc-icon-size:22px}
:host(.ps-A) .tab.ttl,:host(.ps-B) .tab.ttl{flex:1;justify-content:flex-start;font-size:16px;color:var(--primary-text-color);padding-left:8px}
:host(.ps-A) .tabs.many,:host(.ps-B) .tabs.many{display:grid;grid-template-columns:repeat(5,1fr);height:auto}
:host(.ps-A) .tabs.many .tab,:host(.ps-B) .tabs.many .tab{height:36px;justify-content:center}
:host(.ps-A) .btop,:host(.ps-B) .btop{padding:4px 6px}
:host(.ps-A) .banner{padding:4px;gap:3px}
:host(.ps-A) .chip{padding:3px 5px}
/* B: one-line pills, coloured icon instead of label + dot */
:host(.ps-B) .banner{padding:4px;gap:3px;grid-auto-rows:auto}
:host(.ps-B) .chip{display:flex;align-items:center;gap:3px;padding:5px 5px;border-radius:999px;justify-content:flex-start}
:host(.ps-B) .chip .dot,:host(.ps-B) .chip > span:not(.dot){display:none}
:host(.ps-B) .pi{display:inline-block;--mdc-icon-size:15px;flex:none}
:host(.ps-B) .chip b{font-size:min(11.5px,2.7vw)}
:host(.ps-B) .wi{display:none}   /* the pill's own icon is already the weather icon */
`;

class OaksNav extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" }).innerHTML = `<style>${CSS}</style><div class="wrap"><div class="menu"><ha-icon icon="mdi:menu"></ha-icon><span class="title"></span></div><div class="btop"><div class="banner"></div><a class="wxw" hidden></a></div><div class="tabs"></div></div>`;
    this._q = (s) => this.shadowRoot.querySelector(s);
    this._q(".menu ha-icon").addEventListener("click", () => { const r = this._root(); (r || this).dispatchEvent(new Event("hass-toggle-menu", { bubbles: true, composed: true })); });
    this.shadowRoot.addEventListener("click", (e) => {
      const a = e.target.closest("[data-go]"); if (a) { e.preventDefault(); go(a.dataset.go); return; }
      if (e.target.closest("[data-ham]")) { const r = this._root(); (r || this).dispatchEvent(new Event("hass-toggle-menu", { bubbles: true, composed: true })); return; }
      const t = e.target.closest("[data-inner]"); if (t) { this._inner = t.dataset.inner; this._innerApplied = null; this._render(true); }
    });
    this._sig = ""; this._inner = null;
  }
  _ha() { return document.querySelector("home-assistant"); }
  _root() { if (!this._hr || !this._hr.isConnected) this._hr = deep(document, "hui-root"); if (this._hr) return this._hr;
    if (window.innerWidth > PHONE_MAX && /^\/(todo|calendar)(\/|$)/.test(location.pathname)) return deep(document, location.pathname.startsWith("/todo") ? "ha-panel-todo" : "ha-panel-calendar");
    return null; }
  _where() {
    const seg = location.pathname.split("/").filter(Boolean); if (seg[0] === "todo") { seg[0] = "house-map"; seg[1] = "todo"; } else if (seg[0] === "calendar") { seg[0] = "house-map"; seg[1] = "calendar"; }
    const sec = SECTIONS.find((s) => s.dash === seg[0]) || (seg[0] === V2_TEST ? SECTIONS[0] : null);
    if (!sec) return null;
    const view = seg[1] || sec.tabs[0].p;
    return { sec, view };
  }
  tick() {
    const seg = location.pathname.split("/").filter(Boolean);
    const mk = seg.slice(0, 2).join("/");
    if ((MOVED[mk] || (seg.length === 1 && MOVED[seg[0]])) && !this._disabled()) {
      history.replaceState(null, "", "/" + (MOVED[mk] || MOVED[seg[0]]) + location.search + location.hash);
      window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: true } })); return;
    }
    if (seg[0] === "smart-home" && ALIASES[seg[1]] && !this._disabled()) {
      history.replaceState(null, "", "/" + ALIASES[seg[1]] + location.search + location.hash);
      window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: true } }));
      return;
    }
    const w = this._where(), r = this._root();
    if (!w || !r || this._disabled()) { this._off(); const ha = this._ha(); try { phoneEverywhere(ha && ha.hass, false); } catch (e) { console.warn("oaks phone", e); } return; }
    try { phoneEverywhere(this._ha().hass, true); } catch (e) { console.warn("oaks phone", e); }
    this.classList.add("on");
    const phone = window.innerWidth <= PHONE_MAX;
    this.classList.toggle("phone", phone);
    // sit exactly over the panel area (right of the sidebar)
    const rr = r.getBoundingClientRect();
    this.style.left = rr.left + "px"; this.style.width = rr.width + "px";
    this._render(false, w, phone);
    // phone: floating hybrid bar replaces the ☰ + top tabs (only when your lists are readable)
    const fb = document.querySelector("oaks-fbar") || document.body.appendChild(document.createElement("oaks-fbar"));
    const fbOn = phone && fb.update(this._ha().hass, w);
    fb.classList.toggle("on", !!fbOn); this.classList.toggle("fb", !!fbOn);
    peopleTick(this._ha().hass, !!fbOn && location.pathname === PEOPLE_PATH);
    doorbellFit(!!fbOn && location.pathname === DOORBELL_PATH);
    { const hv = V2() && w.sec.id === 'home'; this.classList.toggle('v2home', hv); this.classList.toggle('v2all', V2()); const hb = this._q('.banner'); if (V2() && hb) hb.style.width = ''; }
    // push the page down by our height
    const v = r.shadowRoot && (r.shadowRoot.querySelector("#view") || r.shadowRoot.querySelector("hui-view-container"));
    const h = this.classList.contains("folded") && this._fullH ? this._fullH : Math.ceil(this.getBoundingClientRect().height);
    if (!this.classList.contains("folded")) this._fullH = h;
    // kiosk-mode pins #view padding-top with !important but adds --view-container-padding-top to it
    if (v && v.style.getPropertyValue("--view-container-padding-top") !== h + "px") v.style.setProperty("--view-container-padding-top", h + "px");
    PRIME_H = h; try { primePage(); } catch (e) {}
    this._v = v;
    if (r.tagName !== "HUI-ROOT") { if (this._pp && this._pp !== r) this._unpad(); this._pp = r; { const fr = r.shadowRoot && r.shadowRoot.querySelector("ha-two-pane-top-app-bar-fixed, ha-top-app-bar-fixed"); if (fr && fr.style.height !== "100%") fr.style.height = "100%"; const fc = r.shadowRoot && r.shadowRoot.querySelector("ha-full-calendar"), fh = "calc(100vh - var(--header-height, 56px) - " + h + "px)"; if (fc && fc.style.height !== fh) fc.style.height = fh; } if (r.dataset.oaksPad !== String(h)) { r.dataset.oaksPad = h; Object.assign(r.style, { display: "block", position: "relative", top: h + "px", height: "calc(100% - " + h + "px)", transform: "translateZ(0)" });  } } else if (this._pp) this._unpad();
    if (v) { const pb = this.classList.contains("fb") ? Math.ceil(document.querySelector("oaks-fbar").getBoundingClientRect().height) + 24 + "px" : ""; if (v.style.paddingBottom !== pb) v.style.paddingBottom = pb; }
    if (w.sec.inner) this._driveInner(w.sec);
  }
  _disabled() { return location.search.includes("disable_km"); }
  _unpad() { const r = this._pp; if (r) { Object.assign(r.style, { display: "", position: "", top: "", height: "", transform: "" }); delete r.dataset.oaksPad; } this._pp = null; }
  _off() { this._unpad(); doorbellFit(false); const fb = document.querySelector("oaks-fbar"); if (fb) fb.classList.remove("on"); const pe = document.querySelector("oaks-people"); if (pe && pe.classList.contains("on")) { const ha = this._ha(); if (ha && ha.hass) peopleTick(ha.hass, false); } if (!this.classList.contains("on")) return; this.classList.remove("on", "fb"); if (this._v) { this._v.style.removeProperty("--view-container-padding-top"); this._v.style.paddingBottom = ""; } }
  _render(force, w, phone) {
    w = w || this._where(); if (!w) return; phone = phone ?? this.classList.contains("phone");
    const ha = this._ha(), hass = ha && ha.hass; if (!hass) return;
    const S = (e) => hass.states[e];
    const sig = [hass.states["sensor.met_eireann_warning_level"] && hass.states["sensor.met_eireann_warning_level"].state, hass.states["sensor.met_eireann_warning_headline"] && hass.states["sensor.met_eireann_warning_headline"].state, w.sec.id, w.view, phone, this._inner, innerWidth, ...Object.values(BANNER).map((e) => { const s = S(e); return s ? s.state + (s.attributes.temperature ?? "") : "-"; })].join("|");
    if (!force && sig === this._sig) return; this._sig = sig;
    // banner (same pills + order as the accepted mock)
    const st = (e) => (S(e) ? S(e).state : "unavailable");
    const num = (e) => parseFloat(st(e)) || 0;
    const wx = S(BANNER.weather);
    const cond = wx ? wx.state.replace("partlycloudy", "partly cloudy").replace(/-/g, " ") : "";
    const imp = num(BANNER.imp), exp = num(BANNER.exp), soc = Math.round(num(BANNER.soc));
    const al = (e) => ALARM[st(e)] || st(e);
    const armedDot = (e) => (st(e) === "triggered" ? "var(--error-color)" : st(e) === "disarmed" ? "var(--state-alarm_control_panel-disarmed-color,var(--secondary-text-color))" : "var(--state-alarm_control_panel-armed_away-color,var(--info-color))");
    const sd = (sid) => SECTIONS.find((s) => s.id === sid);
    const url = (sid, p) => "/" + sd(sid).dash + "/" + p;
    const c = (dot, lab, val, href, extra, cls, icon, pi) => `<a class="chip ${cls || ""}" data-go="${href}" href="${href}" title="${esc(lab)}"><ha-icon class="pi" icon="${pi || icon || "mdi:circle-small"}" style="color:${dot}"></ha-icon><span class="dot" style="background:${dot}"></span><span>${esc(lab)}</span> <b>${esc(val)}${icon ? `<ha-icon class="wi" icon="${icon}" title="${esc(extra)}"></ha-icon>` : ""}${extra ? ` <span class="x">${esc(extra)}</span>` : ""}</b></a>`;
    this._q(".banner").innerHTML =
      c("var(--primary-color)", "Mode", st(BANNER.mode), url("home", "home"), "", "", "", "mdi:home-account") +
      c(armedDot(BANNER.house), "House", al(BANNER.house), url("security", "alarm"), "", st(BANNER.house) === "triggered" ? "alert" : "", "", "mdi:shield-home") +
      c(armedDot(BANNER.shed), "Shed", al(BANNER.shed), url("security", "alarm"), "", st(BANNER.shed) === "triggered" ? "alert" : "", "", "mdi:warehouse") +
      c("var(--secondary-text-color)", "Outside", (wx && wx.attributes.temperature != null ? wx.attributes.temperature + " °C" : "–"), url("home", "weather-detail"), cond ? cond[0].toUpperCase() + cond.slice(1) : "", "", wx && (WX_ICON[wx.state] || "mdi:weather-cloudy")) +
      `<span class="sp"></span>` +
      c("var(--state-active-color,var(--warning-color))", "Solar", kw(num(BANNER.solar)), url("energy", "solar"), "", "en", "", "mdi:solar-power") +
      c("var(--primary-color)", "House", kw(num(BANNER.load)), url("energy", "solar"), "", "en", "", "mdi:home-lightning-bolt") +
      c(soc < 25 ? "var(--warning-color)" : "var(--success-color)", "Battery", soc + " %", url("energy", "solar"), "", "en", "", "mdi:battery-" + (soc >= 95 ? "high" : soc < 10 ? "outline" : Math.floor(soc / 10) * 10)) +
      c("var(--info-color)", "Grid", (exp > imp ? "export " + kw(exp) : "import " + kw(imp)), url("energy", "solar"), "", "en", "", "mdi:transmission-tower");
    // banner width = your 3-column card width on every page (phone: full width)
    const b = this._q(".banner"); b.style.width = phone ? "" : Math.min(this.getBoundingClientRect().width - 32, COL_MAX) + "px";
    // Met Eireann warning strip under the banner, only while a warning is active (his 25-11 mock -> "make it live")
    { const ww = this._q(".wxw"), lv = st("sensor.met_eireann_warning_level"), hl = st("sensor.met_eireann_warning_headline"), ex = st("sensor.met_eireann_warning_expiry");
      const on = /^(yellow|orange|red)$/i.test(lv); ww.hidden = !on;
      if (on) { const m = /-\s*(.+?)\s+for\s+(.+)$/i.exec(hl) || [], kind = (m[1] || "Weather warning"), areas = (m[2] || "").split(/\s*,\s*/).filter(Boolean);
        const d = new Date(ex), now = new Date(), t = d.toTimeString().slice(0, 5), dd = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
        const day = isNaN(d) ? "" : dd(d) === dd(now) ? "today" : dd(d) - dd(now) === 864e5 ? "tomorrow" : String(d.getDate()).padStart(2, "0") + "-" + String(d.getMonth() + 1).padStart(2, "0");
        const where = areas.length ? (phone ? "" : " · " + areas[0] + (areas.length > 1 ? " + " + (areas.length - 1) + " more" : "")) : "";
        ww.className = "wxw " + lv.toLowerCase(); ww.dataset.go = url("home", "weather-detail"); ww.href = ww.dataset.go; ww.style.width = b.style.width;
        ww.innerHTML = `<ha-icon icon="mdi:alert"></ha-icon><span class="wt"><b>${esc(lv[0].toUpperCase() + lv.slice(1).toLowerCase())} ${esc(kind.toLowerCase())}</b>${esc(where)}${day ? " · until " + t + " " + day : ""}</span><span class="go">Details ›</span>`; } }
    // tabs
    const vis = w.sec.tabs.filter((t) => !t.hidden && (V2() || !t.v2));   // Household Calendar / To-do only in V2
    const cur = w.sec.tabs.find((t) => t.p === w.view);
    const selP = w.sec.inner ? (this._inner || vis[0].p) : cur ? (cur.parent || cur.p) : null;
    const tabs = this._q(".tabs");
    const compact = phone && PHONE_STYLE !== "tall";
    this.classList.toggle("ps-A", compact && PHONE_STYLE === "A"); this.classList.toggle("ps-B", compact && PHONE_STYLE === "B");
    tabs.classList.toggle("none", vis.length < 2 && !compact);
    this.classList.toggle("enhome", phone && ENERGY_HOME_ONLY && w.sec.id !== "home");
    tabs.classList.toggle("many", vis.length > 5);
    const names0 = { home: "Home", house: "House", energy: "Energy", security: "Security", infra: "Infrastructure" };
    tabs.innerHTML = (compact ? `<a class="tab ham" data-ham><ha-icon icon="mdi:menu"></ha-icon></a>` + (vis.length < 2 ? `<span class="tab ttl">${names0[w.sec.id]}</span>` : "") : "") + (vis.length < 2 && compact ? "" : vis.map((t) => w.sec.inner
      ? `<a class="tab ${t.p === selP ? "sel" : ""}" data-inner="${esc(t.p)}"><ha-icon icon="${t.i}"></ha-icon><span class="tl">${esc(t.n)}</span></a>`
      : `<a class="tab ${t.p === selP ? "sel" : ""}" data-go="${(window.innerWidth > PHONE_MAX && t.durl) || t.url || "/" + w.sec.dash + "/" + t.p}" href="${(window.innerWidth > PHONE_MAX && t.durl) || t.url || "/" + w.sec.dash + "/" + t.p}"><ha-icon icon="${t.i}"></ha-icon><span class="tl">${esc(t.n)}</span></a>`).join(""));
    const names = { home: "Home", house: "House", energy: "Energy", security: "Security", infra: "Infrastructure" };
    this._q(".title").textContent = names[w.sec.id];
  }
  // Infrastructure: click the infra page's own tab and hide its tab strip (same-origin iframe)
  _driveInner(sec) {
    const r = this._root(); const f = r && deep(r.shadowRoot || r, "iframe");
    let d; try { d = f && f.contentDocument; } catch (e) { return; }
    if (!d || !d.body) return;
    if (!d.getElementById("oaks-nav-style")) { const s = d.createElement("style"); s.id = "oaks-nav-style"; s.textContent = ".tabs{display:none!important}"; d.head.appendChild(s); this._innerApplied = null; }
    const want = this._inner || sec.tabs[0].p;
    if (this._innerApplied === want + "|" + d.URL) return;
    const t = [...d.querySelectorAll(".tabs > *")].find((x) => x.textContent.trim() === want);
    if (t) { t.click(); this._innerApplied = want + "|" + d.URL; }
  }
}
customElements.define("oaks-nav", OaksNav);

/* Rooms overview: your room photos (same images as the Home tiles) + temperature / lights chips */
const ROOMS = [
  { v: "kitchen", n: "Kitchen", a: "kitchen", img: "/api/image/serve/f3d6a395b6d142180c75d66206ea77fb/512x512" },
  { v: "sitting-room", n: "Sitting Room", a: "sitting_room", img: "/api/image/serve/71dee4784c3ec84c9d06a85e37eb5515/512x512" },
  { v: "colm-bedroom", n: "Colm", a: "colm_bedroom", img: "/api/image/serve/afc9d2275c1e294c23313ddfe2c0235c/512x512" },
  { v: "cian-bedroom", n: "Cian", a: "cian_bedroom", img: "/api/image/serve/8e775435348fac8aacb27c2b9e2a5755/512x512" },
  { v: "aoife-bedroom", n: "Aoife", a: "aoife_bedroom", img: "/api/image/serve/5f84ea7ec0f15b59bcceb8cbb2149b3a/512x512" },
  { v: "office", n: "Office", a: "office", img: "/api/image/serve/ae67b6d971687053d31fa9fb19b16966/512x512" },
];
class OaksRoomsCard extends HTMLElement {
  setConfig(c) { this._c = c || {}; }
  getCardSize() { return 8; }
  getGridOptions() { return { columns: "full" }; }
  set hass(h) {
    this._h = h;
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" }).innerHTML = `<style>
.g{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
@media (max-width:${PHONE_MAX}px){.g{grid-template-columns:1fr}}
.r{background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:12px;overflow:hidden;cursor:pointer}
.r:hover{border-color:var(--primary-color)}
.ph{aspect-ratio:16/8;background-size:cover;background-position:center;position:relative}
.ph::after{content:"";position:absolute;inset:0;background:linear-gradient(transparent 55%,rgba(0,0,0,.6))}
.ph span{position:absolute;left:14px;bottom:10px;color:#fff;font-size:15px;font-weight:500;z-index:1}
.row{display:flex;gap:8px;padding:12px;align-items:center}
.chip{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid var(--divider-color);border-radius:999px;background:var(--secondary-background-color);color:var(--secondary-text-color);font-size:13px}
.chip b{color:var(--primary-text-color);font-weight:500}.dot{width:8px;height:8px;border-radius:50%}
.go{margin-left:auto;color:var(--primary-color);font-weight:500;font-size:13px}</style><div class="g"></div>`;
      this.shadowRoot.addEventListener("click", (e) => { const r = e.target.closest("[data-v]"); if (r) go("/house-map/" + r.dataset.v); });
    }
    const sig = ROOMS.map((r) => this._stat(r).join(",")).join("|");
    if (sig === this._sig) return; this._sig = sig;
    const chip = (dot, lab, val) => `<span class="chip"><span class="dot" style="background:${dot}"></span>${lab} <b>${val}</b></span>`;
    this.shadowRoot.querySelector(".g").innerHTML = ROOMS.map((r) => { const [t, on] = this._stat(r);
      return `<div class="r" data-v="${r.v}"><div class="ph" style="background-image:url('${r.img}')"><span>${esc(r.n)}</span></div>
      <div class="row">${t != null ? chip("var(--state-active-color,var(--warning-color))", "", esc(t) + "°") : ""}${chip(on ? "var(--state-active-color,var(--warning-color))" : "var(--disabled-text-color)", "Lights", on ? on + " on" : "off")}<span class="go">Open ›</span></div></div>`; }).join("");
  }
  // lights on + first temperature sensor in the room's area (entity registry → area)
  _stat(r) {
    const h = this._h; let on = 0, t = null;
    for (const [id, e] of Object.entries(h.entities || {})) {
      const area = e.area_id || (e.device_id && h.devices[e.device_id] && h.devices[e.device_id].area_id);
      if (area !== r.a) continue;
      const s = h.states[id]; if (!s) continue;
      if (id.startsWith("light.") && s.state === "on") on++;
      if (t == null && id.startsWith("sensor.") && s.attributes.device_class === "temperature" && !isNaN(parseFloat(s.state))) t = s.state;
    }
    return [t, on];
  }
}
customElements.define("oaks-rooms-card", OaksRoomsCard);


/* ===== Sidebar from your lists (25-11-2026) =====
 * The lists live at the top of the Home dashboard's YAML (Home → ✏️ → ⋮ → Raw configuration editor):
 *   oaks_sidebar:
 *     admins: [Home, Map, ..., ---, Calendar, ...]      # HA admins
 *     users:  [Home, Map, ..., ---, Music Assistant]    # everyone else
 * Each line = a sidebar name as HA shows it (or its web address); "---" = divider.
 * HA's own list is hidden and these entries are drawn in its place (same HA list items, so collapse/drawer/selection work as normal).
 * If the lists can't be read, HA's normal sidebar is left alone. */
const SB_SECTIONS = { home: "smart-home", house: "house-map", household: "house-map", map: "house-map", energy: "house-energy", security: "house-security", infrastructure: "house-infra" };
const SB_DEF_ICON = { calendar: "mdi:calendar", light: "mdi:lamps", todo: "mdi:clipboard-list", history: "mdi:chart-box", logbook: "mdi:format-list-bulleted-type",
  energy: "mdi:lightning-bolt", map: "mdi:tooltip-account", "media-browser": "mdi:play-box-multiple", config: "mdi:cog" };
const SB = { lists: (() => { try { return JSON.parse(localStorage.getItem("oaks_sidebar_lists") || "null"); } catch (e) { return null; } })(), loaded: 0, sig: "" };
async function sbLoad(hass) {
  try { const c = await hass.callWS({ type: "lovelace/config", url_path: HOME_DASH }); SB.lists = (c && c.oaks_sidebar) || null;
    try { if (SB.lists) localStorage.setItem("oaks_sidebar_lists", JSON.stringify(SB.lists)); else localStorage.removeItem("oaks_sidebar_lists"); } catch (e) {} }
  catch (e) { SB.lists = SB.lists || null; }
  SB.loaded = Date.now(); SB.sig = "";
}
function sbPanels(hass) {
  return Object.values(hass.panels || {}).filter((p) => p.url_path).map((p) => {
    const raw = p.title || p.url_path; const loc = hass.localize && hass.localize("panel." + raw);
    return { url: p.url_path, title: loc || raw, icon: p.icon || SB_DEF_ICON[p.url_path] || "mdi:view-dashboard", admin: !!p.require_admin };
  });
}
function sbResolve(name, panels) {
  const n = String(name).trim(); if (/^-{3,}$/.test(n)) return { sep: true };
  const k = n.toLowerCase().replace(/^\//, "");
  const sec = SB_SECTIONS[k]; if (sec) { const p = panels.find((x) => x.url === sec); if (p) return p; }
  return panels.find((x) => x.title.toLowerCase() === k) || panels.find((x) => x.url === k) || { unknown: n };
}
function sbTick() {
  const ha = document.querySelector("home-assistant"), hass = ha && ha.hass; if (!hass || !hass.user) return;
  if (!SB.loaded || Date.now() - SB.loaded > 120000) { SB.loaded = Date.now(); sbLoad(hass); }
  const main = ha.shadowRoot && ha.shadowRoot.querySelector("home-assistant-main");
  const sb = main && main.shadowRoot && main.shadowRoot.querySelector("ha-sidebar"); const sr = sb && sb.shadowRoot;
  const nav = sr && sr.querySelector("ha-list-nav.before-spacer"); const slot = nav && nav.querySelector("slot");
  if (!slot) return;
  const list = SB.lists && (hass.user.is_admin ? SB.lists.admins : SB.lists.users);
  let st = sr.getElementById("oaks-sb-style");
  if (!Array.isArray(list)) { if (st) st.remove(); slot.querySelectorAll(".oaks").forEach((e) => e.remove()); SB.sig = ""; return; }
  if (!st) { st = document.createElement("style"); st.id = "oaks-sb-style";
    st.textContent = "ha-list-nav.before-spacer ha-list-item-button:not(.oaks){display:none!important} .oaks-div{border-top:1px solid var(--divider-color);margin:6px 12px} .oaks-bad .item-text{color:var(--error-color)}";
    sr.appendChild(st); SB.sig = ""; }
  const cur = location.pathname.split("/").filter(Boolean)[0] || "";
  const panels = sbPanels(hass);
  const ents = list.map((n) => sbResolve(n, panels)).filter((e) => !(e.admin && !hass.user.is_admin) && !(e.unknown && !hass.user.is_admin));
  const sig = JSON.stringify([ents, cur, !!slot.querySelector(".oaks")]);
  if (sig === SB.sig && slot.lastElementChild && slot.lastElementChild.classList.contains("oaks")) return;
  SB.sig = sig;
  slot.querySelectorAll(".oaks").forEach((e) => e.remove());
  for (const e of ents) {
    if (e.sep) { const d = document.createElement("div"); d.className = "oaks oaks-div"; slot.appendChild(d); continue; }
    const it = document.createElement("ha-list-item-button");
    it.className = "oaks" + (e.url === cur ? " selected" : "") + (e.unknown ? " oaks-bad" : "");
    it.setAttribute("role", "listitem"); it.setAttribute("interactive", "");
    if (e.unknown) it.title = "Not found in HA: check the name in the oaks_sidebar list";
    else it.href = "/" + e.url;
    const icon = document.createElement("ha-icon"); icon.setAttribute("slot", "start"); icon.icon = e.unknown ? "mdi:alert-circle-outline" : e.icon;
    const tx = document.createElement("span"); tx.className = "item-text"; tx.setAttribute("slot", "headline"); tx.textContent = e.unknown ? e.unknown + " ?" : e.title;
    it.appendChild(icon); it.appendChild(tx); slot.appendChild(it);
  }
}

/* ===== v12 (25-11-2026, his "build v5 floating bar on phone, keep the rail on desktop") =====
 * DESKTOP: HA's sidebar becomes an 84 px rail (sections from your list, icon + label), More + you at the bottom.
 *          Done inside HA's own sidebar, so it also shows on HA's pages (Settings, History...).
 * PHONE:   on your dashboards a floating bar at the bottom: sections (first 5 of your list) + More,
 *          and above it the current section's tabs as a segmented control. HA's drawer is left as it is
 *          for HA's own pages.
 * MORE:    a popover (desktop) / bottom sheet (phone) with the rest of your list + Settings (admins), Notifications, Profile. */
let RAIL_WIDE = localStorage.getItem('oaks_rail_wide') === '1';
const RAIL_W_N = 84, RAIL_W_W = 220;
const RAIL_W = 84;
document.documentElement.style.setProperty('--oaks-rail-w', (RAIL_WIDE ? RAIL_W_W : RAIL_W_N) + 'px');
const ICO = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const P_MORE = "M16,12A2,2 0 0,1 18,10A2,2 0 0,1 20,12A2,2 0 0,1 18,14A2,2 0 0,1 16,12M10,12A2,2 0 0,1 12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12M4,12A2,2 0 0,1 6,10A2,2 0 0,1 8,12A2,2 0 0,1 6,14A2,2 0 0,1 4,12Z";
function myEntries(hass) {
  const list = SB.lists && (hass.user.is_admin ? SB.lists.admins : SB.lists.users);
  if (!Array.isArray(list)) return null;
  const panels = sbPanels(hass);
  return list.map((n) => sbResolve(n, panels)).filter((e) => !(e.admin && !hass.user.is_admin) && !(e.unknown && !hass.user.is_admin));
}
const isSection = (e) => e && !e.sep && !e.unknown && Object.values(SB_SECTIONS).includes(e.url);
function splitNav(ents) {   // [bar items, More items]: the list's "---" line divides them (no line: sections vs the rest)
  const i = ents.findIndex((e) => e.sep);
  if (i < 0) return [ents.filter(isSection), ents.filter((e) => !isSection(e))];
  return [ents.slice(0, i).filter((e) => !e.sep && !e.unknown), ents.slice(i + 1).filter((e) => !e.sep)];
}
function liftAdd(px) { const pn = deep(document, "ha-panel-calendar") || deep(document, "ha-panel-todo"); if (!pn) return; const st = [pn.shadowRoot]; while (st.length) { const n = st.pop(); if (!n) continue; n.querySelectorAll("ha-button, ha-fab").forEach((b) => { const cs = getComputedStyle(b); if ((cs.position === "absolute" || cs.position === "fixed") && b.style.bottom !== px) b.style.bottom = px; }); n.querySelectorAll("*").forEach((e) => e.shadowRoot && st.push(e.shadowRoot)); } }
const curSeg = () => { const s = location.pathname.split("/").filter(Boolean)[0] || ""; return s === "todo" || s === "calendar" ? "house-map" : s; };
/* ---- Notifications count (same source as HA's own sidebar bell: persistent_notification/subscribe) ---- */
const NOTIF = { n: 0, conn: null, map: {} };
function notifSub(hass) {
  if (window.OAKS_FAKE_NOTIFS) { NOTIF.n = window.OAKS_FAKE_NOTIFS.length; return; }   // test browser only
  if (!hass || !hass.connection || NOTIF.conn === hass.connection) return;
  NOTIF.conn = hass.connection; NOTIF.map = {};
  hass.connection.subscribeMessage((m) => {
    if (m.type === "current") NOTIF.map = {};
    if (m.type === "removed") Object.keys(m.notifications || {}).forEach((k) => delete NOTIF.map[k]);
    else Object.assign(NOTIF.map, m.notifications || {});
    NOTIF.n = Object.keys(NOTIF.map).length;
    try { railTick(); } catch (e) {} const f = document.querySelector("oaks-fbar"); if (f) f._sig = "";
  }, { type: "persistent_notification/subscribe" }).catch(() => { NOTIF.conn = null; });
}
const showNotifs = () => { const ha = document.querySelector("home-assistant"); const main = ha.shadowRoot.querySelector("home-assistant-main"); (main || ha).dispatchEvent(new Event("hass-show-notifications", { bubbles: true, composed: true })); };
const BADGE_CSS = `.nb{position:absolute;min-width:18px;height:18px;box-sizing:border-box;padding:0 5px;border-radius:9px;background:var(--accent-color);color:var(--text-accent-color,var(--text-primary-color,#fff));font-size:11px;font-weight:600;line-height:18px;text-align:center;pointer-events:none;font-family:var(--ha-font-family-body,Roboto,Noto,sans-serif)}`;
const badge = (n) => n ? `<span class="nb">${n > 99 ? "99+" : n}</span>` : "";
function hassIcon(el, icon) { const h = document.createElement("ha-icon"); h.icon = icon; el.appendChild(h); return h; }

/* ---- More: popover / sheet (one element in <body>) ---- */
class OaksMore extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }).innerHTML = `<style>
:host{position:fixed;inset:0;z-index:20;display:none;font-family:var(--ha-font-family-body,Roboto,Noto,sans-serif);color:var(--primary-text-color)}
:host(.open){display:block}
.scrim{position:absolute;inset:0;background:rgba(0,0,0,.28)}
.card{position:absolute;left:calc(var(--oaks-rail-w,${RAIL_W}px) + 10px);bottom:16px;width:360px;max-height:80vh;overflow:auto;background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.35);padding:14px}
:host(.phone) .card{left:0;right:0;bottom:0;width:auto;border-radius:20px 20px 0 0;border-bottom:0;padding:8px 14px calc(18px + env(safe-area-inset-bottom));animation:up .22s ease}
@keyframes up{from{transform:translateY(40px);opacity:.4}to{transform:none;opacity:1}}
.grab{display:none;width:36px;height:4px;border-radius:2px;background:var(--divider-color);margin:2px auto 12px} :host(.phone) .grab{display:block}
h4{margin:2px 4px 10px;font-size:12px;font-weight:600;letter-spacing:.9px;text-transform:uppercase;color:var(--secondary-text-color)}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.grid a{display:flex;flex-direction:column;align-items:center;gap:5px;padding:8px 2px;border-radius:12px;font-size:11.5px;color:var(--primary-text-color);text-align:center;cursor:pointer;line-height:1.2;text-decoration:none}
.grid a:hover{background:var(--secondary-background-color)}
.tile{width:48px;height:48px;border-radius:14px;background:var(--secondary-background-color);display:flex;align-items:center;justify-content:center;color:var(--primary-color);--mdc-icon-size:24px}
.grid a.sel .tile{background:color-mix(in srgb,var(--primary-color) 20%,transparent)}
.bad{color:var(--error-color)}
.row{display:flex;gap:6px;align-items:center;border-top:1px solid var(--divider-color);margin-top:12px;padding-top:10px;flex-wrap:wrap}
.row a{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;color:var(--primary-text-color);font-size:13px;cursor:pointer;text-decoration:none;--mdc-icon-size:20px}
.row a ha-icon{color:var(--secondary-text-color)} .row a:hover{background:var(--secondary-background-color)}
.sp{flex:1}
${BADGE_CSS} .row a{position:relative} .row .nb{position:static;margin-left:2px}
</style><div class="scrim"></div><div class="card"><div class="grab"></div><h4>More</h4><div class="grid"></div><div class="row"></div></div>`;
    this.shadowRoot.querySelector(".scrim").onclick = () => this.close();
    this.shadowRoot.addEventListener("click", (e) => { const a = e.target.closest("[data-go]"); if (a) { e.preventDefault(); this.close(); go(a.dataset.go); }
      const n = e.target.closest("[data-notif]"); if (n) { this.close(); showNotifs(); } });
  }
  open(items, hass, phone, title) {
    const q = (s) => this.shadowRoot.querySelector(s); const cur = curSeg(); q("h4").textContent = title || "More";
    this.classList.toggle("phone", phone);
    q(".grid").innerHTML = ""; q(".row").innerHTML = "";
    for (const e of items) {
      const a = document.createElement("a"); if (!e.unknown) { a.dataset.go = "/" + e.url; a.href = "/" + e.url; }
      if (e.url === cur) a.className = "sel";
      const t = document.createElement("span"); t.className = "tile"; hassIcon(t, e.unknown ? "mdi:alert-circle-outline" : e.icon);
      const l = document.createElement("span"); l.textContent = e.unknown ? e.unknown + " ?" : e.title; if (e.unknown) l.className = "bad";
      a.append(t, l); q(".grid").appendChild(a);
    }
    const row = q(".row");
    const link = (icon, text, attrs) => { const a = document.createElement("a"); Object.entries(attrs).forEach(([k, v]) => a.setAttribute(k, v)); hassIcon(a, icon); a.append(text); row.appendChild(a); };
    if (hass.user.is_admin) link("mdi:cog", "Settings", { "data-go": "/config", href: "/config" });
    link("mdi:bell-outline", "Notifications", { "data-notif": "1" }); if (NOTIF.n) row.lastChild.insertAdjacentHTML("beforeend", badge(NOTIF.n));
    row.appendChild(Object.assign(document.createElement("span"), { className: "sp" }));
    link("mdi:account-circle", hass.user.name, { "data-go": "/profile", href: "/profile" });
    this.classList.add("open");
  }
  close() { this.classList.remove("open"); }
}
customElements.define("oaks-more", OaksMore);
const MORE = () => document.querySelector("oaks-more") || document.body.appendChild(document.createElement("oaks-more"));

/* ---- DESKTOP RAIL: drawn inside HA's sidebar ---- */
const RAIL_CSS = `
:host(.oaks-rail) > *:not(#oaks-rail):not(style):not(card-mod){display:none!important}
#oaks-rail{display:none}
:host(.oaks-rail) #oaks-rail{display:flex;flex-direction:column;align-items:center;height:100%;box-sizing:border-box;padding:10px 0 12px;gap:2px;overflow:auto;scrollbar-width:none;background:var(--sidebar-background-color);font-family:var(--ha-font-family-body,Roboto,Noto,sans-serif)}
#oaks-rail a{width:76px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 0 8px;color:var(--sidebar-text-color);font-size:11.5px;font-weight:500;text-align:center;line-height:1.15;cursor:pointer;text-decoration:none;-webkit-tap-highlight-color:transparent}
#oaks-rail .pill{width:56px;height:32px;border-radius:16px;display:flex;align-items:center;justify-content:center;color:var(--sidebar-icon-color);--mdc-icon-size:24px;transition:background .15s}
#oaks-rail a:hover .pill{background:color-mix(in srgb,var(--sidebar-text-color) 10%,transparent)}
#oaks-rail a.sel{color:var(--sidebar-selected-text-color,var(--primary-color))}
#oaks-rail a.sel .pill{color:var(--sidebar-selected-icon-color,var(--primary-color));background:color-mix(in srgb,var(--sidebar-selected-icon-color,var(--primary-color)) 18%,transparent)}
#oaks-rail .grow{flex:1}
#oaks-rail a.railw{padding:2px 0 4px} #oaks-rail a.railw .pill{height:26px}
:host(.oaks-wide) #oaks-rail{align-items:stretch;padding:10px 10px 12px}
:host(.oaks-wide) #oaks-rail a{width:auto;flex-direction:row;gap:12px;padding:4px 6px;font-size:14px;text-align:left}
:host(.oaks-wide) #oaks-rail .pill{width:44px;flex:none}
:host(.oaks-wide) #oaks-rail a.railw{justify-content:flex-end}
:host(.oaks-wide) #oaks-rail .me{margin-left:8px}
#oaks-rail .pill{position:relative} ${BADGE_CSS} #oaks-rail .nb{top:-4px;right:6px}
#oaks-rail .me{width:40px;height:40px;border-radius:50%;margin-top:8px;cursor:pointer;background:var(--primary-color);color:var(--text-primary-color,#fff);display:flex;align-items:center;justify-content:center;font-weight:500;overflow:hidden;background-size:cover;background-position:center}
`;
let RAIL_SIG = "";
function wideTick() {
  const ha = document.querySelector("home-assistant"); const main = ha && ha.shadowRoot && ha.shadowRoot.querySelector("home-assistant-main");
  const lov = main && main.shadowRoot && main.shadowRoot.querySelector("partial-panel-resolver ha-panel-lovelace");
  const hr = lov && lov.shadowRoot && lov.shadowRoot.querySelector("hui-root"); if (!hr || !hr.shadowRoot) return;
  const desk = window.innerWidth > PHONE_MAX;
  hr.shadowRoot.querySelectorAll("hui-sections-view").forEach((v) => {
    const one = (v.lovelace && v.lovelace.config && v.index != null && (((v.lovelace.config.views || [])[v.index] || {}).max_columns === 1));
    const want = desk && !one ? "100vw" : "";
    if (v.style.getPropertyValue("--column-max-width") !== want) { if (want) v.style.setProperty("--column-max-width", want); else v.style.removeProperty("--column-max-width"); } });
}
function railTick() {
  const ha = document.querySelector("home-assistant"), hass = ha && ha.hass; if (!hass || !hass.user) return;
  const main = ha.shadowRoot && ha.shadowRoot.querySelector("home-assistant-main"); if (!main || !main.shadowRoot) return;
  const sb = main.shadowRoot.querySelector("ha-sidebar"); const sr = sb && sb.shadowRoot; if (!sr) return;
  const ents = myEntries(hass);
  const modal = main.hasAttribute("modal") || window.innerWidth <= PHONE_MAX;
  const on = !!ents && !modal && !location.search.includes("disable_km");
  if (!on) { if (main.style.getPropertyValue("--ha-sidebar-width")) main.style.removeProperty("--ha-sidebar-width"); sb.classList.remove("oaks-rail"); RAIL_SIG = ""; return; }
  main.style.setProperty("--ha-sidebar-width", `calc(${RAIL_WIDE ? RAIL_W_W : RAIL_W_N}px + var(--safe-area-inset-left,0px))`); sb.classList.toggle("oaks-wide", RAIL_WIDE);
  sb.classList.add("oaks-rail");
  if (!sr.getElementById("oaks-rail-style")) { const st = document.createElement("style"); st.id = "oaks-rail-style"; st.textContent = RAIL_CSS; sr.appendChild(st); RAIL_SIG = ""; }
  let rail = sr.getElementById("oaks-rail");
  if (!rail) { rail = document.createElement("nav"); rail.id = "oaks-rail"; sr.appendChild(rail); RAIL_SIG = "";
    rail.addEventListener("click", (e) => { const a = e.target.closest("[data-go]"); if (a) { e.preventDefault(); go(a.dataset.go); return; }
      if (e.target.closest("[data-railw]")) { RAIL_WIDE = !RAIL_WIDE; localStorage.setItem("oaks_rail_wide", RAIL_WIDE ? "1" : "0"); document.documentElement.style.setProperty("--oaks-rail-w", (RAIL_WIDE ? RAIL_W_W : RAIL_W_N) + "px"); RAIL_SIG = ""; railTick(); return; }
      if (e.target.closest("[data-notif]")) { showNotifs(); return; }
      if (e.target.closest("[data-more]")) { const h = document.querySelector("home-assistant").hass; MORE().open(splitNav(myEntries(h))[1], h, false); } }); }
  const cur = curSeg(); const secs = splitNav(ents)[0];
  notifSub(hass);
  const sig = JSON.stringify([secs.map((e) => e.url), cur, hass.user.name, NOTIF.n, RAIL_WIDE]);
  if (sig === RAIL_SIG) return; RAIL_SIG = sig;
  rail.innerHTML = "";
  const extraSel = !secs.some((e) => e.url === cur);
  for (const e of secs) {
    const a = document.createElement("a"); a.dataset.go = "/" + e.url; a.href = "/" + e.url; if (e.url === cur) a.className = "sel";
    const p = document.createElement("span"); p.className = "pill"; hassIcon(p, e.icon); a.append(p, e.title); rail.appendChild(a);
  }
  rail.appendChild(Object.assign(document.createElement("span"), { className: "grow" }));
  const m = document.createElement("a"); m.dataset.more = "1"; if (extraSel) m.className = "sel";
  const mp = document.createElement("span"); mp.className = "pill"; mp.innerHTML = ICO(P_MORE).replace("<svg", '<svg style="width:24px;height:24px;fill:currentColor"'); m.append(mp, "More"); rail.appendChild(m);
  const nb = document.createElement("a"); nb.dataset.notif = "1"; nb.title = "Notifications";
  const np = document.createElement("span"); np.className = "pill"; hassIcon(np, "mdi:bell-outline"); np.insertAdjacentHTML("beforeend", badge(NOTIF.n)); nb.append(np, "Notifications"); rail.appendChild(nb);
  const rw = document.createElement("a"); rw.dataset.railw = "1"; rw.className = "railw"; rw.title = RAIL_WIDE ? "Narrow sidebar" : "Wide sidebar"; rw.innerHTML = `<span class="pill"><svg viewBox="0 0 24 24" style="width:22px;height:22px;fill:currentColor"><path d="${RAIL_WIDE ? "M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z" : "M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"}"/></svg></span>`; rail.appendChild(rw);
  const me = document.createElement("span"); me.className = "me"; me.dataset.more = "1"; me.title = hass.user.name;
  const person = Object.values(hass.states).find((s) => s.entity_id.startsWith("person.") && s.attributes.user_id === hass.user.id);
  if (person && person.attributes.entity_picture) me.style.backgroundImage = `url(${person.attributes.entity_picture})`;
  else me.textContent = (hass.user.name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2);
  rail.appendChild(me);
}

/* ---- PHONE: floating hybrid bar (sections + segmented tabs) on your dashboards ---- */
const BAR_SHORT = { "Music Assistant": "Music" };
const V2_NAME = { House: "Household" };   // shown names in V2 mode (his 26-11)   // phone bar labels that would not fit
const FBAR_CSS = `
:host{position:fixed;left:10px;right:10px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:5;display:none;font-family:var(--ha-font-family-body,Roboto,Noto,sans-serif)}
:host(.on){display:block}
.card{border-radius:26px;padding:6px;background:color-mix(in srgb,var(--card-background-color) 82%,transparent);-webkit-backdrop-filter:blur(18px) saturate(1.4);backdrop-filter:blur(18px) saturate(1.4);
  border:1px solid color-mix(in srgb,var(--divider-color) 70%,transparent);box-shadow:0 10px 30px rgba(0,0,0,.18),0 2px 6px rgba(0,0,0,.08)}
.row{position:relative;display:flex}
.ind{position:absolute;top:0;bottom:0;border-radius:20px;background:color-mix(in srgb,var(--primary-text-color) 8%,transparent);transition:left .32s cubic-bezier(.3,.7,.2,1),width .32s cubic-bezier(.3,.7,.2,1),opacity .2s;pointer-events:none;opacity:0}
.segw{overflow:hidden;max-height:0;opacity:0;transition:max-height .3s ease,opacity .25s ease,margin .3s ease}
.card.hasseg .segw{max-height:48px;opacity:1;margin-bottom:5px}
.seg{overflow-x:auto;scrollbar-width:none} .seg::-webkit-scrollbar{display:none}
.seg a{flex:1 0 auto;min-width:0;position:relative;z-index:1;text-align:center;font-size:12.5px;font-weight:500;color:var(--secondary-text-color);padding:8px 10px;white-space:nowrap;transition:color .2s;text-decoration:none;cursor:pointer;-webkit-tap-highlight-color:transparent}
.seg a.sel{color:var(--primary-text-color)}
.seg .ind{border-radius:16px;background:color-mix(in srgb,var(--primary-text-color) 9%,transparent)}
.secs a{flex:1 1 0;min-width:0;position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 0 6px;font-size:10.5px;font-weight:500;color:var(--secondary-text-color);transition:color .2s;text-decoration:none;cursor:pointer;-webkit-tap-highlight-color:transparent;--mdc-icon-size:23px}
.secs a.sel{color:var(--primary-text-color)} .secs a.sel ha-icon,.secs a.sel svg{color:var(--primary-color);fill:var(--primary-color)}
.secs svg{width:23px;height:23px;fill:currentColor}
.secs span.l{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.secs .mi{position:relative;display:flex} ${BADGE_CSS} .secs .nb{top:-6px;left:14px}
`;
class OaksFbar extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }).innerHTML = `<style>${FBAR_CSS}</style><div class="card"><div class="segw"><div class="row seg"><span class="ind"></span></div></div><div class="row secs"><span class="ind"></span></div></div>`;
    this.shadowRoot.addEventListener("click", (e) => {
      const sc = e.target.closest("[data-sec]"); if (sc) { e.preventDefault(); const u = sc.dataset.sec, dash = u.split("/")[0];   // V2: a section press opens / closes its row
        const known = SECTIONS.some((x) => x.dash === dash);
        if (!known) { go("/" + u); return; }
        if (V2_ROW === dash) { V2_ROW = null; if (dash === HOME_DASH) window.dispatchEvent(new CustomEvent("oaks-home-tab", { detail: { k: "none" } })); }
        else { V2_ROW = dash; if (dash === HOME_DASH && !/^\/(smart-home\/home|home-test)/.test(location.pathname)) go(location.pathname.startsWith("/" + V2_TEST) ? location.pathname : "/" + HOME_DASH + "/home"); }
        this._sig = ""; const h = document.querySelector("home-assistant"); this.update(h.hass, document.querySelector("oaks-nav")._where()); return; }
      const ht = e.target.closest("[data-htab]"); if (ht) { e.preventDefault(); window.dispatchEvent(new CustomEvent("oaks-home-tab", { detail: { k: ht.dataset.htab } })); return; }
      const a = e.target.closest("[data-go]"); if (a) { e.preventDefault(); go(a.dataset.go); return; }
      const t = e.target.closest("[data-inner]"); if (t) { const n = document.querySelector("oaks-nav"); n._inner = t.dataset.inner; n._innerApplied = null; n._render(true); this._sig = ""; return; }
      if (e.target.closest("[data-more]")) { const h = document.querySelector("home-assistant").hass; const [top, rest] = splitNav(myEntries(h)); MORE().open(top.slice(5).concat(rest), h, true); } });
    this._sig = ""; }
  update(hass, w) {
    const ents = myEntries(hass); const q = (s) => this.shadowRoot.querySelector(s);
    if (!ents) return false;
    const secs = splitNav(ents)[0]; const cur = curSeg();
    const v2 = V2(); const sec = v2 ? (V2_ROW ? SECTIONS.find((x) => x.dash === V2_ROW || (V2_ROW === HOME_DASH && x.id === 'home')) : null) : (w && w.sec);
    const vis = !sec ? [] : (v2 && sec.id === 'home') ? V2_HOME_TABS.map(([p, n, i]) => ({ p, n, i, home: true })) : sec.tabs.filter((t) => !t.hidden && (v2 || !t.v2));
    const curTab = sec ? (sec.inner ? (document.querySelector("oaks-nav")._inner || vis[0].p) : (() => { const t = sec.tabs.find((x) => x.p === w.view); return t ? (t.parent || t.p) : null; })()) : null;
    notifSub(hass);
    const sig = JSON.stringify([secs.map((e) => e.url), cur, vis.map((t) => t.p), curTab, NOTIF.n, v2, V2_ROW, V2_PTAB]);
    if (sig !== this._sig) {
      this._sig = sig;
      const sr = q(".secs"), sg = q(".seg"); sr.querySelectorAll("a").forEach((a) => a.remove()); sg.querySelectorAll("a").forEach((a) => a.remove());
      for (const e of secs.slice(0, 5)) { const a = document.createElement("a"); a.href = "/" + e.url; if (v2) a.dataset.sec = e.url; else a.dataset.go = "/" + e.url; if (e.url === cur || (v2 && cur === V2_TEST && e.url === HOME_DASH)) a.className = "sel";
        hassIcon(a, e.icon); const l = document.createElement("span"); l.className = "l"; l.textContent = BAR_SHORT[e.title] || (v2 && V2_NAME[e.title]) || e.title; a.appendChild(l); sr.appendChild(a); }
      const more = document.createElement("a"); more.dataset.more = "1"; if (!secs.slice(0, 5).some((e) => e.url === cur)) more.className = "sel";
      more.innerHTML = '<span class="mi">' + ICO(P_MORE) + badge(NOTIF.n) + '</span><span class="l">More</span>'; sr.appendChild(more);
      if (vis.length > 1) for (const t of vis) { const a = document.createElement("a"); a.textContent = t.n;
        if (t.home) a.dataset.htab = t.p; else if (sec.inner) a.dataset.inner = t.p; else { a.dataset.go = t.url || "/" + sec.dash + "/" + t.p; a.href = a.dataset.go; }
        if (t.home ? t.p === V2_PTAB : t.p === curTab) a.className = "sel"; sg.appendChild(a); }
      q(".card").classList.toggle("hasseg", vis.length > 1);
    }
    requestAnimationFrame(() => { for (const row of [".secs", ".seg"]) { const r = q(row), sel = r.querySelector("a.sel"), ind = r.querySelector(".ind");
      if (sel && sel.offsetWidth) { ind.style.opacity = 1; ind.style.left = sel.offsetLeft + "px"; ind.style.width = sel.offsetWidth + "px"; if (row === ".seg") { const L = sel.offsetLeft, R = L + sel.offsetWidth; if (L < r.scrollLeft) r.scrollLeft = L - 8; else if (R > r.scrollLeft + r.clientWidth) r.scrollLeft = R - r.clientWidth + 8; } } else ind.style.opacity = 0; } });
    return true;
  }
}
customElements.define("oaks-fbar", OaksFbar);

/* ---- PHONE People map (his pick "A", 25-11): HA's bottom People sheet is hidden, a slim strip of
 *      photos sits above the floating bar (green ring = home, tap = HA's person details). ---- */
const PEOPLE_PATH = "/house-map/map";
const MAP_DASH = "dashboard-map";
class OaksPeople extends HTMLElement {
  // same look as the 3D house's who's-home icons (live-house-card #lv-ppl): 44 px round photos stacked down the left
  constructor() { super(); this.attachShadow({ mode: "open" }).innerHTML = `<style>
:host{position:fixed;left:8px;z-index:5;display:none}
:host(.on){display:flex;flex-direction:column;gap:6px}
.p{width:44px;height:44px;border-radius:50%;box-sizing:border-box;border:2px solid #2fbf71;box-shadow:0 2px 8px rgba(0,0,0,.5);background:#2a3350 center/cover;display:flex;align-items:center;justify-content:center;
  font-family:var(--ha-font-family-body,Roboto,Noto,sans-serif);font-weight:600;color:#e6e9ef;cursor:pointer;-webkit-tap-highlight-color:transparent}
.p.away{border-color:#7d8aa6}
</style>`;
    this.shadowRoot.addEventListener("click", (e) => { const p = e.target.closest("[data-e]"); if (!p) return;
      document.querySelector("home-assistant").dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: p.dataset.e }, bubbles: true, composed: true })); });
    this._sig = ""; }
  update(hass) {
    const ORDER = ["Colm", "Olivia", "Cian", "Daire"];   // same order as the 3D house (his 24-11)
    const nm = (s) => (s.attributes.friendly_name || s.entity_id.slice(7)).split(" ")[0];
    const ord = (s) => { const i = ORDER.indexOf(nm(s)); return i < 0 ? 99 : i; };
    const ppl = Object.values(hass.states).filter((s) => s.entity_id.startsWith("person.") && !["unknown", "unavailable"].includes(s.state))
      .sort((x, y) => ord(x) - ord(y) || nm(x).localeCompare(nm(y)));
    const where = (s) => (s.state === "home" ? "Home" : s.state === "not_home" ? "Away" : s.state);
    const sig = JSON.stringify(ppl.map((s) => [s.entity_id, s.state, s.attributes.entity_picture]));
    if (sig === this._sig) return; this._sig = sig;
    this.shadowRoot.querySelectorAll(".p").forEach((x) => x.remove());
    for (const s of ppl) {
      const p = document.createElement("div"); p.className = "p" + (s.state === "home" ? "" : " away"); p.dataset.e = s.entity_id; p.title = nm(s) + " · " + where(s);
      if (s.attributes.entity_picture) p.style.backgroundImage = `url("${s.attributes.entity_picture}")`; else p.textContent = nm(s)[0];
      this.shadowRoot.appendChild(p);
    }
  }
}
customElements.define("oaks-people", OaksPeople);
function peopleTick(hass, active) {
  const el = document.querySelector("oaks-people") || (active ? document.body.appendChild(document.createElement("oaks-people")) : null);
  // HA's own map overview sheet (only touched while we replace it)
  const st = [document]; let ov = null; if (active || (el && el.classList.contains("on"))) { while (st.length && !ov) { const n = st.pop(); ov = n.querySelector && n.querySelector("hui-map-overview"); (n.querySelectorAll ? n.querySelectorAll("*") : []).forEach((e) => e.shadowRoot && st.push(e.shadowRoot)); } }
  if (!active) { if (el) el.classList.remove("on"); if (ov && ov.style.display === "none") ov.style.display = ""; return; }
  if (ov && ov.style.display !== "none") ov.style.display = "none";
  const nav = document.querySelector("oaks-nav"); const nb = nav && nav.getBoundingClientRect();   // just under the banner, like the 3D house
  el.style.top = Math.round((nb && nb.height ? nb.bottom : 0) + 8) + "px";
  el.update(hass); el.classList.add("on");
}

/* ---- PHONE, everywhere (his 25-11 "remove the sidebar… break away completely from the original ha setup"):
 *      the floating bar also on HA's own pages (Music Assistant, AudioMuse, How it Works, Settings…),
 *      HA's ☰ hidden and its drawer blocked; those pages end above the bar. ---- */
const PH = { on: false };
setTimeout(() => { try { showMenuButtons(); } catch (e) {} }, 3000);
window.addEventListener("hass-toggle-menu", (e) => { if (!PH.on) return; e.stopImmediatePropagation(); e.preventDefault();
  // an app's own "back to Home Assistant" (Music Assistant's drawer item…) = exit to Home; HA's own ☰ = our menu
  const fromHaMenu = e.composedPath().some((n) => n && n.tagName === "HA-MENU-BUTTON");
  if (!fromHaMenu) { const m0 = document.querySelector("oaks-more"); if (m0) m0.close(); go("/" + HOME_DASH + "/home"); return; }
  const h = document.querySelector("home-assistant").hass; const ents = myEntries(h); if (!ents) return;
  const m = MORE(); if (m.classList.contains("open")) { m.close(); return; }
  m.open(ents.filter((x) => !x.sep), h, true, "Menu");   // full menu: sections + the rest of your list
}, true);
function hideMenuButtons() {
  return;   // 25-11 v17: HA's ☰ stays visible on HA's own pages; it opens our menu (see hass-toggle-menu above)
  const st = [document]; while (st.length) { const n = st.pop();
    (n.querySelectorAll ? n.querySelectorAll("*") : []).forEach((e) => { if (e.tagName === "HA-MENU-BUTTON" && e.style.display !== "none") { e.style.display = "none"; e.dataset.oaksHidden = "1"; } if (e.shadowRoot) st.push(e.shadowRoot); }); }
}
function showMenuButtons() {
  const st = [document]; while (st.length) { const n = st.pop();
    (n.querySelectorAll ? n.querySelectorAll("*") : []).forEach((e) => { if (e.dataset && e.dataset.oaksHidden) { e.style.display = ""; delete e.dataset.oaksHidden; } if (e.shadowRoot) st.push(e.shadowRoot); }); }
}
function panelPad(px) {
  const ha = document.querySelector("home-assistant"); const main = ha && ha.shadowRoot && ha.shadowRoot.querySelector("home-assistant-main");
  const ppr = main && main.shadowRoot && main.shadowRoot.querySelector("partial-panel-resolver"); if (!ppr) return;
  const v = px ? px + "px" : ""; if (ppr.style.paddingBottom !== v) { ppr.style.paddingBottom = v; ppr.style.boxSizing = px ? "border-box" : ""; }
}
function phoneEverywhere(hass, onDashboard) {
  const phone = window.innerWidth <= PHONE_MAX && !location.search.includes("disable_km");
  const ents = phone && hass && hass.user ? myEntries(hass) : null;
  const was = PH.on; PH.on = !!ents;
  if (!PH.on) { if (was) { panelPad(0); const fb = document.querySelector("oaks-fbar"); if (fb && !onDashboard) fb.classList.remove("on"); } return false; }
  // Other HA DASHBOARDS on the phone (How it Works…, his 25-11 "how it works has a hamburger menu"): no HA header/☰, our floating bar.
  // HA's own apps (Music Assistant, AION, Update Manager, Settings…): their own layout + ☰ (which opens our menu).
  if (!onDashboard) {
    const fb = document.querySelector("oaks-fbar") || document.body.appendChild(document.createElement("oaks-fbar"));
    const ha = document.querySelector("home-assistant"); const main = ha && ha.shadowRoot && ha.shadowRoot.querySelector("home-assistant-main");
    const lov = main && main.shadowRoot && main.shadowRoot.querySelector("partial-panel-resolver ha-panel-lovelace");
    const hr = lov && lov.shadowRoot && lov.shadowRoot.querySelector("hui-root");
    if (hr && hr.shadowRoot) {
      if (!hr.shadowRoot.getElementById("oaks-phone-hdr")) { const st = document.createElement("style"); st.id = "oaks-phone-hdr";
        st.textContent = "@media (max-width:" + PHONE_MAX + "px){.header{display:none!important} #view{padding-top:env(safe-area-inset-top)!important;--header-height:0px}}"; hr.shadowRoot.appendChild(st); }
      fb.update(hass, null); fb.classList.add("on");
      // his 25-11 "add map back put it in more": HA's Map sheet sits in the top layer over our bar -> same as the old People tab (faces on the left)
      peopleTick(hass, location.pathname.startsWith("/" + MAP_DASH));
    } else if (location.pathname.startsWith("/todo") || location.pathname.startsWith("/calendar")) { fb.update(hass, { sec: SECTIONS.find((x) => x.dash === "house-map"), view: location.pathname.startsWith("/todo") ? "todo" : "calendar" }); fb.classList.add("on"); liftAdd(Math.ceil(fb.getBoundingClientRect().height) + 24 + "px"); peopleTick(hass, false); panelPad(Math.ceil(fb.getBoundingClientRect().height) + 24); return true; }
    else { fb.classList.remove("on"); peopleTick(hass, false); }
  }
  panelPad(0);
  return true;
}

/* ---- PHONE Doorbell (his 25-11 "doorbell red and green icons are half covered"): the camera ends above the bar,
 *      so the answer / hang-up buttons (88% down the camera) are never under it. ---- */
const DOORBELL_PATH = "/house-security/doorbell";
let DOOR_CARD = null;
function doorbellFit(active) {
  if (!active) { if (DOOR_CARD) { DOOR_CARD.style.height = ""; DOOR_CARD.style.display = ""; DOOR_CARD = null; } return; }
  if (!DOOR_CARD || !DOOR_CARD.isConnected) { DOOR_CARD = null; const st = [document]; while (st.length && !DOOR_CARD) { const n = st.pop(); DOOR_CARD = n.querySelector && n.querySelector("advanced-camera-card"); (n.querySelectorAll ? n.querySelectorAll("*") : []).forEach((e) => e.shadowRoot && st.push(e.shadowRoot)); } }
  const fb = document.querySelector("oaks-fbar"); if (!DOOR_CARD || !fb) return;
  const h = Math.floor(fb.getBoundingClientRect().top - DOOR_CARD.getBoundingClientRect().top - 10) + "px";
  if (DOOR_CARD.style.height !== h) { DOOR_CARD.style.height = h; DOOR_CARD.style.display = "block"; }
}

/* ---- No flash when switching section (his 25-11 "glitching at the top of the page when i change tab"):
 *      HA builds a new page per dashboard; for ~85 ms its own header showed and the page had no room for the banner.
 *      Prime every new page the moment it exists (every frame for 1.5 s after a navigation). ---- */
let PRIME_H = 0;
function primePage() {
  const nav = document.querySelector("oaks-nav"); if (!nav || !nav._where || !nav._where()) return;
  const h = PRIME_H || Math.ceil(nav.getBoundingClientRect().height); if (!h) return;
  const ha = document.querySelector("home-assistant"); const main = ha && ha.shadowRoot && ha.shadowRoot.querySelector("home-assistant-main");
  const lov = main && main.shadowRoot && main.shadowRoot.querySelector("partial-panel-resolver ha-panel-lovelace");
  const hr = lov && lov.shadowRoot && lov.shadowRoot.querySelector("hui-root"); const sr = hr && hr.shadowRoot; if (!sr) return;
  let st = sr.getElementById("oaks-prime"); if (!st) { st = document.createElement("style"); st.id = "oaks-prime"; sr.appendChild(st); }
  const css = `.header{display:none!important} #view{--view-container-padding-top:${h}px}`;
  if (st.textContent !== css) st.textContent = css;
}
function primeBurst() { const t0 = performance.now(); const f = () => { try { primePage(); } catch (e) {} if (performance.now() - t0 < 1500) requestAnimationFrame(f); }; requestAnimationFrame(f); }

// moved/deleted pages: rewrite the address BEFORE HA looks the page up (a deleted dashboard is otherwise "not found")
function movedTarget(pathname) {
  const seg = pathname.split("/").filter(Boolean); const mk = seg.slice(0, 2).join("/");
  if (MOVED[mk]) return "/" + MOVED[mk];
  if (seg.length === 1 && MOVED[seg[0]]) return "/" + MOVED[seg[0]];
  if (seg[0] === "smart-home" && ALIASES[seg[1]]) return "/" + ALIASES[seg[1]];
  return null;
}
window.addEventListener("location-changed", () => { if (location.search.includes("disable_km")) return; const t = movedTarget(location.pathname); if (t) history.replaceState(null, "", t + location.search + location.hash); }, true);
// start
if (FOLD) {
  let last = 0;
  window.addEventListener("scroll", (e) => {
    const n = document.querySelector("oaks-nav"); if (!n || !n.classList.contains("phone")) return;
    const el = e.target === document ? document.scrollingElement : e.target; const y = el.scrollTop || window.scrollY || 0;
    if (y < 40) n.classList.remove("folded"); else if (y > last + 6) n.classList.add("folded"); else if (y < last - 6) n.classList.remove("folded");
    last = y;
  }, true);
  window.addEventListener("location-changed", () => { last = 0; const n = document.querySelector("oaks-nav"); if (n) n.classList.remove("folded"); });
}
// every page the same width whether it scrolls or not (his 25-11 "the banner moves… they are not the same" — classic Windows scrollbars)
document.documentElement.style.scrollbarGutter = "stable";
if (!document.querySelector("oaks-nav")) {
  const nav = document.createElement("oaks-nav"); document.body.appendChild(nav);
  const t = () => nav.tick();
  window.addEventListener("location-changed", () => { primeBurst(); setTimeout(t, 50); });
  window.addEventListener("popstate", () => setTimeout(t, 50));
  window.addEventListener("resize", t);
  setInterval(t, 1000); t();
  const sbt = () => { try { sbTick(); } catch (e) { console.warn('oaks sidebar', e); } try { railTick(); } catch (e) { console.warn('oaks rail', e); } try { wideTick(); } catch (e) { console.warn('oaks wide', e); } };
  window.addEventListener('location-changed', () => { const m = document.querySelector('oaks-more'); if (m) m.close(); [150, 800, 2000].forEach((t) => setTimeout(hideMenuButtons, t)); });
  setInterval(sbt, 1000); window.addEventListener('location-changed', () => setTimeout(sbt, 60));
  const early = setInterval(() => { const h = document.querySelector('home-assistant'); if (h && h.hass && h.hass.connection) { clearInterval(early); if (!SB.loaded) { SB.loaded = Date.now(); sbLoad(h.hass).then(() => { t(); sbt(); }); } t(); sbt(); } }, 100);
  console.info("oaks-nav v" + ON_VERSION);
}
