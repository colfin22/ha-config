/* heating-activity-card — "Recent activity" for the heating status helper (ha-config #38).
 * Replica of the stock logbook card's rendering (layout/colours measured from the live
 * card; dot-assignment rule from the HA frontend source: colours from the theme's graph
 * palette in order of first appearance, newest row first) with one difference: the badge
 * shows WHO made the change, joined from the parallel input_text.heating_status_by helper
 * written by the heating flow — a person's initial (or profile picture) for app boosts,
 * a hand for dial changes, "N" (Node-RED) for every automatic change and for entries
 * from before the helper existed. */
class HeatingActivityCard extends HTMLElement {
  setConfig(config) {
    this._config = Object.assign({
      entity: "input_text.heating_status",
      by_entity: "input_text.heating_status_by",
      hours: 24,
      max_items: 40,
      height: 360,
      title: "Recent activity",
    }, config);
    this._built = false;
    this._lastState = null;
    this._lastFetch = 0;
    this._dotColors = new Map(); // state string -> colour, in first-appearance order
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._built) this._build();
    const st = hass.states[this._config.entity];
    const cur = st ? st.state : null;
    const now = Date.now();
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
        .wrap { padding: 2px 0 8px; }
        .list { height: var(--hac-height, 360px); overflow-y: auto; overscroll-behavior: contain;
                scrollbar-width: thin; scrollbar-color: var(--divider-color, #1d2740) transparent; }
        .title { display:flex; justify-content:space-between; align-items:center;
                 color: var(--primary-text-color); font-size:22px; font-weight:400; padding:14px 16px 6px; }
        .chev { font-size:20px; color: inherit; text-decoration: none; }
        .day { color: var(--primary-text-color); font-size:13.5px; font-weight:600; padding:14px 16px 6px; }
        .row { display:flex; align-items:center; height:41px; padding:0 14px 0 16px; }
        .dot { width:10px; height:10px; border-radius:50%; flex:0 0 10px; margin-right:16px; }
        .txt { color: var(--primary-text-color); font-size:14.5px; flex:1 1 auto;
               white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .badge { width:24px; height:24px; border-radius:50%;
                 background: var(--light-primary-color, #7fdcee); color: var(--card-background-color, #121826);
                 font-size:12.5px; font-weight:500; display:flex; align-items:center; justify-content:center;
                 flex:0 0 24px; margin:0 10px 0 12px; overflow:hidden; }
        .badge img { width:100%; height:100%; object-fit:cover; }
        .badge.hand { font-size:14px; }
        .time { color: var(--secondary-text-color); font-size:13px; min-width:58px; text-align:right; }
        .empty { color: var(--secondary-text-color); font-size:13px; padding: 8px 16px; }
      </style>
      <div class="wrap">
        <div class="title"><span></span><a class="chev" aria-label="Show history">&#8250;</a></div>
        <div class="list"><div class="empty">Loading…</div></div>
      </div>`;
    card.querySelector(".title span").textContent = this._config.title;
    this._chev = card.querySelector(".chev");
    this._list = card.querySelector(".list");
    this._list.style.setProperty("--hac-height", this._config.height + "px");
    this.replaceChildren(card);
    this._built = true;
  }

  _palette() {
    // Theme graph palette, same lookup order as the frontend (--graph-color-N, then
    // --color-N); fall back to the measured live values if the theme defines neither.
    const cs = getComputedStyle(this);
    const fallback = ["#4269d0","#f4bd4a","#ff725c","#6cc5b0","#a463f2","#ff8ab7",
                      "#97bbf5","#9c6b4e","#3ca951","#9498a0"];
    const out = [];
    for (let i = 1; i <= 10; i++) {
      const v = (cs.getPropertyValue(`--graph-color-${i}`) || cs.getPropertyValue(`--color-${i}`)).trim();
      out.push(v || fallback[i - 1]);
    }
    return out;
  }

  _dot(state) {
    if (!this._dotColors.has(state)) {
      const pal = this._palette();
      this._dotColors.set(state, pal[this._dotColors.size % pal.length]);
    }
    return this._dotColors.get(state);
  }

  _badge(by) {
    const el = document.createElement("span");
    el.className = "badge";
    if (!by || by === "Node-RED") {
      // the Node-RED logo (white nodes on its own #8f0000 red), self-hosted;
      // falls back to the letter if the icon ever fails to load
      el.style.background = "#8f0000";
      const img = document.createElement("img");
      img.src = "/local/node-red-icon.svg";
      img.onerror = () => { el.style.background = ""; el.replaceChildren(); el.textContent = "N"; };
      el.replaceChildren(img);
      return el;
    }
    if (by === "hand") { el.classList.add("hand"); el.textContent = "✋"; return el; }
    // person: profile picture when their person entity has one, else initial
    const states = this._hass ? this._hass.states : {};
    const person = Object.values(states).find((s) =>
      s && (s.entity_id || "").startsWith("person.") && s.attributes &&
      ((s.attributes.friendly_name || "").split(" ")[0].toLowerCase() === by.toLowerCase()));
    if (person && person.attributes.entity_picture) {
      const img = document.createElement("img");
      img.src = person.attributes.entity_picture;
      el.replaceChildren(img);
      return el;
    }
    el.textContent = by[0].toUpperCase();
    return el;
  }

  async _fetch() {
    if (!this._hass) return;
    // chevron -> History panel filtered to the status helper (same URL pattern the
    // stock card uses for its logbook link); refreshed here so the date stays current.
    const y = new Date(); y.setHours(0, 0, 0, 0);
    this._chev.href = "/history?start_date=" +
      encodeURIComponent(new Date(y.getTime() - 86400000).toISOString()) +
      "&back=1&entity_id=" + this._config.entity;
    const end = new Date();
    const start = new Date(end.getTime() - this._config.hours * 3600 * 1000);
    const url = (eid) => "history/period/" + start.toISOString() +
      "?filter_entity_id=" + eid +
      "&end_time=" + encodeURIComponent(end.toISOString()) +
      "&minimal_response&no_attributes";
    let hist, byHist;
    try {
      [hist, byHist] = await Promise.all([
        this._hass.callApi("GET", url(this._config.entity)),
        this._hass.callApi("GET", url(this._config.by_entity)).catch(() => [[]]),
      ]);
    } catch (e) {
      this._list.innerHTML = '<div class="empty">Couldn’t load history</div>';
      return;
    }
    const ok = (h) => h.state && h.state !== "unknown" && h.state !== "unavailable";
    const byRows = ((byHist && byHist[0]) || []).filter(ok)
      .map((h) => ({ t: new Date(h.last_changed).getTime(), by: h.state }));
    const entries = ((hist && hist[0]) || []).filter(ok).reverse().slice(0, this._config.max_items);
    if (entries.length > 1 &&
        new Date(entries[entries.length - 1].last_changed) <= start) entries.pop();
    if (!entries.length) {
      this._list.innerHTML = '<div class="empty">No changes in the last ' + this._config.hours + "h</div>";
      return;
    }
    // join: the by-helper is written in the same flow run as the status (milliseconds
    // apart) — nearest by-entry within 10s claims the row; no match = Node-RED.
    const byFor = (t) => {
      let best = null, bestD = 10000;
      for (const b of byRows) {
        const d = Math.abs(b.t - t);
        if (d < bestD) { bestD = d; best = b.by; }
      }
      return best;
    };
    const dayLabel = (t) => {
      const today = new Date(); today.setHours(0,0,0,0);
      const yest = new Date(today.getTime() - 86400000);
      const date = t.toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" });
      if (t >= today) return "Today · " + date;
      if (t >= yest) return "Yesterday · " + date;
      return date;
    };
    const out = [];
    let curDay = null;
    for (const h of entries) {
      const t = new Date(h.last_changed);
      const lbl = dayLabel(t);
      if (lbl !== curDay) {
        curDay = lbl;
        const day = document.createElement("div");
        day.className = "day"; day.textContent = lbl;
        out.push(day);
      }
      const row = document.createElement("div");
      row.className = "row";
      const dot = document.createElement("span");
      dot.className = "dot"; dot.style.background = this._dot(h.state);
      const txt = document.createElement("span");
      txt.className = "txt"; txt.textContent = h.state[0].toUpperCase() + h.state.slice(1);
      const time = document.createElement("span");
      time.className = "time";
      time.textContent = t.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      row.append(dot, txt, this._badge(byFor(t.getTime())), time);
      out.push(row);
    }
    this._list.replaceChildren(...out);
  }

  getCardSize() { return 5; }
}
customElements.define("heating-activity-card", HeatingActivityCard);
