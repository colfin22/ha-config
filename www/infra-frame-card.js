/* infra-frame-card: shows a page from /api/infra_private/ (Home Assistant login required)
 * in an iframe, via a short-lived signed URL from HA (websocket auth/sign_path).
 * The page talks back with postMessage; this card runs the matching HA action with the
 * logged-in user's own session, so the buttons work at home and away:
 *   {infra:1, action:'reload'}                       re-sign and reload the page
 *   {infra:1, action:'maint', desired:'on'|'off'}    input_boolean.maintenance_mode
 *   {infra:1, action:'updone'}                       automation.trigger (config: updone_automation)
 *   {infra:1, action:'ipref'}                        automation.trigger (config: ipref_automation)
 * Only messages from its own iframe, same origin, are accepted. */
class InfraFrameCard extends HTMLElement {
  setConfig(config) {
    this._cfg = Object.assign({
      path: '/api/infra_private/infra.html',
      height: 'calc(100vh - var(--header-height, 56px))',
      refresh: 60,
      expires: 900,
      maintenance_entity: 'input_boolean.maintenance_mode',
      updone_automation: null,
      ipref_automation: null,
    }, config || {});
  }
  set hass(hass) {
    this._hass = hass;
    if (!this._started && this.isConnected) this._start();
  }
  connectedCallback() { if (this._hass && !this._started) this._start(); }
  disconnectedCallback() {
    clearInterval(this._timer);
    window.removeEventListener('message', this._onMsg);
    this._started = false;
  }
  _start() {
    this._started = true;
    this.innerHTML = '';
    const f = document.createElement('iframe');
    f.title = 'Infrastructure';
    f.style.cssText = 'border:0;width:100%;display:block;height:' + this._cfg.height;
    this.appendChild(f);
    this._frame = f;
    this._onMsg = (e) => this._message(e);
    window.addEventListener('message', this._onMsg);
    this._timer = setInterval(() => this._load(), this._cfg.refresh * 1000);
    this._load();
  }
  async _load() {
    try {
      const r = await this._hass.callWS({ type: 'auth/sign_path', path: this._cfg.path, expires: this._cfg.expires });
      if (this._frame) this._frame.src = r.path;
    } catch (err) { console.warn('infra-frame-card: sign_path failed', err); }
  }
  async _message(e) {
    if (!this._frame || e.source !== this._frame.contentWindow || e.origin !== location.origin) return;
    const m = e.data || {};
    if (m.infra !== 1) return;
    const h = this._hass, c = this._cfg;
    try {
      if (m.action === 'reload') return this._load();
      if (m.action === 'maint' && (m.desired === 'on' || m.desired === 'off'))
        return await h.callService('input_boolean', m.desired === 'on' ? 'turn_on' : 'turn_off', { entity_id: c.maintenance_entity });
      if (m.action === 'updone' && c.updone_automation)
        return await h.callService('automation', 'trigger', { entity_id: c.updone_automation });
      if (m.action === 'ipref' && c.ipref_automation)
        return await h.callService('automation', 'trigger', { entity_id: c.ipref_automation });
    } catch (err) { console.warn('infra-frame-card: action failed', m.action, err); }
  }
  getCardSize() { return 12; }
}
customElements.define('infra-frame-card', InfraFrameCard);
