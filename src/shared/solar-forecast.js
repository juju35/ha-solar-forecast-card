// ── Solar forecast ───────────────────────────────────────────────────────────
// The forecast comes from the sensors of a solar forecast integration (Forecast.Solar, Solcast, Open-Meteo Solar
// Forecast): today's, the rest of today's and tomorrow's energy, the power now, the peak time. The sensors of the same
// device (one per forecast integration entry) are found by their translation key or entity id. `entities` overrides
// any role. The hour by hour forecast comes from those sensors' attributes when they carry it (Solcast's detailed
// forecast, Open-Meteo's `wh_period`), else from the Energy dashboard's forecast (energy/solar_forecast). The actual
// production, hour by hour, comes from the recorder's statistics of the panels' energy sensor.
export const SF_PLATFORMS = ["forecast_solar", "solcast_solar", "open_meteo_solar_forecast"];
// Matched against "<translation key> <entity id>".
export const SF_ROLES = {
  remaining: /(today_remaining|remaining_today|get_remaining_today)\b/,
  today: /(energy_production_today|forecast_today|total_kwh_forecast_today)\b/,
  tomorrow: /(energy_production_tomorrow|forecast_tomorrow|total_kwh_forecast_tomorrow)\b/,
  day3: /(forecast_day_3|total_kwh_forecast_d3)\b/,
  now: /(power_production_now|power_now)\b/,
  peak: /(highest_peak_time_today|peak_time_today|peak_w_time_today)\b/,
};

export const sfNum = (st) => {
  if (!st || ["unavailable", "unknown", ""].includes(st.state)) return null;
  const v = Number(st.state);
  return Number.isFinite(v) ? v : null;
};
// An energy in kWh, a power in W, whatever the sensor's unit.
export const sfKwh = (st) => {
  const v = sfNum(st);
  if (v == null) return null;
  const u = st.attributes?.unit_of_measurement || "kWh";
  return /^Wh$/i.test(u) ? v / 1000 : /^MWh$/i.test(u) ? v * 1000 : v;
};
export const sfWatts = (st) => {
  const v = sfNum(st);
  if (v == null) return null;
  const u = st.attributes?.unit_of_measurement || "W";
  return /^kW$/i.test(u) ? v * 1000 : /^MW$/i.test(u) ? v * 1e6 : v;
};

// The role of a sensor, from its translation key and its entity id.
export const sfRole = (hass, id) => {
  if (!id.startsWith("sensor.")) return null;
  const key = `${hass.entities?.[id]?.translation_key || ""} ${id}`;
  return Object.keys(SF_ROLES).find((r) => SF_ROLES[r].test(key)) || null;
};

// Today's forecast sensors of the home, one per forecast integration entry: for the card picker's first config.
export const sfSources = (hass) =>
  Object.keys(hass.entities || {}).filter((id) => SF_PLATFORMS.includes(hass.entities[id].platform) && sfRole(hass, id) === "today");

// The sensor of each role: those of `entity`'s device, else of every forecast integration of the home.
export const sfFind = (hass, entity, overrides = {}) => {
  const reg = hass.entities || {};
  const dev = entity && reg[entity]?.device_id;
  const pool = Object.keys(reg).filter((id) => (dev ? reg[id].device_id === dev : SF_PLATFORMS.includes(reg[id].platform)));
  const out = {};
  for (const id of entity ? [entity, ...pool] : pool) {
    const r = sfRole(hass, id);
    if (r && !out[r]) out[r] = id;
  }
  return { ...out, ...Object.fromEntries(Object.entries(overrides).filter(([, v]) => v)) };
};

// The time zone the days are counted in, the way Home Assistant's own dashboards count them: the server's
// (hass.config.time_zone), unless the user's profile asks for the browser's. Undefined: the browser's.
export const sfTz = (hass) => (hass?.locale?.time_zone === "local" ? undefined : hass?.config?.time_zone) || undefined;

// The offset (ms) of `tz` (else the browser's time zone) from UTC at `t`.
export const sfOffset = (t, tz) => {
  if (!tz) return -new Date(t).getTimezoneOffset() * 6e4;
  try {
    const parts = sfIntl(Intl.DateTimeFormat, "en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    }).formatToParts(t);
    const g = (k) => Number(parts.find((x) => x.type === k)?.value);
    const s = Math.floor(t / 1000) * 1000;
    return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"), g("second")) - s;
  } catch {
    return -new Date(t).getTimezoneOffset() * 6e4;
  }
};
// The wall clock of `t` in `tz`: year, month (0-11), day, hour, minute.
export const sfParts = (t, tz) => {
  const d = new Date(t + sfOffset(t, tz));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), min: d.getUTCMinutes() };
};
// The instant of a wall clock time in `tz` (days and hours past their range roll over, like Date's setters).
export const sfAt = (y, m, d, h, tz) => {
  const wall = Date.UTC(y, m, d, h);
  const t = wall - sfOffset(wall, tz);
  const off = sfOffset(t, tz);
  return off === sfOffset(wall, tz) ? t : wall - off;
};
// The start of the hour holding `t` (ms), at `t`'s own offset (the repeated hour of autumn stays apart).
export const sfHour = (t, tz) => {
  const off = sfOffset(t, tz);
  const wall = t + off;
  return wall - (((wall % 3.6e6) + 3.6e6) % 3.6e6) - off;
};
// Midnight `offset` days from the day of `t`.
export const sfDay = (t, offset = 0, tz) => {
  const p = sfParts(t, tz);
  return sfAt(p.y, p.m, p.d + offset, 0, tz);
};

// The hour by hour forecast (kWh per hour start) a sensor's attributes carry: Solcast's detailedHourly or
// detailedForecast (average kW over each period), Open-Meteo's wh_period (Wh per period start).
export const sfAttrHours = (st, into = new Map(), tz) => {
  const a = st?.attributes || {};
  const add = (t, kwh) => {
    if (!Number.isFinite(t) || !Number.isFinite(kwh)) return;
    const h = sfHour(t, tz);
    into.set(h, (into.get(h) || 0) + kwh);
  };
  const list = a.detailedHourly || a.detailedForecast;
  if (Array.isArray(list) && list.length) {
    const step = list.length > 1 ? (new Date(list[1].period_start) - new Date(list[0].period_start)) / 3.6e6 || 1 : 1;
    for (const p of list) add(new Date(p.period_start).getTime(), Number(p.pv_estimate) * step);
  } else if (a.wh_period && typeof a.wh_period === "object") {
    for (const [k, v] of Object.entries(a.wh_period)) add(new Date(k).getTime(), Number(v) / 1000);
  }
  return into;
};

// The forecast integration entries the card's numbers come from: those of the chosen sensor's device when an
// `entity` is set; else every entry of the integration (platform) of the today sensor found, so two integrations
// forecasting the same roof are never added up (the planes of one integration are). Null: no way to tell.
export const sfEntries = (hass, todayId, own) => {
  const reg = hass.entities || {};
  const devs = hass.devices || {};
  const ent = todayId && reg[todayId];
  if (!ent?.device_id || !devs[ent.device_id]) return null;
  if (own) return new Set(devs[ent.device_id].config_entries || []);
  const out = new Set();
  for (const e of Object.values(reg)) if (e.platform === ent.platform && devs[e.device_id]) for (const c of devs[e.device_id].config_entries || []) out.add(c);
  return out.size ? out : null;
};

// The Energy dashboard's forecast (energy/solar_forecast: Wh per hour, per config entry), summed over the entries of
// `only` (all of them when null, or when none of them is there).
export const sfWsHours = (forecasts, into = new Map(), tz, only = null) => {
  const all = Object.entries(forecasts || {});
  const kept = only ? all.filter(([id]) => only.has(id)) : all;
  for (const [, f] of kept.length ? kept : all)
    for (const [k, v] of Object.entries(f?.wh_hours || {})) {
      const h = sfHour(new Date(k).getTime(), tz);
      if (Number.isFinite(h)) into.set(h, (into.get(h) || 0) + Number(v) / 1000);
    }
  return into;
};

// The hours of `w` in a row with the most forecast energy among `hours` ([{ t, f }]), from `from` on; null when none
// has any.
export const sfBestWindow = (hours, from, w) => {
  let best = null;
  for (let i = 0; i + w <= hours.length; i++) {
    if (hours[i].t < from) continue;
    const sum = hours.slice(i, i + w).reduce((s, h) => s + (h.f || 0), 0);
    if (sum > 0.001 && (!best || sum > best.sum)) best = { start: hours[i].t, end: hours[i + w - 1].t + 3.6e6, sum };
  }
  return best;
};

// The Intl formats, made once per language and options (a render formats many numbers).
export const sfIntlCache = new Map();
export const sfIntl = (Kind, lang, opts) => {
  const key = `${Kind.name}|${lang}|${JSON.stringify(opts)}`;
  if (!sfIntlCache.has(key)) sfIntlCache.set(key, new Kind(lang, opts));
  return sfIntlCache.get(key);
};
