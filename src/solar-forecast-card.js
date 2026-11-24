/**
 * solar-forecast-card / solar-forecast-mini-card: the solar production forecast. Today hour by hour as a ribbon coloured
 * by the sun, the hours already produced faded, the best time to run appliances, and the next days.
 * https://github.com/juju35/ha-solar-forecast-card
 */

// The badge's icon of each state (its colour is the stylesheet's).
const SF_ICONS = {
  on_track: "mdi:sun-clock",
  above: "mdi:sun-clock",
  below: "mdi:weather-partly-cloudy",
  forecast: "mdi:sun-clock",
  night: "mdi:weather-night",
  offline: "mdi:lan-disconnect",
  none: "mdi:sun-clock",
};
// One loop of the banner's animations (s): the sun's rays turn by one step, the current runs down to the panels.
const SF_LOOP = 3;
// How often the hour by hour data is fetched again (ms), and at each new hour.
const SF_REFRESH = 10 * 60 * 1000;

// ── Banner ───────────────────────────────────────────────────────────────────
// The illustrated header's scene: 200 × 80, drawn to the banner's right edge. Hills, a house with its solar panels on
// the roof; the sun on its arc at the time of day (`p`, 0 at sunrise, 1 at sunset), its light running to the panels
// while they produce; a cloud over it below the forecast. The picture's night (`night`: the dark theme) darkens the
// sky, the hills and the house; the real night (`moon`: the sun set) puts the moon and the stars in place of the sun.
const sfScene = ({ night, moon, p, producing, cloudy, animate, uid }) => {
  const hill = night ? ["#24384f", "#1b2c40"] : ["#a8d58f", "#8cc673"];
  const wall = night ? "#3a4656" : "#f3e3c8";
  const roof = night ? "#5b3b30" : "#c8643a";
  const cells = night ? "#14243f" : "#1d3f8f";
  const sx = 18 + 104 * Math.min(1, Math.max(0, p));
  const sy = 44 - 32 * Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
  const sun = "#f5b400";
  const rays = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => `<path d="M${sx} ${sy - 11}v-3" transform="rotate(${k * 45} ${sx} ${sy})"/>`).join("");
  const spin = animate && producing ? `<animateTransform attributeName="transform" type="rotate" from="0 ${sx} ${sy}" to="45 ${sx} ${sy}" dur="${SF_LOOP}s" repeatCount="indefinite"/>` : "";
  const run = animate && producing ? `<animate attributeName="stroke-dashoffset" from="10" to="0" dur="${SF_LOOP / 3}s" repeatCount="indefinite"/>` : "";
  const sky = moon
    ? `<circle cx="70" cy="18" r="7" fill="${night ? "#e8edf5" : "#f4f1e4"}"/><circle cx="73.5" cy="15.5" r="6" fill="${night ? "#1c3050" : "#cbe5f7"}"/>
       ${[
         [30, 12],
         [48, 30],
         [96, 10],
         [118, 26],
         [150, 14],
         [182, 22],
       ]
         .map(([x, y]) => (night ? `<circle cx="${x}" cy="${y}" r=".9" fill="#fff" opacity=".8"/>` : ""))
         .join("")}`
    : `<g class="sun"><circle cx="${sx}" cy="${sy}" r="7" fill="${sun}"/><g stroke="${sun}" stroke-width="1.6" stroke-linecap="round">${rays}${spin}</g></g>
       ${producing ? `<path d="M${sx + 6} ${sy + 4} Q${(sx + 150) / 2} ${Math.min(sy, 30) - 6} 150 44" fill="none" stroke="${sun}" stroke-width="1.4" stroke-dasharray="2 3" stroke-linecap="round">${run}</path>` : ""}
       ${cloudy ? `<path d="M${sx - 12} ${sy + 8}c0-5 4-8 9-8 2-4 6-6 10-6 6 0 10 4 10 9 4 0 6 3 6 5z" fill="#fff" opacity=".92"/>` : ""}
       <path d="M14 20c0-4 3-6 7-6 2-3 5-4 8-4 5 0 8 3 8 7h-23z" fill="#fff" opacity=".85"/>`;
  return `<defs><linearGradient id="h${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hill[0]}"/><stop offset="1" stop-color="${hill[1]}"/></linearGradient></defs>
    ${sky}
    <path d="M0 80 Q60 52 130 62 T200 56 V80Z" fill="url(#h${uid})"/>
    <g class="house"><rect x="128" y="56" width="50" height="24" fill="${wall}"/>
      <path d="M122 58 L153 36 L184 58Z" fill="${roof}"/>
      <path d="M140 50 L157 38 L172 49 L155 61Z" fill="${cells}"/>
      <path d="M145 52 L162 40 M150 55 L167 43 M155 58 L170 47" stroke="${night ? "#2c4a78" : "#7fa8ff"}" stroke-width=".8"/>
      <rect x="148" y="66" width="9" height="14" fill="${night ? "#2a2f38" : "#8a5a3b"}"/>
      <rect x="134" y="62" width="9" height="8" fill="${moon ? "#f5d27a" : "#9cc7ec"}"/><rect x="164" y="62" width="9" height="8" fill="${moon ? "#f5d27a" : "#9cc7ec"}"/></g>`;
};

// The status pill's place, decided by measurement after each render and each new width (the same rule on every
// card): on the title row, right after the title, only when the whole title and the pill's whole label fit there;
// otherwise on its own line under the subtitle (clamped to one line). When the label is still cut there, or the text
// block leaves the banner or runs over its ground strip, the pill keeps its dot alone, on the title row (its label
// stays in title and aria-label). A card of 200 px or less shows the dot alone anyway (CSS), beside the title.
const sfPlacePill = (head, row, ground) => {
  if (!head) return;
  head.removeAttribute("data-wrap");
  head.removeAttribute("data-dot");
  const pill = row.querySelector(":scope > .bpill, :scope > .pill");
  const text = pill?.querySelector(".bpt, .pt");
  if (!text?.getBoundingClientRect || text.getBoundingClientRect().width <= 1) return;
  const name = row.querySelector(".title");
  const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
  const title = name ? (name.scrollWidth > name.clientWidth ? name.scrollWidth : name.getBoundingClientRect().width) + gap : 0;
  if (title + pill.getBoundingClientRect().width <= row.getBoundingClientRect().width + 0.5) return;
  head.setAttribute("data-wrap", "");
  const box = row.parentElement.getBoundingClientRect();
  const frame = head.getBoundingClientRect();
  const out = ground && (box.bottom > ground.getBoundingClientRect().top + 0.5 || box.top < frame.top - 0.5);
  if (text.scrollWidth > text.clientWidth + 0.5 || out) {
    head.removeAttribute("data-wrap");
    head.setAttribute("data-dot", "");
  }
};

// ── Card ─────────────────────────────────────────────────────────────────────
class SolarForecastCard extends RcCard {
  static tag = "solar-forecast-card";
  static i18n = SF_I18N;
  static defaults = { illustration: true, illustration_theme: "auto", show_subtitle: true, show_days: true, animations: true, window_hours: 3 };

  // The first forecast of the home.
  static getStubConfig(hass) {
    const entity = hass ? sfSources(hass)[0] : undefined;
    return entity ? { entity } : {};
  }

  getCardSize() {
    return 6;
  }

  connectedCallback() {
    super.connectedCallback?.();
    this._timer ??= setInterval(() => this._fetch(), SF_REFRESH);
    // A new width: the status pill is fitted again (in the next frame, and only for a new width).
    if (typeof ResizeObserver !== "function") return;
    this._resize ??= new ResizeObserver((entries) => {
      const w = Math.round(entries.at(-1).contentRect.width);
      if (w === this._fitWidth) return;
      this._fitWidth = w;
      cancelAnimationFrame(this._fitFrame);
      this._fitFrame = requestAnimationFrame(() => this._fitPill());
    });
    this._resize.observe(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback?.();
    clearInterval(this._timer);
    this._timer = undefined;
    this._resize?.disconnect();
    this._fitWidth = undefined;
    if (this._fitFrame) cancelAnimationFrame(this._fitFrame);
  }

  // The hour by hour data from Home Assistant: the Energy dashboard's forecast and solar source (for the production
  // sensor, when none is set), and the recorder's hourly statistics of the production since midnight.
  async _fetch() {
    const h = this._hass;
    if (!h?.callWS || this._busy) return;
    this._busy = true;
    const now = Date.now();
    const tz = sfTz(h);
    try {
      let prod = this._config.production;
      if (!prod) {
        if (this._prefs === undefined) this._prefs = await h.callWS({ type: "energy/get_prefs" }).catch(() => null);
        prod = (this._prefs?.energy_sources || []).find((s) => s.type === "solar")?.stat_energy_from;
      }
      const wh = await h.callWS({ type: "energy/solar_forecast" }).catch(() => null);
      let act = null;
      let last = null;
      if (prod) {
        // From the hour before midnight: its reading is where the first hour of today starts from.
        const day0 = sfDay(now, 0, tz);
        const r = await h
          .callWS({
            type: "recorder/statistics_during_period",
            start_time: new Date(day0 - 3.6e6).toISOString(),
            end_time: new Date(sfHour(now, tz) + 3.6e6).toISOString(),
            statistic_ids: [prod],
            period: "hour",
            types: ["change", "state"],
            units: { energy: "kWh" },
          })
          .catch(() => null);
        if (r) {
          const rows = (r[prod] || []).map((x) => ({
            t: sfHour(typeof x.start === "number" ? x.start : new Date(x.start).getTime(), tz),
            change: Number(x.change) || 0,
            state: x.state == null ? null : Number(x.state),
          }));
          act = new Map(rows.filter((x) => x.t >= day0).map((x) => [x.t, x.change]));
          const end = rows[rows.length - 1];
          if (end && Number.isFinite(end.state)) last = { t: end.t, state: end.state };
        }
      }
      this._ws = { wh, act, last, prod, hour: sfHour(now, tz), at: now };
    } finally {
      this._busy = false;
    }
    this._sig = null;
    this._render();
  }

  _fmt(v, digits) {
    try {
      return sfIntl(Intl.NumberFormat, this._lang(), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
    } catch {
      return v.toFixed(digits);
    }
  }

  _kwh(v) {
    return v == null ? "—" : `${this._fmt(v, v >= 100 ? 0 : 1)} kWh`;
  }

  _watts(v) {
    if (v == null) return "—";
    return v >= 1000 ? `${this._fmt(v / 1000, 1)} kW` : `${this._fmt(v, 0)} W`;
  }

  // Times are shown in the time zone the days are counted in.
  _time(t, opts) {
    const tz = sfTz(this._hass);
    try {
      return sfIntl(Intl.DateTimeFormat, this._lang(), tz ? { ...opts, timeZone: tz } : opts).format(new Date(t));
    } catch {
      return new Date(t).toTimeString().slice(0, 5);
    }
  }

  _hm(t) {
    return this._time(t, { hour: "numeric", minute: "2-digit" });
  }

  _weekday(t) {
    return this._time(t, { weekday: "long" });
  }

  // The forecast and the production, hour by hour, and what they add up to.
  _collect() {
    const h = this._hass;
    const c = this._config;
    const now = Date.now();
    const tz = sfTz(h);
    const ws = this._ws;
    // Fetched at first, every SF_REFRESH, and at each new hour.
    if (h.callWS && !this._busy && (!ws || ws.hour !== sfHour(now, tz))) this._fetch();
    const e = rcMemo((this._memo ||= {}), "find", [c.entity, c.entities, h.entities], () => sfFind(h, c.entity, c.entities || {}));
    const st = (role) => (e[role] ? h.states[e[role]] : undefined);
    const todaySt = st("today");
    const hourly = new Map();
    for (const r of ["today", "tomorrow", "day3"]) sfAttrHours(st(r), hourly, tz);
    if (!hourly.size) {
      const only = rcMemo(this._memo, "entries", [e.today, !!c.entity, h.entities, h.devices], () => sfEntries(h, e.today, !!c.entity));
      sfWsHours(ws?.wh, hourly, tz, only);
    }
    let act = ws?.act || null;
    // The recorder compiles an hour once it is over: the hour under way comes from the production sensor's live
    // reading, minus its reading at the end of the hour before (a sensor reset at midnight starts again from 0).
    const live = ws?.prod ? sfKwh(h.states[ws.prod]) : null;
    const curH = sfHour(now, tz);
    if (act && live != null && ws.last && ws.last.t === curH - 3.6e6) {
      act = new Map(act);
      act.set(curH, live >= ws.last.state ? live - ws.last.state : live);
    }
    // The 24 hour starts of today and the next two days, worked out once a day.
    const starts = rcMemo(this._memo, "hours", [sfDay(now, 0, tz), tz], () =>
      [0, 1, 2].map((offset) => {
        const p = sfParts(sfDay(now, offset, tz), tz);
        return Array.from({ length: 24 }, (_, i) => sfAt(p.y, p.m, p.d, i, tz));
      }),
    );
    const day = (offset) =>
      starts[offset].map((t) => ({ t, f: hourly.has(t) ? hourly.get(t) : null, a: act?.has(t) ? act.get(t) : null }));
    const today = day(0);
    const tom = day(1);
    const aft = day(2);
    const sumF = (hours) => hours.reduce((s, x) => s + (x.f || 0), 0);
    const hasHourly = today.some((x) => x.f != null);
    const cur = sfHour(now, tz);
    const frac = (now - cur) / 3.6e6;
    const total = sfKwh(todaySt) ?? (hasHourly ? sumF(today) : null);
    const future = today.reduce((s, x) => s + (x.t > cur ? x.f || 0 : x.t === cur ? (x.f || 0) * (1 - frac) : 0), 0);
    const remaining = sfKwh(st("remaining")) ?? (hasHourly ? future : null);
    const soFar = total != null && remaining != null ? Math.max(0, total - remaining) : null;
    const produced = act ? today.reduce((s, x) => s + (x.t <= cur ? x.a || 0 : 0), 0) : null;
    const powerSt = c.power ? h.states[c.power] : undefined;
    const nowW = sfWatts(powerSt);
    const nowF = sfWatts(st("now")) ?? (hourly.has(cur) ? hourly.get(cur) * 1000 : null);
    const tomorrow = sfKwh(st("tomorrow")) ?? (tom.some((x) => x.f != null) ? sumF(tom) : null);
    const day3 = sfKwh(st("day3")) ?? (aft.filter((x) => x.f != null).length >= 12 ? sumF(aft) : null);
    const sun = h.states["sun.sun"];
    const night = sun ? sun.state === "below_horizon" : hasHourly && !(hourly.get(cur) > 0.001);
    // The hours with any sun, over the days shown: the ribbons' range.
    const lit = (x) => (x.f || 0) > 0.005 || (x.a || 0) > 0.005;
    const hoursLit = [today, tom, aft].flatMap((d) => d.map((x, i) => (lit(x) ? i : -1))).filter((i) => i >= 0);
    const range = hoursLit.length ? [Math.min(...hoursLit), Math.max(...hoursLit)] : null;
    let state;
    if (!todaySt && !hasHourly) state = "none";
    else if (!hasHourly && sfNum(todaySt) == null) state = "offline";
    else if (night) state = "night";
    else if (produced != null && soFar != null && soFar >= 0.2) {
      const r = produced / soFar;
      state = r > 1.1 ? "above" : r >= 0.85 ? "on_track" : "below";
    } else state = "forecast";
    const w = Math.min(6, Math.max(1, Math.round(Number(c.window_hours) || 3)));
    // The best window starts at the next hour once this one is a quarter gone.
    const bestToday = sfBestWindow(today, frac > 0.25 ? cur + 3.6e6 : cur, w);
    const best = bestToday || sfBestWindow(tom, 0, w);
    // The sun's place on its arc: between the first and the last lit hour of today.
    const [r0, r1] = range || [6, 20];
    const wall = sfParts(now, tz);
    const p = (wall.h + wall.min / 60 - r0) / (r1 + 1 - r0);
    const dev = e.today && h.devices?.[h.entities?.[e.today]?.device_id];
    return {
      none: state === "none",
      state,
      ids: e,
      name: c.title || this._t("title"),
      dev: dev?.name_by_user || dev?.name || "",
      today,
      tom,
      aft: day3 != null && aft.some((x) => x.f != null) ? aft : null,
      hasHourly,
      cur,
      frac,
      total,
      remaining,
      soFar,
      produced,
      nowW,
      nowF,
      tomorrow,
      day3,
      range,
      best,
      bestTomorrow: !bestToday && !!best,
      w,
      p,
      prodId: ws?.prod || c.production || null,
      powerId: c.power || null,
    };
  }

  _dark() {
    return !!this._hass.themes?.darkMode;
  }

  // The banner's night: forced by `illustration_theme`, else Home Assistant's dark theme alone (a light theme keeps the
  // day picture after sunset).
  _night() {
    const theme = this._config.illustration_theme;
    if (theme === "night" || theme === "day") return theme === "night";
    return this._dark();
  }

  _animate() {
    if (this._config.animations === false) return false;
    try {
      return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return true;
    }
  }

  // Unique per card: the SVG ids of several cards on one page never clash.
  _id() {
    this._uid ||= Math.random().toString(36).slice(2, 8);
    return this._uid;
  }

  // The illustrated header: the badge (the state's icon, in the state's colour), the title and `sub` on the sky at
  // the left, the house and its panels at the right, a 10 px grass strip edge to edge. `ring`: the mini card's share
  // of today's forecast already produced, around the badge.
  _banner(m, sub, ring = "", pill = "") {
    const c = this._config;
    const nav = c.navigation_path;
    const night = this._night();
    const producing = !m.none && m.state !== "night" && m.state !== "offline" && (m.nowW ?? m.nowF ?? 0) > 20;
    const scene = sfScene({ night, moon: m.state === "night", p: m.p, producing, cloudy: m.state === "below", animate: this._animate(), uid: this._id() });
    const chip = pill ? `<span class="bpill" title="${rcEsc(pill)}" aria-label="${rcEsc(pill)}"><span class="bdot"></span><span class="bpt">${rcEsc(pill)}</span></span>` : "";
    return `
      <div class="banner${night ? " night" : ""}">
        <div class="head${nav ? " nav" : ""}"${nav ? ' role="link" tabindex="0"' : ""}${m.dev ? ` title="${rcEsc(m.dev)}"` : ""}>
          <div class="badge">${ring}<ha-icon icon="${SF_ICONS[m.state]}"></ha-icon></div>
          <div class="tt"><div class="trow"><div class="title">${rcEsc(m.name)}</div>${chip}</div>${sub}</div>
        </div>
        <svg class="room" viewBox="0 0 200 80" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">${scene}</svg>
        <div class="ground"></div>
      </div>`;
  }

  // The status pill's place, on the banner and on the classic header (see sfPlacePill).
  _fitPill() {
    for (const row of this.shadowRoot?.querySelectorAll?.(".trow") || []) {
      const banner = row.closest(".banner");
      sfPlacePill(banner || row.closest(".head"), row, banner?.querySelector(".ground"));
    }
  }

  _sub(m) {
    if (m.none || m.state === "offline") return "";
    if (m.state === "night") return m.tomorrow != null ? this._t("chip_tomorrow", { v: this._kwh(m.tomorrow) }) : "";
    return m.remaining != null ? this._t("sub_to_come", { v: this._kwh(m.remaining) }) : "";
  }

  // The level of a cell, 0 (no sun) to 5, against the sunniest hour shown.
  _cells(hours, max, past) {
    const [a, b] = this._items.range;
    return hours
      .slice(a, b + 1)
      .map((x) => {
        const done = past && x.t < this._items.cur && x.a != null;
        const v = done ? x.a : x.f;
        const lvl = v == null || v <= 0.005 || !max ? 0 : Math.min(5, Math.max(1, Math.ceil((v / max) * 5)));
        const title = x.a != null && x.t < this._items.cur ? this._t("hour_title", { h: this._hm(x.t), f: this._kwh(x.f), a: this._kwh(x.a) }) : this._t("hour_title_f", { h: this._hm(x.t), f: this._kwh(x.f) });
        return `<span class="cl l${lvl}${done ? " past" : ""}" title="${rcEsc(title)}"></span>`;
      })
      .join("");
  }

  // Today's ribbon: the cells, the marker of now, the best window under it and the hours.
  _ribbon(m) {
    if (!m.hasHourly || !m.range) return `<div class="box nohr">${rcEsc(this._t("no_hourly"))}</div>`;
    const [a, b] = m.range;
    const n = b - a + 1;
    const shown = [m.today, m.tom, ...(m.aft ? [m.aft] : [])].flatMap((d) => d.slice(a, b + 1));
    const max = Math.max(...shown.map((x) => Math.max(x.f || 0, x.a || 0)));
    const at = (t) => m.today.findIndex((x) => x.t === t) - a;
    const nowI = at(m.cur);
    const pct = (v) => `${((v / n) * 100).toFixed(2)}%`;
    const marker = m.state !== "night" && nowI >= 0 && nowI < n ? `<span class="nowm" style="left:${pct(nowI + m.frac)}"></span>` : "";
    const nowLabel = marker ? `<span class="ax now" style="left:${pct(nowI + m.frac)}">${rcEsc(this._t("now_marker"))}</span>` : "";
    const bi = m.best && !m.bestTomorrow ? at(m.best.start) : -1;
    const bracket = bi >= 0 ? `<span class="bw" style="left:${pct(bi)};width:${pct(Math.min(m.w, n - bi))}"></span>` : "";
    const bestLine = m.best ? `<div class="bwt">${rcEsc(this._t(m.bestTomorrow ? "best_tomorrow" : "best", { from: this._hm(m.best.start), to: this._hm(m.best.end) }))}</div>` : "";
    return `
      <div class="box rb">
        <div class="rh"><span>${rcEsc(this._t("today_hours"))}</span>${m.total != null ? `<span>${rcEsc(this._t("forecast_total", { v: this._kwh(m.total) }))}</span>` : ""}</div>
        <div class="rw"><div class="cells" style="--n:${n}">${this._cells(m.today, max, true)}</div>${marker}</div>
        <div class="under">${bracket}<span class="ax first">${rcEsc(this._hm(m.today[a].t))}</span>${nowLabel}<span class="ax last">${rcEsc(this._hm(m.today[b].t + 3.6e6))}</span></div>
        ${bestLine}
      </div>
      ${this._days(m, n, max)}`;
  }

  // Tomorrow and the day after, a thinner ribbon each with its total.
  _days(m, n, max) {
    if (this._config.show_days === false) return "";
    const rows = [
      [this._t("tomorrow"), m.tom, m.tomorrow],
      ...(m.aft ? [[this._weekday(m.aft[0].t), m.aft, m.day3]] : []),
    ].filter(([, hours]) => hours.some((x) => x.f != null));
    if (!rows.length) return "";
    const legend = `<div class="lg"><span>${rcEsc(this._t("less_sun"))}</span><span class="sw">${[1, 2, 3, 4, 5].map((l) => `<span class="cl l${l}"></span>`).join("")}</span><span>${rcEsc(this._t("more_sun"))}</span><span class="fd">${rcEsc(this._t("faded"))}</span></div>`;
    return `<div class="box dy">${rows.map(([label, hours, sum]) => `<div class="dr"><span class="dl">${rcEsc(label)}</span><div class="cells thin" style="--n:${n}">${this._cells(hours, max, false)}</div><span class="dv">${rcEsc(this._kwh(sum))}</span></div>`).join("")}</div>${legend}`;
  }

  _nums(m) {
    const first = m.produced != null ? ["produced", m.produced, m.prodId] : ["forecast_today", m.total, m.ids.today];
    const now = m.nowW != null ? ["now", this._watts(m.nowW), m.powerId] : ["now_forecast", this._watts(m.nowF), m.ids.now];
    const item = (label, value, id, cls = "") =>
      `<button class="nm${cls}"${id ? ` data-id="${rcEsc(id)}"` : ""}><span class="nl">${rcEsc(this._t(label))}</span><span class="nv">${rcEsc(value)}</span></button>`;
    // By night, nothing is still to come today: tomorrow instead.
    const second = m.state === "night" ? item("tomorrow", this._kwh(m.tomorrow), m.ids.tomorrow, " acc") : item("to_come", this._kwh(m.remaining), m.ids.remaining || m.ids.today, " acc");
    return `<div class="nums">${item(first[0], this._kwh(first[1]), first[2])}${second}${item(now[0], now[1], now[2])}</div>`;
  }

  _draw(m) {
    const c = this._config;
    const status = this._t(`st_${m.state === "none" ? "offline" : m.state}`);
    const parts = [m.state, m.total, m.remaining, m.produced, m.nowW, m.nowF, m.tomorrow, m.day3, m.range, m.best, m.cur, Math.round(m.frac * 20), m.today, m.tom, m.aft, this._night(), this._dark()];
    if (!this._changed(parts)) return;
    const sub = this._sub(m);
    const subHtml = c.show_subtitle !== false && sub ? `<div class="subt">${rcEsc(sub)}</div>` : "";
    const head =
      c.illustration !== false
        ? this._banner(m, subHtml, "", m.none ? "" : status)
        : `<div class="head${c.navigation_path ? " nav" : ""}"${c.navigation_path ? ' role="link" tabindex="0"' : ""}>
            <div class="badge"><ha-icon icon="${SF_ICONS[m.state]}"></ha-icon></div>
            <div class="tt"><div class="trow"><div class="title">${rcEsc(m.name)}</div>${m.none ? "" : `<span class="pill" title="${rcEsc(status)}" aria-label="${rcEsc(status)}"><span class="pt">${rcEsc(status)}</span></span>`}</div>${subHtml}</div>
          </div>`;
    if (m.none) {
      this._paint("none", `${head}<div class="box nohr">${rcEsc(this._t("no_forecast"))}</div>`, "", this._dark() ? " dk" : "");
      this._fitPill();
      return;
    }
    this._paint(m.state, head + this._nums(m) + this._ribbon(m), "", this._dark() ? " dk" : "");
    this._fitPill();
  }

  _bindAfter(root) {
    for (const b of root.querySelectorAll(".nm[data-id]") || []) b.addEventListener("click", () => rcMoreInfo(this, b.dataset.id));
  }

  static styles = `
    :host { --sf-l0: rgba(127,127,127,.14); --sf-l1: #fff0cc; --sf-l2: #ffdf99; --sf-l3: #ffc04d; --sf-l4: #ff9a1f; --sf-l5: #f76707; }
    ha-card.lvl-on_track, ha-card.lvl-forecast { --c: #f59f00; }
    ha-card.lvl-above { --c: #2f9e44; }
    ha-card.lvl-below { --c: #e8590c; }
    ha-card.lvl-night, ha-card.lvl-offline, ha-card.lvl-none { --c: var(--rc-idle); }
    .tt { flex: 1 1 0; min-width: 5ch; display: flex; flex-direction: column; }
    .tt .title { flex: none; }
    .subt { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    :host([hide-title]) .head .tt { visibility: hidden; }
    .box { margin-top: 10px; border-radius: 12px; padding: 10px 12px; background: var(--secondary-background-color, rgba(127,127,127,.08)); }
    .nohr { font-size: 13px; color: var(--secondary-text-color); }
    .nums { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
    .nm { all: unset; cursor: pointer; display: flex; flex-direction: column; min-width: 0; border-radius: 8px; padding: 2px 4px; }
    .nm:not([data-id]) { cursor: default; }
    .nm:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
    .nl { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .nv { font-size: 20px; font-weight: 500; line-height: 1.2; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .nm.acc .nv { color: color-mix(in srgb, var(--c) 62%, var(--primary-text-color, #212121)); }
    .rh { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; color: var(--secondary-text-color); margin-bottom: 8px; }
    .rh span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rw { position: relative; }
    .cells { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 2px; }
    .cl { display: block; height: 44px; border-radius: 6px; background: var(--sf-l0); }
    .cells.thin .cl { height: 16px; border-radius: 4px; }
    .cl.l1 { background: var(--sf-l1); } .cl.l2 { background: var(--sf-l2); } .cl.l3 { background: var(--sf-l3); }
    .cl.l4 { background: var(--sf-l4); } .cl.l5 { background: var(--sf-l5); }
    .cl.past { opacity: .45; }
    .nowm { position: absolute; top: -5px; bottom: -5px; width: 2px; margin-left: -1px; border-radius: 1px; background: var(--primary-text-color); }
    .under { position: relative; height: 28px; margin-top: 6px; }
    .bw { position: absolute; top: 0; height: 8px; box-sizing: border-box; border: 2px solid #2f9e44; border-top: none; border-radius: 0 0 6px 6px; }
    .ax { position: absolute; top: 11px; font-size: 11px; color: var(--secondary-text-color); white-space: nowrap; }
    .ax.first { left: 0; } .ax.last { right: 0; }
    .ax.now { transform: translateX(-50%); font-weight: 500; color: var(--primary-text-color); }
    .bwt { font-size: 12px; font-weight: 500; color: color-mix(in srgb, #2f9e44 60%, var(--primary-text-color, #212121)); }
    .dy { display: flex; flex-direction: column; gap: 10px; }
    .dr { display: grid; grid-template-columns: 76px minmax(0, 1fr) auto; gap: 10px; align-items: center; }
    .dl { font-size: 13px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dl::first-letter { text-transform: uppercase; }
    .dv { font-size: 14px; font-weight: 500; text-align: right; white-space: nowrap; }
    .lg { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; margin-top: 8px; font-size: 11px; color: var(--secondary-text-color); }
    .lg .sw { display: flex; gap: 2px; }
    .lg .sw .cl { width: 16px; height: 9px; border-radius: 3px; }
    .lg .fd { margin-left: auto; }
    @container (max-width: 340px) {
      .nv { font-size: 17px; }
      .dr { grid-template-columns: 68px minmax(0, 1fr) auto; gap: 8px; }
      .lg .fd { margin-left: 0; }
    }
    /* Illustrated header (banner): 90 px, edge to edge, the title on the sky, the house and its panels at the right,
       a 10 px grass strip at the bottom. The badge's icon is in the state's colour, grey when idle, by day and night. */
    .banner { position: relative; display: flex; height: 90px; margin: -12px -12px 0; overflow: hidden;
              background: linear-gradient(180deg, #d6ecfb 0%, #bfe0f6 100%);
              --bt: #0d2a45; --bs: #3b5b78; --ic: color-mix(in srgb, var(--c) 85%, #10283f); --sw: min(200px, 56%); }
    .banner.night { background: linear-gradient(180deg, #142339 0%, #1d3150 100%); --bt: #fff; --bs: rgba(255,255,255,.78); --ic: color-mix(in srgb, var(--c) 72%, #fff); }
    .lvl-night .banner, .lvl-offline .banner, .lvl-none .banner { --ic: #6b7680; }
    .lvl-night .banner.night, .lvl-offline .banner.night, .lvl-none .banner.night { --ic: #a7b0b8; }
    .banner .head { position: relative; z-index: 1; flex: 1; min-width: 0; height: 80px; box-sizing: border-box;
                    padding: 0 calc(var(--sw) + 4px) 0 14px; flex-wrap: nowrap; }
    .banner .head::after { content: none; }
    .banner .badge { position: relative; color: var(--ic); background: rgba(255,255,255,.62); box-shadow: inset 0 0 0 1px rgba(13,42,69,.12); }
    .banner.night .badge { background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.14); }
    .banner .title { color: var(--bt); }
    .banner .subt { color: var(--bs); font-size: 13px; }
    .banner .room { position: absolute; right: 0; bottom: 10px; width: var(--sw); height: calc(80px * var(--sk, 1)); }
    .banner .ground { position: absolute; left: 0; right: 0; bottom: 0; height: 10px; background: repeating-linear-gradient(90deg, #5aa83c 0 22px, #6fbe4e 22px 44px); }
    .banner.night .ground { background: repeating-linear-gradient(90deg, #1f3a2a 0 22px, #25442f 22px 44px); }
    /* The mini card's expand / collapse button: 24 px, frosted, 5 px from the banner's top right corner. */
    .banner .zoom { position: absolute; z-index: 2; top: 5px; right: 5px; width: 24px; height: 24px; margin: 0; color: #33506b;
                    background: rgba(255,255,255,.55); box-shadow: inset 0 0 0 1px rgba(255,255,255,.7); backdrop-filter: blur(4px); }
    .banner.night .zoom { color: #fff; background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.2); }
    .banner .zoom:hover { background: rgba(255,255,255,.75); color: #33506b; }
    .banner.night .zoom:hover { background: rgba(255,255,255,.22); color: #fff; }
    .banner .tt { min-width: 0; flex: 1 1 auto; }
    /* Status pill right after the title (see sfPlacePill). */
    .trow { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .trow > .title { flex: 0 1 auto; min-width: 0; }
    .trow > .bpill, .trow > .pill { flex: none; max-width: none; }
    :host([hide-title]) .trow .title { visibility: hidden; }
    .head:has(.trow) { flex-wrap: nowrap; }
    .head:has(.trow)::after { content: none; }
    .bpill { display: inline-flex; align-items: center; gap: 4px; min-width: 0; box-sizing: border-box; overflow: hidden;
             white-space: nowrap; padding: 1px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; line-height: 16px;
             background: color-mix(in srgb, var(--c) 18%, rgba(255,255,255,.78)); color: color-mix(in srgb, var(--c) 45%, #0d2a45); }
    .banner.night .bpill { background: color-mix(in srgb, var(--c) 30%, rgba(8,18,38,.55)); color: color-mix(in srgb, var(--c) 35%, #ffffff); }
    .bdot { width: 7px; height: 7px; border-radius: 50%; background: var(--c); flex: none; }
    .bpt { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
    [data-wrap] .trow { display: contents; }
    [data-wrap] .trow > .bpill, [data-wrap] .trow > .pill { order: 9; align-self: flex-start; max-width: 100%; margin-top: 3px; }
    .banner[data-wrap] .trow > .bpill { max-width: calc(100cqw - 80px); }
    [data-wrap] .subt { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    [data-dot] .bpill { padding: 0; background: none; }
    [data-dot] .bpt, [data-dot] .trow > .pill .pt { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
    [data-dot] .trow > .pill { padding: 0; width: 18px; height: 18px; justify-content: center; background: none; }
    [data-dot] .trow > .pill::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
    @container (max-width: 200px) {
      .bpill { padding: 0; background: none; }
      .bpt, .trow > .pill .pt { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
      .trow > .pill { padding: 0; width: 18px; height: 18px; justify-content: center; background: none; }
      .trow > .pill::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
    }
    /* The mini card: the banner alone, its readings as chips on the sky. */
    ha-card.bn { padding: 0; }
    ha-card.bn > .banner { margin: 0; --sw: min(200px, 46%); }
    /* Narrower cards: the scene is drawn smaller (75 %, 62 %, then 50 % of its height, its left part cropped). */
    @container (max-width: 420px) { .banner, ha-card.bn > .banner { --sw: 150px; --sk: .75; } }
    @container (max-width: 340px) { .banner, ha-card.bn > .banner { --sw: 112px; --sk: .62; } }
    @container (max-width: 260px) { .banner, ha-card.bn > .banner { --sw: 70px; --sk: .5; } }
    /* The chips that do not fit wrap to a second line, hidden: never a chip cut to "R…". */
    .banner .rs { display: flex; flex-wrap: wrap; gap: 4px; height: 20px; margin: 3px 0 0 -2px; min-width: 0; overflow: hidden; }
    .banner .r { flex: none; line-height: 20px; padding: 0 7px; color: var(--bt); background: rgba(255,255,255,.62); }
    .banner.night .r { background: rgba(10,20,40,.4); }
    .banner span.r { cursor: default; }
    .banner span.r:hover { background: rgba(255,255,255,.62); }
    .banner.night span.r:hover { background: rgba(10,20,40,.4); }
    .banner .ringb { position: absolute; inset: 0; }
    /* Home Assistant's dark theme: the sun's colours on a dark tile. */
    ha-card.dk { --sf-l1: #4a3d1f; --sf-l2: #7a5a1c; --sf-l3: #b07818; --sf-l4: #e08a18; --sf-l5: #f76707; }
  `;
}

// ── Editor ───────────────────────────────────────────────────────────────────
const sfSchema = (booleans) => (lang) => [
  { name: "entity", selector: { entity: { domain: "sensor" } } },
  { name: "title", selector: { text: {} } },
  { name: "navigation_path", selector: { navigation: {} } },
  { name: "production", selector: { entity: { domain: "sensor", device_class: "energy" } } },
  { name: "power", selector: { entity: { domain: "sensor", device_class: "power" } } },
  { name: "window_hours", selector: { number: { min: 1, max: 6, step: 1, mode: "box", unit_of_measurement: "h" } } },
  ...rcBooleans(...booleans),
  {
    name: "illustration_theme",
    selector: { select: { mode: "dropdown", options: ["auto", "day", "night"].map((value) => ({ value, label: rcT(SF_I18N, lang, `ed_theme_${value}`) })) } },
  },
  ...rcAdvanced(SF_I18N, lang, "entities", "language"),
];

const SF_HELPERS = ["entity", "title", "production", "power", "window_hours", "zoom", "entities", "language"];

const SolarForecastCardEditor = rcEditor({
  card: SolarForecastCard,
  helpers: SF_HELPERS,
  schema: sfSchema(["show_title", "show_subtitle", "illustration", "show_days", "animations"]),
});

rcRegister(SolarForecastCard, SolarForecastCardEditor, "Solar Forecast Card", "The solar production forecast: today hour by hour, the best time to run appliances, and the next days");

// ── Mini card ────────────────────────────────────────────────────────────────
// The forecast on two lines: a ring with the share of today's forecast already produced as the badge, the title and
// the state, then what is still to come and tomorrow as chips; the zoom button opens the full card in place.
class SolarForecastMiniCard extends rcMini(
  SolarForecastCard,
  "solar-forecast-mini-card",
  `
    .mini > .badge { background: none; }
    .ringb { width: 40px; height: 40px; }
  `,
) {
  getCardSize() {
    return this._zoomed ? super.getCardSize() : 1;
  }

  _drawMini(m) {
    const night = this._night();
    // Rebuilt only when what it shows changes: the energies as written, the ring by steps of 2.5 %.
    const done = m.produced ?? m.soFar;
    const pct = m.total ? Math.min(100, ((done || 0) / m.total) * 100) : 0;
    if (!this._changed(["mini", m.state, this._kwh(m.remaining), this._kwh(m.tomorrow), Math.round(pct / 2.5), night, m.p > 0.5, Math.round(m.p * 20)])) return;
    const status = this._t(`st_${m.state === "none" ? "offline" : m.state}`);
    // A chip opens its sensor's more-info; one with nothing to open is plain text.
    const chip = (text, id) =>
      id ? `<button class="r" data-id="${rcEsc(id)}" title="${rcEsc(text)}"><span>${rcEsc(text)}</span></button>` : `<span class="r" title="${rcEsc(text)}"><span>${rcEsc(text)}</span></span>`;
    const chips = m.none
      ? chip(this._t("no_forecast"))
      : [
          m.state !== "night" && m.remaining != null && chip(this._t("chip_to_come", { v: this._kwh(m.remaining) }), m.ids.remaining || m.ids.today),
          m.tomorrow != null && chip(this._t("chip_tomorrow", { v: this._kwh(m.tomorrow) }), m.ids.tomorrow),
        ]
          .filter(Boolean)
          .join("");
    // The ring around the badge: the share of today's forecast already produced.
    const L = 2 * Math.PI * 17;
    const ring = `<svg class="ringb" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="none" stroke="color-mix(in srgb, var(--c) 18%, transparent)" stroke-width="4"/><circle cx="20" cy="20" r="17" fill="none" stroke="var(--c)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${((L * pct) / 100).toFixed(1)} 999" transform="rotate(-90 20 20)"/></svg>`;
    const c = this._config;
    this.shadowRoot.innerHTML = `<style>${RC_BASE_STYLES}${this.constructor.styles}</style>
      <ha-card class="lvl-${m.state} bn${this._dark() ? " dk" : ""}">${this._banner(m, chips ? `<div class="rs">${chips}</div>` : "", ring, m.none ? "" : status)}</ha-card>`;
    const root = this.shadowRoot;
    if (c.navigation_path) rcBindNav(root.querySelector(".head"), c.navigation_path);
    for (const el of root.querySelectorAll(".r[data-id]")) el.addEventListener("click", () => rcMoreInfo(this, el.dataset.id));
    this._fitPill();
  }
}

const SolarForecastMiniCardEditor = rcEditor({
  card: SolarForecastMiniCard,
  helpers: SF_HELPERS,
  schema: sfSchema(["show_title", "show_subtitle", "illustration", "show_days", "animations", "zoom"]),
});

rcRegister(
  SolarForecastMiniCard,
  SolarForecastMiniCardEditor,
  "Solar Forecast Mini Card",
  "The solar forecast on two lines: today's share produced, what is still to come and tomorrow, with a zoom to the full card",
);
