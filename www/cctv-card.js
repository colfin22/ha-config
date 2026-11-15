/* cctv-card — CCTV tab card (desktop + phone).
 * Live grid (HA's own live picture-entity cards) + NVR panel + ONE timeline:
 * grey = motion, amber = alert, purple = detection, blue marker = where you are.
 * Drag the marker into the past and EVERY tile plays its Frigate recording from that moment.
 * Data: Frigate integration websocket (frigate/reviews/get, frigate/recordings/get)
 * and its recording proxy /api/frigate/recording/<Cam>/start/<s>/end/<e> (signed path).
 */
const TZ = 'Europe/Dublin';
const DAY = 86400;
const CHUNK = 30; // seconds of recording per load
const SPAN = DAY; // timeline shows 24 h at once, blue marker fixed in the middle
const BACK = 10 * DAY; // how far back the bar scrolls (Frigate keeps 10 days continuous)
const BLK = 21600; // motion is fetched in 6 h blocks; past blocks are cached
// Frigate's own logo (bird), from the Frigate web UI favicon
const FRIGATE_SVG = '<svg viewBox="0 0 888 888" aria-hidden="true"><g transform="translate(0,888) scale(0.1,-0.1)" fill="currentColor"><path d="M8228 8865 c-2 -2 -25 -6 -53 -9 -38 -5 -278 -56 -425 -91 -33 -7 -381 -98 -465 -121 -49 -14 -124 -34 -165 -45 -67 -18 -485 -138 -615 -176 -50 -14 -106 -30 -135 -37 -8 -2 -35 -11 -60 -19 -25 -8 -85 -27 -135 -42 -49 -14 -101 -31 -115 -36 -14 -5 -34 -11 -45 -13 -11 -3 -65 -19 -120 -36 -55 -18 -127 -40 -160 -50 -175 -53 -247 -77 -550 -178 -364 -121 -578 -200 -820 -299 -88 -36 -214 -88 -280 -115 -66 -27 -129 -53 -140 -58 -11 -5 -67 -29 -125 -54 -342 -144 -535 -259 -579 -343 -34 -66 7 -145 156 -299 229 -238 293 -316 340 -413 38 -80 41 -152 10 -281 -57 -234 -175 -543 -281 -732 -98 -174 -172 -239 -341 -297 -116 -40 -147 -52 -210 -80 -107 -49 -179 -107 -290 -236 -51 -59 -179 -105 -365 -131 -19 -2 -48 -7 -65 -9 -16 -3 -50 -8 -75 -11 -69 -9 -130 -39 -130 -63 0 -24 31 -46 78 -56 18 -4 139 -8 270 -10 250 -4 302 -11 335 -44 19 -18 19 -23 7 -46 -19 -36 -198 -121 -490 -233 -850 -328 -914 -354 -1159 -473 -185 -90 -337 -186 -395 -249 -60 -65 -67 -107 -62 -350 3 -113 7 -216 10 -230 3 -14 7 -52 10 -85 7 -70 14 -128 21 -170 2 -16 7 -48 10 -70 3 -22 11 -64 16 -94 6 -30 12 -64 14 -75 1 -12 5 -34 9 -51 3 -16 8 -39 10 -50 12 -57 58 -258 71 -310 9 -33 18 -69 20 -79 25 -110 138 -416 216 -582 21 -47 39 -87 39 -90 0 -7 217 -438 261 -521 109 -201 293 -501 347 -564 11 -13 37 -44 56 -68 69 -82 126 -109 160 -75 26 25 14 65 -48 164 -138 218 -142 245 -138 800 2 206 4 488 5 625 1 138 -1 293 -6 345 -28 345 -28 594 -1 760 12 69 54 187 86 235 33 52 188 212 293 302 98 84 108 93 144 121 19 15 52 42 75 61 78 64 302 229 426 313 248 169 483 297 600 326 53 14 205 6 365 -17 33 -5 155 -8 270 -6 179 3 226 7 316 28 58 13 140 25 182 26 82 2 120 6 217 22 73 12 97 16 122 18 12 1 23 21 38 70 l20 68 74 -17 c81 -20 155 -30 331 -45 69 -6 132 -8 715 -20 484 -11 620 -8 729 16 85 19 131 63 98 96 -25 26 -104 34 -302 32 -373 -2 -408 -1 -471 26 -90 37 2 102 171 120 33 3 76 8 95 10 19 2 71 7 115 10 243 17 267 20 338 37 145 36 47 102 -203 137 -136 19 -262 25 -490 22 -124 -2 -362 -4 -530 -4 l-305 -1 -56 26 c-65 31 -171 109 -238 176 -52 51 -141 173 -141 191 0 6 -6 22 -14 34 -18 27 -54 165 -64 244 -12 98 -6 322 12 414 9 47 29 127 45 176 26 80 58 218 66 278 1 11 6 47 10 80 3 33 8 70 10 83 2 13 7 53 11 90 3 37 8 74 9 83 22 118 22 279 -1 464 -20 172 -20 172 70 238 108 79 426 248 666 355 25 11 77 34 115 52 92 42 443 191 570 242 55 22 109 44 120 48 24 11 130 52 390 150 199 75 449 173 500 195 17 7 118 50 225 95 237 100 333 143 490 220 229 113 348 191 337 223 -3 10 -70 20 -79 12z"/></g></svg>';
const HFMT = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' });
// Two palettes: follows each person's HA theme (hass.themes.darkMode). Dark = the original look.
const DARK = { bg: '#0a0e17', card: '#121826', deep: '#0d1220', bd: '#1d2740', ink: '#e8eef7', sec: '#7d8aa6',
  cy: '#35c9e6', am: '#ffc94d', gr: '#3ddc84', pu: '#a880ff', mo: '#3a4560', bi: '#000', fut: '#ffffff0d', amb: '#ffc94d55' };
const LIGHT = { bg: '#f5f7fa', card: '#ffffff', deep: '#eef1f6', bd: '#d3d9e4', ink: '#1a2230', sec: '#535e74',
  cy: '#08718d', am: '#935e00', gr: '#136e3f', pu: '#6a3de8', mo: '#b3bccb', bi: '#fff', fut: '#0000000a', amb: '#935e0066' };
const C = { ...DARK };
const palCss = () => ':host{' + Object.keys(C).map((k) => `--cc-${k}:${C[k]}`).join(';') + '}';

const fmtTime = (t, secs) => new Date(t * 1000).toLocaleTimeString('en-GB',
  { timeZone: TZ, hour: '2-digit', minute: '2-digit', ...(secs ? { second: '2-digit' } : {}) });
const fmtDate = (t) => new Date(t * 1000).toLocaleDateString('en-GB', { timeZone: TZ, day: '2-digit', month: '2-digit' }).replace('/', '-');
const dayStart = () => { // local (Dublin) midnight as epoch seconds
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const g = (k) => +parts.find((p) => p.type === k).value;
  return Math.floor(now.getTime() / 1000) - (g('hour') * 3600 + g('minute') * 60 + g('second'));
};

class CctvCard extends HTMLElement {
  setConfig(config) {
    if (!config.cameras || !config.cameras.length) throw new Error('cameras required');
    this._config = config;
    this._order = config.cameras.map((_, i) => i);
    this._mode = 'live';
    this._t = null;
    this._reviews = [];
    this._mblk = new Map(); this._mload = new Set();
    this._built = false;
  }

  set hass(hass) {
    this._hass = hass;
    const dm = !(hass.themes && hass.themes.darkMode === false);
    if (dm !== this._dm) { // theme switched: swap palette in place (no rebuild, streams keep playing)
      this._dm = dm; Object.assign(C, dm ? DARK : LIGHT);
      const pal = this.shadowRoot && this.shadowRoot.getElementById('pal');
      if (pal) { pal.textContent = palCss(); this._nvrHtml = null; this._revSig = null; this._renderEvents(); this._draw(); }
    }
    if (!this._built) this._build();
    (this._liveCards || []).forEach((c) => { if (c) c.hass = hass; });
    this._renderNvr();
  }

  getCardSize() { return 12; }
  getGridOptions() { return { columns: 'full', rows: 'auto' }; }

  connectedCallback() {
    this._timer = setInterval(() => this._tick(), 1000);
    this._dataTimer = setInterval(() => this._loadReviews(), 60000);
    this._motionTimer = setInterval(() => this._loadMotion(true), 300000);
  }
  disconnectedCallback() {
    clearInterval(this._timer); clearInterval(this._dataTimer); clearInterval(this._motionTimer);
  }

  async _build() {
    this._built = true;
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `
<style id="pal">${palCss()}</style>
<style>
  :host{display:block}
  ha-card{background:var(--cc-card);border:1px solid var(--cc-bd);border-radius:12px;padding:12px;color:var(--cc-ink);font-family:var(--ha-font-family-body,Roboto,sans-serif)}
  .grid{display:grid;grid-template-columns:repeat(var(--cols,3),1fr);gap:8px}
  .tile{position:relative;aspect-ratio:16/9;border-radius:8px;overflow:hidden;background:#000;cursor:pointer;outline:2px solid transparent}
  .tile.big{grid-column:span 2;grid-row:span 2}
  .strip .tile.big{grid-column:1 / -1;grid-row:auto}
  .strip .tile:not(.big) .lbl,.strip .tile:not(.big) .rec{display:none !important}
  .strip{gap:4px}
  .strip .tile{border-radius:6px}
  .tile .live,.tile video{position:absolute;inset:0;width:100%;height:100%}
  .tile .live{--ha-card-border-radius:0;--ha-card-border-width:0}
  .tile .live{pointer-events:none}
  .tile video{object-fit:cover;display:none;background:#000}
  .past .tile video{display:block}
  .ld{position:absolute;inset:0;z-index:2;display:flex;align-items:center;justify-content:center;background:var(--cc-deep);color:var(--cc-sec);font-size:12px;pointer-events:none;transition:opacity .4s}
  .ld.off{opacity:0}
  .past .tile .ld{display:none}
  .lbl{position:absolute;left:8px;top:6px;background:#000a;color:#fff;padding:3px 8px;border-radius:6px;font-size:12px;z-index:3;pointer-events:none}
  .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--cc-gr);margin-right:6px}
  .dot.on{background:var(--cc-am);box-shadow:0 0 8px var(--cc-am)}
  .rec{position:absolute;right:8px;top:6px;z-index:3;font-size:11px;font-weight:600;color:#ffc94d;background:#000a;padding:2px 7px;border-radius:6px;display:none;pointer-events:none}
  .past .rec{display:block}
  .nvr{aspect-ratio:16/9;background:var(--cc-deep);border-radius:8px;padding:4px 14px;overflow:hidden;display:flex;flex-direction:column;justify-content:center;box-sizing:border-box}
  .nvr .h{font-weight:600;font-size:12px;margin:0 0 1px}
  .nr{display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--cc-bd);font-size:12px;color:var(--cc-sec)}
  .nr:last-child{border:0}
  .shead{display:flex;gap:12px;align-items:center;font-size:12px;margin:10px 0 6px}
  #mode{font-weight:700;color:var(--cc-gr)} #mode.recm{color:var(--cc-am)}
  #when{color:var(--cc-sec);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .btn{padding:4px 12px;border-radius:8px;background:var(--cc-cy);color:var(--cc-bi);font-weight:600;font-size:11px;cursor:pointer;user-select:none;border:0}
  .btn[hidden]{display:inline-block;visibility:hidden}
  .shead.navh{display:grid;grid-template-columns:1fr auto 1fr;grid-template-areas:"mode ctr live" "when when when";gap:4px 8px;align-items:center}
  .navh #mode{grid-area:mode}
  .navh .ctr{grid-area:ctr;display:flex;gap:10px}
  .navh .rgt{grid-area:live;display:flex;justify-content:flex-end}
  .navh #when{grid-area:when;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
  .btn.nav{background:var(--cc-bd);color:var(--cc-ink);font-size:14px;padding:4px 14px;line-height:1}
  .track{position:relative;height:48px;background:var(--cc-deep);border-radius:6px;cursor:ew-resize;user-select:none;touch-action:none}
  canvas{width:100%;height:100%;display:block}
  .marker{left:50%;position:absolute;top:-5px;bottom:-5px;width:3px;margin-left:-1px;background:var(--cc-cy);border-radius:2px;box-shadow:0 0 6px var(--cc-cy);pointer-events:none}
  .marker::before{content:'';position:absolute;top:-4px;left:-4px;width:11px;height:11px;border-radius:50%;background:var(--cc-cy)}
  .hours{position:relative;height:14px;overflow:hidden;font-size:10px;color:var(--cc-sec);margin-top:3px}
  .hours span{position:absolute;top:0;transform:translateX(-50%);white-space:nowrap}
  .hours span.d{color:var(--cc-ink);font-weight:600}
  .foot{display:flex;justify-content:flex-end;margin-top:8px}
  .fg{display:inline-flex;align-items:center;justify-content:center;width:34px;height:28px;padding:0;background:var(--cc-bd);color:var(--cc-ink);text-decoration:none;vertical-align:middle}
  .fg svg{width:20px;height:20px;display:block}
  .leg{font-size:11px;color:var(--cc-sec);margin-top:6px}
  .ev{display:flex;gap:8px;overflow-x:auto;margin-top:10px;padding-bottom:4px;scrollbar-width:thin;scrollbar-color:var(--cc-bd) transparent}
  .ev.desk{scrollbar-width:auto;scrollbar-color:var(--cc-cy) var(--cc-bd)}
  .th{flex:0 0 120px;background:var(--cc-deep);border-radius:8px;overflow:hidden;cursor:pointer;border:1px solid transparent}
  .th:hover{border-color:var(--cc-cy)}
  .th img{width:120px;height:68px;object-fit:cover;display:block;background:#000}
  .th div{font-size:11px;padding:4px 6px;color:var(--cc-sec);line-height:1.3}
  .th b{color:var(--cc-ink)}
  .ev.detail .th{flex:0 0 270px;display:flex;border:1px solid var(--cc-cy)55;border-radius:10px}
  .ev.detail .th img{width:96px;height:auto;min-height:84px;object-fit:cover;flex:0 0 96px}
  .ev.detail .th div{padding:6px 8px;font-size:11px;line-height:1.45}
  .ev.detail .th .t{font-size:13px;font-weight:700;color:var(--cc-ink)}
  .ev.detail .th .t i{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:6px;vertical-align:middle}
</style>
<ha-card>
  <div class="grid" id="grid"></div>
  ${this._config.nav_buttons
    ? '<div class="shead navh"><span id="mode">● LIVE</span><div class="ctr"><button class="btn nav" id="prev" title="Previous event">◀</button><button class="btn nav" id="next" title="Next event">▶</button></div><div class="rgt"><button class="btn" id="live" hidden>Back to live</button></div><span id="when">now</span></div>'
    : '<div class="shead"><span id="mode">● LIVE</span><span id="when">now</span><button class="btn" id="live" hidden>Back to live</button></div>'}
  <div class="track swiper" id="track"><canvas id="cv"></canvas><div class="marker" id="marker"></div></div>
  <div class="hours" id="hours"></div>
  <div class="leg">${(this._config.columns === 2 || this._config.layout === 'strip') ? 'Drag the bar back (up to 10 days) to replay all cameras' : 'Drag the bar back (up to 10 days): every camera plays the moment under the blue marker'}${(this._config.columns === 2 || this._config.layout === 'strip') ? '<br>' : ' · '}grey = motion · <b style="color:var(--cc-am)">amber</b> = alert · <b style="color:var(--cc-pu)">purple</b> = detection${(this._config.columns === 2 || this._config.layout === 'strip') ? '' : ' · tap a camera to make it big'}</div>
  <div class="ev swiper ${this._config.event_style === 'detail' ? 'detail' : ''} ${this._config.layout !== 'strip' ? 'desk' : ''}" id="ev" ${this._config.events === false ? 'hidden style="display:none"' : ''}></div>
  ${this._config.frigate_url ? `<div class="foot"><a class="btn fg" id="fg" href="${this._config.frigate_url}" target="_blank" rel="noopener" title="Open Frigate">${FRIGATE_SVG}</a></div>` : ''}
</ha-card>`;
    this.$ = (id) => root.getElementById(id);
    this.$('live').onclick = () => this._goLive();
    if (this._config.nav_buttons) {
      this.$('prev').onclick = () => this._step(-1);
      this.$('next').onclick = () => this._step(1);
    }
    this._setupTrack();
    await this._buildTiles();
    this._loadReviews();
    this._loadMotion();
    new ResizeObserver(() => this._draw()).observe(this.$('track'));
  }

  async _buildTiles() {
    const helpers = await window.loadCardHelpers();
    this._helpers = helpers;
    const cams = this._config.cameras;
    this._tiles = []; this._liveCards = []; this._videos = [];
    cams.forEach((cam, i) => {
      const tile = document.createElement('div');
      tile.className = 'tile';
      const live = this._makeLive(cam, this._order[0] === i);
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto';
      v.addEventListener('ended', () => { if (this._mode === 'past' && this._chunkStart && i === this._order[0]) this._seek(this._chunkStart + Math.max(1, Math.round(v.duration || CHUNK)), true); });
      const lbl = document.createElement('div');
      lbl.className = 'lbl'; lbl.innerHTML = `<span class="dot"></span>${cam.name}`;
      const rec = document.createElement('div'); rec.className = 'rec';
      const ld = document.createElement('div'); ld.className = 'ld'; ld.textContent = 'Loading…';
      tile.append(live, ld, v, lbl, rec);
      this._cover(tile, live);
      tile.onclick = () => { this._order = [i, ...this._order.filter((x) => x !== i)]; this._layout(); };
      this._tiles.push(tile); this._liveCards.push(live); this._videos.push(v);
    });
    this._nvr = document.createElement('div');
    this._nvr.className = 'nvr';
    this.$('grid').style.setProperty('--cols', this._config.columns || 3);
    if (this._config.layout === 'strip') this.$('grid').classList.add('strip');
    this._layout();
    this._renderNvr();
  }

  _makeLive(cam, big) {
    const camCfg = { camera_entity: cam.entity, dimensions: { aspect_ratio: '16:9', layout: { fit: 'cover' } } };
    if (this._config.quality_by_size) {
      // big pane = full stream, small panes = the camera's sub stream (if it has one)
      camCfg.live_provider = 'go2rtc';
      camCfg.go2rtc = { stream: big || !cam.sub ? cam.frigate : cam.sub };
    }
    const live = this._helpers.createCardElement({ type: 'custom:advanced-camera-card', cameras: [camCfg], menu: { style: 'none' }, status_bar: { style: 'none' }, live: { controls: { builtin: false, next_previous: { style: 'none' }, thumbnails: { mode: 'none' }, timeline: { mode: 'none' } }, draggable: false, zoomable: false }, view: { default: 'live' }, dimensions: { aspect_ratio: '16:9' }, performance: { features: { card_loading_indicator: false } } });
    live.classList.add('live');
    if (this._hass) live.hass = this._hass;
    return live;
  }

  // Our own "Loading…" box over a tile until its camera shows a real picture
  // (hides the camera card's own loading screen with its version number).
  _cover(tile, live) {
    const ld = tile.querySelector('.ld');
    if (!ld) return;
    ld.classList.remove('off');
    clearInterval(tile._ldTimer);
    const t0 = Date.now();
    tile._ldTimer = setInterval(() => {
      if (!live.isConnected && Date.now() - t0 > 3000 || Date.now() - t0 > 20000 || this._hasFrame(live)) {
        clearInterval(tile._ldTimer);
        ld.classList.add('off');
      }
    }, 300);
  }

  _hasFrame(root) {
    const stack = [root];
    while (stack.length) {
      const n = stack.pop();
      if (n.tagName === 'VIDEO' && n.readyState >= 2 && n.videoWidth > 0) return true;
      if (n.tagName === 'IMG' && n.complete && n.naturalWidth > 64) return true;
      if (n.shadowRoot) stack.push(...n.shadowRoot.children);
      if (n.children) stack.push(...n.children);
    }
    return false;
  }

  _layout() {
    const g = this.$('grid');
    g.innerHTML = '';
    this._order.forEach((i, pos) => {
      const tile = this._tiles[i];
      const big = pos === 0;
      if (tile.classList.contains('big') !== big && tile.dataset.laid) {
        // the camera card keeps its first-drawn size: redraw the live view at the new size
        const fresh = this._makeLive(this._config.cameras[i], big);
        tile.replaceChild(fresh, this._liveCards[i]);
        this._liveCards[i] = fresh;
        this._cover(tile, fresh);
      }
      tile.classList.toggle('big', big);
      tile.dataset.laid = '1';
      g.appendChild(tile);
    });
    if (this._config.nvr) g.appendChild(this._nvr);
  }

  _renderNvr() {
    if (!this._nvr || !this._hass) return;
    if (!this._config.nvr) { this._renderDots(); return; }
    const s = (e) => (this._hass.states[e] ? this._hass.states[e].state : '?');
    const n = this._config.nvr || {};
    const u = parseInt(s(n.uptime)) || 0;
    const row = (l, v, c) => `<div class="nr"><span>${l}</span><b style="color:${c}">${v}</b></div>`;
    const html = '<div class="h">NVR</div>' + row('Coral inference', s(n.coral) + ' ms', C.cy) + row('CCTV disk', s(n.disk) + ' %', C.am)
      + row('CPU', Math.round(parseFloat(s(n.cpu))) + ' %', C.pu)
      + row('Memory', `${(parseFloat(s(n.mem)) || 0).toFixed(1)} GB · ${Math.round(parseFloat(s(n.mem_pct)))} %`, C.gr)
      + row('Frigate up', `${Math.floor(u / 86400)} d ${Math.floor((u % 86400) / 3600)} h`, C.ink);
    if (html !== this._nvrHtml) { this._nvr.innerHTML = html; this._nvrHtml = html; }
    this._renderDots();
  }

  _renderDots() {
    const s = (e) => (this._hass.states[e] ? this._hass.states[e].state : '?');
    this._config.cameras.forEach((cam, i) => {
      const on = cam.occupancy && s(cam.occupancy) === 'on';
      const d = this._tiles && this._tiles[i].querySelector('.dot');
      if (d) d.classList.toggle('on', on);
    });
  }

  // ---------- data ----------
  async _loadReviews() {
    if (!this._hass) return;
    const d0 = Math.floor(Date.now() / 1000) - BACK;
    try {
      let r = await this._hass.callWS({ type: 'frigate/reviews/get', instance_id: this._config.instance_id || 'frigate', after: d0, limit: 2000 });
      if (typeof r === 'string') r = JSON.parse(r);
      this._reviews = (Array.isArray(r) ? r : []).map((x) => ({ id: x.id, cam: x.camera, start: x.start_time, end: x.end_time || x.start_time + 10, sev: x.severity, objects: (x.data && x.data.objects) || [], zones: (x.data && x.data.zones) || [] }))
        .sort((a, b) => b.start - a.start);
    } catch (e) { this._reviews = []; }
    const sig = this._reviews.map((r) => r.id + ':' + Math.round(r.end)).join('|');
    if (sig !== this._revSig) { this._revSig = sig; this._renderEvents(); }
    this._draw();
  }

  // Motion in 6 h blocks of 5-minute bins. Finished blocks are kept; the current one is refetched every 5 min.
  _loadMotion(refreshNow) {
    if (!this._hass) return;
    const now = Math.floor(Date.now() / 1000);
    const cur = Math.floor(now / BLK);
    if (refreshNow && this._mblk.has(cur) && !this._mload.has(cur)) this._fetchBlock(cur); // keep old bars until new ones arrive
    const c = this._center();
    const lo = Math.floor(Math.max(now - BACK, c - SPAN / 2 - BLK) / BLK), hi = Math.min(cur, Math.floor((c + SPAN / 2) / BLK));
    for (let k = hi; k >= lo; k--) if (!this._mblk.has(k) && !this._mload.has(k)) this._fetchBlock(k);
  }

  async _fetchBlock(k) {
    this._mload.add(k);
    const bins = new Map();
    const after = k * BLK, before = Math.min((k + 1) * BLK, Math.floor(Date.now() / 1000));
    for (const cam of this._config.cameras) {
      try {
        let segs = await this._hass.callWS({ type: 'frigate/recordings/get', instance_id: this._config.instance_id || 'frigate', camera: cam.frigate, after, before });
        if (typeof segs === 'string') segs = JSON.parse(segs);
        (segs || []).forEach((sg) => { if (sg.motion) { const b = Math.floor(sg.start_time / 300); bins.set(b, (bins.get(b) || 0) + sg.motion); } });
      } catch (e) { /* camera without recordings */ }
    }
    this._mblk.set(k, bins); this._mload.delete(k);
    this._draw(true);
  }

  _renderEvents() {
    const ev = this.$('ev'); if (!ev) return;
    const cams = Object.fromEntries(this._config.cameras.map((c) => [c.frigate, c.name]));
    ev.innerHTML = '';
    this._reviews.slice(0, 30).forEach((r) => {
      const d = document.createElement('div'); d.className = 'th';
      const img = `<img loading="lazy" src="/api/frigate/notifications/${r.id}/${r.cam}/review_thumbnail.webp">`;
      if (this._config.event_style === 'detail') {
        const what = (r.objects[0] || r.sev).replace(/^./, (c) => c.toUpperCase());
        const dur = Math.max(1, Math.round(r.end - r.start));
        d.innerHTML = `${img}<div><div class="t"><i style="background:${r.sev === 'alert' ? C.am : C.pu}"></i>${what}</div>📅 ${fmtDate(r.start)} ${fmtTime(r.start, true)}<br>⏱ ${dur}s<br>📷 ${cams[r.cam] || r.cam}${r.zones.length ? '<br>📍 ' + r.zones.map((z) => z.replace(/_/g, ' ')).join(', ') : ''}</div>`;
      } else {
        d.innerHTML = `${img}<div>${r.objects.join(', ') || r.sev} · ${cams[r.cam] || r.cam}<br><b>${fmtTime(r.start)}</b></div>`;
      }
      d.style.borderColor = r.sev === 'alert' ? C.amb : 'transparent';
      d.onclick = () => { this._evT = r.start; this._seek(r.start - 3); };
      ev.appendChild(d);
    });
  }

  // ---------- timeline ----------
  // The blue marker stays in the middle; drag the bar (or mouse-wheel on desktop) to move through time.
  // A tap without dragging jumps to the time under the finger.
  _center() { return this._mode === 'live' || !this._t ? Date.now() / 1000 : this._t; }
  _clampT(t) { const now = Date.now() / 1000; return Math.min(now, Math.max(now - BACK, t)); }

  _setupTrack() {
    const tr = this.$('track');
    let drag = null;
    tr.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, c: this._center(), moved: false }; tr.setPointerCapture(e.pointerId); });
    tr.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) < 5) return;
      drag.moved = true; this._evT = null;
      this._preview(this._clampT(drag.c - (dx / tr.clientWidth) * SPAN)); this._scrub();
    });
    const up = (e) => {
      if (!drag) return;
      const d = drag; drag = null;
      if (!d.moved) { const r = tr.getBoundingClientRect(); this._evT = null; this._seek(this._clampT(d.c + ((e.clientX - r.left) / r.width - 0.5) * SPAN)); return; }
      this._seek(this._t);
    };
    tr.addEventListener('pointerup', up);
    tr.addEventListener('pointercancel', (e) => { if (drag && drag.moved) up(e); drag = null; });
    tr.addEventListener('wheel', (e) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!d) return;
      e.preventDefault(); this._evT = null;
      this._preview(this._clampT(this._center() + (d / tr.clientWidth) * SPAN * 0.5)); this._scrub();
      clearTimeout(this._wheelT); this._wheelT = setTimeout(() => this._seek(this._t), 450);
    }, { passive: false });
  }

  _draw(force) {
    const cv = this.$('cv'); if (!cv || !cv.clientWidth) return;
    const c = this._center();
    const step = SPAN / cv.clientWidth; // seconds per css pixel
    if (!force && this._drawnC != null && Math.abs(c - this._drawnC) < step / 2 && this._drawnW === cv.clientWidth) return;
    this._drawnC = c; this._drawnW = cv.clientWidth;
    const w = cv.width = cv.clientWidth * 2, h = cv.height = cv.clientHeight * 2;
    const g = cv.getContext('2d'); const v0 = c - SPAN / 2, v1 = c + SPAN / 2;
    const fx = (t) => ((t - v0) / SPAN) * w;
    g.clearRect(0, 0, w, h);
    // hour ticks (Dublin time); midnight = date label
    const every = cv.clientWidth >= 600 ? 3 : 6;
    let html = '';
    for (let t = Math.ceil(v0 / 3600) * 3600; t <= v1; t += 3600) {
      const hr = +HFMT.format(new Date(t * 1000));
      if (hr % every) continue;
      const x = fx(t);
      g.fillStyle = hr === 0 ? C.sec : C.bd; g.fillRect(x, 0, hr === 0 ? 2 : 1, h);
      const pc = (x / w) * 100;
      if (pc > 3 && pc < 97) html += hr === 0 ? `<span class="d" style="left:${pc}%">${fmtDate(t)}</span>` : `<span style="left:${pc}%">${String(hr).padStart(2, '0')}:00</span>`;
    }
    if (html !== this._hoursHtml) { this.$('hours').innerHTML = html; this._hoursHtml = html; }
    // motion (scaled to the busiest 5-min bin in view)
    const b0 = Math.floor(v0 / 300), b1 = Math.ceil(v1 / 300);
    const get = (b) => { const m = this._mblk.get(Math.floor((b * 300) / BLK)); return (m && m.get(b)) || 0; };
    let max = 1; for (let b = b0; b <= b1; b++) max = Math.max(max, get(b));
    g.fillStyle = C.mo; const bw = (300 / SPAN) * w;
    for (let b = b0; b <= b1; b++) { const m = get(b); if (m > 0) { const bh = Math.max(2, (m / max) * h * 0.55); g.fillRect(fx(b * 300), h - bh, Math.max(1, bw - 1), bh); } }
    this._reviews.forEach((r) => { if (r.end < v0 || r.start > v1) return; g.fillStyle = r.sev === 'alert' ? C.am : C.pu; g.fillRect(fx(r.start), r.sev === 'alert' ? 4 : 18, Math.max(4, fx(r.end) - fx(r.start)), 11); });
    const now = Date.now() / 1000;
    g.fillStyle = C.fut; g.fillRect(fx(now), 0, w, h); // future
    if (v0 < now - BACK) g.fillRect(0, 0, fx(now - BACK), h); // older than Frigate keeps
    this._loadMotion();
  }

  _placeMarker() { this._draw(); }

  _near(t) {
    const cams = Object.fromEntries(this._config.cameras.map((c) => [c.frigate, c.name]));
    const n = this._reviews.filter((r) => t >= r.start - 20 && t <= r.end + 20).map((r) => `${r.objects.join(', ')} · ${cams[r.cam] || r.cam}`);
    return n.length ? '  —  ' + [...new Set(n)].slice(0, 3).join('   ') : '';
  }

  _preview(t) {
    const now = Date.now() / 1000;
    this._t = Math.min(t, now);
    this._draw();
    const live = now - this._t < 30;
    this.$('mode').textContent = live ? '● LIVE' : '⏪ RECORDING'; this.$('mode').className = live ? '' : 'recm';
    this.$('when').textContent = live ? 'now' : `${fmtDate(this._t)} ${fmtTime(this._t, true)}${this._near(this._t)}`;
  }

  // While dragging: show each camera's recording at the marker (throttled).
  _scrub() {
    if (this._scrubTimer) return;
    this._scrubTimer = setTimeout(() => { this._scrubTimer = null; this._scrubLoad(this._t); }, 350);
  }

  async _scrubLoad(t) {
    const now = Date.now() / 1000;
    if (!t || now - t < 30) return;
    const t0 = Math.floor(t);
    if (this._lastScrub === t0) return;
    this._lastScrub = t0;
    this._mode = 'past'; this._chunkStart = null;
    this.$('grid').classList.add('past'); this.$('live').hidden = false;
    const cams = this._config.cameras;
    // Frigate's recording download can't be seeked inside, so fetch a tiny clip that STARTS at the marker.
    const idx = this._config.big_first ? [this._order[0]] : cams.map((_, i) => i);
    const signed = await Promise.all(idx.map((i) => this._sign(`/api/frigate/recording/${cams[i].frigate}/start/${t0}/end/${t0 + 2}`)));
    if (this._lastScrub !== t0 || this._chunkStart) return; // marker moved on, or released
    idx.forEach((i, k) => { const v = this._videos[i]; v.onloadeddata = () => v.pause(); v.src = signed[k]; v.load(); });
    this._tiles.forEach((tile) => { tile.querySelector('.rec').textContent = 'REC ' + fmtTime(t0, true); });
  }

  _sign(p) {
    return this._hass.callWS({ type: 'auth/sign_path', path: p, expires: 3600 }).then((r) => r.path).catch(() => p);
  }

  async _seek(t, continuing) {
    const now = Date.now() / 1000;
    if (now - t < 30) return this._goLive();
    t = Math.floor(Math.max(t, now - BACK));
    clearTimeout(this._scrubTimer); this._scrubTimer = null; this._lastScrub = null;
    this._mode = 'past'; this._t = t; this._chunkStart = t;
    this.$('grid').classList.add('past'); this.$('live').hidden = false;
    if (!continuing) this._preview(t);
    const cams = this._config.cameras;
    const len = this._config.big_first ? 12 : CHUNK;
    const paths = cams.map((c) => `/api/frigate/recording/${c.frigate}/start/${t}/end/${t + len}`);
    const signed = await Promise.all(paths.map((p) => this._sign(p)));
    if (this._chunkStart !== t) return; // a newer seek happened
    const start = (i) => { const v = this._videos[i]; v.onloadeddata = null; v.dataset.start = t; v.dataset.len = len; v.src = signed[i]; v.load(); const p = v.play(); if (p) p.catch(() => {}); };
    if (!this._config.big_first || continuing) { this._videos.forEach((v, i) => start(i)); return; }
    // phone: big camera first; the small ones one at a time once it shows
    const bigI = this._order[0];
    const rest = this._order.slice(1);
    this._videos.forEach((v, i) => { if (i !== bigI) { v.pause(); v.removeAttribute('src'); v.load(); } });
    const next = () => { if (this._chunkStart !== t || !rest.length) return; const i = rest.shift(); const v = this._videos[i]; v.addEventListener('loadeddata', next, { once: true }); setTimeout(next, 2500); start(i); };
    this._videos[bigI].addEventListener('loadeddata', next, { once: true });
    setTimeout(next, 4000);
    start(bigI);
    this._placeMarker();
  }

  // ◀ / ▶ : jump every camera to the previous / next event (from live, ◀ = most recent event)
  _step(dir) {
    const cur = this._mode === 'live' ? Date.now() / 1000 : (this._evT != null ? this._evT : this._t);
    const evs = this._reviews.filter((r) => r.sev === 'alert'); // alerts only, newest first
    let target = null;
    if (dir < 0) target = evs.find((r) => r.start < cur - 1);
    else target = [...evs].reverse().find((r) => r.start > cur + 1);
    if (!target) { if (dir > 0) { this._evT = null; this._goLive(); } return; }
    this._evT = target.start;
    this._seek(target.start - 3);
  }

  _goLive() {
    clearTimeout(this._scrubTimer); this._scrubTimer = null;
    this._mode = 'live'; this._t = null; this._chunkStart = null;
    this._videos.forEach((v) => { v.pause(); v.onloadeddata = null; v.removeAttribute('src'); delete v.dataset.start; v.load(); });
    this.$('grid').classList.remove('past'); this.$('live').hidden = true;
    this.$('mode').textContent = '● LIVE'; this.$('mode').className = ''; this.$('when').textContent = 'now';
    this._placeMarker();
  }

  _tick() {
    if (!this._built || !this.$) return;
    if (this._mode === 'past' && this._chunkStart) {
      const v = this._videos[this._order[0]];
      const t = this._chunkStart + (v && !isNaN(v.currentTime) ? v.currentTime : 0);
      this._t = t;
      this.$('when').textContent = `${fmtDate(t)} ${fmtTime(t, true)}${this._near(t)}`;
      this._tiles.forEach((tile) => { tile.querySelector('.rec').textContent = 'REC ' + fmtTime(t, true); });
    }
    this._placeMarker();
  }
}

customElements.define('cctv-card', CctvCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'cctv-card', name: 'CCTV card', description: 'Live grid + single Frigate timeline that rewinds every camera together' });
