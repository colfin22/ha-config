/* heating-boost-card — bespoke card for the Node-RED-driven heating.
 * Big current temp (read-only, no +/-), live status, boost slider + Boost/Cancel buttons.
 * Entities are configurable but default to this home's helpers. */
class HeatingBoostCard extends HTMLElement {
  setConfig(config) {
    this._config = Object.assign({
      climate: "climate.netatmo_smart_thermostat",
      status: "input_text.heating_status",
      slider: "input_number.heating_boost_temperature",
      boost: "input_button.heating_boost_start",
      cancel: "input_button.heating_boost_cancel",
      name: "Heating",
    }, config);
    this._built = false;
  }

  _build() {
    const card = document.createElement("ha-card");
    card.innerHTML = `
      <style>
        .wrap { padding: 16px 16px 20px; }
        .head { display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; }
        .name { font-size: 16px; font-weight: 500; }
        .action { font-size: 13px; color: var(--secondary-text-color); text-transform: capitalize; }
        .ring { position: relative; width: 200px; height: 200px; margin: 4px auto; }
        .ring svg { width: 100%; height: 100%; transform: rotate(135deg); }
        .ring .track { fill: none; stroke: var(--divider-color); stroke-width: 5; stroke-linecap: round; }
        .ring .fill { fill: none; stroke: var(--state-climate-idle-color, #8a8a8a); stroke-width: 5;
                      stroke-linecap: round; transition: stroke-dasharray .5s, stroke .3s; }
        .ring.heating .fill { stroke: var(--state-climate-heat-color, #ff8100); }
        .ring .tgtdot { fill: var(--primary-text-color); transition: fill .3s; }
        .ring.heating .tgtdot { fill: var(--state-climate-heat-color, #ff8100); }
        .ring.heating .tgt { color: var(--state-climate-heat-color, #ff8100); }
        .ring .inner {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
        }
        .cur { font-size: 52px; font-weight: 300; line-height: 1; }
        .cur span { font-size: 24px; color: var(--secondary-text-color); }
        .tgt { font-size: 15px; color: var(--secondary-text-color); margin-top: 6px; }
        .status { text-align: center; font-size: 14px; margin: 4px 0 14px; color: var(--primary-text-color); }
        .boostlbl { font-size: 13px; color: var(--secondary-text-color); margin-bottom: 2px; }
        .boostrow { display: flex; align-items: center; gap: 10px; }
        .boostrow input[type=range] { flex: 1; accent-color: var(--state-climate-heat-color, #ff8100); }
        .sliderval { min-width: 46px; text-align: right; font-size: 14px; }
        .btns { display: flex; gap: 10px; margin-top: 14px; }
        .btns button {
          flex: 1; border: none; border-radius: 12px; padding: 10px 0; font-size: 14px;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;
          color: var(--text-primary-color, #fff);
        }
        .b-boost { background: var(--secondary-text-color); transition: background .3s; }
        .b-boost.boosting { background: var(--state-climate-heat-color, #ff8100); }
        .b-cancel { background: var(--secondary-text-color); }
        .btns button:active { opacity: .8; }
      </style>
      <div class="wrap">
        <div class="head"><div class="name"></div><div class="action"></div></div>
        <div class="ring">
          <svg viewBox="0 0 100 100">
            <circle class="track" cx="50" cy="50" r="45"></circle>
            <circle class="fill" cx="50" cy="50" r="45"></circle>
            <circle class="tgtdot" r="4" cx="-10" cy="-10"></circle>
          </svg>
          <div class="inner"><div class="cur"></div><div class="tgt"></div></div>
        </div>
        <div class="status"></div>
        <div class="boostlbl">Boost temperature</div>
        <div class="boostrow">
          <ha-icon icon="mdi:thermometer-chevron-up"></ha-icon>
          <input type="range" min="19" max="24" step="0.5">
          <div class="sliderval"></div>
        </div>
        <div class="btns">
          <button class="b-boost"><ha-icon icon="mdi:fire"></ha-icon>Boost 2 h</button>
          <button class="b-cancel"><ha-icon icon="mdi:fire-off"></ha-icon>Cancel</button>
        </div>
      </div>`;
    this._el = {
      name: card.querySelector(".name"), action: card.querySelector(".action"),
      ring: card.querySelector(".ring"), cur: card.querySelector(".cur"),
      fill: card.querySelector(".fill"), tgtdot: card.querySelector(".tgtdot"),
      track: card.querySelector(".track"),
      tgt: card.querySelector(".tgt"), status: card.querySelector(".status"),
      range: card.querySelector("input[type=range]"), val: card.querySelector(".sliderval"),
      bboost: card.querySelector(".b-boost"),
    };
    this._el.name.textContent = this._config.name;

    this._el.range.addEventListener("input", () => {
      this._dragging = true;
      this._el.val.textContent = Number(this._el.range.value).toFixed(1) + "°";
    });
    this._el.range.addEventListener("change", () => {
      this._dragging = false;
      this._hass.callService("input_number", "set_value",
        { entity_id: this._config.slider, value: Number(this._el.range.value) });
    });
    card.querySelector(".b-boost").addEventListener("click", () =>
      this._hass.callService("input_button", "press", { entity_id: this._config.boost }));
    card.querySelector(".b-cancel").addEventListener("click", () =>
      this._hass.callService("input_button", "press", { entity_id: this._config.cancel }));

    this.replaceChildren(card);
    this._built = true;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._built) this._build();
    const c = hass.states[this._config.climate];
    const st = hass.states[this._config.status];
    const num = hass.states[this._config.slider];
    if (c) {
      const cur = c.attributes.current_temperature;
      const tgt = c.attributes.temperature;
      const action = c.attributes.hvac_action || c.state;
      this._el.cur.innerHTML = (cur != null ? cur.toFixed(1) : "–") + "<span>°C</span>";
      this._el.tgt.textContent = tgt != null ? "target " + tgt + "°" : "";
      this._el.action.textContent = action;
      this._el.ring.classList.toggle("heating", action === "heating");
      // arc: 270° gauge clamped to a domestic 12-25° display range, filled to the CURRENT temperature
      const lo = this._config.arc_min != null ? this._config.arc_min : 12;
      const hi = this._config.arc_max != null ? this._config.arc_max : 25;
      const C = 2 * Math.PI * 45, ARC = 0.75;
      const frac = v => Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
      if (cur != null) {
        this._el.fill.setAttribute("stroke-dasharray", (C * ARC * frac(cur)) + " " + C);
        this._el.fill.style.display = "";
      } else this._el.fill.style.display = "none";
      this._el.track.setAttribute("stroke-dasharray", (C * ARC) + " " + C);
      if (tgt != null) {
        const a = (135 + 270 * frac(tgt)) * Math.PI / 180; // same rotation origin as the svg
        this._el.tgtdot.setAttribute("cx", 50 + 45 * Math.cos(a - 135 * Math.PI / 180));
        this._el.tgtdot.setAttribute("cy", 50 + 45 * Math.sin(a - 135 * Math.PI / 180));
        this._el.tgtdot.style.display = "";
      } else this._el.tgtdot.style.display = "none";
    }
    this._el.status.textContent = st ? st.state : "";
    this._el.bboost.classList.toggle("boosting", !!st && /^Boost/i.test(st.state));
    if (num && !this._dragging) {
      const min = num.attributes.min, max = num.attributes.max, step = num.attributes.step;
      if (min != null) this._el.range.min = min;
      if (max != null) this._el.range.max = max;
      if (step != null) this._el.range.step = step;
      this._el.range.value = num.state;
      this._el.val.textContent = Number(num.state).toFixed(1) + "°";
    }
  }

  getCardSize() { return 4; }
}
customElements.define("heating-boost-card", HeatingBoostCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "heating-boost-card", name: "Heating Boost Card",
  description: "Read-only thermostat display with boost slider and buttons" });
