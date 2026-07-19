/* heating-activity-card — bespoke "Recent activity" list for the heating status helper.
 * Replaces the stock logbook card (ha-config #38): the flow writes the helper, so the
 * logbook byline credited Node-RED for every entry, including manual ones. This card
 * renders time + status text only — the (auto)/(manual) tag in the text is the real
 * attribution. Entity/hours/title configurable; defaults to this home's helper. */
class HeatingActivityCard extends HTMLElement {
  setConfig(config) {
    this._config = Object.assign({
      entity: "input_text.heating_status",
      hours: 24,
      max_items: 30,
      title: "Recent activity",
    }, config);
    this._built = false;
    this._lastState = null;
    this._lastFetch = 0;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._built) this._build();
    const st = hass.states[this._config.entity];
    const cur = st ? st.state : null;
    const now = Date.now();
    // Refetch when the helper changes, and at most once a minute otherwise.
    if (cur !== this._lastState || now - this._lastFetch > 60000) {
      this._lastState = cur;
      this._lastFetch = now;
      this._fetch();
    }
  }

  _build() {
    const card = document.createElement("ha-card");
    card.innerHTML = `
      <style>
        .wrap { padding: 12px 16px 14px; }
        .title { font-size: 16px; font-weight: 500; margin-bottom: 8px; }
        .row { display: flex; gap: 12px; padding: 5px 0; align-items: baseline; }
        .when { flex: 0 0 72px; font-size: 12px; color: var(--secondary-text-color);
                font-variant-numeric: tabular-nums; }
        .what { font-size: 14px; color: var(--primary-text-color); overflow-wrap: anywhere; }
        .empty { font-size: 13px; color: var(--secondary-text-color); padding: 4px 0; }
      </style>
      <div class="wrap">
        <div class="title"></div>
        <div class="list"><div class="empty">Loading…</div></div>
      </div>`;
    card.querySelector(".title").textContent = this._config.title;
    this._list = card.querySelector(".list");
    this.replaceChildren(card);
    this._built = true;
  }

  async _fetch() {
    if (!this._hass) return;
    const end = new Date();
    const start = new Date(end.getTime() - this._config.hours * 3600 * 1000);
    const url = "history/period/" + start.toISOString() +
      "?filter_entity_id=" + this._config.entity +
      "&end_time=" + encodeURIComponent(end.toISOString()) +
      "&minimal_response&no_attributes";
    let hist;
    try {
      hist = await this._hass.callApi("GET", url);
    } catch (e) {
      this._list.innerHTML = '<div class="empty">Couldn’t load history</div>';
      return;
    }
    const entries = ((hist && hist[0]) || [])
      .filter((h) => h.state && h.state !== "unknown" && h.state !== "unavailable")
      .reverse() // newest first
      .slice(0, this._config.max_items);
    // The first history row is the state already in force at the window start,
    // not a change inside the window — drop it if it's the oldest remaining row.
    if (entries.length > 1 &&
        new Date(entries[entries.length - 1].last_changed) <= start) entries.pop();
    if (!entries.length) {
      this._list.innerHTML = '<div class="empty">No changes in the last ' +
        this._config.hours + "h</div>";
      return;
    }
    const today = new Date().toDateString();
    this._list.replaceChildren(...entries.map((h) => {
      const t = new Date(h.last_changed);
      const hhmm = t.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit", hour12: false });
      const row = document.createElement("div");
      row.className = "row";
      const when = document.createElement("div");
      when.className = "when";
      when.textContent = (t.toDateString() === today ? "" : "Yest. ") + hhmm;
      const what = document.createElement("div");
      what.className = "what";
      what.textContent = h.state;
      row.append(when, what);
      return row;
    }));
  }

  getCardSize() { return 4; }
}
customElements.define("heating-activity-card", HeatingActivityCard);
