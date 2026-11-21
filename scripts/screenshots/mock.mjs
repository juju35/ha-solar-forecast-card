// The mock home of the screenshots and animations: a Forecast.Solar entry for the roof (today, the rest of today,
// tomorrow, the power now, the peak time), the sun, the panels' energy and power sensors, and the answers of the
// Energy dashboard (preferences, forecast) and of the recorder (the production hour by hour). The clock is fixed, so
// that a capture only changes when the card does: 15:30 on a June day, or 22:00 for the night.
const st = (entity_id, state, attributes = {}) => ({ entity_id, state, attributes, last_changed: "2026-06-21T00:00:00Z" });

const DAY = [2026, 5, 21];
const at = (offset, hour, minute = 0) => new Date(DAY[0], DAY[1], DAY[2] + offset, hour, minute).getTime();
// A bell of `peak` kWh at 13:00, from 6:00 to 20:00.
const bell = (peak) => Array.from({ length: 24 }, (_, h) => (h < 6 || h > 20 ? 0 : Math.round(peak * Math.exp(-(((h - 13) / 3.1) ** 2)) * 1000) / 1000));
const F = [bell(4.6), bell(5.5), bell(2.4)];

// `scene`: on_track, above, below (a cloudy afternoon), night (22:00), sensors (no hour by hour forecast: the numbers
// from the sensors alone).
const SCENES = {
  on_track: { now: at(0, 15, 30), produced: 0.97, power: 2850 },
  above: { now: at(0, 15, 30), produced: 1.22, power: 3900 },
  below: { now: at(0, 15, 30), produced: 0.55, power: 940 },
  night: { now: at(0, 22), produced: 0.97, power: 0, sun: "below_horizon" },
  sensors: { now: at(0, 15, 30), produced: null, power: null, hourly: false },
};

export const nowOf = (scene) => SCENES[scene].now;

// The page's clock and the card's callWS, as script source: window.Date fixed at the scene's time, window.__ws answering
// from the data put on the hass object (`this.__ws`).
export const pageScript = (scene) => `(() => {
  const N = ${SCENES[scene].now};
  const R = Date;
  window.Date = class extends R {
    constructor(...a) { super(...(a.length ? a : [N])); }
    static now() { return N; }
  };
  window.__ws = async function (msg) {
    const d = this.__ws || {};
    if (msg.type === "energy/get_prefs") return d.prefs ?? null;
    if (msg.type === "energy/solar_forecast") return d.forecast ?? null;
    if (msg.type === "recorder/statistics_during_period") return d.stats ?? null;
    return null;
  };
})();`;

export const setup = (s) => {
  const v = SCENES[s.scene];
  const now = v.now;
  const total = F[0].reduce((a, b) => a + b, 0);
  let rest = 0;
  for (let h = 0; h < 24; h++) {
    const t = at(0, h);
    if (t > now) rest += F[0][h];
    else if (t + 3.6e6 > now) rest += F[0][h] * (1 - (now - t) / 3.6e6);
  }
  const fs = {
    "sensor.energy_production_today": ["energy_production_today", total.toFixed(2), { unit_of_measurement: "kWh", device_class: "energy" }],
    "sensor.energy_production_today_remaining": ["energy_production_today_remaining", rest.toFixed(2), { unit_of_measurement: "kWh", device_class: "energy" }],
    "sensor.energy_production_tomorrow": ["energy_production_tomorrow", F[1].reduce((a, b) => a + b, 0).toFixed(2), { unit_of_measurement: "kWh", device_class: "energy" }],
    "sensor.power_production_now": ["power_production_now", now < at(0, 21) ? String(Math.round(F[0][new Date(now).getHours()] * 1000)) : "0", { unit_of_measurement: "W", device_class: "power" }],
    "sensor.power_highest_peak_time_today": ["power_highest_peak_time_today", new Date(at(0, 13)).toISOString(), { device_class: "timestamp" }],
  };
  const states = Object.fromEntries(Object.entries(fs).map(([id, [, value, a]]) => [id, st(id, value, a)]));
  states["sun.sun"] = st("sun.sun", v.sun || "above_horizon");
  states["sensor.solar_energy"] = st("sensor.solar_energy", "4862.3", { unit_of_measurement: "kWh", device_class: "energy", state_class: "total_increasing" });
  if (v.power != null) states["sensor.solar_power"] = st("sensor.solar_power", String(v.power), { unit_of_measurement: "W", device_class: "power" });
  const entities = Object.fromEntries(Object.entries(fs).map(([id, [key]]) => [id, { entity_id: id, device_id: "roof", platform: "forecast_solar", translation_key: key }]));
  const wh = {};
  F.forEach((f, off) => {
    f.forEach((kwh, h) => {
      wh[new Date(at(off, h)).toISOString()] = kwh * 1000;
    });
  });
  // A little noise on the production, the same at every run.
  const rows = [];
  for (let h = 0; h < 24; h++) {
    const t = at(0, h);
    if (t > now || v.produced == null) continue;
    const part = t + 3.6e6 > now ? (now - t) / 3.6e6 : 1;
    const noise = 1 + 0.06 * Math.sin(h * 2.3);
    rows.push({ start: t, end: t + 3.6e6, change: Math.round(F[0][h] * v.produced * noise * part * 1000) / 1000 });
  }
  const hourly = v.hourly !== false;
  return {
    hass: {
      language: "en",
      locale: { language: "en" },
      devices: { roof: { name: "Roof" } },
      entities,
      states,
      __ws: hourly
        ? {
            prefs: { energy_sources: [{ type: "solar", stat_energy_from: "sensor.solar_energy", config_entry_solar_forecast: ["roof"] }] },
            forecast: { roof: { wh_hours: wh } },
            stats: { "sensor.solar_energy": rows },
          }
        : {},
    },
    config: { entity: "sensor.energy_production_today", ...(v.power != null ? { power: "sensor.solar_power" } : {}), ...s.config },
    open: s.open,
  };
};
