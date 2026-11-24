import assert from "node:assert/strict";
import { test } from "node:test";
import { at, bell, makeHass, midnight, st, totals } from "./hass.mjs";
import { fakeNode, load } from "./load.mjs";

const NOW = at(0, 15) + 30 * 60 * 1000; // today, 15:30
const sf = load({ now: NOW });
const { cards } = sf;
const json = (v) => JSON.parse(JSON.stringify(v));
const settle = () => new Promise((r) => setTimeout(r, 0));

// A card whose shadow root answers every selector with nodes recording their click listeners; the hour by hour data
// fetched (callWS) before the test reads it.
const make = async (tag, config, hass = makeHass({ now: NOW })) => {
  const card = new cards[tag]();
  card.attachShadow();
  const nodes = {};
  card.shadowRoot.querySelector = (s) => (nodes[s] ||= fakeNode());
  card._nodes = nodes;
  card.setConfig({ type: `custom:${tag}`, ...config });
  card.hass = hass;
  await settle();
  await settle();
  return card;
};
const ENTITY = { entity: "sensor.energy_production_today" };

test("both cards are registered, with their editors and a picker entry", () => {
  for (const tag of ["solar-forecast-card", "solar-forecast-mini-card"]) {
    assert.ok(sf.customElements.get(tag), tag);
    assert.ok(sf.customElements.get(`${tag}-editor`), `${tag}-editor`);
  }
  assert.deepEqual(json(sf.window.customCards.map((c) => c.type)), ["solar-forecast-card", "solar-forecast-mini-card"]);
});

test("discovery: the roles on the forecast's device, by translation key or entity id; overrides win", () => {
  const h = makeHass({ now: NOW });
  const r = sf.sfFind(h, "sensor.power_production_now");
  assert.equal(r.today, "sensor.energy_production_today");
  assert.equal(r.remaining, "sensor.energy_production_today_remaining", "the rest of today is not today's total");
  assert.equal(r.tomorrow, "sensor.energy_production_tomorrow");
  assert.equal(r.now, "sensor.power_production_now");
  assert.equal(r.peak, "sensor.power_highest_peak_time_today");
  assert.equal(sf.sfFind(h, null, { tomorrow: "sensor.other" }).tomorrow, "sensor.other");
  assert.deepEqual(json(cards["solar-forecast-card"].getStubConfig(h)), ENTITY);
  // Solcast, by entity id alone.
  const s = {
    entities: {
      "sensor.solcast_pv_forecast_forecast_today": { device_id: "s", platform: "solcast_solar" },
      "sensor.solcast_pv_forecast_forecast_remaining_today": { device_id: "s", platform: "solcast_solar" },
      "sensor.solcast_pv_forecast_forecast_day_3": { device_id: "s", platform: "solcast_solar" },
    },
  };
  const rs = sf.sfFind(s, "sensor.solcast_pv_forecast_forecast_today");
  assert.deepEqual([rs.today, rs.remaining, rs.day3], ["sensor.solcast_pv_forecast_forecast_today", "sensor.solcast_pv_forecast_forecast_remaining_today", "sensor.solcast_pv_forecast_forecast_day_3"]);
});

test("hours: Solcast's detailed forecast, Open-Meteo's wh_period and the Energy dashboard's forecast, in kWh per hour", () => {
  const t = at(0, 12);
  const half = new Date(t + 30 * 60 * 1000).toISOString();
  const solcast = sf.sfAttrHours(
    st("sensor.x", "1", {
      detailedForecast: [
        { period_start: new Date(t).toISOString(), pv_estimate: 2 },
        { period_start: half, pv_estimate: 4 },
      ],
    }),
  );
  assert.equal(solcast.get(t), 3, "two half hours at 2 and 4 kW: 3 kWh");
  const om = sf.sfAttrHours(st("sensor.y", "1", { wh_period: { [new Date(t).toISOString()]: 1500 } }));
  assert.equal(om.get(t), 1.5);
  const ws = sf.sfWsHours({ a: { wh_hours: { [new Date(t).toISOString()]: 1000 } }, b: { wh_hours: { [new Date(t).toISOString()]: 500 } } });
  assert.equal(ws.get(t), 1.5, "the entries add up");
});

test("energy dashboard forecast: only the entries of the card's integration are added up", () => {
  const t = at(0, 12);
  const k = new Date(t).toISOString();
  const forecasts = { plane1: { wh_hours: { [k]: 1000 } }, plane2: { wh_hours: { [k]: 500 } }, solcast: { wh_hours: { [k]: 1400 } } };
  const h = {
    entities: {
      "sensor.energy_production_today": { device_id: "p1", platform: "forecast_solar" },
      "sensor.energy_production_today_2": { device_id: "p2", platform: "forecast_solar" },
      "sensor.solcast_pv_forecast_forecast_today": { device_id: "s", platform: "solcast_solar" },
    },
    devices: { p1: { config_entries: ["plane1"] }, p2: { config_entries: ["plane2"] }, s: { config_entries: ["solcast"] } },
  };
  const same = sf.sfEntries(h, "sensor.energy_production_today", false);
  assert.deepEqual(json([...same].sort()), ["plane1", "plane2"], "the planes of one integration");
  assert.equal(sf.sfWsHours(forecasts, new Map(), undefined, same).get(t), 1.5, "Solcast's forecast of the same roof is left out");
  assert.equal(sf.sfWsHours(forecasts, new Map(), undefined, sf.sfEntries(h, "sensor.energy_production_today", true)).get(t), 1, "the chosen entity's entry alone");
  assert.equal(sf.sfWsHours(forecasts, new Map(), undefined, new Set(["gone"])).get(t), 2.9, "no entry left: all of them");
  assert.equal(sf.sfEntries({ entities: {}, devices: {} }, "sensor.x", false), null);
});

test("days and hours are counted in Home Assistant's time zone, unless the profile asks for the browser's", () => {
  assert.equal(sf.sfTz({ config: { time_zone: "Pacific/Kiritimati" }, locale: {} }), "Pacific/Kiritimati");
  assert.equal(sf.sfTz({ config: { time_zone: "Pacific/Kiritimati" }, locale: { time_zone: "server" } }), "Pacific/Kiritimati");
  assert.equal(sf.sfTz({ config: { time_zone: "Pacific/Kiritimati" }, locale: { time_zone: "local" } }), undefined);
  const tz = "Pacific/Kiritimati"; // UTC+14, no daylight saving time
  const t = Date.UTC(2026, 5, 10, 11, 20); // 2026-06-11 01:20 there
  assert.equal(sf.sfDay(t, 0, tz), Date.UTC(2026, 5, 10, 10), "midnight of the 11th there");
  assert.equal(sf.sfDay(t, 1, tz), Date.UTC(2026, 5, 11, 10));
  assert.equal(sf.sfHour(t, tz), Date.UTC(2026, 5, 10, 11));
  assert.deepEqual(json(sf.sfParts(t, tz)), { y: 2026, m: 5, d: 11, h: 1, min: 20 });
  // Paris: 2026-03-29 has 23 hours (2:00 → 3:00).
  const paris = "Europe/Paris";
  assert.equal(sf.sfDay(Date.UTC(2026, 2, 29, 12), 0, paris), Date.UTC(2026, 2, 28, 23));
  assert.equal(sf.sfDay(Date.UTC(2026, 2, 29, 12), 1, paris), Date.UTC(2026, 2, 29, 22));
  assert.equal(sf.sfHour(Date.UTC(2026, 9, 25, 0, 30), paris), Date.UTC(2026, 9, 25, 0), "the repeated hour of October");
});

test("the recorder's statistics start at midnight in Home Assistant's time zone", async () => {
  const hass = makeHass({ now: NOW, config: { time_zone: "Pacific/Kiritimati" } });
  await make("solar-forecast-card", ENTITY, hass);
  const q = hass.ws.find((w) => w.type === "recorder/statistics_during_period");
  assert.equal(new Date(q.start_time).getTime(), sf.sfDay(NOW, 0, "Pacific/Kiritimati") - 3.6e6, "from the hour before midnight");
});

test("a `production` sensor set in the config is the one read, its live reading filling the hour under way", async () => {
  // A daily yield sensor: 0.5 kWh per hour from 6:00, the recorder compiled up to 14:00, now 15:30 at 5.25 kWh.
  const rows = [];
  for (let h = -1; h < 15; h++) {
    const t = h < 0 ? at(-1, 23) : at(0, h);
    const state = h < 6 ? (h < 0 ? 9 : 0) : (h - 5) * 0.5;
    rows.push({ start: t, end: t + 3.6e6, change: h < 6 ? 0 : 0.5, state });
  }
  const hass = makeHass({ now: NOW });
  hass.states["sensor.daily_yield"] = st("sensor.daily_yield", "5250", { unit_of_measurement: "Wh", device_class: "energy" });
  const base = hass.callWS;
  hass.callWS = async (msg) => {
    if (msg.type === "recorder/statistics_during_period") {
      hass.ws.push(msg);
      return { "sensor.daily_yield": rows };
    }
    return base(msg);
  };
  const card = await make("solar-forecast-card", { ...ENTITY, production: "sensor.daily_yield" }, hass);
  const q = hass.ws.find((w) => w.type === "recorder/statistics_during_period");
  assert.deepEqual(json(q.statistic_ids), ["sensor.daily_yield"]);
  assert.ok(!hass.ws.some((w) => w.type === "energy/get_prefs"), "the Energy dashboard is not asked for its solar source");
  assert.equal(Math.round(card._items.produced * 100) / 100, 5.25, "4.5 kWh compiled + 0.75 kWh live");
  hass.states["sensor.daily_yield"] = st("sensor.daily_yield", "5400", { unit_of_measurement: "Wh", device_class: "energy" });
  card.hass = hass;
  assert.equal(Math.round(card._items.produced * 100) / 100, 5.4, "follows the sensor between two compiled hours");
  // A lifetime counter reading a little lower than an hour ago is a glitch, not a reset: no energy for the hour.
  hass.states["sensor.daily_yield"] = st("sensor.daily_yield", "4450", { unit_of_measurement: "Wh", device_class: "energy" });
  card.hass = hass;
  assert.equal(Math.round(card._items.produced * 100) / 100, 4.5, "a small drop adds nothing");
  hass.states["sensor.daily_yield"] = st("sensor.daily_yield", "200", { unit_of_measurement: "Wh", device_class: "energy" });
  card.hass = hass;
  assert.equal(Math.round(card._items.produced * 100) / 100, 4.7, "a reset starts again from 0");
});

test("best window: the hours in a row with the most forecast, from now on", () => {
  const hours = [0, 1, 3, 4, 2, 1, 0].map((f, i) => ({ t: i * 3.6e6, f }));
  const b = sf.sfBestWindow(hours, 0, 2);
  assert.deepEqual([b.start, b.end], [2 * 3.6e6, 4 * 3.6e6]);
  assert.equal(sf.sfBestWindow(hours, 4 * 3.6e6, 2).start, 4 * 3.6e6, "not in the past");
  assert.equal(sf.sfBestWindow(hours.map((h) => ({ ...h, f: 0 })), 0, 2), null);
});

test("full card: the numbers, the ribbon from the Energy dashboard, the production from the recorder", async () => {
  const hass = makeHass({ now: NOW });
  const card = await make("solar-forecast-card", { ...ENTITY, power: "sensor.solar_power" }, hass);
  const m = card._items;
  assert.deepEqual(json(hass.ws.map((w) => w.type)), ["energy/get_prefs", "energy/solar_forecast", "recorder/statistics_during_period"]);
  assert.equal(hass.ws[2].statistic_ids[0], "sensor.solar_energy", "the Energy dashboard's solar source");
  const { total, rest } = totals(bell(4.6), NOW);
  assert.equal(m.total, total);
  assert.equal(m.remaining, rest);
  assert.ok(m.produced > (total - rest) * 0.85 && m.produced < (total - rest) * 1.1, `produced ${m.produced}`);
  assert.equal(m.state, "on_track");
  assert.deepEqual(json(m.range), [6, 20]);
  assert.equal(m.best.start, at(0, 16), "15:30: the best 3 hours left today start at the next hour");
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /class="banner"/);
  assert.match(html, /<span class="bpt">On track<\/span>/);
  assert.match(html, new RegExp(`<div class="subt">${rest.toFixed(1).replace(".", "\\.")} kWh still to come today</div>`));
  assert.match(html, /<span class="nl">Produced<\/span>/);
  assert.match(html, /<span class="nv">2\.8 kW<\/span>/, "the power sensor");
  assert.equal((html.match(/class="cl l/g) || []).length, 15 * 3 + 5, "15 hours today, tomorrow and the day after, and the legend");
  assert.match(html, /class="cl l\d past"/, "the hours produced are faded");
  assert.match(html, /class="nowm" style="left:6[0-9]\.\d+%"/, "now: 15:30 in 6:00–20:00");
  assert.match(html, /<div class="bwt">best 4:00 PM – 7:00 PM<\/div>|<div class="bwt">best 4:00 PM – 7:00 PM<\/div>/);
  assert.match(html, /<span class="dl">Tomorrow<\/span>/);
  assert.match(html, /<span class="dv">22\.3 kWh<\/span>/);
});

test("states: below and above the forecast, night, no forecast", async () => {
  const below = await make("solar-forecast-card", ENTITY, makeHass({ now: NOW, produced: 0.5 }));
  assert.equal(below._items.state, "below");
  const above = await make("solar-forecast-card", ENTITY, makeHass({ now: NOW, produced: 1.4 }));
  assert.equal(above._items.state, "above");
  const night = await make("solar-forecast-card", ENTITY, makeHass({ now: NOW, sun: "below_horizon" }));
  assert.equal(night._items.state, "night");
  assert.match(night.shadowRoot.innerHTML, /<div class="subt">Tomorrow 22\.3 kWh<\/div>/);
  assert.doesNotMatch(night.shadowRoot.innerHTML, /class="nowm"/);
  const none = await make("solar-forecast-card", {}, { ...makeHass({ now: NOW, ws: false }), entities: {}, states: {} });
  assert.equal(none._items.state, "none");
  assert.match(none.shadowRoot.innerHTML, /No solar forecast found/);
});

test("no hour by hour forecast: the numbers from the sensors, and a hint instead of the ribbon", async () => {
  const card = await make("solar-forecast-card", ENTITY, makeHass({ now: NOW, ws: false }));
  const m = card._items;
  assert.equal(m.hasHourly, false);
  assert.equal(m.state, "forecast");
  assert.equal(m.nowF, 3100);
  const html = card.shadowRoot.innerHTML;
  assert.match(html, new RegExp(`<span class="nl">Forecast today</span><span class="nv">${totals(bell(4.6), NOW).total.toFixed(1).replace(".", "\\.")} kWh</span>`));
  assert.match(html, /<span class="nl">Forecast now<\/span><span class="nv">3\.1 kW<\/span>/);
  assert.match(html, /No hour by hour forecast/);
});

test("the numbers open their sensor's details", async () => {
  const card = await make("solar-forecast-card", ENTITY);
  const events = [];
  card.dispatchEvent = (e) => events.push(e.detail?.entityId);
  const buttons = [];
  card.shadowRoot.querySelectorAll = (s) => (s === ".nm[data-id]" ? buttons : []);
  for (const id of ["sensor.solar_energy"]) buttons.push({ dataset: { id }, addEventListener(_type, fn) { this.fn = fn; } });
  card._bindAfter(card.shadowRoot);
  buttons[0].fn();
  assert.deepEqual(events, ["sensor.solar_energy"]);
});

test("mini card: the ring, the chips, and the zoom to the full card", async () => {
  const card = await make("solar-forecast-mini-card", ENTITY);
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /<ha-card class="lvl-on_track bn">/);
  assert.match(html, /class="ringb"/);
  assert.match(html, / kWh to come/);
  assert.match(html, /Tomorrow 22\.3 kWh/);
  assert.match(html, /<button class="r" data-id="sensor\.energy_production_tomorrow"/, "a chip with a sensor opens it");
  const none = await make("solar-forecast-mini-card", {}, { ...makeHass({ now: NOW, ws: false }), entities: {}, states: {} });
  assert.match(none.shadowRoot.innerHTML, /<span class="r" title="No solar forecast found/, "a chip with nothing to open is plain text");
  card._zoomed = true;
  card._sig = null;
  card._render();
  assert.match(card.shadowRoot.innerHTML, /class="cells"/);
});

test("the dark theme darkens the sun's colours", async () => {
  const card = await make("solar-forecast-card", ENTITY, makeHass({ now: NOW, themes: { darkMode: true } }));
  assert.match(card.shadowRoot.innerHTML, /<ha-card class="lvl-on_track dk">/);
  assert.match(card.shadowRoot.innerHTML, /class="banner night"/);
});

test("translations: every language has every English key", () => {
  const en = Object.keys(sf.SF_I18N.en);
  for (const [lang, table] of Object.entries(sf.SF_I18N)) {
    const missing = en.filter((k) => !(k in table));
    assert.deepEqual(missing, [], lang);
  }
  assert.equal(Object.keys(sf.SF_I18N).length, 22);
});

test("the editor writes only what differs from the defaults", () => {
  const ed = new (sf.customElements.get("solar-forecast-card-editor"))();
  ed.setConfig({ type: "custom:solar-forecast-card" });
  ed.hass = makeHass({ now: NOW });
  const form = ed.children[0];
  const names = form.schema.flatMap((s) => (s.schema ? s.schema.map((x) => x.name) : [s.name]));
  for (const n of ["entity", "production", "power", "window_hours", "show_days", "illustration_theme", "language"]) assert.ok(names.includes(n), n);
  let out;
  ed.dispatchEvent = (e) => (out = e.detail.config);
  form.listeners["value-changed"]({ detail: { value: { type: "custom:solar-forecast-card", window_hours: 3, show_days: true, entity: "sensor.energy_production_today" } } });
  assert.deepEqual(json(out), { type: "custom:solar-forecast-card", entity: "sensor.energy_production_today" });
  assert.ok(midnight(0) instanceof Date);
});
