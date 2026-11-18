/* security-card — the Security tab as one card (desktop + phone layouts), built 18-11-2026 from the accepted mocks.
 * Source: ~/homelab/security-mock/card/security-card.src.js -> gen.py bakes the house plan in -> /config/www/security-card.js
 * - Tapping a door / window / motion sensor (tile, plan marker or motion room) opens its HISTORY. It never changes a device.
 * - The only controls are the alarm mode buttons (alarm_control_panel services).
 * - "by" attribution follows alarm-activity-card: Alarmo changed_by -> recorded initiator helper (NFC) -> user context -> automation.
 * Config:
 *   layout: desktop | phone
 *   by_entity: input_text.alarm_status_by
 *   automation_name: Node-RED
 *   alarms:  [{entity, name, plan: house|shed (outline on the plan), modes:[disarmed, armed_away, armed_night], labels:{disarmed:'Disarmed', ...}}]
 *   sensors: [{entity, name, kind: door|win|mot, battery, tamper, alarm, modes:[armed_away, ...]}]
 */
const SC_VERSION = "5";
const SC_PLAN = `<svg viewBox="0 0 760 560" class="plan"><text class="fl" x="30" y="22">GROUND</text><text class="fl" x="330" y="22">FIRST</text><text class="fl" x="630" y="22">YARD</text><polygon class="room mot" data-m="binary_sensor.sitting_room_presence_occupancy" points="30.0,72.0 84.4,72.0 84.4,41.4 176.2,41.4 176.2,72.0 206.8,72.0 206.8,196.1 159.2,243.7 30.0,243.7"/>
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
const SC_LOW = 30;
const SC_DAY = 86400000;
const SC_SVC = { disarmed: "alarm_disarm", armed_away: "alarm_arm_away", armed_night: "alarm_arm_night", armed_home: "alarm_arm_home" };
const SC_STATE = { disarmed: "Disarmed", armed_away: "Armed away", armed_night: "Armed night", armed_home: "Armed home",
  arming: "Arming…", pending: "Entry delay…", triggered: "Triggered", unavailable: "Unavailable", unknown: "Unknown" };
const SC_BTN = { disarmed: "Disarm", armed_away: "Away", armed_night: "Night", armed_home: "Home" };
const SC_ICON = {
  shield: "M12 1 3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-4Z",
  shieldO: "M12 1 3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-4Zm0 2.2 7 3.1V11c0 4.5-3 8.7-7 9.9-4-1.2-7-5.4-7-9.9V6.3l7-3.1Z",
  lock: "M12 2a5 5 0 0 0-5 5v3H6v12h12V10h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 0 1 6 0v3Z",
  moon: "M14 2a10 10 0 1 0 8 15A8 8 0 0 1 14 2Z",
  home: "M12 3 2 12h3v8h6v-6h2v6h6v-8h3L12 3Z",
};
const SC_MODE_ICON = { disarmed: SC_ICON.shield, armed_away: SC_ICON.lock, armed_night: SC_ICON.moon, armed_home: SC_ICON.home };
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const fT = (ms, sec) => { const d = new Date(ms); return pad(d.getHours()) + ":" + pad(d.getMinutes()) + (sec ? ":" + pad(d.getSeconds()) : ""); };
const fD = (ms) => { const d = new Date(ms); return pad(d.getDate()) + "-" + pad(d.getMonth() + 1) + "-" + d.getFullYear(); };
const dayStart = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const fDur = (s) => { s = Math.round(s); if (s < 60) return s + " s"; if (s < 3600) return Math.round(s / 60) + " min"; const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h + " h" + (m ? " " + m + " min" : ""); };
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SC_CSS = `
:host{--sc-card:var(--ha-card-background,var(--card-background-color,#121826));--sc-deep:var(--secondary-background-color,#0e1420);
 --sc-ink:var(--primary-text-color,#e8eef7);--sc-sec:var(--secondary-text-color,#7d8aa6);--sc-bd:var(--divider-color,#1d2740);
 --sc-cy:#35c9e6;--sc-gr:#3ddc84;--sc-am:#ffc94d;--sc-rd:#ff5a5a;--sc-pu:#a880ff;display:block}
ha-card{overflow:hidden;color:var(--sc-ink);container-type:inline-size}
ha-card.lt{--sc-am:#b26b00;--sc-gr:#18864b;--sc-pu:#6f42e0;--sc-cy:#0a7fa0;--sc-rd:#d32f2f}
*{box-sizing:border-box}
button{font:inherit;color:inherit}
.hero{display:flex;align-items:center;gap:18px;padding:18px 22px;border-bottom:1px solid var(--sc-bd);background:linear-gradient(90deg,rgba(53,201,230,.08),transparent 60%)}
.hero.warn{background:linear-gradient(90deg,rgba(255,201,77,.12),transparent 60%)}
.hero.alarm{background:linear-gradient(90deg,rgba(255,90,90,.2),transparent 60%)}
.shield{width:54px;height:54px;flex:none;border-radius:50%;display:grid;place-items:center;border:2px solid var(--sc-cy);color:var(--sc-cy)}
.hero.warn .shield{border-color:var(--sc-am);color:var(--sc-am)}.hero.alarm .shield{border-color:var(--sc-rd);color:var(--sc-rd)}
.ht{font-size:22px;font-weight:500}.hs{color:var(--sc-sec);margin-top:2px}
.chips{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.chip{display:flex;align-items:center;gap:6px;background:var(--sc-deep);border:1px solid var(--sc-bd);border-radius:999px;padding:6px 12px;font-size:13px;color:var(--sc-sec)}
.chip b{color:var(--sc-ink);font-weight:500}.dot{width:8px;height:8px;border-radius:50%;background:var(--sc-sec)}
.dot.g{background:var(--sc-gr)}.dot.a{background:var(--sc-am)}.dot.r{background:var(--sc-rd)}.dot.p{background:var(--sc-pu)}
.grid{display:grid;grid-template-columns:330px minmax(0,1fr) 380px}
.col{padding:18px 20px;border-right:1px solid var(--sc-bd);min-width:0}.col:last-child{border-right:0}
@container (max-width:1150px){.grid{grid-template-columns:300px minmax(0,1fr)}.col.actc{grid-column:1/-1;border-top:1px solid var(--sc-bd);border-right:0}}
h3{margin:0 0 12px;font-size:12px;letter-spacing:.08em;color:var(--sc-sec);font-weight:600;text-transform:uppercase;display:flex;align-items:center;gap:8px}
h3 .r{margin-left:auto;text-transform:none;letter-spacing:0;font-weight:400}
.ap{background:var(--sc-deep);border:1px solid var(--sc-bd);border-radius:12px;padding:14px;margin-bottom:12px}
.ap.armed{border-color:rgba(168,128,255,.55)}.ap.trig{border-color:var(--sc-rd);box-shadow:0 0 0 1px var(--sc-rd) inset}
.aph{display:flex;align-items:center;gap:12px}.ic{width:40px;height:40px;flex:none;border-radius:50%;display:grid;place-items:center;border:2px solid var(--sc-sec);color:var(--sc-sec)}
.armed .ic{border-color:var(--sc-pu);color:var(--sc-pu)}.trig .ic{border-color:var(--sc-rd);color:var(--sc-rd)}
.apn{font-size:18px}.aps{color:var(--sc-sec);font-size:13px}.armed .aps{color:var(--sc-pu)}.trig .aps{color:var(--sc-rd)}
.busy .aps{animation:pulse 1.4s infinite}
.since{margin-left:auto;color:var(--sc-sec);font-size:12px;text-align:right}
.btns{display:flex;gap:6px;margin-top:12px;background:var(--sc-card);border-radius:10px;padding:4px}
.btns button{flex:1;background:none;border:0;padding:9px 4px;border-radius:8px;cursor:pointer;font-size:13px;display:flex;flex-direction:column;align-items:center;gap:3px}
.btns button:hover{background:rgba(127,140,170,.15)}.btns button.on{background:rgba(127,140,170,.3)}.btns button.on.arm{background:var(--sc-pu);color:#fff}
.btns button.next{outline:2px solid var(--sc-pu);animation:pulse 1.4s infinite}
.btns button:disabled{opacity:.5;cursor:default}
.ready{margin-top:10px;font-size:12.5px;color:var(--sc-sec)}.ready.bad{color:var(--sc-am)}.ready.err,.ready.tr{color:var(--sc-rd)}
.by{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--sc-sec);margin-top:3px}.by.r{justify-content:flex-end;white-space:nowrap}
.by img{width:18px;height:18px;border-radius:50%;object-fit:cover}
.bot{width:18px;height:18px;border-radius:50%;background:rgba(53,201,230,.15);display:inline-grid;place-items:center;font-size:11px;color:var(--sc-cy);overflow:hidden}.bot img{width:14px;height:14px;border-radius:0}
.plan{width:100%;height:auto;display:block}
.plan .room{fill:var(--sc-deep);transition:fill .3s}.plan .room.mot{cursor:pointer}.plan .room.mot.armed{fill:rgba(168,128,255,.26)}.plan .room.mot.det{fill:rgba(255,201,77,.22)}
.plan .room.mot.armed+.rl{fill:var(--sc-pu)}
.plan .we{stroke:var(--sc-sec);stroke-opacity:.55;stroke-width:6;stroke-linecap:square}.plan .wi{stroke:var(--sc-sec);stroke-opacity:.35;stroke-width:2.5}
.plan .shedwall{fill:none;stroke:var(--sc-sec);stroke-opacity:.55;stroke-width:6}
.plan .rl{fill:var(--sc-sec);font-size:11px;text-anchor:middle;pointer-events:none}.plan .room.mot.det+.rl{fill:var(--sc-am)}.plan .rl.sm{font-size:8.5px}
.plan .fl{fill:var(--sc-sec);font-size:11px;letter-spacing:.12em;font-weight:600}
/* armed outline (his idea 18-11): house walls / shed outline purple while that alarm is set, red when triggered */
.plan.h-armed .we,.plan.s-armed .shedwall{stroke:var(--sc-pu);stroke-opacity:1}
.plan.h-busy .we,.plan.s-busy .shedwall{stroke:var(--sc-pu);stroke-opacity:1;animation:pulse 1.4s infinite}
.plan.h-trig .we,.plan.s-trig .shedwall{stroke:var(--sc-rd);stroke-opacity:1;animation:pulse 1s infinite}
.sn{cursor:pointer}.sn .hit{stroke:transparent;stroke-width:22}
.sn .op{stroke:var(--sc-gr);stroke-width:7;stroke-linecap:round;transition:stroke .2s}.sn.win .op{stroke-width:5}
.sn.open .op{stroke:var(--sc-am);animation:pulse 1.4s infinite}.sn.low .op{stroke-dasharray:3 4}.sn.off .op{stroke:var(--sc-sec);stroke-dasharray:2 4}
.sn:hover .op{stroke:var(--sc-cy)}
@keyframes pulse{50%{opacity:.35}}
.legend{display:flex;gap:16px;flex-wrap:wrap;margin-top:6px;font-size:12px;color:var(--sc-sec)}
.legend span{display:flex;align-items:center;gap:6px}.lg{width:18px;height:5px;border-radius:3px;display:inline-block}
.filters{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap}
.filters button{background:var(--sc-deep);border:1px solid var(--sc-bd);color:var(--sc-sec);border-radius:999px;padding:4px 11px;font-size:12.5px;cursor:pointer}
.filters button.on{border-color:var(--sc-cy);color:var(--sc-cy)}
.acts{max-height:560px;overflow:auto;padding-right:4px;scrollbar-width:thin}
.dayl{font-size:11.5px;color:var(--sc-sec);margin:6px 0;font-weight:600}
.act{display:grid;grid-template-columns:12px 1fr auto;gap:10px;padding:7px 0;border-bottom:1px solid var(--sc-bd);align-items:start}
.act .d{width:9px;height:9px;border-radius:50%;margin-top:5px;background:var(--sc-sec)}
.act .t{font-size:12px;color:var(--sc-sec);text-align:right;white-space:nowrap}.act .w{font-size:12px;color:var(--sc-sec)}
.act.trig{background:rgba(255,90,90,.08);border-radius:8px;padding:8px;border:1px solid rgba(255,90,90,.35);margin:4px 0}
.act.trig .d{background:var(--sc-rd)}.act.trig b{color:var(--sc-rd)}.act.arm .d{background:var(--sc-pu)}.act.open .d{background:var(--sc-am)}
.empty{color:var(--sc-sec);font-size:13px;padding:10px 0}
.health{border-top:1px solid var(--sc-bd);padding:16px 20px}
.groups{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}
@container (max-width:1150px){.groups{grid-template-columns:1fr}}
.gl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.ti{display:flex;align-items:center;gap:10px;background:var(--sc-deep);border:1px solid var(--sc-bd);border-radius:10px;padding:9px 11px;cursor:pointer;min-width:0}
.ti:hover{border-color:var(--sc-cy)}.ti>div{min-width:0}.ti .n{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ti .s{font-size:11.5px;color:var(--sc-sec);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ti .st{width:8px;height:30px;flex:none;border-radius:4px;background:var(--sc-gr)}.ti.open .st{background:var(--sc-am)}
.ti.mot .st{background:rgba(127,140,170,.35)}.ti.mot.det .st{background:var(--sc-am)}.ti.off .st{background:var(--sc-sec)}
.bat{margin-left:auto;display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--sc-sec);flex:none}
.bat i{display:inline-block;width:22px;height:10px;border:1.5px solid var(--sc-sec);border-radius:2px;position:relative}
.bat i:after{content:"";position:absolute;left:1px;top:1px;bottom:1px;width:calc(var(--p)*18px/100);background:var(--sc-gr);border-radius:1px}
.bat.low{color:var(--sc-am)}.bat.low i{border-color:var(--sc-am)}.bat.low i:after{background:var(--sc-am)}
.tamp{color:var(--sc-rd);font-size:11.5px;margin-left:6px}
/* phone */
.ph .blk{padding:12px 14px;border-bottom:1px solid var(--sc-bd)}
.ph .hero{padding:12px 14px;gap:12px;align-items:flex-start}.ph .shield{width:42px;height:42px}.ph .ht{font-size:18px}.ph .hs{font-size:12.5px}
.ph .chips{margin:8px 0 0;justify-content:flex-start;gap:6px}.ph .chip{font-size:11.5px;padding:2px 9px;border-color:rgba(255,201,77,.5);color:var(--sc-am);background:none}.ph .chip.r{border-color:rgba(255,90,90,.6);color:var(--sc-rd)}
.pin{display:flex;gap:10px;align-items:center;background:rgba(255,90,90,.1);border:1px solid rgba(255,90,90,.45);border-radius:10px;padding:8px 10px;font-size:12.5px}
.pin b{color:var(--sc-rd)}.pin .s{color:var(--sc-sec)}
.al{display:flex;align-items:center;gap:10px}.ph .ic{width:34px;height:34px}.aln{font-size:16px}.als{font-size:12px;color:var(--sc-sec)}
.al.armed .als{color:var(--sc-pu)}.al.trig .als{color:var(--sc-rd)}.al.busy .als{animation:pulse 1.4s infinite}
.alw{margin-left:auto;text-align:right;font-size:11.5px;color:var(--sc-sec)}.alw .by{justify-content:flex-end;font-size:11.5px}.alw .by img,.alw .bot{width:16px;height:16px}
.seg{display:flex;gap:4px;margin-top:10px;background:var(--sc-deep);border-radius:10px;padding:3px}
.seg button{flex:1;background:none;border:0;padding:9px 2px;border-radius:8px;font-size:13px;cursor:pointer}
.seg button.on{background:rgba(127,140,170,.3)}.seg button.on.arm{background:var(--sc-pu);color:#fff}.seg button.next{outline:2px solid var(--sc-pu);animation:pulse 1.4s infinite}
.seg.slim button{padding:6px 2px;font-size:12.5px}
.ph .ready{margin-top:8px;font-size:12px}
.sep{height:1px;background:var(--sc-bd);margin:12px -14px}
.gh{display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:pointer;border-bottom:1px solid var(--sc-bd);user-select:none}
.gh .t{font-size:12px;letter-spacing:.08em;color:var(--sc-sec);font-weight:600;text-transform:uppercase}
.gh .v{margin-left:auto;font-size:13px}.gh .v.ok{color:var(--sc-gr)}.gh .v.w{color:var(--sc-am)}
.gh .ch{color:var(--sc-sec);transition:transform .2s}.gh.open .ch{transform:rotate(90deg)}
.gb{padding:2px 14px 12px;border-bottom:1px solid var(--sc-bd)}.ex{padding:0 14px 10px;border-bottom:1px solid var(--sc-bd);margin-top:-4px}
.ph .ti{margin-top:6px;padding:8px 10px}.ph .ti .st{width:6px;height:28px}.ph .ti .n{font-size:13.5px}
.g2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 6px}
.ah{display:flex;align-items:center;padding:12px 14px 4px}.ah .t{font-size:12px;letter-spacing:.08em;color:var(--sc-sec);font-weight:600;text-transform:uppercase}
.ph .filters{padding:4px 14px 6px;margin:0}.ph .acts{max-height:none;padding:0}
.ph .act{padding:8px 14px;font-size:13px;grid-template-columns:10px 1fr auto;gap:9px}.ph .act .d{width:8px;height:8px;margin-top:6px}
.ph .act.trig{margin:4px 8px}
.more{display:block;width:100%;background:none;border:0;color:var(--sc-cy);padding:11px;font-size:13px;cursor:pointer}
.mapbtn{display:flex;align-items:center;gap:8px;width:100%;background:none;border:0;border-top:1px solid var(--sc-bd);padding:13px 14px;font-size:14px;cursor:pointer}
.mapbtn .ch{margin-left:auto;color:var(--sc-sec)}
.mapw{padding:0 14px 14px}
.floors{display:flex;gap:4px;background:var(--sc-deep);border-radius:10px;padding:3px;margin-bottom:10px}
.floors button{flex:1;background:none;border:0;color:var(--sc-sec);padding:7px;border-radius:8px;font-size:12.5px;cursor:pointer}.floors button.on{background:rgba(127,140,170,.3);color:var(--sc-ink)}
.ph .plan .fl{display:none}
`;

/* popup + tooltip live on document.body so no transformed ancestor can trap a position:fixed overlay */
const SC_POP_CSS = `
:host{--sc-card:var(--ha-card-background,var(--card-background-color,#121826));--sc-deep:var(--secondary-background-color,#0e1420);
 --sc-ink:var(--primary-text-color,#e8eef7);--sc-sec:var(--secondary-text-color,#7d8aa6);--sc-bd:var(--divider-color,#1d2740);
 --sc-gr:#3ddc84;--sc-am:#ffc94d;--sc-rd:#ff5a5a;font-family:var(--ha-font-family-body,Roboto,sans-serif);font-size:14px;line-height:1.4}
*{box-sizing:border-box}button{font:inherit;color:inherit}
.hm{position:fixed;inset:0;background:rgba(4,7,12,.6);display:none;align-items:center;justify-content:center;z-index:9999}
.hm.show{display:flex}
.hm.sheet{align-items:flex-end}
.hp{width:560px;max-width:100%;max-height:88vh;overflow:auto;background:var(--sc-card);color:var(--sc-ink);border:1px solid var(--sc-bd);border-radius:14px;padding:18px 20px;box-shadow:0 12px 40px rgba(0,0,0,.45)}
.sheet .hp{border-radius:18px 18px 0 0;max-height:85vh;padding:16px 14px calc(22px + env(safe-area-inset-bottom))}
.hh{display:flex;align-items:center;gap:10px}.hh .nm{font-size:18px;font-weight:500;flex:1}
.x{background:none;border:0;color:var(--sc-sec);font-size:24px;cursor:pointer;line-height:1;padding:0 4px}
.sub{color:var(--sc-sec);font-size:12px;margin:2px 0 14px}
.pill{font-size:12px;padding:2px 10px;border-radius:20px;border:1px solid var(--sc-bd);white-space:nowrap}
.pill.on{color:var(--sc-am);border-color:rgba(255,201,77,.5)}.pill.off{color:var(--sc-gr);border-color:rgba(61,220,132,.45)}
.lbl{font-size:11px;letter-spacing:.12em;color:var(--sc-sec);text-transform:uppercase;margin:12px 0 6px;display:flex;justify-content:space-between}
.day{display:grid;grid-template-columns:84px 1fr 96px;gap:8px;align-items:center;padding:4px 6px;border-radius:8px;cursor:pointer;font-size:12px;white-space:nowrap}
.sheet .day{grid-template-columns:72px 1fr 86px;gap:6px;font-size:11px}
.day:hover,.day.sel{background:var(--sc-deep)}.day.sel{outline:1px solid var(--sc-bd)}
.day .d{color:var(--sc-sec)}.day .c{text-align:right;color:var(--sc-sec)}.day .c b{color:var(--sc-ink);font-weight:500}
.bar{position:relative;height:14px;background:rgba(61,220,132,.18);border-radius:4px;overflow:hidden}
.bar.m{background:rgba(127,140,170,.18)}
.bar i{position:absolute;top:0;bottom:0;background:var(--sc-am);min-width:2px}
.bar i.u{background:repeating-linear-gradient(45deg,rgba(127,140,170,.6) 0 3px,transparent 3px 6px);min-width:0}
.bar i.nd{background:repeating-linear-gradient(45deg,rgba(127,140,170,.3) 0 3px,transparent 3px 6px);min-width:0}
.axis{display:grid;grid-template-columns:84px 1fr 96px;gap:8px;font-size:10px;color:var(--sc-sec);padding:0 6px}
.sheet .axis{grid-template-columns:72px 1fr 86px;gap:6px}
.axis span{display:flex;justify-content:space-between}.axis em{font-style:normal}
.ev{display:flex;gap:10px;padding:7px 2px;border-bottom:1px solid var(--sc-bd);font-size:13px}.ev:last-child{border-bottom:0}
.ev .t{width:64px;color:var(--sc-sec);font-variant-numeric:tabular-nums}
.ev .dt{width:8px;height:8px;flex:none;border-radius:50%;background:var(--sc-am);margin-top:6px}.ev .dt.u{background:var(--sc-sec)}
.ev .s{color:var(--sc-sec);font-size:12px}
.empty{color:var(--sc-sec);font-size:13px;padding:10px 0;line-height:1.5}
.key{display:flex;gap:14px;font-size:11px;color:var(--sc-sec);margin-top:10px;flex-wrap:wrap}
.key i{display:inline-block;width:14px;height:8px;border-radius:2px;margin-right:5px;vertical-align:middle}
.tip{position:fixed;pointer-events:none;background:var(--sc-card);color:var(--sc-ink);border:1px solid var(--sc-bd);border-radius:8px;padding:8px 10px;font-size:12.5px;display:none;z-index:9998;min-width:170px;box-shadow:0 6px 20px rgba(0,0,0,.35)}
.tip b{display:block;font-size:13.5px;margin-bottom:2px}.tip .a{color:var(--sc-am)}.tip .r{color:var(--sc-rd)}.tip .m{color:var(--sc-sec)}
`;

class SecurityCard extends HTMLElement {
  setConfig(config) {
    if (!config || !Array.isArray(config.alarms) || !Array.isArray(config.sensors)) throw new Error("security-card: alarms and sensors are required");
    this._c = Object.assign({ layout: "desktop", by_entity: "input_text.alarm_status_by", automation_name: "Node-RED", automation_icon: "/local/node-red-icon.svg" }, config);
    this._ui = { filt: "all", showAll: false, mapOpen: false, floor: "g", open: { door: false, win: false, mot: false } };
    this._err = {};
    this._lb = []; this._by = []; this._cb = [];
    this._sig = ""; this._lbSig = "";
    if (this._root) this._build();
  }
  getCardSize() { return this._c && this._c.layout === "phone" ? 10 : 14; }
  getGridOptions() { return { columns: "full" }; }

  set hass(h) {
    this._hass = h;
    if (!this._root) { this._root = this.attachShadow({ mode: "open" }); this._build(); }
    const c = this._c, st = h.states;
    const ids = [...c.alarms.map((a) => a.entity), ...c.sensors.flatMap((s) => [s.entity, s.battery, s.tamper].filter(Boolean))];
    const sig = ids.map((e) => { const s = st[e]; return s ? s.state + "|" + s.last_changed + "|" + (s.attributes.next_state || "") : "-"; }).join(";");
    const lbSig = [...c.alarms.map((a) => a.entity), ...c.sensors.map((s) => s.entity)].map((e) => st[e] ? st[e].last_changed : "-").join(";");
    if (lbSig !== this._lbSig) { this._lbSig = lbSig; this._queueFetch(); }
    if (sig !== this._sig) { this._sig = sig; this._render(); }
  }
  connectedCallback() {
    this._tick = setInterval(() => this._root && this._render(), 60000);
    if (this._hass) this._queueFetch();
  }
  disconnectedCallback() { clearInterval(this._tick); this._hideTip(); }

  /* ---------- data ---------- */
  _queueFetch() { clearTimeout(this._ft); this._ft = setTimeout(() => this._fetch(), 800); }
  async _fetch() {
    const h = this._hass, c = this._c; if (!h) return;
    const now = Date.now(), start = new Date(Math.min(dayStart(now), now - SC_DAY)), end = new Date(now + 60000);
    const ents = [...c.alarms.map((a) => a.entity), ...c.sensors.map((s) => s.entity)];
    const panels = c.alarms.map((a) => a.entity);
    const hist = (eids, minimal) => "history/period/" + new Date(dayStart(now) - 6 * SC_DAY).toISOString() + "?filter_entity_id=" + eids.join(",") + "&end_time=" + encodeURIComponent(end.toISOString()) + (minimal ? "&minimal_response&no_attributes" : "");
    try {
      const start7 = new Date(dayStart(now) - 6 * SC_DAY);
      const [lb, lbA, byH, cbH] = await Promise.all([
        h.callApi("GET", "logbook/" + start.toISOString() + "?entity=" + c.sensors.map((x) => x.entity).join(",") + "&end_time=" + encodeURIComponent(end.toISOString())),
        h.callApi("GET", "logbook/" + start7.toISOString() + "?entity=" + panels.join(",") + "&end_time=" + encodeURIComponent(end.toISOString())),
        c.by_entity ? h.callApi("GET", hist([c.by_entity], true)).catch(() => [[]]) : Promise.resolve([[]]),
        h.callApi("GET", hist(panels, false)).catch(() => []),
      ]);
      const ok = (s) => s && s !== "unknown" && s !== "unavailable";
      this._lb = [...(lb || []), ...(lbA || [])].filter((r) => r.entity_id && ok(r.state)).map((r) => Object.assign({}, r, { t: new Date(r.when).getTime() }));
      this._by = ((byH && byH[0]) || []).filter((x) => ok(x.state)).map((x) => ({ t: new Date(x.last_changed).getTime(), by: x.state }));
      this._cb = [];
      for (const series of cbH || []) for (const x of series || []) { const cb = x.attributes && x.attributes.changed_by; if (cb) this._cb.push({ t: new Date(x.last_changed || x.last_updated).getTime(), by: cb }); }
      this._lbErr = false;
    } catch (e) { this._lbErr = true; }
    this._render();
  }

  /* ---------- helpers ---------- */
  _s(e) { return this._hass.states[e]; }
  _sen() {
    return this._c.sensors.map((cfg) => {
      const s = this._s(cfg.entity), b = cfg.battery && this._s(cfg.battery), t = cfg.tamper && this._s(cfg.tamper);
      const bat = b && !isNaN(parseFloat(b.state)) ? Math.round(parseFloat(b.state)) : null;
      const lastOn = this._lb.filter((r) => r.entity_id === cfg.entity && r.state === "on").reduce((m, r) => Math.max(m, r.t), 0) || null;
      return Object.assign({}, cfg, { state: s ? s.state : "unavailable", changed: s ? new Date(s.last_changed).getTime() : 0, lastOn,
        bat, tamper: t && t.state === "on", na: !s || s.state === "unavailable" || s.state === "unknown" });
    });
  }
  _sname(s) { return s.kind === "win" ? s.name + " window" : s.name; }
  _ago(ms, phone) {
    const s = (Date.now() - ms) / 1000;
    if (s < 60) return "just now"; if (s < 3600) return Math.round(s / 60) + " min ago";
    if (dayStart(ms) === dayStart(Date.now())) return (phone ? "" : "since ") + fT(ms);
    return (phone ? "" : "since ") + fD(ms).slice(0, 5) + (phone ? "" : " " + fT(ms));
  }
  _person(uid) { return Object.values(this._hass.states).find((s) => s.entity_id.startsWith("person.") && s.attributes.user_id === uid); }
  _personByName(n) { return Object.values(this._hass.states).find((s) => s.entity_id.startsWith("person.") && (s.attributes.friendly_name || "").split(" ")[0].toLowerCase() === String(n).toLowerCase()); }
  _who(r) { // same priority as alarm-activity-card
    if (!r || !r.entity_id.startsWith("alarm_control_panel.")) return null;
    const cb = this._cb.find((x) => Math.abs(x.t - r.t) <= 5000);
    if (cb) return this._pb(this._personByName(cb.by), cb.by);
    let best = null, bd = 10000;
    for (const b of this._by) { const d = Math.abs(b.t - r.t); if (d < bd) { bd = d; best = b.by; } }
    if (best) return best === "hand" ? { name: "hand", hand: true } : this._pb(this._personByName(best), best);
    if (!r.context_user_id) return null;
    const p = this._person(r.context_user_id);
    if (p) return this._pb(p, p.attributes.friendly_name);
    return { name: this._c.automation_name, auto: true };
  }
  _pb(p, fb) { const n = p ? (p.attributes.friendly_name || fb).split(" ")[0] : fb; return { name: n, pic: p && p.attributes.entity_picture }; }
  _whoHtml(w, short) {
    if (!w) return "";
    if (w.auto) return `<div class="by"><span class="bot"><img src="${esc(this._c.automation_icon)}" onerror="this.replaceWith('⚙')"></span>${short ? "" : "by "}${esc(w.name)}${short ? "" : " (automation)"}</div>`;
    if (w.hand) return `<div class="by"><span class="bot">✋</span>${short ? "" : "by "}hand</div>`;
    return `<div class="by">${w.pic ? `<img src="${esc(w.pic)}">` : `<span class="bot">${esc(w.name[0])}</span>`}${short ? "" : "by "}${esc(w.name)}</div>`;
  }
  _alarmName(e) { const a = this._c.alarms.find((x) => x.entity === e); return a ? a.name : e; }
  _rows() { // logbook -> story rows (open+close pair = one row), newest first
    const kind = {}; this._c.sensors.forEach((s) => (kind[s.entity] = s.kind));
    const asc = [...this._lb].sort((a, b) => a.t - b.t); const rows = []; const oa = {};
    for (const a of asc) {
      if (a.entity_id.startsWith("alarm_control_panel.")) { rows.push({ t: a.t, k: "alarm", e: a.entity_id, s: a.state, raw: a }); continue; }
      const k = kind[a.entity_id]; if (!k || k === "mot") continue;
      if (a.state === "on") { oa[a.entity_id] = rows.length; rows.push({ t: a.t, k, e: a.entity_id, open: true }); }
      else if (a.state === "off" && oa[a.entity_id] !== undefined) { const r = rows[oa[a.entity_id]]; r.open = false; r.dur = (a.t - r.t) / 1000; delete oa[a.entity_id]; }
    }
    // a row still marked open whose sensor is now closed: close it at its last change
    rows.forEach((r) => { if (r.open) { const s = this._s(r.e); if (s && s.state === "off") { r.open = false; r.dur = Math.max(0, (new Date(s.last_changed).getTime() - r.t) / 1000); } } });
    return rows.reverse();
  }
  _trigWhy(r) { // the sensor of that alarm that went on/opened last before the trigger (60 s window)
    const al = r.e; const ss = this._c.sensors.filter((s) => s.alarm === al).map((s) => s.entity);
    const cand = this._lb.filter((x) => ss.includes(x.entity_id) && x.state === "on" && x.t <= r.t + 2000 && x.t >= r.t - 60000).sort((a, b) => b.t - a.t)[0];
    if (!cand) return "";
    const s = this._c.sensors.find((x) => x.entity === cand.entity_id);
    return s.kind === "mot" ? this._sname(s) + " detected motion while armed" : this._sname(s) + " opened while armed";
  }
  _ready(a, sen) { // per-mode check from Alarmo's own sensor modes; doors/windows only
    const st = this._s(a.entity); const armed = st && st.state.startsWith("armed");
    const arm = a.modes.filter((m) => m !== "disarmed");
    const open = sen.filter((s) => s.alarm === a.entity && s.kind !== "mot" && s.state === "on");
    if (!open.length) return { cls: "", txt: "✓ Ready to arm: everything closed" };
    const names = open.length > 3 ? open.length + " doors and windows are" : open.map((s) => this._sname(s)).join(", ") + (open.length > 1 ? " are" : " is");
    if (armed) return { cls: "bad", txt: "⚠ " + names + " open" };
    const blocked = arm.filter((m) => open.some((s) => (s.modes || arm).includes(m)));
    const fine = arm.filter((m) => !blocked.includes(m));
    const it = open.length > 1 ? "them" : "it";
    let txt = "⚠ " + names + " open — close " + it + " before arming";
    if (blocked.length && fine.length) txt += " " + blocked.map((m) => SC_BTN[m]).join("/") + " (" + fine.map((m) => SC_BTN[m]).join("/") + " is OK)";
    return { cls: "bad", txt };
  }
  _lastWho(e) { const r = [...this._lb].filter((x) => x.entity_id === e).sort((a, b) => b.t - a.t).find((x) => this._who(x)); return r ? this._who(r) : null; }

  /* ---------- actions ---------- */
  async _arm(e, mode) {
    const svc = SC_SVC[mode]; if (!svc) return;
    delete this._err[e];
    try { await this._hass.callService("alarm_control_panel", svc, { entity_id: e }); }
    catch (err) { this._err[e] = (err && err.message) || "Home Assistant refused the change"; setTimeout(() => { delete this._err[e]; this._render(); }, 10000); }
    this._render();
  }

  /* ---------- build + render ---------- */
  _build() {
    const ph = this._c.layout === "phone";
    this._root.innerHTML = `<style>${SC_CSS}</style><ha-card class="${ph ? "ph" : "dk"}">${ph ? this._phoneSkel() : this._deskSkel()}</ha-card>`;
    const R = this._root;
    R.addEventListener("click", (ev) => {
      const t = ev.composedPath().find((n) => n.dataset && (n.dataset.act || n.dataset.e || n.dataset.m)); if (!t) return;
      const d = t.dataset;
      if (d.act === "arm") return this._arm(d.ent, d.mode);
      if (d.act === "filt") { this._ui.filt = d.v; return this._render(); }
      if (d.act === "more") { this._ui.showAll = !this._ui.showAll; return this._render(); }
      if (d.act === "grp") { this._ui.open[d.v] = !this._ui.open[d.v]; return this._render(); }
      if (d.act === "map") { this._ui.mapOpen = !this._ui.mapOpen; return this._render(); }
      if (d.act === "floor") { this._ui.floor = d.v; return this._render(); }
      if (d.e) return this._openHist(d.e);
      if (d.m) return this._openHist(d.m);
    });
    if (!ph) {
      R.addEventListener("mousemove", (ev) => { const g = ev.composedPath().find((n) => n.classList && n.classList.contains("sn")); if (g) this._showTip(g.dataset.e, ev); else this._hideTip(); });
      R.addEventListener("mouseleave", () => this._hideTip());
    }
    this._sig = "";
    if (this._hass) this._render();
  }
  _deskSkel() {
    return `<div class="hero" id="hero"><div class="shield"><svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="${SC_ICON.shieldO}"/></svg></div>
      <div><div class="ht" id="ht"></div><div class="hs" id="hs"></div></div><div class="chips" id="chips"></div></div>
      <div class="grid"><div class="col"><h3>Alarm</h3><div id="panels"></div></div>
      <div class="col"><h3>House <span class="r" id="planr"></span></h3>${SC_PLAN}
      <div class="legend"><span><i class="lg" style="background:var(--sc-gr)"></i>closed</span><span><i class="lg" style="background:var(--sc-am)"></i>open</span><span><i class="lg" style="background:rgba(255,201,77,.35)"></i>motion / presence</span><span><i class="lg" style="background:repeating-linear-gradient(90deg,var(--sc-gr) 0 3px,transparent 3px 7px)"></i>low battery</span><span><i class="lg" style="background:var(--sc-pu)"></i>alarm set · motion armed</span><span style="margin-left:auto">tap anything for its history</span></div></div>
      <div class="col actc"><h3>Activity <span class="r">today</span></h3><div class="filters" id="filters"></div><div class="acts" id="acts"></div></div></div>
      <div class="health"><div class="groups" id="groups"></div></div>`;
  }
  _phoneSkel() {
    return `<div class="hero" id="hero"><div class="shield"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="${SC_ICON.shieldO}"/></svg></div>
      <div style="flex:1;min-width:0"><div class="ht" id="ht"></div><div class="hs" id="hs"></div><div class="chips" id="chips"></div></div></div>
      <div class="blk" id="pinw" style="display:none;border-bottom:0;padding-bottom:0"></div>
      <div class="blk" id="panels"></div><div id="groups"></div>
      <div><div class="ah"><span class="t">Activity</span></div><div class="filters" id="filters"></div><div class="acts" id="acts"></div><button class="more" id="more" data-act="more"></button></div>
      <button class="mapbtn" data-act="map"><span>🗺</span>Map<span class="ch" id="mapch">›</span></button>
      <div class="mapw" id="mapw" style="display:none"><div class="floors" id="floors"></div>${SC_PLAN}</div>`;
  }
  _render() {
    if (!this._hass || !this._root || !this._root.getElementById("hero")) return;
    const ph = this._c.layout === "phone", $ = (id) => this._root.getElementById(id);
    { const ink = getComputedStyle(this).getPropertyValue("--primary-text-color").trim(), m = ink.match(/^#?([0-9a-f]{6})$/i);
      const lum = m ? (parseInt(m[1].slice(0, 2), 16) * .299 + parseInt(m[1].slice(2, 4), 16) * .587 + parseInt(m[1].slice(4, 6), 16) * .114) : 255;
      const hc = this._root.querySelector("ha-card"); if (hc) hc.classList.toggle("lt", lum < 128); } // light theme -> darker accents
    const sen = this._sen(), c = this._c;
    const dw = sen.filter((s) => s.kind !== "mot"), open = dw.filter((s) => s.state === "on");
    const oD = open.filter((s) => s.kind === "door"), oW = open.filter((s) => s.kind === "win");
    const nD = dw.filter((s) => s.kind === "door").length, nW = dw.filter((s) => s.kind === "win").length;
    const alarms = c.alarms.map((a) => Object.assign({}, a, { st: this._s(a.entity) }));
    const trig = alarms.some((a) => a.st && a.st.state === "triggered");
    const mot = sen.filter((s) => s.kind === "mot" && s.state === "on");
    const low = sen.filter((s) => s.bat !== null && s.bat <= SC_LOW), tam = sen.filter((s) => s.tamper), na = sen.filter((s) => s.na);
    // hero
    $("hero").className = "hero" + (ph ? " blk" : "") + (trig ? " alarm" : open.length ? " warn" : "");
    const grp = (o, n, lab) => !o.length ? "" : o.length === n ? `${lab}: all ${n}` : o.length > 3 ? `${lab}: ${o.length} of ${n}` : `${lab}: ` + o.map((x) => x.name.replace(" Door", "")).join(", ");
    $("ht").textContent = trig ? "Alarm triggered" : !open.length ? "All secure" : open.length === 1 ? this._sname(open[0]) + " is open" : open.length === nD + nW ? "Everything is open" : open.length + " doors and windows open";
    $("hs").textContent = trig ? alarms.filter((a) => a.st && a.st.state === "triggered").map((a) => a.name).join(", ") + " alarm is sounding" : !open.length ? `All ${nD + nW} doors and windows closed` : open.length === 1 ? "Everything else is closed" : [grp(oD, nD, "Doors"), grp(oW, nW, "Windows")].filter(Boolean).join(" · ");
    if (ph) {
      $("chips").innerHTML = low.map((s) => `<span class="chip">🔋 ${esc(s.name)} ${s.bat}%</span>`).join("") + tam.map((s) => `<span class="chip r">Tamper: ${esc(s.name)}</span>`).join("") + na.map((s) => `<span class="chip r">Offline: ${esc(s.name)}</span>`).join("");
    } else {
      const ch = alarms.map((a) => { const s = a.st ? a.st.state : "unavailable"; return `<div class="chip"><span class="dot ${s.startsWith("armed") ? "p" : s === "triggered" ? "r" : ""}"></span>${esc(a.name)} <b>${SC_STATE[s] || s}</b></div>`; });
      ch.push(`<div class="chip"><span class="dot ${mot.length ? "a" : ""}"></span>Motion <b>${mot.length ? mot.map((s) => esc(s.name)).join(", ") : "none"}</b></div>`);
      ch.push(`<div class="chip"><span class="dot ${low.length ? "a" : "g"}"></span>${low.length ? `<b>${low.map((s) => esc(s.name)).join(", ")}</b> battery ${low.map((s) => s.bat + "%").join(", ")}` : "Batteries <b>OK</b>"}</div>`);
      if (tam.length) ch.push(`<div class="chip"><span class="dot r"></span>Tamper <b>${tam.map((s) => esc(s.name)).join(", ")}</b></div>`);
      if (na.length) ch.push(`<div class="chip"><span class="dot r"></span>Offline <b>${na.map((s) => esc(s.name)).join(", ")}</b></div>`);
      $("chips").innerHTML = ch.join("");
    }
    const rows = this._rows();
    // pinned trigger (phone, last 24 h)
    if (ph) {
      const lt = rows.find((r) => r.k === "alarm" && r.s === "triggered" && Date.now() - r.t < SC_DAY);
      const pw = $("pinw"); pw.style.display = lt ? "block" : "none";
      if (lt) { const d = rows.find((r) => r.e === lt.e && r.s === "disarmed" && r.t > lt.t); const w = d && this._who(d.raw);
        pw.innerHTML = `<div class="pin"><span style="color:var(--sc-rd);font-size:16px">⚠</span><div><b>${esc(this._alarmName(lt.e))} alarm triggered · ${fT(lt.t)}${dayStart(lt.t) !== dayStart(Date.now()) ? " yesterday" : ""}</b><br><span class="s">${esc(this._trigWhy(lt) || "")}${d ? ` · disarmed ${fT(d.t)}${w ? " by " + esc(w.name) : ""}` : ""}</span></div></div>`; }
    }
    // alarm panels
    $("panels").innerHTML = alarms.map((a, i) => {
      const s = a.st ? a.st.state : "unavailable", armed = s.startsWith("armed"), tr = s === "triggered", busy = s === "arming" || s === "pending";
      const next = a.st && a.st.attributes.next_state;
      const rd = this._ready(a, sen), w = this._lastWho(a.entity);
      const lastT = rows.find((r) => r.e === a.entity && r.s === "triggered" && dayStart(r.t) === dayStart(Date.now()));
      const lab = (m) => (a.labels && a.labels[m]) || (m === "disarmed" && i === 0 ? "Disarmed" : SC_BTN[m]);
      const btns = a.modes.map((m) => `<button data-act="arm" data-ent="${esc(a.entity)}" data-mode="${m}" class="${s === m ? "on" : ""} ${m !== "disarmed" ? "arm" : ""} ${busy && next === m ? "next" : ""}" ${!a.st || s === "unavailable" ? "disabled" : ""}>${ph ? "" : `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="${SC_MODE_ICON[m]}"/></svg>`}${lab(m)}</button>`).join("");
      const lastA = this._lb.filter((r) => r.entity_id === a.entity && r.state === s).reduce((m, r) => Math.max(m, r.t), 0);
      const since = lastA ? this._ago(lastA, ph) : "";
      const err = this._err[a.entity] ? `<div class="ready err">✕ ${esc(this._err[a.entity])}</div>` : "";
      const readyH = (ph && !rd.cls) ? "" : `<div class="ready ${rd.cls}">${rd.txt}</div>`;
      const icon = `<svg width="${ph ? 16 : 20}" height="${ph ? 16 : 20}" viewBox="0 0 24 24" fill="currentColor"><path d="${SC_MODE_ICON[armed ? s : "disarmed"] || SC_ICON.lock}"/></svg>`;
      if (ph) return `${i ? '<div class="sep"></div>' : ""}<div class="al ${armed ? "armed" : ""} ${tr ? "trig" : ""} ${busy ? "busy" : ""}"><div class="ic">${icon}</div><div><div class="aln">${esc(a.name)}</div><div class="als">${SC_STATE[s] || s}</div></div><div class="alw">${since}${this._whoHtml(w, true)}</div></div>
        <div class="seg ${a.modes.length < 3 ? "slim" : ""}">${btns}</div>${readyH}${err}`;
      return `<div class="ap ${armed ? "armed" : ""} ${tr ? "trig" : ""} ${busy ? "busy" : ""}"><div class="aph"><div class="ic">${icon}</div><div><div class="apn">${esc(a.name)}</div><div class="aps">${SC_STATE[s] || s}</div></div><div class="since">${since}${this._whoHtml(w).replace('class="by"', 'class="by r"').replace(" (automation)", "")}</div></div>
        <div class="btns">${btns}</div>${readyH}${err}${lastT ? `<div class="ready tr">Last triggered today ${fT(lastT.t)}</div>` : ""}</div>`;
    }).join("");
    // plan
    const byE = {}; sen.forEach((s) => (byE[s.entity] = s));
    this._root.querySelectorAll(".sn").forEach((g) => { const s = byE[g.dataset.e]; if (!s) return; g.classList.toggle("open", s.state === "on"); g.classList.toggle("low", s.bat !== null && s.bat <= SC_LOW); g.classList.toggle("off", s.na); });
    this._root.querySelectorAll(".room.mot").forEach((r) => { const s = byE[r.dataset.m]; r.classList.toggle("det", !!s && s.state === "on");
      // his idea 18-11: a room whose motion sensor is armed in the alarm's current mode (Alarmo's own modes) fills purple
      const al = s && this._s(s.alarm), m = al ? al.state : ""; r.classList.toggle("armed", !!s && m.startsWith("armed") && (s.modes || []).includes(m)); });
    { const svg = this._root.querySelector(".plan"); if (svg) alarms.forEach((a) => { if (!a.plan) return; const x = a.plan === "shed" ? "s" : "h", st = a.st ? a.st.state : "";
      svg.classList.toggle(x + "-armed", st.startsWith("armed")); svg.classList.toggle(x + "-busy", st === "arming" || st === "pending"); svg.classList.toggle(x + "-trig", st === "triggered"); }); }
    if (!ph) $("planr").textContent = mot.length ? "motion: " + mot.map((s) => s.name).join(", ") : "no motion";
    // groups
    const G = [["door", "Doors"], ["win", "Windows"], ["mot", "Motion & Presence"]];
    const tile = (s) => { const on = s.state === "on", low = s.bat !== null && s.bat <= SC_LOW;
      const stx = s.na ? "Offline" : s.kind === "mot" ? (on ? "Detected" : "Clear") : (on ? "Open" : "Closed");
      const bat = s.bat === null ? "" : ph ? (low ? `<span class="bat low">🔋 ${s.bat}%</span>` : "") : `<span class="bat ${low ? "low" : ""}">${low ? `<i style="--p:${s.bat}"></i>` : ""}${s.bat}%</span>`;
      const when = (ms) => dayStart(ms) === dayStart(Date.now()) ? fT(ms) : fD(ms).slice(0, 5);
      const sub = s.na ? "" : on ? (s.lastOn ? " · since " + when(s.lastOn) : "") : s.lastOn ? (s.kind === "mot" ? " · motion " : " · opened ") + when(s.lastOn) : "";
      return `<div class="ti ${s.kind === "mot" ? "mot" : ""} ${on ? (s.kind === "mot" ? "det" : "open") : ""} ${s.na ? "off" : ""}" data-e="${esc(s.entity)}"><span class="st"></span><div><div class="n">${esc(s.name)}${s.tamper ? '<span class="tamp">tamper</span>' : ""}</div><div class="s">${stx}${sub}</div></div>${bat}</div>`; };
    $("groups").innerHTML = G.map(([k, n]) => {
      const g = sen.filter((s) => s.kind === k); if (!g.length) return "";
      const op = g.filter((s) => s.state === "on");
      if (!ph) { const r = k === "mot" ? (op.length ? op.length + " detected" : "all clear") : (op.length ? op.length + " open" : "all closed");
        return `<div><h3>${n} <span class="r">${r}</span></h3><div class="gl">${g.map(tile).join("")}</div></div>`; }
      const v = k === "mot" ? (op.length ? op.map((s) => esc(s.name)).join(", ") : "all clear") : (op.length ? op.length + " open" : "all closed ✓");
      const cls = k === "mot" ? "" : op.length ? "w" : "ok";
      const ex = g.filter((s) => (k !== "mot" && s.state === "on") || (s.bat !== null && s.bat <= SC_LOW) || s.tamper || s.na);
      const isO = this._ui.open[k];
      return `<div class="gh ${isO ? "open" : ""}" data-act="grp" data-v="${k}"><span class="t">${n}</span><span class="v ${cls}">${v}</span><span class="ch">›</span></div>` +
        (isO ? `<div class="gb"><div class="g2">${g.map(tile).join("")}</div></div>` : ex.length ? `<div class="ex">${ex.map(tile).join("")}</div>` : "");
    }).join("");
    // activity
    const today = rows.filter((r) => dayStart(r.t) === dayStart(Date.now()));
    const cnt = (k) => k === "all" ? today.length : today.filter((r) => r.k === k).length;
    const f = today.filter((r) => this._ui.filt === "all" || r.k === this._ui.filt);
    const fe = $("filters");
    fe.style.display = ph && !this._ui.showAll ? "none" : "flex";
    fe.innerHTML = [["all", "All"], ["alarm", "Alarm"], ["door", "Doors"], ["win", "Windows"]].map(([k, n]) => `<button data-act="filt" data-v="${k}" class="${this._ui.filt === k ? "on" : ""}">${n} ${cnt(k)}</button>`).join("");
    const list = ph && !this._ui.showAll ? today.slice(0, 4) : f;
    const sn = {}; sen.forEach((s) => (sn[s.entity] = s));
    let html = ph ? "" : `<div class="dayl">Today · ${fD(Date.now())}</div>`;
    if (this._lbErr) html += `<div class="empty">Couldn’t load activity</div>`;
    else if (!list.length) html += `<div class="empty">Nothing yet today</div>`;
    html += list.map((r) => {
      if (r.k === "alarm") { const cl = r.s === "triggered" ? "trig" : r.s.startsWith("armed") ? "arm" : "";
        const txt = r.s === "triggered" ? (ph ? "<b>alarm triggered</b>" : "ALARM TRIGGERED") : (SC_STATE[r.s] || r.s).replace("…", "").toLowerCase();
        const why = r.s === "triggered" ? `<div class="w">${esc(this._trigWhy(r))}</div>` : "";
        return `<div class="act ${cl}"><span class="d"></span><div><b>${esc(this._alarmName(r.e))}</b> ${txt}${why}${this._whoHtml(this._who(r.raw))}</div><div class="t">${fT(r.t, !ph)}</div></div>`; }
      const s = sn[r.e];
      return `<div class="act ${r.open ? "open" : ""}"><span class="d"></span><div><b>${esc(this._sname(s))}</b> opened${!ph && r.open ? " — still open" : ""}<div class="w">${r.open ? (ph ? "still open" : "") : "closed after " + fDur(r.dur)}</div></div><div class="t">${fT(r.t, !ph)}</div></div>`;
    }).join("");
    $("acts").innerHTML = html;
    if (ph) {
      $("more").style.display = today.length > 4 || this._ui.showAll ? "block" : "none";
      $("more").textContent = this._ui.showAll ? "Show less" : `Show all (${today.length} today)`;
      $("mapw").style.display = this._ui.mapOpen ? "block" : "none"; $("mapch").textContent = this._ui.mapOpen ? "⌄" : "›";
      $("floors").innerHTML = [["g", "Ground"], ["f", "First"], ["s", "Yard"]].map(([k, n]) => `<button data-act="floor" data-v="${k}" class="${this._ui.floor === k ? "on" : ""}">${n}</button>`).join("");
      if (this._ui.mapOpen) requestAnimationFrame(() => this._sizeMap());
    }
  }
  _sizeMap() { // box = exact shape of the floor's viewBox, so no neighbouring floor shows at the edges
    const svg = this._root.querySelector(".plan"); if (!svg) return;
    svg.setAttribute("viewBox", { g: "15 30 270 520", f: "315 30 270 400", s: "610 70 122 142" }[this._ui.floor]);
    const vb = svg.getAttribute("viewBox").split(" ").map(Number), W = svg.parentElement.clientWidth - 28 || 320, h = Math.min(430, W * vb[3] / vb[2]);
    svg.style.width = (h * vb[2] / vb[3]) + "px"; svg.style.height = h + "px"; svg.style.margin = "0 auto";
  }

  /* ---------- body-level popup + tooltip ---------- */
  _pop() {
    if (this._popHost && this._popHost.isConnected) return this._popRoot;
    const host = document.createElement("security-card-popup"); document.body.appendChild(host);
    const r = host.attachShadow({ mode: "open" });
    r.innerHTML = `<style>${SC_POP_CSS}</style><div class="hm" id="hm"><div class="hp" id="hp"></div></div><div class="tip" id="tip"></div>`;
    r.getElementById("hm").addEventListener("click", (ev) => {
      if (ev.target.id === "hm") return this._closeHist();
      const t = ev.composedPath().find((n) => n.dataset && (n.dataset.day || n.dataset.x)); if (!t) return;
      if (t.dataset.x) return this._closeHist();
      this._hist.day = +t.dataset.day; this._renderHist();
    });
    this._esc = (ev) => { if (ev.key === "Escape") this._closeHist(); };
    document.addEventListener("keydown", this._esc);
    this._popHost = host; this._popRoot = r; return r;
  }
  _showTip(e, ev) {
    const s = this._sen().find((x) => x.entity === e); if (!s) return;
    const t = this._pop().getElementById("tip"); t.style.display = "block";
    t.style.left = Math.min(ev.clientX + 14, window.innerWidth - 220) + "px"; t.style.top = (ev.clientY + 10) + "px";
    const on = s.state === "on";
    t.innerHTML = `<b>${esc(this._sname(s))}</b>${s.na ? '<span class="r">Offline</span>' : on ? '<span class="a">Open</span>' : "Closed"}${s.lastOn ? " · last opened " + (dayStart(s.lastOn) === dayStart(Date.now()) ? fT(s.lastOn) : fD(s.lastOn).slice(0, 5)) : ""}<br>${s.bat !== null ? `Battery ${s.bat}%${s.bat <= SC_LOW ? ' <span class="a">low</span>' : ""} · ` : ""}tamper ${s.tamper ? '<span class="r">ALERT</span>' : "OK"}<br><span class="m">tap for history</span>`;
  }
  _hideTip() { if (this._popRoot) this._popRoot.getElementById("tip").style.display = "none"; }
  async _openHist(e) {
    this._hideTip();
    const r = this._pop(), now = Date.now();
    this._hist = { e, day: dayStart(now), rows: null, now };
    r.getElementById("hm").className = "hm show" + (this._c.layout === "phone" ? " sheet" : "");
    this._renderHist();
    try {
      const start = new Date(dayStart(now) - 6 * SC_DAY).toISOString();
      const res = await this._hass.callWS({ type: "history/history_during_period", start_time: start, end_time: new Date(now + 60000).toISOString(),
        entity_ids: [e], minimal_response: true, no_attributes: true, significant_changes_only: false });
      if (!this._hist || this._hist.e !== e) return;
      this._hist.rows = (res[e] || []).map((x) => [Math.round((x.lc || x.lu) * 1000), x.s]);
    } catch (err) { if (this._hist) this._hist.rows = []; }
    this._renderHist();
  }
  _closeHist() { if (this._popRoot) this._popRoot.getElementById("hm").className = "hm"; this._hist = null; }
  _renderHist() {
    const H = this._hist; if (!H) return;
    const s = this._sen().find((x) => x.entity === H.e); if (!s) return;
    const isMot = s.kind === "mot", on = s.state === "on", now = Date.now();
    const word = isMot ? "detected" : "opened", W = isMot ? "Detected" : "Opened";
    const stTxt = s.na ? "Offline" : isMot ? (on ? "Detected" : "Clear") : (on ? "Open" : "Closed");
    let h = `<div class="hh"><span class="nm">${esc(this._sname(s))}</span><span class="pill ${on ? "on" : "off"}">${stTxt}</span><button class="x" data-x="1">×</button></div>
      <div class="sub">${s.kind === "door" ? "Door" : s.kind === "win" ? "Window" : "Motion / presence"}${s.bat !== null ? " · battery " + s.bat + " %" : ""}${s.tamper ? ' · <span style="color:var(--sc-rd)">tamper alert</span>' : ""}</div>`;
    if (!H.rows) { this._popRoot.getElementById("hp").innerHTML = h + `<div class="empty">Loading history…</div>`; return; }
    const rows = H.rows, sp = [];
    rows.forEach((r, i) => { const a = r[0], b = i + 1 < rows.length ? rows[i + 1][0] : now; if (b > a) sp.push({ a, b, s: r[1] }); });
    const first = sp.length ? sp[0].a : now, today = dayStart(now);
    h += `<div class="lbl"><span>Last 7 days</span><span>tap a day</span></div>`;
    for (let k = 0; k < 7; k++) {
      const d0 = dayStart(today - k * SC_DAY + 3600000), d1 = dayStart(d0 + SC_DAY + 3600000), len = d1 - d0, end = Math.min(d1, now);
      let bars = "", n = 0, onS = 0;
      if (first > d0) bars += `<i class="nd" style="left:0;width:${Math.min(100, (Math.min(first, d1) - d0) / len * 100)}%"></i>`;
      sp.forEach((x) => { if (x.s === "off" || x.b <= d0 || x.a >= d1) return; const a = Math.max(x.a, d0), b = Math.min(x.b, d1);
        if (x.s === "on") { if (x.a >= d0) n++; onS += (b - a) / 1000; }
        bars += `<i class="${x.s === "on" ? "" : "u"}" style="left:${(a - d0) / len * 100}%;width:${(b - a) / len * 100}%"></i>`; });
      if (now < d1) bars += `<i class="nd" style="left:${(now - d0) / len * 100}%;width:${(d1 - now) / len * 100}%;opacity:.35"></i>`;
      const dt = new Date(d0), nod = first >= end;
      h += `<div class="day ${d0 === H.day ? "sel" : ""}" data-day="${d0}"><span class="d">${k === 0 ? "Today" : WD[dt.getDay()]} ${pad(dt.getDate())}-${pad(dt.getMonth() + 1)}</span><div class="bar ${isMot ? "m" : ""}">${bars}</div><span class="c">${nod ? "no data" : n ? `<b>${n}×</b> · ${fDur(onS)}` : isMot ? "none" : "closed"}</span></div>`;
    }
    h += `<div class="axis"><span></span><span><em>00</em><em>06</em><em>12</em><em>18</em><em>24</em></span><span></span></div>`;
    h += `<div class="key"><span><i style="background:${isMot ? "rgba(127,140,170,.3)" : "rgba(61,220,132,.35)"}"></i>${isMot ? "clear" : "closed"}</span><span><i style="background:var(--sc-am)"></i>${isMot ? "detected" : "open"}</span><span><i style="background:repeating-linear-gradient(45deg,rgba(127,140,170,.6) 0 3px,transparent 3px 6px)"></i>offline</span><span><i style="background:repeating-linear-gradient(45deg,rgba(127,140,170,.3) 0 3px,transparent 3px 6px)"></i>no data (recorder keeps 7 days)</span></div>`;
    const d0 = H.day, d1 = dayStart(d0 + SC_DAY + 3600000), dt = new Date(d0);
    const evs = sp.filter((x) => x.s !== "off" && x.a >= d0 && x.a < d1 && (x.s === "on" || x.b - x.a >= 600000)).reverse();
    h += `<div class="lbl"><span>${d0 === today ? "Today" : WD[dt.getDay()]} ${fD(d0)}</span><span>${evs.filter((x) => x.s === "on").length} ${word}</span></div>`;
    if (!evs.length) h += `<div class="empty">${first >= Math.min(d1, now) ? "No data for this day (older than the recorder keeps, or before this sensor was recorded)." : isMot ? "No motion this day." : "Not opened this day."}</div>`;
    evs.forEach((x) => { const still = x.b >= now && x.s === "on";
      h += x.s === "on" ? `<div class="ev"><span class="t">${fT(x.a, true)}</span><span class="dt"></span><div>${W}<div class="s">${still ? (isMot ? "still detected" : "still open") : (isMot ? "clear after " : "closed after ") + fDur((x.b - x.a) / 1000)}</div></div></div>`
        : `<div class="ev"><span class="t">${fT(x.a, true)}</span><span class="dt u"></span><div>Offline<div class="s">for ${fDur((x.b - x.a) / 1000)}</div></div></div>`; });
    this._popRoot.getElementById("hp").innerHTML = h;
  }
}
customElements.define("security-card", SecurityCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "security-card", name: "Security Card", description: "Alarm, house plan, activity, sensors and history in one card" });
console.info("%c SECURITY-CARD %c v" + SC_VERSION + " ", "background:#a880ff;color:#fff", "background:#121826;color:#fff");
