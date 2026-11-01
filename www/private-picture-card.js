/* private-picture-card: a picture card for an image under /api/infra_private/ (Home Assistant
 * login required). Asks HA for a short-lived signed URL (websocket auth/sign_path), so the image
 * is never served without a session. Config: image (required), aspect_ratio ("4:3"),
 * tap_action {action: url, url_path} (optional). */
class PrivatePictureCard extends HTMLElement {
  setConfig(config) {
    if (!config || !config.image || !String(config.image).startsWith('/api/infra_private/'))
      throw new Error('image must be a /api/infra_private/ path');
    this._cfg = config;
  }
  set hass(hass) {
    this._hass = hass;
    if (!this._rendered && this.isConnected) this._render();
  }
  connectedCallback() { if (this._hass && !this._rendered) this._render(); }
  disconnectedCallback() { this._rendered = false; }
  async _render() {
    this._rendered = true;
    const c = this._cfg;
    const ratio = String(c.aspect_ratio || '4:3').replace(':', '/');
    this.innerHTML = '';
    const card = document.createElement('ha-card');
    card.style.cssText = 'overflow:hidden;aspect-ratio:' + ratio + ';' + (c.tap_action && c.tap_action.url_path ? 'cursor:pointer;' : '');
    const img = document.createElement('img');
    img.alt = c.alt || '';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
    card.appendChild(img);
    if (c.tap_action && c.tap_action.action === 'url' && c.tap_action.url_path)
      card.addEventListener('click', () => window.open(c.tap_action.url_path, '_blank', 'noopener'));
    this.appendChild(card);
    try {
      const r = await this._hass.callWS({ type: 'auth/sign_path', path: c.image, expires: 86400 });
      img.src = r.path;
    } catch (err) { console.warn('private-picture-card: sign_path failed', err); }
  }
  getCardSize() { return 4; }
}
customElements.define('private-picture-card', PrivatePictureCard);
