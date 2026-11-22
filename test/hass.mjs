// A mock Home Assistant with a Forecast.Solar entry (today, rest of today, tomorrow, power now, peak time), the sun, a
// production energy sensor, and callWS answering the Energy dashboard's preferences and forecast and the recorder's
// hourly statistics. The day is the machine's today: the hours are built from local midnight.
export const st = (entity_id, state, attributes = {}) => ({ entity_id, state, attributes, last_changed: "2026-01-01T00:00:00Z" });

export const midnight = (offset = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
};
export const at = (offset, hour) => {
  const d = midnight(offset);
  d.setHours(hour);
  return d.getTime();
};

// A bell of `peak` kWh at 13:00, from 6:00 to 20:00.
export const bell = (peak) => Object.fromEntries(Array.from({ length: 24 }, (_, h) => [h, h < 6 || h > 20 ? 0 : Math.round(peak * Math.exp(-(((h - 13) / 3.1) ** 2)) * 1000) / 1000]));

const FS = {
  "sensor.energy_production_today": ["energy_production_today", "18.6", { unit_of_measurement: "kWh", device_class: "energy" }],
  "sensor.energy_production_today_remaining": ["energy_production_today_remaining", "5.1", { unit_of_measurement: "kWh", device_class: "energy" }],
  "sensor.energy_production_tomorrow": ["energy_production_tomorrow", "22.3", { unit_of_measurement: "kWh", device_class: "energy" }],
  "sensor.power_production_now": ["power_production_now", "3100", { unit_of_measurement: "W", device_class: "power" }],
  "sensor.power_highest_peak_time_today": ["power_highest_peak_time_today", "2026-01-01T12:15:00+00:00", { device_class: "timestamp" }],
};

// Today's and the rest of today's totals add up the forecast's hours (the rest from `now` on).
export const totals = (f, now) => {
  let total = 0;
  let rest = 0;
  for (let h = 0; h < 24; h++) {
    const t = at(0, h);
    total += f[h];
    if (t > now) rest += f[h];
    else if (t + 3.6e6 > now) rest += f[h] * (1 - (now - t) / 3.6e6);
  }
  return { total: Math.round(total * 10) / 10, rest: Math.round(rest * 10) / 10 };
};

export const makeHass = ({ sun = "above_horizon", ws = true, produced = 0.95, now = at(0, 15), ...overrides } = {}) => {
  const { total, rest } = totals(bell(4.6), now);
  const value = { "sensor.energy_production_today": String(total), "sensor.energy_production_today_remaining": String(rest) };
  const states = Object.fromEntries(Object.entries(FS).map(([id, [, v, a]]) => [id, st(id, value[id] ?? v, a)]));
  states["sun.sun"] = st("sun.sun", sun);
  states["sensor.solar_energy"] = st("sensor.solar_energy", "1234.5", { unit_of_measurement: "kWh", device_class: "energy", state_class: "total_increasing" });
  states["sensor.solar_power"] = st("sensor.solar_power", "2800", { unit_of_measurement: "W", device_class: "power" });
  const f0 = bell(4.6);
  const f1 = bell(5.5);
  const f2 = bell(2.4);
  const wh = {};
  for (const [off, f] of [
    [0, f0],
    [1, f1],
    [2, f2],
  ])
    for (let h = 0; h < 24; h++) wh[new Date(at(off, h)).toISOString()] = f[h] * 1000;
  const hass = {
    language: "en",
    locale: { language: "en" },
    themes: { darkMode: false },
    devices: { fs: { name: "Roof" } },
    entities: {
      ...Object.fromEntries(Object.entries(FS).map(([id, [key]]) => [id, { device_id: "fs", platform: "forecast_solar", translation_key: key }])),
      "sensor.solar_energy": { device_id: "inv", platform: "fronius" },
      "sensor.solar_power": { device_id: "inv", platform: "fronius" },
    },
    states,
    calls: [],
    ws: [],
    callService(domain, service, data) {
      this.calls.push([domain, service, data]);
    },
    ...overrides,
  };
  if (ws)
    hass.callWS = async (msg) => {
      hass.ws.push(msg);
      if (msg.type === "energy/get_prefs") return { energy_sources: [{ type: "solar", stat_energy_from: "sensor.solar_energy", config_entry_solar_forecast: ["fs1"] }] };
      if (msg.type === "energy/solar_forecast") return { fs1: { wh_hours: wh } };
      if (msg.type === "recorder/statistics_during_period") {
        const rows = [];
        for (let h = 0; h < 24; h++) if (at(0, h) <= now) rows.push({ start: at(0, h), end: at(0, h) + 3.6e6, change: Math.round(f0[h] * produced * 1000) / 1000 });
        return { "sensor.solar_energy": rows };
      }
      return null;
    };
  return hass;
};
