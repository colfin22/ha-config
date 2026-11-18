/* climate-card — the Climate tab as one card (desktop + phone), built 18-11-2026 from the accepted Climate mock.
 * Source ~/homelab/climate-mock/card/climate-card.src.js -> gen.py bakes the house plan -> /config/www/climate-card.js (resource ?v=N, bump on edit)
 * Controls = the same as the old tab: boost slider (input_number.set_value on release), Boost 2 h / Cancel (input_buttons), Away 24h+ toggle.
 * The heating status line is shown VERBATIM (his vocabulary). Today's plan uses his Node-RED Household-page settings, copied into
 * the config (schedule: …) — the card can't read Node-RED, so if he changes them there, update the config too.
 */
const CL_VERSION = "7";
const CL_PLAN = `<svg viewBox="0 0 760 560" class="plan"><text class="fl" x="30" y="22">GROUND</text><text class="fl" x="330" y="22">FIRST</text><text class="fl" x="630" y="22">YARD</text><polygon class="room mot" data-m="binary_sensor.sitting_room_presence_occupancy" points="30.0,72.0 84.4,72.0 84.4,41.4 176.2,41.4 176.2,72.0 206.8,72.0 206.8,196.1 159.2,243.7 30.0,243.7"/>
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
const CLD = {
  climate: "climate.netatmo_smart_thermostat", inside: "sensor.home_temperature", status: "input_text.heating_status", by: "input_text.heating_status_by",
  slider: "input_number.heating_boost_temperature", boost: "input_button.heating_boost_start", cancel: "input_button.heating_boost_cancel",
  away: "input_boolean.heating_extended_away", hours: "sensor.heating_hours_today", mode: "input_select.house_mode", weather: "weather.forecast_home",
  rooms: { Kitchen: "sensor.kitchen_temperature_temperature", Hallway: "climate.netatmo_smart_thermostat", Landing: "sensor.landing_motion_sensor_temperature" }, // Hallway = the thermostat (it is in the hallway, his 18-11)
  tiles: [["sensor.attic_temperature_temperature", "Attic", "sensor.attic_temperature_humidity"], ["sensor.kitchen_temperature_humidity", "Kitchen humidity"], ["sensor.home_temperature", "Thermostat", null, "the temperature the heating follows"]],
  schedule: { wake_weekday: "06:30", wake_weekend: "07:30", wake_summer: "07:00", summer_from_month: 6, summer_to_month: 8, hot_start: "19:00", hot_end: "22:00",
    boost_hours: 2, lead_freezing: 60, forecast_time: "21:30", prox_on_km: 10, frost_after_hours: 24, eco: 19, night: 19, comfort: 19.5, hot: 20, frost: 12 },
};
const c2 = (n) => String(n).padStart(2, "0"), cHM = (d) => c2(d.getHours()) + ":" + c2(d.getMinutes()), cDM = (d) => c2(d.getDate()) + "-" + c2(d.getMonth() + 1);
const cDN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], cWD = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const cEsc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const CL_CSS = `
:host{--k-card:var(--ha-card-background,var(--card-background-color,#121826));--k-deep:var(--secondary-background-color,#0e1420);--k-ink:var(--primary-text-color,#e8eef7);
 --k-sec:var(--secondary-text-color,#7d8aa6);--k-bd:var(--divider-color,#1d2740);--cy:#35c9e6;--gr:#3ddc84;--am:#ffc94d;--rd:#ff5a5a;--or:#ff8100;--cur:#ff6b6b;--tgt:#4c9be8;display:block;color:var(--k-ink)}
.lt{--gr:#18864b;--am:#b26b00;--or:#d26a00;--cur:#d64545;--tgt:#2f7fd0;--cy:#0a7fa0}
*{box-sizing:border-box}button{font:inherit;color:inherit}
.grid{display:grid;grid-template-columns:minmax(0,.95fr) minmax(0,1.6fr);gap:14px}.ph .grid{grid-template-columns:1fr;gap:10px}
.card{background:var(--k-card);border:1px solid var(--k-bd);border-radius:16px;padding:16px 18px;min-width:0}.span2{grid-column:1/-1}
h3{margin:0 0 12px;font-size:12px;letter-spacing:.08em;color:var(--k-sec);font-weight:600;text-transform:uppercase;display:flex;align-items:center;gap:8px}
h3 .r{margin-left:auto;text-transform:none;letter-spacing:0;font-weight:400}
.now{display:flex;gap:18px;align-items:center}.ph .now{gap:12px}
.dial{position:relative;width:170px;height:170px;flex:none}.ph .dial{width:140px;height:140px}.dial svg{width:100%;height:100%}
.dial .c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.dial .t{font-size:44px;font-weight:300;line-height:1}.ph .dial .t{font-size:36px}.dial .s{color:var(--k-sec);font-size:12.5px;margin-top:4px}
.st{font-size:16px}.st b{font-weight:500}.st.one{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:8px}
.ph .lg{gap:10px;font-size:11.5px;flex-wrap:nowrap}.ph .lg i{width:12px}
.chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.chip{display:flex;align-items:center;gap:6px;background:var(--k-deep);border:1px solid var(--k-bd);border-radius:999px;padding:4px 11px;font-size:12.5px;color:var(--k-sec)}
.chip b{color:var(--k-ink);font-weight:500}.chip.on{border-color:var(--or);color:var(--or)}
.boost{margin-top:14px;background:var(--k-deep);border:1px solid var(--k-bd);border-radius:12px;padding:12px}
.boost .l{font-size:12px;color:var(--k-sec);margin-bottom:6px;display:flex;justify-content:space-between}
.boost input{width:100%;accent-color:#ff8100}
.btns{display:flex;gap:8px;margin-top:10px}
.btn{flex:1;background:var(--k-card);border:1px solid var(--k-bd);border-radius:10px;padding:9px 12px;font-size:13.5px;cursor:pointer}
.btn.or{background:#ff8100;border-color:#ff8100;color:#fff}.btn.or.on{box-shadow:0 0 0 3px rgba(255,129,0,.35)}.btn.cx.on{border-color:var(--rd);color:var(--rd)}.btn.cx{color:var(--k-sec)}
.away{display:flex;align-items:center;gap:10px;margin-top:12px;font-size:13px}
.tgl{width:44px;height:26px;border-radius:999px;background:rgba(127,140,170,.35);position:relative;flex:none;cursor:pointer}.tgl:after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:left .15s}
.tgl.on{background:var(--state-climate-heat-color, #ff8100)}.tgl.on:after{left:21px}.away .s{color:var(--k-sec);font-size:12px}
svg.ch{width:100%;height:auto;display:block}.sc{overflow-x:auto;scrollbar-width:thin}.ph .sc svg.ch{width:720px;max-width:none}
.lg{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--k-sec);margin-top:6px}.lg span{display:flex;align-items:center;gap:6px}.lg i{display:inline-block;width:16px;height:4px;border-radius:2px}
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}.ph .kpis{grid-template-columns:1fr 1fr}
.kpi{background:var(--k-deep);border-radius:12px;padding:10px 12px;border-left:3px solid var(--c,#33415f)}
.kpi .v{font-size:20px}.kpi .v small{font-size:12px;color:var(--k-sec)}.kpi .k{font-size:12px;color:var(--k-sec)}.kpi .s{font-size:11.5px;color:var(--k-sec);margin-top:2px}
.strip{display:flex;height:34px;border-radius:9px;overflow:hidden;position:relative}
.strip div{display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;white-space:nowrap;overflow:hidden;border-right:1px solid rgba(0,0,0,.25);text-shadow:0 1px 3px rgba(0,0,0,.85)}
.strip .nw{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--k-ink);border:0}
.ticks{position:relative;height:16px;font-size:10.5px;color:var(--k-sec);margin-top:3px}.ticks span{position:absolute;transform:translateX(-50%);white-space:nowrap}.ticks span:first-child{transform:none}
.rules{margin-top:10px;display:grid;gap:5px;font-size:12.5px;color:var(--k-sec)}.rules b{color:var(--k-ink);font-weight:500}
.rooms{display:grid;grid-template-columns:minmax(0,1fr) 200px;gap:14px;align-items:start}.ph .rooms{grid-template-columns:1fr}
.plan{width:100%;height:auto;display:block}
.plan .room{fill:var(--k-deep)}.plan .we{stroke:var(--k-sec);stroke-opacity:.55;stroke-width:6;stroke-linecap:square}.plan .wi{stroke:var(--k-sec);stroke-opacity:.35;stroke-width:2.5}
.plan .rl{fill:var(--k-sec);font-size:11px;text-anchor:middle;pointer-events:none}.plan .rl.sm{font-size:8.5px}.plan .fl{fill:var(--k-sec);font-size:11px;letter-spacing:.12em;font-weight:600}
.plan .sn,.plan .shedwall{display:none}
.plan .tp{font-size:17px;font-weight:500;text-anchor:middle;cursor:pointer}
.plan .room.warm{fill:rgba(255,129,0,.18)}.plan .room.cool{fill:rgba(76,155,232,.18)}
.side{display:flex;flex-direction:column;gap:8px}
.it{background:var(--k-deep);border:1px solid var(--k-bd);border-radius:12px;padding:10px 12px;cursor:pointer}.it:hover{border-color:var(--cy)}
.it .n{font-size:12px;color:var(--k-sec)}.it .v{font-size:20px}.it .v small{font-size:12.5px;color:var(--k-sec)}.it .s{font-size:11.5px;color:var(--k-sec)}
.key{display:flex;gap:12px;font-size:11.5px;color:var(--k-sec);margin-top:6px;flex-wrap:wrap}.key i{display:inline-block;width:12px;height:8px;border-radius:2px;margin-right:5px;vertical-align:middle}
.act{display:grid;grid-template-columns:10px 1fr auto;gap:10px;padding:8px 0;border-bottom:1px solid var(--k-bd);font-size:13.5px;align-items:start}.act:last-child{border-bottom:0}
.act .d{width:9px;height:9px;border-radius:50%;margin-top:6px}.act .t{color:var(--k-sec);font-size:12px;white-space:nowrap;text-align:right}
.act .by{display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--k-sec);margin-top:2px}
.act .bot{width:16px;height:16px;border-radius:50%;background:rgba(53,201,230,.15);display:inline-grid;place-items:center;font-size:9px;color:var(--cy);font-weight:600;overflow:hidden}.act .bot img{width:16px;height:16px;object-fit:cover}
.empty{color:var(--k-sec);font-size:13px;padding:10px 0}
`;
const CL_POP_CSS = `
:host{--k-card:var(--ha-card-background,var(--card-background-color,#121826));--k-ink:var(--primary-text-color,#e8eef7);--k-sec:var(--secondary-text-color,#7d8aa6);--k-bd:var(--divider-color,#1d2740);font-family:var(--ha-font-family-body,Roboto,sans-serif);font-size:14px}
*{box-sizing:border-box}
.hm{position:fixed;inset:0;background:rgba(4,7,12,.6);display:none;align-items:center;justify-content:center;z-index:9999}.hm.show{display:flex}.hm.sheet{align-items:flex-end}
.hp{width:640px;max-width:100%;background:var(--k-card);color:var(--k-ink);border:1px solid var(--k-bd);border-radius:14px;padding:16px 18px;box-shadow:0 12px 40px rgba(0,0,0,.45)}
.sheet .hp{border-radius:18px 18px 0 0;padding:14px 12px calc(20px + env(safe-area-inset-bottom))}
.hh{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.hh .nm{font-size:18px;flex:1}.hh .s{color:var(--k-sec);font-size:12.5px}
.x{background:none;border:0;color:var(--k-sec);font-size:24px;cursor:pointer}
svg{width:100%;height:auto;display:block;margin-top:8px}.empty{color:var(--k-sec);padding:20px 0}
`;

class ClimateCard extends HTMLElement {
  setConfig(c) { this._c = Object.assign({ layout: "desktop" }, CLD, c || {}, { schedule: Object.assign({}, CLD.schedule, (c && c.schedule) || {}) }); if (this._root) this._build(); }
  getCardSize() { return 16; }
  getGridOptions() { return { columns: "full" }; }
  set hass(h) {
    const first = !this._hass; this._hass = h;
    if (!this._root) { this._root = this.attachShadow({ mode: "open" }); this._build(); }
    if (first) this._load();
    const c = this._c, ids = [c.climate, c.inside, c.status, c.slider, c.away, c.hours, c.mode, c.weather, ...Object.values(c.rooms), ...c.tiles.flatMap((t) => [t[0], t[2]]).filter(Boolean)];
    const sig = ids.map((e) => { const s = h.states[e]; return s ? s.state + "|" + (s.attributes.temperature || "") + "|" + (s.attributes.current_temperature || "") + "|" + (s.attributes.hvac_action || "") : "-"; }).join(";");
    if (sig !== this._sig) {
      const stChanged = this._lastStatus !== (h.states[c.status] || {}).state; this._lastStatus = (h.states[c.status] || {}).state;
      this._sig = sig; this._render(); if (stChanged && !first) this._loadLater();
    }
  }
  connectedCallback() { this._t = setInterval(() => this._load(), 5 * 60000); }
  disconnectedCallback() { clearInterval(this._t); }
  _s(e) { return this._hass.states[e]; } _v(e) { return e.startsWith("climate.") ? this._a(e, "current_temperature") : (this._s(e) || {}).state; } _n(e) { const v = parseFloat(this._v(e)); return isNaN(v) ? null : v; }
  _a(e, k) { return ((this._s(e) || {}).attributes || {})[k]; }
  _loadLater() { clearTimeout(this._lt); this._lt = setTimeout(() => this._load(), 2000); }
  async _load() {
    if (!this._hass) return; const c = this._c, now = Date.now(), d0 = new Date(); d0.setHours(0, 0, 0, 0);
    const W = (ids, start, attrs) => this._hass.callWS({ type: "history/history_during_period", start_time: new Date(start).toISOString(), end_time: new Date(now + 60000).toISOString(),
      entity_ids: ids, minimal_response: !attrs, no_attributes: !attrs, significant_changes_only: false });
    try {
      const [a, b, s] = await Promise.all([W([c.inside], now - 25 * 3600000, false), W([c.climate], d0.getTime() - 6 * 86400000, true), W([c.status, c.by], now - 24 * 3600000, false)]);
      const t = (x) => Math.round(((x.lc || x.lu) || 0) * 1000);
      this._ins = (a[c.inside] || []).map((x) => [t(x), parseFloat(x.s)]).filter((x) => !isNaN(x[1]));
      let last = {}; this._cl = (b[c.climate] || []).map((x) => { if (x.a) last = x.a; return [Math.round((x.lu || 0) * 1000), last.current_temperature, last.temperature, last.hvac_action]; });
      this._hs = (s[c.status] || []).map((x) => [t(x), x.s]).filter((x) => x[1] && x[1] !== "unknown" && x[1] !== "unavailable");
      this._by = (s[c.by] || []).map((x) => [t(x), x.s]).filter((x) => x[1] && x[1] !== "unknown" && x[1] !== "unavailable");
      this._err = false;
    } catch (e) { this._err = true; }
    this._render();
  }
  _build() {
    const ph = this._c.layout === "phone";
    this._root.innerHTML = `<style>${CL_CSS}</style><div class="${ph ? "ph" : "dk"}" id="w"><div class="grid">
      <div class="card"><h3>🔥 Heating now <span class="r" id="hmode"></span></h3>
        ${ph ? '<div class="st one" id="stat"></div>' : ""}<div class="now"><div class="dial" id="dial"></div><div style="min-width:0;flex:1">${ph ? "" : '<div class="st" id="stat"></div>'}<div class="chips" id="chips"></div></div></div>
        <div class="boost"><div class="l"><span>Boost temperature</span><span id="bv"></span></div><input type="range" min="19" max="24" step="0.5" id="br">
          <div class="btns"><button class="btn or" id="bboost">🔥 Boost ${this._c.schedule.boost_hours} h</button><button class="btn cx" id="bcancel">Cancel</button></div></div>
        <div class="away"><div class="tgl" id="awt"></div><div><div>Away 24h+ → ${this._c.schedule.frost}°C</div><div class="s">After ${this._c.schedule.frost_after_hours} h of Away the heating drops to frost ${this._c.schedule.frost}°.</div></div></div></div>
      <div class="card"><h3>📈 Last 24 hours <span class="r">inside vs target · heating on</span></h3><div class="sc" id="chart"><div class="empty">Loading…</div></div>
        <div class="lg"><span><i style="background:var(--cur)"></i>Inside${ph ? "" : " (thermostat)"}</span><span><i style="background:var(--tgt)"></i>Target</span><span><i style="background:rgba(255,129,0,.35)"></i>Heating${ph ? "" : " on"}</span><span><i style="background:var(--k-sec)"></i>Outside${ph ? "" : " now"}</span></div>
        <div class="kpis" id="kpis"></div></div>
      <div class="card"><h3>🗓 Today's plan <span class="r" id="pday"></span></h3><div id="plan"></div><h3 style="margin-top:18px">⏱ Heating hours · last 7 days</h3><div id="bars"></div></div>
      <div class="card"><h3>🏠 Rooms <span class="r">tap a temperature for its week</span></h3><div class="rooms"><div>${CL_PLAN}<div class="key"><span><i style="background:rgba(255,129,0,.4)"></i>warmer than target</span><span><i style="background:rgba(76,155,232,.4)"></i>more than 1° below</span><span><i style="border:1px solid var(--k-bd)"></i>no sensor</span></div></div><div class="side" id="side"></div></div></div>
      <div class="card span2"><h3>📝 Recent activity <span class="r">last 24 hours</span></h3><div id="acts"></div></div></div></div>`;
    const R = this._root, c = this._c;
    const br = R.getElementById("br");
    br.addEventListener("input", () => { R.getElementById("bv").textContent = (+br.value).toFixed(1) + "°"; this._drag = true; });
    br.addEventListener("change", () => { this._drag = false; this._hass.callService("input_number", "set_value", { entity_id: c.slider, value: Number(br.value) }); });
    R.getElementById("bboost").addEventListener("click", () => this._hass.callService("input_button", "press", { entity_id: c.boost }));
    R.getElementById("bcancel").addEventListener("click", () => this._hass.callService("input_button", "press", { entity_id: c.cancel }));
    R.getElementById("awt").addEventListener("click", () => this._hass.callService("input_boolean", "toggle", { entity_id: c.away }));
    R.addEventListener("click", (ev) => { const t = ev.composedPath().find((n) => n.dataset && n.dataset.pop); if (t) this._pop(t.dataset.pop, t.dataset.n); });
    const svg = R.querySelector(".plan"); if (svg) svg.setAttribute("viewBox", "10 30 600 520");
    this._sig = "";
  }
  _render() {
    if (!this._hass || !this._root.getElementById("w")) return;
    const R = this._root, c = this._c, S = c.schedule, ph = c.layout === "phone", now = new Date();
    { const ink = getComputedStyle(this).getPropertyValue("--primary-text-color").trim(), m = ink.match(/^#?([0-9a-f]{6})$/i);
      const lum = m ? parseInt(m[1].slice(0, 2), 16) * .299 + parseInt(m[1].slice(2, 4), 16) * .587 + parseInt(m[1].slice(4, 6), 16) * .114 : 255; R.getElementById("w").classList.toggle("lt", lum < 128); }
    const cur = this._a(c.climate, "current_temperature"), tgt = this._a(c.climate, "temperature"), act = this._a(c.climate, "hvac_action");
    const status = this._v(c.status) || "", boosting = /^boost/i.test(status), heating = act === "heating";
    // ---- dial ----
    const Rr = 72, C = 85, a0 = 135, span = 270, lo = 15, hi = 25, ang = (v) => a0 + span * Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
    const pt = (a) => [C + Rr * Math.cos(a * Math.PI / 180), C + Rr * Math.sin(a * Math.PI / 180)];
    const arc = (a1, a2) => { const [x1, y1] = pt(a1), [x2, y2] = pt(Math.max(a1 + .01, a2)); return `M${x1} ${y1} A${Rr} ${Rr} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2} ${y2}`; };
    const [tx, ty] = pt(ang(tgt || lo));
    R.getElementById("dial").innerHTML = `<svg viewBox="0 0 170 170"><path d="${arc(a0, a0 + span)}" stroke="rgba(127,140,170,.25)" stroke-width="12" fill="none" stroke-linecap="round"/>
      ${cur != null ? `<path d="${arc(a0, ang(cur))}" stroke="${heating ? "var(--state-climate-heat-color, #ff8100)" : "var(--state-climate-idle-color, #8a8a8a)"}" stroke-width="12" fill="none" stroke-linecap="round"/>` : ""}
      ${tgt != null ? `<circle cx="${tx}" cy="${ty}" r="7" fill="${heating ? "var(--state-climate-heat-color, #ff8100)" : "var(--primary-text-color)"}" stroke="var(--k-deep, #0e1420)" stroke-width="2"/>` : ""}</svg>
      <div class="c"><div class="t">${cur != null ? (+cur).toFixed(1) + "°" : "–"}</div><div class="s">target <b style="color:${heating ? "var(--state-climate-heat-color, #ff8100)" : "var(--secondary-text-color)"}">${tgt != null ? (+tgt).toFixed(1) + "°" : "–"}</b></div></div>`;
    const parts = status.split(" — ");
    R.getElementById("stat").innerHTML = `<b>${cEsc(parts[0])}</b>${parts[1] ? " — " + cEsc(parts.slice(1).join(" — ")) : ""}`;
    const out = this._a(c.weather, "temperature"), hrs = this._n(c.hours);
    R.getElementById("chips").innerHTML = `<span class="chip ${heating ? "on" : ""}">${heating ? "🔥 Heating" : "Idle"}</span>${hrs != null ? `<span class="chip">On <b>${hrs.toFixed(1)} h</b> today</span>` : ""}<span class="chip">House <b>${cEsc(this._v(c.mode) || "–")}</b></span>${out != null ? `<span class="chip">Outside <b>${(+out).toFixed(1)}°</b></span>` : ""}`;
    R.getElementById("hmode").textContent = heating ? "boiler on" : "boiler idle";
    const br = R.getElementById("br"), bt = this._n(c.slider); if (!this._drag && bt != null) { br.value = bt; R.getElementById("bv").textContent = bt.toFixed(1) + "°"; }
    R.getElementById("bboost").classList.toggle("on", boosting); R.getElementById("bcancel").classList.toggle("on", boosting);
    R.getElementById("awt").classList.toggle("on", this._v(c.away) === "on");
    // ---- 24 h chart ----
    if (this._ins && this._cl) {
      const W = 900, H = 280, L = 40, Rm = 16, T = 10, B = 28, cw = W - L - Rm, ch = H - T - B, t1 = Date.now(), t0 = t1 - 24 * 3600000, X = (t) => L + cw * (Math.max(t, t0) - t0) / (t1 - t0);
      const ins = this._ins.filter((r) => r[0] >= t0 - 3600000), cl = this._cl.filter((r, i, a) => i + 1 >= a.length || a[i + 1][0] >= t0);
      const vals = [...ins.map((r) => r[1]), ...cl.map((r) => r[2]).filter((v) => v != null)];
      const vlo = vals.length ? Math.floor(Math.min(...vals) - 1) : 15, vhi = vals.length ? Math.ceil(Math.max(...vals) + .5) : 22, Y = (v) => T + ch - ch * (v - vlo) / Math.max(1, vhi - vlo);
      let s = `<svg class="ch" viewBox="0 0 ${W} ${H}">`;
      cl.forEach((r, i) => { if (r[3] !== "heating") return; const a = Math.max(r[0], t0), b = i + 1 < cl.length ? cl[i + 1][0] : t1; if (b > a) s += `<rect x="${X(a)}" y="${T}" width="${Math.max(1, X(b) - X(a))}" height="${ch}" fill="rgba(255,129,0,.2)"/>`; });
      for (let v = vlo; v <= vhi; v++) s += `<line x1="${L}" x2="${W - Rm}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--k-bd)"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="10" fill="var(--k-sec)">${v}°</text>`;
      for (let h = 0; h <= 24; h += 3) { const t = t0 + h * 3600000; s += `<text x="${X(t)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="var(--k-sec)">${cHM(new Date(t))}</text>`; }
      let d = ""; cl.forEach((r, i) => { if (r[2] == null) return; const x = X(r[0]), x2 = i + 1 < cl.length ? X(cl[i + 1][0]) : X(t1); d += (d ? "L" : "M") + `${x} ${Y(r[2])} L${x2} ${Y(r[2])}`; });
      s += `<path d="${d}" fill="none" stroke="var(--tgt)" stroke-width="2"/>`;
      s += `<path d="${ins.map((r, i) => (i ? "L" : "M") + X(r[0]).toFixed(1) + " " + Y(r[1]).toFixed(1)).join(" ")}" fill="none" stroke="var(--cur)" stroke-width="2"/>`;
      if (out != null) s += out >= vlo && out <= vhi ? `<line x1="${L}" x2="${W - Rm}" y1="${Y(out)}" y2="${Y(out)}" stroke="var(--k-sec)" stroke-dasharray="4 4"/><text x="${W - Rm - 4}" y="${Y(out) - 4}" text-anchor="end" font-size="10" fill="var(--k-sec)">outside now ${(+out).toFixed(1)}°</text>`
        : `<text x="${W - Rm - 4}" y="${T + ch - 4}" text-anchor="end" font-size="10" fill="var(--k-sec)">outside now ${(+out).toFixed(1)}° (below the chart)</text>`;
      const el = R.getElementById("chart"); el.innerHTML = s + "</svg>"; if (ph) requestAnimationFrame(() => (el.scrollLeft = el.scrollWidth));
      const iv = ins.filter((r) => r[0] >= t0).map((r) => r[1]); let on = 0;
      cl.forEach((r, i) => { if (r[3] === "heating") { const a = Math.max(r[0], t0), b = i + 1 < cl.length ? cl[i + 1][0] : t1; if (b > a) on += (b - a) / 3600000; } });
      const K = [["var(--cur)", "Inside now", `${cur != null ? (+cur).toFixed(1) : "–"}°`, iv.length ? `low ${Math.min(...iv).toFixed(1)}° · high ${Math.max(...iv).toFixed(1)}° (24 h)` : ""],
        ["var(--tgt)", "Target", `${tgt != null ? (+tgt).toFixed(1) : "–"}°`, cEsc(parts[0])],
        ["var(--or)", "Heating on", `${on.toFixed(1)} <small>h</small>`, `last 24 h${hrs != null ? " · " + hrs.toFixed(1) + " h since midnight" : ""}`],
        ["var(--k-sec)", "Outside", `${out != null ? (+out).toFixed(1) : "–"}°`, `${this._a(c.weather, "humidity") != null ? this._a(c.weather, "humidity") + "% humidity" : ""}`]];
      R.getElementById("kpis").innerHTML = K.map((k) => `<div class="kpi" style="--c:${k[0]}"><div class="k">${k[1]}</div><div class="v">${k[2]}</div><div class="s">${k[3]}</div></div>`).join("");
      // ---- heating hours 7 days ----
      const days = [], dd = new Date(); dd.setHours(0, 0, 0, 0);
      for (let k = 6; k >= 0; k--) { const st = new Date(dd); st.setDate(dd.getDate() - k); const sT = st.getTime(), en = new Date(st); en.setDate(st.getDate() + 1); const eT = Math.min(en.getTime(), t1); let hh = 0;
        this._cl.forEach((r, i) => { if (r[3] !== "heating") return; const b = i + 1 < this._cl.length ? this._cl[i + 1][0] : t1, x = Math.max(r[0], sT), y = Math.min(b, eT); if (y > x) hh += (y - x) / 3600000; }); days.push([sT, hh]); }
      const BW = 520, BH = 170, BL = 26, BB = 22, BT = 16, bcw = BW - BL - 6, bch = BH - BT - BB, mx = Math.max(4, ...days.map((x) => x[1])), bw = bcw / 7;
      let b = `<svg class="ch" viewBox="0 0 ${BW} ${BH}">`;
      for (let v = 0; v <= mx; v += 2) b += `<line x1="${BL}" x2="${BW - 6}" y1="${BT + bch - bch * v / mx}" y2="${BT + bch - bch * v / mx}" stroke="var(--k-bd)"/><text x="${BL - 5}" y="${BT + bch - bch * v / mx + 4}" text-anchor="end" font-size="10" fill="var(--k-sec)">${v}</text>`;
      days.forEach((x, i) => { const xx = BL + i * bw + bw * .2, h = bch * x[1] / mx; b += `<rect x="${xx}" y="${BT + bch - h}" width="${bw * .6}" height="${h}" rx="3" fill="${i === 6 ? "#ff8100" : "#ffb300"}" opacity="${i === 6 ? 1 : .75}"/><text x="${xx + bw * .3}" y="${BT + bch - h - 4}" text-anchor="middle" font-size="10.5" fill="var(--k-ink)">${x[1].toFixed(1)}</text><text x="${xx + bw * .3}" y="${BH - 6}" text-anchor="middle" font-size="10" fill="var(--k-sec)">${i === 6 ? "Today" : cDN[new Date(x[0]).getDay()]}</text>`; });
      const full = days.slice(0, 6).filter((x, i) => this._cl.length && this._cl[0][0] <= x[0]);
      R.getElementById("bars").innerHTML = b + "</svg>" + (full.length ? `<div style="font-size:12px;color:var(--k-sec);margin-top:4px">Average ${(full.reduce((a, x) => a + x[1], 0) / full.length).toFixed(1)} h a day over the last ${full.length} full days.</div>` : "");
    } else if (this._err) R.getElementById("chart").innerHTML = `<div class="empty">Couldn’t load history</div>`;
    // ---- today's plan (his Node-RED settings) ----
    const wd = now.getDay(), wk = wd === 0 || wd === 6, mon = now.getMonth() + 1, summer = mon >= S.summer_from_month && mon <= S.summer_to_month;
    const wake = summer ? S.wake_summer : wk ? S.wake_weekend : S.wake_weekday, hh = (s) => +s.slice(0, 2) + (+s.slice(3)) / 60, nh = now.getHours() + now.getMinutes() / 60;
    const COL = { night: "#24456b", comfort: "#2d6a4f", hot: "#b4561c" };
    const seg = [[0, hh(wake), "night", `night ${S.night}°`], [hh(wake), hh(S.hot_start), "comfort", `comfort ${S.comfort}°`], [hh(S.hot_start), hh(S.hot_end), "hot", `hot ${S.hot}°`], [hh(S.hot_end), 24, "late", ""]];
    R.getElementById("pday").textContent = `${cWD[wd]} · ${wk ? "weekend" : "weekday"} · house ${this._v(c.mode) || "–"}`;
    R.getElementById("plan").innerHTML = `<div class="strip">${seg.map((g) => `<div style="flex:${g[1] - g[0]};background:${g[2] === "late" ? "repeating-linear-gradient(135deg,#2d6a4f 0 8px,#24456b 8px 16px)" : COL[g[2]]}">${g[1] - g[0] >= 2.5 ? g[3] : ""}</div>`).join("")}<div class="nw" style="left:${nh / 24 * 100}%"></div></div>
      <div class="ticks">${[[0, "00:00"], [hh(wake), wake], [hh(S.hot_start), S.hot_start], [hh(S.hot_end), S.hot_end]].map((t) => `<span style="left:${t[0] / 24 * 100}%">${t[1]}</span>`).join("")}</div>
      <div class="rules"><div>🌅 <b>Wake ${wake}</b> (weekdays ${S.wake_weekday}, weekends ${S.wake_weekend}${summer ? ", summer " + S.wake_summer : ""}): night ${S.night}° → comfort ${S.comfort}°. On cold mornings it starts up to <b>${S.lead_freezing} min earlier</b> (forecast checked at ${S.forecast_time}).</div>
      <div>🔥 <b>Hot ${S.hot}°</b> ${S.hot_start}–${S.hot_end}. 🌙 <b>Night ${S.night}°</b> when the house goes to Sleeping.</div>
      <div>🚪 <b>Away</b>: eco ${S.eco}°, frost ${S.frost}° after ${S.frost_after_hours} h if Away 24h+ is on; warms up again when someone is heading home (within ${S.prox_on_km} km).</div>
      <div style="font-size:11.5px">Times and temperatures from your Node-RED Household page.</div></div>`;
    // ---- rooms ----
    const svg = R.querySelector(".plan");
    if (svg && tgt != null) {
      svg.querySelectorAll(".tp").forEach((x) => x.remove()); svg.querySelectorAll("polygon.room").forEach((p) => p.classList.remove("warm", "cool"));
      svg.querySelectorAll(".rl").forEach((t) => { const n = t.textContent, e = c.rooms[n]; if (!e) return; const v = this._n(e); if (v == null) return;
        const x = +t.getAttribute("x"), y = +t.getAttribute("y"), d = v - tgt, col = d > 0 ? "var(--or)" : d < -1 ? "var(--tgt)" : "var(--k-ink)";
        t.insertAdjacentHTML("afterend", `<text class="tp" x="${x}" y="${y + 20}" fill="${col}" data-pop="${e}" data-n="${n}">${v.toFixed(1)}°</text>`);
        const room = [...svg.querySelectorAll("polygon.room")].find((p) => { const b = p.getBBox(); return x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height; });
        if (room && (d > 0 || d < -1)) room.classList.add(d > 0 ? "warm" : "cool"); });
    }
    R.getElementById("side").innerHTML = c.tiles.map(([e, n, hum, sub]) => { const v = this._n(e); if (v == null) return ""; const u = e.endsWith("humidity") ? "%" : "°";
      return `<div class="it" data-pop="${e}" data-n="${cEsc(n)}"><div class="n">${cEsc(n)}</div><div class="v">${v.toFixed(1)}<small>${u}</small></div>${hum && this._n(hum) != null ? `<div class="s">humidity ${Math.round(this._n(hum))}%</div>` : sub ? `<div class="s">${cEsc(sub)}</div>` : ""}</div>`; }).join("");
    // ---- recent activity ----
    if (this._hs) {
      const COLS = ["#35c9e6", "#a880ff", "#3ddc84", "#ffc94d", "#ff6b6b", "#4c9be8"], cm = {}; let ci = 0;
      const person = (n) => Object.values(this._hass.states).find((s) => s.entity_id.startsWith("person.") && (s.attributes.friendly_name || "").split(" ")[0].toLowerCase() === String(n).toLowerCase());
      R.getElementById("acts").innerHTML = this._hs.slice().reverse().map((r) => { const k = r[1].split(" ")[0]; if (!(k in cm)) cm[k] = COLS[ci++ % COLS.length];
        let best = null, bd = 60000; this._by.forEach((x) => { const d = Math.abs(x[0] - r[0]); if (d < bd) { bd = d; best = x[1]; } }); const b = best || "Node-RED";
        const p = r[1].split(" — "), d = new Date(r[0]), pr = b !== "Node-RED" && person(b), pic = pr && pr.attributes.entity_picture;
        const badge = b === "Node-RED" ? "N" : pic ? `<img src="${cEsc(this._hass.hassUrl(pic))}">` : cEsc(b[0]);
        return `<div class="act"><span class="d" style="background:${cm[k]}"></span><div><b style="font-weight:500">${cEsc(p[0])}</b>${p[1] ? " — " + cEsc(p.slice(1).join(" — ")) : ""}<div class="by"><span class="bot">${badge}</span>${b === "Node-RED" ? "Node-RED (automatic)" : cEsc(b)}</div></div><div class="t">${dayKey(d) === dayKey(now) ? "" : cDM(d) + " "}${cHM(d)}</div></div>`; }).join("") || `<div class="empty">No changes in the last 24 hours</div>`;
    }
    function dayKey(d) { return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); }
  }
  /* 7-day popup on document.body */
  _popRoot() {
    if (this._ph && this._ph.isConnected) return this._pr;
    const host = document.createElement("climate-card-popup"); document.body.appendChild(host);
    const r = host.attachShadow({ mode: "open" }); r.innerHTML = `<style>${CL_POP_CSS}</style><div class="hm" id="hm"><div class="hp" id="hp"></div></div>`;
    r.getElementById("hm").addEventListener("click", (ev) => { if (ev.target.id === "hm" || ev.composedPath().some((n) => n.dataset && n.dataset.x)) r.getElementById("hm").className = "hm"; });
    document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") r.getElementById("hm").className = "hm"; });
    this._ph = host; this._pr = r; return r;
  }
  async _pop(e, n) {
    const r = this._popRoot(), hp = r.getElementById("hp"), u = e.endsWith("humidity") ? "%" : "°";
    r.getElementById("hm").className = "hm show" + (this._c.layout === "phone" ? " sheet" : "");
    hp.innerHTML = `<div class="hh"><span class="nm">${cEsc(n)}</span><button class="x" data-x="1">×</button></div><div class="empty">Loading the last 7 days…</div>`;
    const t1 = Date.now(), t0 = t1 - 7 * 86400000; let rows = [];
    const isCl = e.startsWith("climate.");
    try { const res = await this._hass.callWS({ type: "history/history_during_period", start_time: new Date(t0).toISOString(), end_time: new Date(t1 + 60000).toISOString(), entity_ids: [e], minimal_response: !isCl, no_attributes: !isCl, significant_changes_only: false });
      let la = {}; rows = (res[e] || []).map((x) => { if (x.a) la = x.a; return [Math.round((isCl ? x.lu : (x.lc || x.lu)) * 1000), parseFloat(isCl ? la.current_temperature : x.s)]; }).filter((x) => !isNaN(x[1])); } catch (err) { /* empty */ }
    if (!rows.length) { hp.innerHTML = `<div class="hh"><span class="nm">${cEsc(n)}</span><button class="x" data-x="1">×</button></div><div class="empty">No history for this sensor.</div>`; return; }
    const W = 600, H = 220, L = 36, Rm = 10, T = 10, B = 24, cw = W - L - Rm, ch = H - T - B, X = (t) => L + cw * (Math.max(t, t0) - t0) / (t1 - t0);
    const v = rows.map((x) => x[1]), lo = Math.floor(Math.min(...v)), hi = Math.ceil(Math.max(...v)), Y = (y) => T + ch - ch * (y - lo) / Math.max(1, hi - lo), stp = hi - lo > 12 ? 5 : hi - lo > 6 ? 2 : 1;
    let s = `<svg viewBox="0 0 ${W} ${H}">`;
    for (let y = lo; y <= hi; y += stp) s += `<line x1="${L}" x2="${W - Rm}" y1="${Y(y)}" y2="${Y(y)}" stroke="var(--k-bd)"/><text x="${L - 5}" y="${Y(y) + 4}" text-anchor="end" font-size="10" fill="var(--k-sec)">${y}${u}</text>`;
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    for (let k = 0; k < 7; k++) { const dt = new Date(d0); dt.setDate(d0.getDate() - k); const t = dt.getTime(); s += `<line x1="${X(t)}" x2="${X(t)}" y1="${T}" y2="${T + ch}" stroke="var(--k-bd)"/><text x="${X(t) + 4}" y="${H - 6}" font-size="10" fill="var(--k-sec)">${cDN[dt.getDay()]} ${cDM(dt)}</text>`; }
    s += `<path d="${rows.map((x, i) => (i ? "L" : "M") + X(x[0]).toFixed(1) + " " + Y(x[1]).toFixed(1)).join(" ")}" fill="none" stroke="${u === "%" ? "#35c9e6" : "#ff6b6b"}" stroke-width="1.8"/></svg>`;
    hp.innerHTML = `<div class="hh"><span class="nm">${cEsc(n)}</span><span class="s">now ${(+this._v(e)).toFixed(1)}${u} · 7-day low ${Math.min(...v).toFixed(1)}${u} · high ${Math.max(...v).toFixed(1)}${u}</span><button class="x" data-x="1">×</button></div>${s}`;
  }
}
customElements.define("climate-card", ClimateCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "climate-card", name: "Climate Card", description: "Climate tab: heating now, 24 h chart, today's plan, rooms, activity" });
console.info("%c CLIMATE-CARD %c v" + CL_VERSION + " ", "background:#ff8100;color:#fff", "background:#121826;color:#fff");
