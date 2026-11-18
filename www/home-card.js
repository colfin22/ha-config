/* home-card — the Home tab as one card (desktop + phone layouts), built 18-11-2026 from the accepted Home Page mock.
 * Source: ~/homelab/home-mock/card/home-card.js -> /config/www/home-card.js (resource /local/home-card.js?v=N, bump on every edit)
 * Live data only. Controls: House mode (input_select), Guest toggle, heating Boost/Cancel (same input_buttons as heating-boost-card).
 * Storm + Maintenance are display-only, as on the old Home tab (card-mod blocked taps there).
 * Every tile links to its tab. Config: layout: desktop | phone (everything else has defaults below, override any key).
 */
const HC_VERSION = "1";
const HC_DEF = {
  people: [{ e: "person.colm_finn", n: "Colm" }, { e: "person.olivia_finn", n: "Olivia" }, { e: "person.cian_finn", n: "Cian" }, { e: "person.daire_finn", n: "Daire" }],
  rooms: [
    { name: "Kitchen", img: "/api/image/serve/f3d6a395b6d142180c75d66206ea77fb/512x512", path: "/smart-home/kitchen" },
    { name: "Sitting Room", img: "/api/image/serve/71dee4784c3ec84c9d06a85e37eb5515/512x512", path: "/smart-home/sitting-room" },
    { name: "Colm", img: "/api/image/serve/afc9d2275c1e294c23313ddfe2c0235c/512x512", path: "/smart-home/colm-bedroom" },
    { name: "Cian", img: "/api/image/serve/8e775435348fac8aacb27c2b9e2a5755/512x512", path: "/smart-home/cian-bedroom" },
    { name: "Aoife", img: "/api/image/serve/5f84ea7ec0f15b59bcceb8cbb2149b3a/512x512", path: "/smart-home/aoife-bedroom" },
    { name: "Office", img: "/api/image/serve/ae67b6d971687053d31fa9fb19b16966/512x512", path: "/smart-home/office" },
  ],
  weather: "weather.forecast_home",
  mode: "input_select.house_mode", guest: "input_boolean.guest_mode", storm: "input_boolean.storm_mode", maintenance: "input_boolean.maintenance_mode",
  appliances: [
    { e: "input_select.washing_machine_run_status", n: "Washing machine", i: "🧺" },
    { e: "input_select.dishwasher_run_status", n: "Dishwasher", i: "🍽" },
    { e: "input_select.tumble_dryer_run_status", n: "Tumble dryer", i: "🌀" },
  ],
  done_state: "All Done!",
  alarms: [{ e: "alarm_control_panel.house", n: "House" }, { e: "alarm_control_panel.shed", n: "Shed" }],
  doors: [["binary_sensor.front_door_contact", "Front Door"], ["binary_sensor.back_door_contact", "Back Door"], ["binary_sensor.patio_door_contact", "Patio Door"], ["binary_sensor.shed_door_contact", "Shed Door"]],
  windows: [["binary_sensor.sitting_room_window_contact", "Sitting Room"], ["binary_sensor.back_window_contact", "Back"], ["binary_sensor.colm_window_contact", "Colm's Room"], ["binary_sensor.cian_window_contact", "Cian's Room"], ["binary_sensor.aoife_window_contact", "Aoife's Room"], ["binary_sensor.office_window_contact", "Office"]],
  batteries: [["sensor.front_door_battery", "Front Door"], ["sensor.back_door_battery", "Back Door"], ["sensor.patio_door_battery", "Patio Door"], ["sensor.shed_door_battery", "Shed Door"],
    ["sensor.sitting_room_window_battery", "Sitting Room window"], ["sensor.back_window_battery", "Back window"], ["sensor.colm_window_battery", "Colm's Room window"], ["sensor.cian_window_battery", "Cian's Room window"],
    ["sensor.aoife_window_battery", "Aoife's Room window"], ["sensor.office_window_battery", "Office window"], ["sensor.hallway_motion_sensor_battery", "Hallway motion"], ["sensor.landing_motion_sensor_battery", "Landing motion"]],
  low_battery: 30,
  frigate_instance: "frigate",
  cameras: [{ f: "Doorbell", n: "Doorbell", img: "image.cctv_last_alert_doorbell" }, { f: "Front_Van", n: "Front Van", img: "image.cctv_last_alert_front_van" },
    { f: "Front_Car", n: "Front Car", img: "image.cctv_last_alert_front_car" }, { f: "Rear_Door", n: "Rear Door", img: "image.cctv_last_alert_rear_door" }, { f: "Rear_Shed", n: "Rear Shed", img: "image.cctv_last_alert_rear_shed" }],
  climate: "climate.netatmo_smart_thermostat", heating_status: "input_text.heating_status", heating_hours: "sensor.heating_hours_today",
  boost: "input_button.heating_boost_start", cancel: "input_button.heating_boost_cancel", boost_temp: "input_number.heating_boost_temperature",
  temps: [["sensor.kitchen_temperature_temperature", "Kitchen"], ["sensor.hallway_motion_sensor_temperature", "Hallway"], ["sensor.landing_motion_sensor_temperature", "Landing"]],
  photo: "image.immich_pics_for_display",
  bins: "sensor.panda_waste",
  lists: [["todo.travel", "Travel"], ["todo.shopping_list", "Shopping list"], ["todo.tasks", "Tasks"]],
  energy: { solar: "sensor.solarcost_today_solar_generation", solar_fc: "sensor.solcast_pv_forecast_forecast_today", battery: "sensor.solis_battery_soc", house: "sensor.solis_house_load",
    cost: "sensor.solarcost_today_estimated_bill", imp: "sensor.solarcost_today_grid_import", exp: "sensor.solarcost_today_grid_export", rate: "sensor.solarcost_current_import_rate" },
  calendars: [{ e: "calendar.home_assistant_family_planner", k: "fam" }, { e: "calendar.panda_waste", k: "bin" }],
  nav: { security: "/smart-home/security", cctv: "/smart-home/cctv", climate: "/smart-home/climate", energy: "/smart-home/energy", weather: "/smart-home/weather-detail", appliances: "/smart-home/appliances", calendar: "/calendar", todo: "/todo" },
};
const pad2 = (n) => String(n).padStart(2, "0");
const hEsc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hT = (d) => pad2(d.getHours()) + ":" + pad2(d.getMinutes());
const hD = (d) => pad2(d.getDate()) + "-" + pad2(d.getMonth() + 1) + "-" + d.getFullYear();
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WX = { sunny: "☀️", "clear-night": "🌙", partlycloudy: "⛅", cloudy: "☁️", rainy: "🌧", pouring: "🌧", fog: "🌫", windy: "💨", "windy-variant": "💨", snowy: "❄️", "snowy-rainy": "🌨", hail: "🌨", lightning: "🌩", "lightning-rainy": "⛈", exceptional: "⚠️" };
const WXT = { sunny: "Sunny", "clear-night": "Clear", partlycloudy: "Partly cloudy", cloudy: "Cloudy", rainy: "Rain", pouring: "Heavy rain", fog: "Fog", windy: "Windy", "windy-variant": "Windy", snowy: "Snow", "snowy-rainy": "Sleet", hail: "Hail", lightning: "Lightning", "lightning-rainy": "Thunderstorms", exceptional: "Exceptional" };

const HC_CSS = `
:host{--hc-card:var(--ha-card-background,var(--card-background-color,#121826));--hc-deep:var(--secondary-background-color,#0e1420);
 --hc-ink:var(--primary-text-color,#e8eef7);--hc-sec:var(--secondary-text-color,#7d8aa6);--hc-bd:var(--divider-color,#1d2740);
 --hc-cy:#35c9e6;--hc-gr:#3ddc84;--hc-am:#ffc94d;--hc-rd:#ff5a5a;--hc-pu:#a880ff;--hc-or:#ff8100;display:block;color:var(--hc-ink)}
*{box-sizing:border-box}button{font:inherit;color:inherit}
.lt{--hc-am:#b26b00;--hc-gr:#18864b;--hc-pu:#6f42e0;--hc-cy:#0a7fa0;--hc-or:#c25e00;--hc-rd:#d32f2f}
.lt .seg button.on,.lt .mon .d.td{color:#fff}
.head{display:flex;align-items:center;gap:24px;flex-wrap:wrap;margin-bottom:16px}
.hello .t{font-size:30px;font-weight:300}.hello .d{color:var(--hc-sec)}
.wx{display:flex;align-items:center;gap:12px;background:var(--hc-card);border:1px solid var(--hc-bd);border-radius:14px;padding:10px 16px;cursor:pointer}
.wx .i{font-size:30px;line-height:1}.wx .tp{font-size:26px;font-weight:300}.wx .s{color:var(--hc-sec);font-size:12.5px}
.ppl{display:flex;gap:8px;flex-wrap:wrap;margin-left:auto}
.pp{display:flex;align-items:center;gap:8px;background:var(--hc-card);border:1px solid var(--hc-bd);border-radius:999px;padding:4px 12px 4px 4px;cursor:pointer}
.pp img,.pp .av{width:32px;height:32px;border-radius:50%;object-fit:cover;flex:none}.pp .av{display:grid;place-items:center;background:var(--hc-deep)}
.pp.away img{filter:grayscale(1) brightness(.7)}
.pp .n{font-size:13px}.pp .st{font-size:11.5px;color:var(--hc-gr)}.pp.away .st{color:var(--hc-sec)}
.rooms{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:16px;height:clamp(120px,20vh,300px)}
.room{position:relative;border-radius:12px;overflow:hidden;cursor:pointer;border:1px solid var(--hc-bd);background:#000}
.room img{width:100%;height:100%;object-fit:cover;display:block;filter:brightness(.75)}
.room span{position:absolute;left:10px;bottom:8px;font-weight:500;color:#fff;text-shadow:0 1px 4px #000}
.mode{display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:var(--hc-card);border:1px solid var(--hc-bd);border-radius:14px;padding:10px 14px;margin-bottom:16px}
.mode .l{font-size:12px;letter-spacing:.08em;color:var(--hc-sec);font-weight:600;text-transform:uppercase}
.seg{display:flex;gap:4px;background:var(--hc-deep);border-radius:10px;padding:3px}
.seg button{background:none;border:0;padding:7px 16px;border-radius:8px;cursor:pointer}.seg button.on{background:var(--hc-cy);color:#04202a;font-weight:500}
.tg{display:flex;align-items:center;gap:6px;background:var(--hc-deep);border:1px solid var(--hc-bd);border-radius:999px;padding:5px 11px;font-size:12.5px;color:var(--hc-sec)}
.tg.click{cursor:pointer}.tg.on{border-color:var(--hc-am);color:var(--hc-am)}
.runs{margin-left:auto;display:flex;gap:6px;flex-wrap:wrap}
.run{display:flex;align-items:center;gap:6px;background:rgba(53,201,230,.1);border:1px solid rgba(53,201,230,.5);border-radius:999px;padding:5px 12px;font-size:12.5px;cursor:pointer}
.warn{border-radius:12px;padding:10px 14px;margin-bottom:16px;color:#fff;font-weight:500}
.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.tile{background:var(--hc-card);border:1px solid var(--hc-bd);border-radius:14px;padding:14px 16px;cursor:pointer;position:relative;min-width:0}
.tile:hover{border-color:var(--hc-cy)}
.tile .h{display:flex;align-items:center;gap:8px;font-size:12px;letter-spacing:.08em;color:var(--hc-sec);font-weight:600;text-transform:uppercase;margin-bottom:10px}
.tile .h .go{margin-left:auto;color:var(--hc-cy);font-size:12px;letter-spacing:0;text-transform:none;font-weight:400}
.big{font-size:22px;line-height:1.2}.sub{color:var(--hc-sec);font-size:12.5px;margin-top:3px}
.ok{color:var(--hc-gr)}.wa{color:var(--hc-am)}.al{color:var(--hc-rd)}.pu{color:var(--hc-pu)}
.row{display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid var(--hc-bd);font-size:13px}.row:last-child{border-bottom:0}.row .v{white-space:nowrap}
.note{margin-top:8px;font-size:12px;border-radius:8px;padding:6px 9px}
.note.r{background:rgba(255,90,90,.1);border:1px solid rgba(255,90,90,.35);color:var(--hc-rd)}
.note.a{background:rgba(255,201,77,.08);border:1px solid rgba(255,201,77,.35);color:var(--hc-am)}
.sp2{grid-column:span 2}.tall{grid-row:span 2}
.lastal{position:relative;border-radius:10px;overflow:hidden;margin-top:10px;aspect-ratio:16/9;background:#000}.lastal img{width:100%;height:100%;object-fit:cover;display:block}
.lastal .lb{position:absolute;left:8px;bottom:7px;background:rgba(0,0,0,.6);color:#fff;border-radius:6px;padding:3px 8px;font-size:12px}.lastal .lb b{color:var(--hc-am)}
.thumbs{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px}
.th{position:relative;border-radius:8px;overflow:hidden;aspect-ratio:16/9;background:#000}.th img{width:100%;height:100%;object-fit:cover;display:block;filter:brightness(.85)}
.th span{position:absolute;left:4px;bottom:3px;font-size:10.5px;background:rgba(0,0,0,.6);color:#fff;border-radius:4px;padding:1px 5px;white-space:nowrap}
.temp{display:flex;align-items:baseline;gap:8px}.temp .v{font-size:34px;font-weight:300}
.rt{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px}.rt div{background:var(--hc-deep);border-radius:8px;padding:6px 8px}.rt b{display:block;font-weight:400;font-size:15px}.rt span{font-size:11px;color:var(--hc-sec)}
.btn{background:var(--hc-deep);border:1px solid var(--hc-bd);border-radius:9px;padding:7px 12px;font-size:13px;cursor:pointer}.btn.or{border-color:rgba(255,129,0,.6);color:var(--hc-or)}.btn.or.on{background:var(--hc-or);color:#fff}.btn.rd{border-color:rgba(255,90,90,.6);color:var(--hc-rd)}
.photot{padding:0;overflow:hidden;min-height:200px;background:#000}
.photobg{position:absolute;inset:-20px;width:calc(100% + 40px);height:calc(100% + 40px);object-fit:cover;filter:blur(18px) brightness(.45)}.photo{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block}
.kpis{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.kpi{background:var(--hc-deep);border-radius:10px;padding:9px 10px}.kpi .v{font-size:19px}.kpi .v small{font-size:13px}.kpi .k{font-size:11.5px;color:var(--hc-sec)}
.batt{height:6px;border-radius:3px;background:rgba(127,140,170,.25);margin-top:6px;overflow:hidden}.batt i{display:block;height:100%;background:var(--hc-gr)}
.fc{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.fd{background:var(--hc-deep);border-radius:10px;padding:10px;text-align:center}.fd .dn{font-size:12.5px;color:var(--hc-sec)}.fd .ic{font-size:24px;margin:4px 0}.fd .hi{font-size:16px}.fd .lo{color:var(--hc-sec);font-size:13px}.fd .rn{font-size:11.5px;color:#5aa9e6;margin-top:2px}
.calw{display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:start}
.mon{display:grid;grid-template-columns:repeat(7,28px);gap:2px;font-size:12px;text-align:center}.mon .mh{grid-column:span 7;text-align:left;font-size:13px;margin-bottom:4px}.mon .dw{color:var(--hc-sec);font-size:10.5px}
.mon .d{height:26px;line-height:26px;border-radius:6px;position:relative}.mon .d.td{background:var(--hc-cy);color:#04202a;font-weight:600}.mon .d.o{opacity:.55}.mon .d.x{opacity:.3}
.mon .d i{position:absolute;bottom:2px;left:50%;width:4px;height:4px;border-radius:50%;transform:translateX(-50%)}
.ag{display:grid;grid-template-columns:62px 1fr;gap:8px;padding:5px 0;border-bottom:1px solid var(--hc-bd);font-size:13px}.ag:last-child{border-bottom:0}.ag .dt{color:var(--hc-sec);font-size:12px}.ag .dt b{display:block;color:var(--hc-ink);font-weight:500;font-size:13px}.ag .tm{color:var(--hc-sec);font-size:12px}.ag .k{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:6px}
.empty{color:var(--hc-sec);font-size:13px}
/* phone */
.ph .head{gap:12px}.ph .hello .t{font-size:24px}
.ph .ppl{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;width:100%;margin-left:0}
.ph .pp{flex-direction:column;gap:3px;padding:6px 2px;border-radius:12px;text-align:center}.ph .pp img,.ph .pp .av{width:38px;height:38px}.ph .pp .n{font-size:12.5px}
.ph .pp .st{font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:80px}
.ph .rooms{grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;height:auto}.ph .room{aspect-ratio:3/2}.ph .room span{font-size:12.5px;left:8px;bottom:5px}
.ph .runs{margin-left:0}
.ph .grid{grid-template-columns:1fr 1fr;gap:10px}.ph .tile{grid-column:span 2;grid-row:auto}
.ph .photot{display:none}
.ph .heatt{display:grid;grid-template-columns:1fr 1fr;column-gap:14px;grid-template-areas:"h h" "t r" "s r" "b r"}
.ph .heatt>.h{grid-area:h}.ph .heatt>.temp{grid-area:t}.ph .heatt>.sub{grid-area:s}.ph .heatt>.rt{grid-area:r;grid-template-columns:1fr;margin-top:0;align-self:start}
.ph .heatt>.rt div{display:flex;justify-content:space-between;align-items:baseline}.ph .heatt>.rt b{display:inline}.ph .heatt>.bb{grid-area:b}
.ph .fc{gap:4px}.ph .fd{padding:6px 2px}
.ph .calw{grid-template-columns:1fr}.ph .mon{display:none}
`;

class HomeCard extends HTMLElement {
  setConfig(c) {
    this._c = Object.assign({}, HC_DEF, c || {}, { energy: Object.assign({}, HC_DEF.energy, (c && c.energy) || {}), nav: Object.assign({}, HC_DEF.nav, (c && c.nav) || {}) });
    this._c.layout = (c && c.layout) || "desktop";
    this._rev = null; this._fc = null; this._cal = null; this._lbTrig = null;
    if (this._root) this._build();
  }
  getCardSize() { return 14; }
  getGridOptions() { return { columns: "full" }; }
  set hass(h) {
    const first = !this._hass; this._hass = h;
    if (!this._root) { this._root = this.attachShadow({ mode: "open" }); this._build(); }
    if (first) this._loadAll();
    const c = this._c, ids = [c.weather, c.mode, c.guest, c.storm, c.maintenance, c.climate, c.heating_status, c.heating_hours, c.photo, c.bins,
      ...c.people.map((p) => p.e), ...c.appliances.map((a) => a.e), ...c.alarms.map((a) => a.e), ...c.doors.map((d) => d[0]), ...c.windows.map((d) => d[0]),
      ...c.batteries.map((b) => b[0]), ...c.cameras.map((x) => x.img), ...c.temps.map((t) => t[0]), ...c.lists.map((l) => l[0]), ...Object.values(c.energy)];
    const sig = ids.map((e) => { const s = h.states[e]; return s ? s.state + (e.startsWith("image.") ? s.attributes.access_token : "") + (e.startsWith("weather.") ? s.attributes.temperature : "") : "-"; }).join("|");
    const alSig = c.alarms.map((a) => (h.states[a.e] || {}).state).join("|") + "|" + c.cameras.map((x) => (h.states[x.img] || {}).state).join("|");
    if (alSig !== this._alSig) { this._alSig = alSig; this._loadLater(); }
    if (sig !== this._sig) { this._sig = sig; this._render(); }
  }
  connectedCallback() {
    this._tick = setInterval(() => this._render(true), 30000);
    this._slow = setInterval(() => this._loadAll(), 10 * 60000);
    if (this._hass && !this._fcUnsub) this._subForecast();
  }
  disconnectedCallback() { clearInterval(this._tick); clearInterval(this._slow); if (this._fcUnsub) { this._fcUnsub.then((u) => u && u()).catch(() => {}); this._fcUnsub = null; } }

  /* ---------- data that isn't in hass.states ---------- */
  _loadLater() { clearTimeout(this._lt); this._lt = setTimeout(() => { this._loadReviews(); this._loadTrig(); }, 1500); }
  _loadAll() { this._loadReviews(); this._loadTrig(); this._loadCal(); if (!this._fcUnsub) this._subForecast(); }
  async _loadReviews() {
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    try {
      let r = await this._hass.callWS({ type: "frigate/reviews/get", instance_id: this._c.frigate_instance, after: Math.floor(d0.getTime() / 1000) - 7 * 86400, limit: 2000 });
      if (typeof r === "string") r = JSON.parse(r);
      this._rev = (Array.isArray(r) ? r : []).filter((x) => x.severity === "alert").map((x) => ({ cam: x.camera, t: x.start_time * 1000, obj: (x.data && x.data.objects) || [] })).sort((a, b) => b.t - a.t);
    } catch (e) { this._rev = []; }
    this._render();
  }
  async _loadTrig() { // alarm triggers today (for the red note on Security)
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    try {
      const lb = await this._hass.callApi("GET", "logbook/" + d0.toISOString() + "?entity=" + this._c.alarms.map((a) => a.e).join(","));
      this._lbTrig = (lb || []).filter((r) => r.state === "triggered").map((r) => ({ e: r.entity_id, t: new Date(r.when).getTime() }));
    } catch (e) { this._lbTrig = []; }
    this._render();
  }
  async _loadCal() {
    const now = new Date(), s = new Date(now.getFullYear(), now.getMonth() - 1, 20), e = new Date(now.getFullYear(), now.getMonth() + 3, 1);
    const out = [];
    await Promise.all(this._c.calendars.map(async (cal) => {
      try {
        const ev = await this._hass.callApi("GET", `calendars/${cal.e}?start=${encodeURIComponent(s.toISOString())}&end=${encodeURIComponent(e.toISOString())}`);
        (ev || []).forEach((x) => { const allday = !!(x.start && x.start.date); const st = allday ? new Date(x.start.date + "T00:00:00") : new Date(x.start.dateTime);
          out.push({ k: cal.k, t: x.summary || "", s: st, allday }); });
      } catch (err) { /* one calendar failing must not hide the other */ }
    }));
    this._cal = out.sort((a, b) => a.s - b.s);
    this._render();
  }
  _subForecast() {
    try {
      this._fcUnsub = this._hass.connection.subscribeMessage((m) => { this._fc = (m && m.forecast) || []; this._render(); },
        { type: "weather/subscribe_forecast", entity_id: this._c.weather, forecast_type: "daily" });
      this._fcUnsub.catch(() => { this._fcUnsub = null; });
    } catch (e) { this._fcUnsub = null; }
  }

  /* ---------- helpers ---------- */
  _s(e) { return this._hass.states[e]; }
  _n(e, dp) { const s = this._s(e); const v = s ? parseFloat(s.state) : NaN; return isNaN(v) ? null : dp === undefined ? v : Number(v.toFixed(dp)); }
  _url(u) { return u ? this._hass.hassUrl(u) : ""; }
  _go(path) { if (!path) return; history.pushState(null, "", path); window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } })); }
  _more(e) { this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: e }, bubbles: true, composed: true })); }

  _build() {
    const ph = this._c.layout === "phone";
    this._root.innerHTML = `<style>${HC_CSS}</style><div class="${ph ? "ph" : "dk"}" id="w"></div>`;
    this._root.addEventListener("click", (ev) => {
      const t = ev.composedPath().find((n) => n.dataset && (n.dataset.go || n.dataset.act || n.dataset.more)); if (!t) return;
      const d = t.dataset, h = this._hass, c = this._c;
      if (d.act === "mode") return h.callService("input_select", "select_option", { entity_id: c.mode, option: d.v });
      if (d.act === "guest") return h.callService("input_boolean", "toggle", { entity_id: c.guest });
      if (d.act === "boost") return h.callService("input_button", "press", { entity_id: c.boost });
      if (d.act === "cancel") return h.callService("input_button", "press", { entity_id: c.cancel });
      if (d.more) return this._more(d.more);
      if (d.go) return this._go(d.go);
    });
    this._sig = ""; if (this._hass) this._render();
  }

  _render(timeOnly) {
    if (!this._hass || !this._root) return;
    const w = this._root.getElementById("w"); if (!w) return;
    { const ink = getComputedStyle(this).getPropertyValue("--primary-text-color").trim(), m = ink.match(/^#?([0-9a-f]{6})$/i);
      const lum = m ? (parseInt(m[1].slice(0, 2), 16) * .299 + parseInt(m[1].slice(2, 4), 16) * .587 + parseInt(m[1].slice(4, 6), 16) * .114) : 255;
      w.classList.toggle("lt", lum < 128); } // dark ink = light theme -> darker accents for contrast
    const c = this._c, ph = c.layout === "phone", now = new Date(), N = c.nav;
    // ---- header ----
    const hr = now.getHours(), greet = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
    const wx = this._s(c.weather), fc0 = this._fc && this._fc[0];
    const wxH = wx ? `<div class="wx" data-go="${N.weather}"><span class="i">${WX[wx.state] || "☁️"}</span><div><div class="tp">${wx.attributes.temperature != null ? Number(wx.attributes.temperature).toFixed(1) + "°C" : "–"}</div><div class="s">${WXT[wx.state] || wx.state}${fc0 ? ` · ${Math.round(fc0.temperature)}° / ${Math.round(fc0.templow)}°` : ""}</div></div></div>` : "";
    const ppl = c.people.map((p) => { const s = this._s(p.e); if (!s) return ""; const home = s.state === "home";
      const st = home ? "Home" : s.state === "not_home" ? "Away" : s.state === "unknown" ? "Unknown" : String(s.state).trim(); const pic = s.attributes.entity_picture;
      return `<div class="pp ${home ? "" : "away"}" data-more="${p.e}">${pic ? `<img src="${hEsc(this._url(pic))}">` : `<span class="av">${hEsc(p.n[0])}</span>`}<div><div class="n">${hEsc(p.n)}</div><div class="st">${hEsc(st)}</div></div></div>`; }).join("");
    const head = `<div class="head"><div class="hello"><div class="t">${greet}</div><div class="d">${DAYS[now.getDay()]} ${hD(now)} · ${hT(now)}</div></div>${wxH}<div class="ppl">${ppl}</div></div>`;
    if (timeOnly && this._headHtml !== undefined) { const hd = w.querySelector(".head"); if (hd) hd.outerHTML = head; this._headHtml = head; return; }
    this._headHtml = head;
    // ---- rooms ----
    const rooms = `<div class="rooms">${c.rooms.map((r) => `<div class="room" data-go="${hEsc(r.path)}"><img src="${hEsc(this._url(r.img))}" loading="lazy"><span>${hEsc(r.name)}</span></div>`).join("")}</div>`;
    // ---- house mode ----
    const mode = this._s(c.mode), mopts = mode ? mode.attributes.options : [];
    const on = (e) => { const s = this._s(e); return s && s.state === "on"; };
    const runs = c.appliances.map((a) => { const s = this._s(a.e); if (!s || s.state === c.done_state || s.state === "unknown" || s.state === "unavailable") return "";
      return `<span class="run" data-go="${N.appliances}">${a.i} ${hEsc(a.n)} running · since ${hT(new Date(s.last_changed))} <span style="color:var(--hc-cy)">›</span></span>`; }).join("");
    const modeBar = `<div class="mode"><span class="l">House mode</span><div class="seg">${mopts.map((m) => `<button data-act="mode" data-v="${hEsc(m)}" class="${mode.state === m ? "on" : ""}">${hEsc(m)}</button>`).join("")}</div>
      <span class="tg click ${on(c.guest) ? "on" : ""}" data-act="guest">👥 Guest</span><span class="tg ${on(c.storm) ? "on" : ""}">⛈ Storm</span><span class="tg ${on(c.maintenance) ? "on" : ""}">🔧 Maintenance</span>
      ${runs ? `<div class="runs">${runs}</div>` : ""}</div>`;
    // ---- security ----
    const opn = [...c.doors, ...c.windows].filter(([e]) => on(e)), nAll = c.doors.length + c.windows.length;
    const al = c.alarms.map((a) => ({ n: a.n, s: (this._s(a.e) || {}).state || "unavailable", e: a.e }));
    const trig = al.some((a) => a.s === "triggered");
    const ST = { disarmed: "Disarmed", armed_away: "Armed away", armed_night: "Armed night", armed_home: "Armed home", arming: "Arming…", pending: "Entry delay…", triggered: "TRIGGERED" };
    const low = c.batteries.map(([e, n]) => [n, this._n(e)]).filter(([, v]) => v !== null && v <= c.low_battery);
    const isWin = (e) => c.windows.some((x) => x[0] === e);
    const openNames = opn.map(([e, n]) => isWin(e) ? n + " window" : n);
    const secBig = trig ? `<div class="big al">Alarm triggered</div>` : !opn.length ? `<div class="big ok">All secure</div>` : `<div class="big wa">${opn.length === 1 ? hEsc(openNames[0]) + " is open" : opn.length + " doors and windows open"}</div>`;
    const secSub = !opn.length ? `All ${nAll} doors and windows closed` : opn.length === 1 ? "Everything else is closed" : opn.length <= 3 ? hEsc(openNames.join(", ")) : "";
    const trigT = (this._lbTrig || []).map((x) => `<div class="note r">${hEsc((c.alarms.find((a) => a.e === x.e) || {}).n || x.e)} alarm triggered today ${hT(new Date(x.t))}</div>`).join("");
    const sec = `<div class="tile" data-go="${N.security}"><div class="h">🛡 Security <span class="go">Security ›</span></div>${secBig}<div class="sub">${secSub}</div>
      ${al.map((a, i) => `<div class="row" ${i ? "" : 'style="margin-top:8px"'}><span>${hEsc(a.n)}</span><span class="v ${a.s.startsWith("armed") ? "pu" : a.s === "triggered" ? "al" : ""}">${ST[a.s] || a.s}</span></div>`).join("")}
      ${trigT}${low.map(([n, v]) => `<div class="note a">🔋 ${hEsc(n)} sensor ${v} %</div>`).join("")}</div>`;
    // ---- cctv ----
    let cctv;
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    if (this._rev === null) cctv = `<div class="tile tall cctvt" data-go="${N.cctv}"><div class="h">📹 CCTV <span class="go">CCTV ›</span></div><div class="empty">Loading…</div></div>`;
    else {
      const today = this._rev.filter((r) => r.t >= d0.getTime());
      const cnt = {}; today.forEach((r) => (cnt[r.cam] = (cnt[r.cam] || 0) + 1));
      const last = c.cameras.map((x) => ({ ...x, r: this._rev.find((r) => r.cam === x.f) })).filter((x) => x.r).sort((a, b) => b.r.t - a.r.t);
      const objs = {}; today.forEach((r) => r.obj.forEach((o) => (objs[o] = (objs[o] || 0) + 1)));
      const top = Object.entries(objs).sort((a, b) => b[1] - a[1])[0];
      const when = (t) => (t >= d0.getTime() ? "" : DN[new Date(t).getDay()] + " ") + hT(new Date(t));
      const img = (x) => { const s = this._s(x.img); return s && s.attributes.entity_picture ? this._url(s.attributes.entity_picture) : ""; };
      const L = last[0];
      cctv = `<div class="tile tall cctvt" data-go="${N.cctv}"><div class="h">📹 CCTV <span class="go">CCTV ›</span></div>
        <div class="big">${today.length} alert${today.length === 1 ? "" : "s"} today</div>
        <div class="sub">${today.length ? (top ? "Mostly " + (top[0] === "person" ? "people" : top[0] + "s") + " · " : "") + "last one " + hT(new Date(today[0].t)) + " at the " + hEsc((c.cameras.find((x) => x.f === today[0].cam) || {}).n || today[0].cam) : L ? "Last alert " + when(L.r.t) + " · " + hEsc(L.n) : "No alerts this week"}</div>
        ${L ? `<div class="lastal">${img(L) ? `<img src="${hEsc(img(L))}">` : ""}<span class="lb"><b>●</b> ${hEsc(L.n)} · ${when(L.r.t)}${cnt[L.f] ? " · " + cnt[L.f] + " today" : ""}</span></div>
        <div class="thumbs">${last.slice(1).map((x) => `<div class="th">${img(x) ? `<img src="${hEsc(img(x))}" loading="lazy">` : ""}<span>${hEsc(x.n)} ${when(x.r.t)}</span></div>`).join("")}</div>` : ""}</div>`;
    }
    // ---- heating ----
    const cl = this._s(c.climate), cur = cl && cl.attributes.current_temperature, tgt = cl && cl.attributes.temperature, act = cl && cl.attributes.hvac_action;
    const hs = this._s(c.heating_status), boosting = !!hs && /^Boost/i.test(hs.state), hh = this._n(c.heating_hours), bt = this._n(c.boost_temp);
    const heat = `<div class="tile heatt" data-go="${N.climate}"><div class="h">🌡 Heating <span class="go">Climate ›</span></div>
      <div class="temp"><span class="v">${cur != null ? Number(cur).toFixed(1) + "°" : "–"}</span><span class="sub">inside</span></div>
      <div class="sub">${boosting ? `<span style="color:var(--hc-or)">${hEsc(hs.state)}</span>` : `Target ${tgt != null ? Number(tgt).toFixed(1) + "°" : "–"} · ${act ? act[0].toUpperCase() + act.slice(1) : ""}`}${hh !== null ? ` · on for ${hh.toFixed(1)} h today` : ""}</div>
      <div class="rt">${c.temps.map(([e, n]) => { const v = this._n(e); return `<div><b>${v !== null ? v.toFixed(1) + "°" : "–"}</b><span>${hEsc(n)}</span></div>`; }).join("")}</div>
      <div class="bb" style="display:flex;gap:8px;margin-top:12px"><button class="btn or ${boosting ? "on" : ""}" data-act="boost">🔥 Boost 2 h${bt !== null && !ph ? " · " + bt.toFixed(1) + "°" : ""}</button>${boosting ? `<button class="btn rd" data-act="cancel">Cancel</button>` : ""}</div></div>`;
    // ---- photo ----
    const pe = this._s(c.photo), pu = pe && pe.attributes.entity_picture ? hEsc(this._url(pe.attributes.entity_picture)) : "";
    const photo = ph ? "" : `<div class="tile photot tall" data-more="${c.photo}">${pu ? `<img class="photobg" src="${pu}"><img class="photo" src="${pu}">` : ""}</div>`;
    // ---- bins & lists ----
    const bs = this._s(c.bins); let binsH = `<div class="empty">No bin dates</div>`;
    if (bs) { const dates = Object.keys(bs.attributes).filter((k) => /^\d{4}-\d\d-\d\d$/.test(k)).sort(); const t0 = new Date(); t0.setHours(0, 0, 0, 0);
      const fut = dates.filter((k) => new Date(k + "T00:00:00") >= t0);
      if (fut.length) { const dt = new Date(fut[0] + "T00:00:00"), days = Math.round((dt - t0) / 86400000);
        binsH = `<div class="big">${days === 0 ? "Today" : days === 1 ? "Tomorrow" : DAYS[dt.getDay()]}</div><div class="sub">${hEsc(bs.attributes[fut[0]])}${days > 1 ? " · in " + days + " days" : ""}</div>${fut[1] ? `<div class="sub">Then ${hD(new Date(fut[1] + "T00:00:00"))}</div>` : ""}`; } }
    const bins = `<div class="tile" data-go="${N.todo}"><div class="h">🗑 Bins &amp; lists <span class="go">Lists ›</span></div>${binsH}
      ${c.lists.map(([e, n], i) => `<div class="row" ${i ? "" : 'style="margin-top:8px"'}><span>${hEsc(n)}</span><span class="v">${this._s(e) ? hEsc(this._s(e).state) : "–"}</span></div>`).join("")}</div>`;
    // ---- energy ----
    const E = c.energy, f1 = (e) => { const v = this._n(e); return v === null ? "–" : v.toFixed(1); };
    const soc = this._n(E.battery), house = this._n(E.house), cost = this._n(E.cost), rate = this._n(E.rate), fcs = this._n(E.solar_fc);
    const energy = `<div class="tile" data-go="${N.energy}"><div class="h">⚡ Energy today <span class="go">Energy ›</span></div><div class="kpis">
      <div class="kpi"><div class="v">${f1(E.solar)} <small>kWh</small></div><div class="k">Solar${fcs !== null ? " (forecast " + fcs.toFixed(1) + ")" : ""}</div></div>
      <div class="kpi"><div class="v">${soc !== null ? Math.round(soc) + " %" : "–"}</div><div class="k">Battery</div><div class="batt"><i style="width:${soc || 0}%"></i></div></div>
      <div class="kpi"><div class="v">${house !== null ? Math.round(house) : "–"} <small>W</small></div><div class="k">House now</div></div>
      <div class="kpi"><div class="v">${cost !== null ? "€" + cost.toFixed(2) : "–"}</div><div class="k">Cost so far today</div></div></div>
      <div class="sub" style="margin-top:9px">Grid import ${f1(E.imp)} kWh · export ${f1(E.exp)} kWh${rate !== null ? " · rate now " + (rate * 100).toFixed(1) + " c/kWh" : ""}</div></div>`;
    // ---- forecast ----
    const sun = this._s("sun.sun");
    const fcH = this._fc === null ? `<div class="empty">Loading…</div>` : `<div class="fc">${this._fc.slice(0, 5).map((f) => { const d = new Date(f.datetime);
      return `<div class="fd"><div class="dn">${DN[d.getDay()]}${ph ? "<br>" : " "}${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}</div><div class="ic">${WX[f.condition] || "☁️"}</div><div class="hi">${Math.round(f.temperature)}°</div><div class="lo">${f.templow != null ? Math.round(f.templow) + "°" : ""}</div><div class="rn">${f.precipitation ? f.precipitation + " mm" : "&nbsp;"}</div></div>`; }).join("")}</div>`;
    const forecast = `<div class="tile sp2" data-go="${N.weather}"><div class="h">🌤 Forecast <span class="go">Weather ›</span></div>${fcH}
      ${sun ? `<div class="sub" style="margin-top:8px">Sunrise ${hT(new Date(sun.attributes.next_rising))} · Sunset ${hT(new Date(sun.attributes.next_setting))}</div>` : ""}</div>`;
    // ---- calendar ----
    let calH = `<div class="empty">Loading…</div>`;
    if (this._cal !== null) {
      const COL = { fam: "var(--hc-pu)", bin: "var(--hc-gr)" }, key = (d) => d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
      const byDay = {}; this._cal.forEach((e) => { (byDay[key(e.s)] = byDay[key(e.s)] || []).push(e); });
      const y = now.getFullYear(), m = now.getMonth(), off = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
      const cell = (d, cls) => { const ev = byDay[key(d)]; return `<div class="d ${cls}">${d.getDate()}${ev ? `<i style="background:${COL[ev[0].k]}"></i>` : ""}</div>`; };
      let mon = `<div class="mh">${MONTHS[m]} ${y}</div>` + ["M", "T", "W", "T", "F", "S", "S"].map((x) => `<div class="dw">${x}</div>`).join("");
      for (let i = off; i > 0; i--) mon += cell(new Date(y, m, 1 - i), "x");
      for (let d = 1; d <= days; d++) mon += cell(new Date(y, m, d), d === now.getDate() ? "td" : d < now.getDate() ? "o" : "");
      const tail = (7 - ((off + days) % 7)) % 7; for (let d = 1; d <= tail; d++) mon += cell(new Date(y, m + 1, d), "x");
      const t0 = new Date(); t0.setHours(0, 0, 0, 0); const rows = [];
      Object.keys(byDay).sort().forEach((k) => { const dt = new Date(k + "T00:00:00"); if (dt < t0) return;
        const ev = byDay[k], binsE = ev.filter((e) => e.k === "bin"), fam = ev.filter((e) => e.k !== "bin");
        const lab = `<b>${DN[dt.getDay()]}</b>${pad2(dt.getDate())}-${pad2(dt.getMonth() + 1)}`;
        if (binsE.length) rows.push(`<div class="ag"><div class="dt">${lab}</div><div><span class="k" style="background:var(--hc-gr)"></span>Bins: ${hEsc(binsE.map((b) => b.t).join(", "))}</div></div>`);
        fam.forEach((f) => rows.push(`<div class="ag"><div class="dt">${lab}</div><div><span class="k" style="background:var(--hc-pu)"></span>${hEsc(f.t)}${f.allday ? "" : ` <span class="tm">${hT(f.s)}</span>`}</div></div>`)); });
      calH = `<div class="calw"><div class="mon">${mon}</div><div>${rows.slice(0, 6).join("") || '<div class="empty">Nothing coming up</div>'}</div></div>`;
    }
    const calendar = `<div class="tile sp2" data-go="${N.calendar}"><div class="h">📅 Calendar <span class="go">Calendar ›</span></div>${calH}</div>`;
    // ---- layout ----
    const grid = ph ? sec + cctv + heat + bins + energy + forecast + calendar
      : sec + cctv + heat + photo + bins + energy + forecast + calendar;
    w.innerHTML = head + rooms + modeBar + `<div class="grid">${grid}</div>`;
  }
}
customElements.define("home-card", HomeCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "home-card", name: "Home Card", description: "Home tab: people, rooms, house mode, security, CCTV, heating, bins, energy, forecast, calendar" });
console.info("%c HOME-CARD %c v" + HC_VERSION + " ", "background:#35c9e6;color:#04202a", "background:#121826;color:#fff");
