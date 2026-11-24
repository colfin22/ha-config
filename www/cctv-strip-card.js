/* cctv-strip-card — across the bottom of the CCTV tab: "Today" (alerts/detections, busiest hour, per-camera 24 h bars, seen today, this week)
 * + "Deliveries & collections" (Frigate courier labels + garbage_truck; one visit = same couriers within 10 min across cameras). Built 18-11-2026 from the accepted mock.
 * Source ~/homelab/cctv-bottom-mock/card/cctv-strip-card.js -> /config/www/cctv-strip-card.js (resource ?v=N, bump on edit).
 * Data: frigate/reviews/get (7 days), refreshed every 5 min and when a camera's last-alert image changes. Tap a delivery = its Frigate clip.
 */
const CS_VERSION = "1";
const CS_CSS = `*{box-sizing:border-box}

:host{--card:var(--ha-card-background,var(--card-background-color,#121826));--deep:var(--secondary-background-color,#0e1420);--bd:var(--divider-color,#1d2740);--ink:var(--primary-text-color,#e8eef7);--sec:var(--secondary-text-color,#7d8aa6);--cy:#35c9e6;--gr:#3ddc84;--am:#ffc94d;--pu:#a880ff;--rd:#ff5a5a;display:block;color:var(--ink)}






.ph .ph .strip{margin:0}.ph .wrap{max-width:410px;margin:10px auto;padding:14px 10px 24px;border:10px solid #1a1f2b;border-radius:40px}
.strip{display:grid;grid-template-columns:calc((100% - 2 * var(--ha-section-grid-column-gap, 32px)) * 2 / 3 + var(--ha-section-grid-column-gap, 32px)) minmax(0,1fr);column-gap:var(--ha-section-grid-column-gap, 32px)}.ph .strip{grid-template-columns:1fr;gap:10px}
.dl img{cursor:pointer}
.card{background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:14px 16px;min-width:0}
h3{margin:0 0 10px;font-size:12px;letter-spacing:.08em;color:var(--sec);font-weight:600;text-transform:uppercase;display:flex;align-items:center;gap:8px}h3 .r{margin-left:auto;text-transform:none;letter-spacing:0;font-weight:400}
.hd{display:flex;align-items:baseline;gap:16px;flex-wrap:wrap;margin-bottom:10px}.hd .big{font-size:26px}.hd .big small{font-size:14px;color:var(--sec)}.hd .s{color:var(--sec);font-size:13px}
.cams{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.ph .cams{grid-template-columns:1fr}
.cam{background:var(--deep);border-radius:10px;padding:9px 10px}.cam .n{font-size:12.5px;display:flex;justify-content:space-between}.cam .n b{font-weight:500}.cam .n span{color:var(--sec);font-size:11.5px}
.cam svg{width:100%;height:34px;display:block;margin-top:6px}
.seen{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.chip{background:var(--deep);border:1px solid var(--bd);border-radius:999px;padding:4px 11px;font-size:12.5px;color:var(--sec)}.chip b{color:var(--ink);font-weight:500}.chip.f{border-color:rgba(53,201,230,.5)}.chip.f b{color:var(--cy)}
.dl .last{display:flex;gap:12px;align-items:center;background:var(--deep);border:1px solid rgba(255,201,77,.4);border-radius:12px;padding:8px}
.dl .last img{width:150px;aspect-ratio:16/9;object-fit:cover;border-radius:8px;flex:none}.ph .dl .last img{width:120px}
.dl .last .t{font-size:18px}.dl .last .s{color:var(--sec);font-size:12.5px}
.dl .rows{margin-top:8px}.dl .row{display:grid;grid-template-columns:72px 1fr auto;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--bd);font-size:13px}.dl .row:last-child{border-bottom:0}
.dl .row img{width:72px;aspect-ratio:16/9;object-fit:cover;border-radius:5px}.dl .row .d{color:var(--sec);font-size:12px;text-align:right;white-space:nowrap}
.pat{margin-top:8px;font-size:12px;color:var(--sec)}
#week svg{width:100%;height:auto;display:block}

`;
class CctvStripCard extends HTMLElement {
  setConfig(c) { this._c = Object.assign({ layout: "desktop", instance_id: "frigate" }, c || {}); if (this._root) this._build(); }
  getCardSize() { return 8; }
  getGridOptions() { return { columns: "full" }; }
  set hass(h) { const first = !this._hass; this._hass = h; if (!this._root) { this._root = this.attachShadow({ mode: "open" }); this._build(); }
    const sig = ["doorbell", "front_van", "front_car", "rear_door", "rear_shed"].map((c) => (h.states["image.cctv_last_alert_" + c] || {}).state).join("|");
    if (first) this._load(); else if (sig !== this._sig) setTimeout(() => this._load(), 5000); this._sig = sig; }
  connectedCallback() { this._t = setInterval(() => this._load(), 5 * 60000); }
  disconnectedCallback() { clearInterval(this._t); }
  _build() {
    this._root.innerHTML = `<style>${CS_CSS}</style><div class="${this._c.layout === "phone" ? "ph" : "dk"}"><div class="strip">
      <div class="card"><h3>📊 Today <span class="r" id="tr"></span></h3><div class="hd" id="hd"></div><div class="cams" id="cams"></div><div class="seen" id="seen"></div><h3 style="margin:14px 0 6px">📅 This week <span class="r">alerts per day</span></h3><div id="week"></div></div>
      <div class="card dl"><h3>📦 Deliveries &amp; collections <span class="r">last 7 days</span></h3><div id="dl"><div class="pat">Loading…</div></div></div></div></div>`;
    this._root.addEventListener("click", (ev) => { const t = ev.composedPath().find((n) => n.dataset && n.dataset.ev !== undefined && n.dataset.cam); if (t) this._clip(t.dataset.ev, t.dataset.cam, t.dataset.lab); });
  }
  async _load() {
    if (!this._hass) return; const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    try { let r = await this._hass.callWS({ type: "frigate/reviews/get", instance_id: this._c.instance_id, after: Math.floor(d0.getTime() / 1000) - 7 * 86400, limit: 3000 });
      if (typeof r === "string") r = JSON.parse(r); this._render(Array.isArray(r) ? r : []); } catch (e) { const el = this._root.getElementById("dl"); if (el) el.innerHTML = '<div class="pat">Couldn’t load Frigate reviews</div>'; }
  }
  _clip(ev, cam, lab) { // same full-screen overlay style as his Where boxes; the clip from Frigate, falls back to the review thumbnail
    if (!ev) return; const o = document.createElement("div"); o.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:zoom-out";
    const v = document.createElement("video"); v.src = `/api/frigate/notifications/${ev}/${cam}/clip.mp4`; v.controls = true; v.autoplay = true; v.muted = true; v.playsInline = true; v.style.cssText = "max-width:95vw;max-height:84vh;border-radius:8px;box-shadow:0 8px 40px #000";
    v.onerror = () => { const i = document.createElement("img"); i.src = `/api/frigate/notifications/${ev}/snapshot.jpg`; i.style.cssText = v.style.cssText; v.replaceWith(i); };
    v.onclick = (e) => e.stopPropagation();
    const c = document.createElement("div"); c.textContent = lab || ""; c.style.cssText = "color:#cfd6e4;font:14px sans-serif;margin-top:10px";
    const k = (e) => { if (e.key === "Escape") { o.remove(); document.removeEventListener("keydown", k); } }; o.onclick = () => { o.remove(); document.removeEventListener("keydown", k); }; document.addEventListener("keydown", k);
    o.append(v, c); document.body.appendChild(o);
  }
  _render(R) {
    const root = this._root, NOW = new Date();
const p2=n=>String(n).padStart(2,'0'),hm=d=>p2(d.getHours())+':'+p2(d.getMinutes()),dm=d=>p2(d.getDate())+'-'+p2(d.getMonth()+1),DN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const CAMS=[['Doorbell','Doorbell'],['Front_Van','Front Van'],['Front_Car','Front Car'],['Rear_Door','Rear Door'],['Rear_Shed','Rear Shed']];
const COUR={an_post:'An Post',dpd:'DPD',dhl:'DHL',ups:'UPS',amazon:'Amazon',fedex:'FedEx',gls:'GLS',package:'Package'};
const DC={...COUR,garbage_truck:'Garbage truck'}; // deliveries & collections (his 19-11: include the garbage truck)
const d0=new Date(NOW);d0.setHours(0,0,0,0);
const today=R.filter(x=>x.start_time*1000>=d0.getTime());
const al=today.filter(x=>x.severity==='alert'),de=today.filter(x=>x.severity==='detection');
// busiest hour
const hrs=Array(24).fill(0);al.forEach(x=>hrs[new Date(x.start_time*1000).getHours()]++);const bh=hrs.indexOf(Math.max(...hrs));
root.getElementById('tr').textContent='since 00:00';
root.getElementById('hd').innerHTML=`<span class="big">${al.length} <small>alerts</small></span><span class="big">${de.length} <small>detections</small></span><span class="s">busiest hour ${p2(bh)}:00–${p2(bh+1)}:00 (${hrs[bh]} alerts)</span>`;
root.getElementById('cams').innerHTML=CAMS.map(([k,n])=>{const a=today.filter(x=>x.camera===k);const A=Array(24).fill(0),Dd=Array(24).fill(0);a.forEach(x=>{const h=new Date(x.start_time*1000).getHours();(x.severity==='alert'?A:Dd)[h]++});
  const mx=Math.max(1,...A.map((v,i)=>v+Dd[i]));let s='<svg viewBox="0 0 240 34" preserveAspectRatio="none">';
  for(let h=0;h<24;h++){const x=h*10+1,ha=30*A[h]/mx,hd=30*Dd[h]/mx;if(hd)s+=`<rect x="${x}" y="${32-ha-hd}" width="8" height="${hd}" fill="#a880ff" opacity=".75"/>`;if(ha)s+=`<rect x="${x}" y="${32-ha}" width="8" height="${ha}" fill="#ffc94d"/>`}
  const nh=NOW.getHours()+NOW.getMinutes()/60;s+=`<line x1="0" x2="240" y1="33" y2="33" stroke="#1d2740"/><rect x="${nh*10}" y="0" width="${240-nh*10}" height="34" fill="rgba(127,140,170,.08)"/></svg>`;
  const last=a.filter(x=>x.severity==='alert').sort((p,q)=>q.start_time-p.start_time)[0];
  return `<div class="cam"><div class="n"><b>${n}</b><span>${(n=>n+' alert'+(n===1?'':'s'))(a.filter(x=>x.severity==='alert').length)}</span></div>${s}<div class="n" style="margin-top:3px"><span>${last?'last '+hm(new Date(last.start_time*1000)):'no alerts'}</span><span>${a.filter(x=>x.severity==='detection').length} det.</span></div></div>`}).join('');
// seen today
const oc={};today.forEach(x=>(x.data.objects||[]).forEach(o=>{o=o.replace('-verified','');if(COUR[o])return;oc[o]=(oc[o]||0)+1}));
const sl={};today.forEach(x=>(x.data.sub_labels||[]).forEach(s=>sl[s]=(sl[s]||0)+1));
const FACES=['Olivia','Colm','Cian','Daire','Aoife'];const IC={person:'🧍',car:'🚗',cat:'🐈',bird:'🐦',dog:'🐕',fox:'🦊'};
root.getElementById('seen').innerHTML=Object.entries(oc).sort((a,b)=>b[1]-a[1]).map(([o,c])=>`<span class="chip">${IC[o]||'•'} ${o==='person'?(c>1?'People':'Person'):o[0].toUpperCase()+o.slice(1).replace(/_/g,' ')+(c>1?'s':'')} <b>${c}</b></span>`).join('')+
  Object.entries(sl).filter(([s])=>FACES.includes(s)).map(([s,c])=>`<span class="chip f">🙂 <b>${s}</b> ${c}×</span>`).join('')/* v5: bird species chips removed (his 24-11 'stop it showing bird types') */||'<span class="chip">Nothing yet today</span>';
// this week: alerts per day, stacked by camera
{const W=900,H=96,L=6,days=[];for(let k=6;k>=0;k--){const t=new Date(d0);t.setDate(d0.getDate()-k);days.push(t)}
 const COL={Doorbell:'#ffc94d',Front_Van:'#35c9e6',Front_Car:'#4c9be8',Rear_Door:'#3ddc84',Rear_Shed:'#a880ff'};
 const cnt=days.map(t=>{const e=new Date(t);e.setDate(t.getDate()+1);return CAMS.map(([k])=>R.filter(x=>x.severity==='alert'&&x.camera===k&&x.start_time*1000>=t&&x.start_time*1000<e).length)});
 const mx=Math.max(1,...cnt.map(c=>c.reduce((a,b)=>a+b,0)));const bw=(W-L*2)/7;let s=`<svg viewBox="0 0 ${W} ${H}">`;
 cnt.forEach((c,i)=>{let y=H-16;c.forEach((v,j)=>{const h=(H-34)*v/mx;if(v){y-=h;s+=`<rect x="${L+i*bw+bw*.2}" y="${y}" width="${bw*.6}" height="${h}" fill="${COL[CAMS[j][0]]}" rx="2"/>`}});
  const tot=c.reduce((a,b)=>a+b,0);s+=`<text x="${L+i*bw+bw/2}" y="${y-4}" text-anchor="middle" font-size="11" fill="#e8eef7">${tot}</text><text x="${L+i*bw+bw/2}" y="${H-3}" text-anchor="middle" font-size="11" fill="#7d8aa6">${i===6?'Today':DN[days[i].getDay()]+' '+dm(days[i])}</text>`});
 root.getElementById('week').innerHTML=s+'</svg><div style="display:flex;gap:12px;flex-wrap:wrap;font-size:11.5px;color:#7d8aa6">'+CAMS.map(([k,n])=>`<span><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${COL[k]};margin-right:5px"></i>${n}</span>`).join('')+'</div>'}
// deliveries: courier objects, one visit = within 10 min across cameras
const dv=R.filter(x=>(x.data.objects||[]).some(o=>DC[o])).sort((p,q)=>q.start_time-p.start_time);const visits=[];
dv.forEach(x=>{const c=(x.data.objects||[]).filter(o=>DC[o]).map(o=>DC[o]);const v=visits.find(v=>Math.abs(v.t-x.start_time)<600&&v.c.join()===c.join());if(v){v.cams.add(x.camera);return}visits.push({t:x.start_time,c,cams:new Set([x.camera]),id:x.id,cam:x.camera,ev:((x.data.detections||[])[0])||''})});
const cn=k=>(CAMS.find(c=>c[0]===k)||[k,k])[1],when=t=>{const d=new Date(t*1000);return (d>=d0?'today':DN[d.getDay()]+' '+dm(d))+' '+hm(d)};
if(visits.length){const L=visits[0];
 const ap=visits.filter(v=>v.c.includes('An Post'));const avg=ap.length>1?ap.reduce((s,v)=>{const d=new Date(v.t*1000);return s+d.getHours()*60+d.getMinutes()},0)/ap.length:null;
 root.getElementById('dl').innerHTML=`<div class="last"><img src="/api/frigate/notifications/${L.id}/${L.cam}/review_thumbnail.webp" data-ev="${L.ev}" data-cam="${L.cam}" data-lab="${L.c.join(', ')} · ${when(L.t)}"><div><div class="t">${L.c.join(', ')}</div><div class="s">${when(L.t)} · ${[...L.cams].map(cn).join(' + ')}</div></div></div>
  <div class="rows">${visits.slice(1,6).map(v=>`<div class="row"><img src="/api/frigate/notifications/${v.id}/${v.cam}/review_thumbnail.webp" data-ev="${v.ev}" data-cam="${v.cam}" data-lab="${v.c.join(', ')} · ${when(v.t)}"><div>${v.c.join(', ')}<div style="color:var(--sec);font-size:11.5px">${[...v.cams].map(cn).join(' + ')}</div></div><div class="d">${when(v.t)}</div></div>`).join('')}</div>
  ${avg!=null?`<div class="pat">An Post came ${ap.length} times this week, usually around ${p2(Math.floor(Math.round(avg)/60))}:${p2(Math.round(avg)%60)}.</div>`:''}`}
else root.getElementById('dl').innerHTML='<div class="pat">No deliveries or collections spotted in the last 7 days.</div>';

  }
}
customElements.define("cctv-strip-card", CctvStripCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "cctv-strip-card", name: "CCTV Strip Card", description: "Today + Deliveries strip for the CCTV tab" });
console.info("%c CCTV-STRIP-CARD %c v" + CS_VERSION + " ", "background:#ffc94d;color:#3a2a00", "background:#121826;color:#fff");
