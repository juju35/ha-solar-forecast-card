# Changelog

## 1.0.5 - 2026-11-27

### Fixes
- Tiles have the 10 px corner radius shared by the ha-* cards.

## 1.0.4 - 2026-11-24

### Fixes
- The production follows the `production` sensor live (#6). The recorder compiles an hour's statistics only once the hour is over, so the energy produced today moved once an hour; the hour under way now comes from the sensor's live reading, minus its reading at the end of the hour before (a drop of more than 10 % is a reset, as for the recorder — a daily sensor at midnight starts again from 0; a smaller one adds nothing, so a counter's glitch is not counted as energy). A `production` sensor set in the config is still the one read, the Energy dashboard's solar source only when none is set.

## 1.0.3 - 2026-11-24

### Maintenance
- The card source is split into ES modules: `src/shared/` (entry `src/shared/index.js`), cut at its sections, with the translations in one file per language (`i18n/<lang>.js`). `scripts/bundle.mjs` concatenates them back, in their original order, into the same single file and per-language files as before; the tests evaluate that bundle.

## 1.0.2 - 2026-11-22

### Performance
- Card picker: the previews are back (`preview: true`), and light. Each card's preview is drawn only once it scrolls into view of Home Assistant's card picker, which otherwise builds the preview of every card at once: until then it holds Home Assistant's state (no render, no history request, no animation). On a dashboard or in the card editor the card is drawn as before.

## 1.0.1 - 2026-11-22

### Performance
- Card picker: the cards no longer ask Home Assistant for a live preview (`preview: false` in `window.customCards`). The picker drew every card at once (history requests, animations), which made the list slow to open; it now shows each card's description instead.

## 1.0.0 - 2026-11-22

### Features
- First release: `solar-forecast-card` and `solar-forecast-mini-card`. Today hour by hour as a ribbon coloured by the sun, the hours already produced faded, the marker of now and the best window to run appliances; produced, still to come and the power now; tomorrow and the day after as thinner ribbons; an illustrated header whose sun follows the time of day. Forecast.Solar, Solcast and Open-Meteo Solar Forecast, the hour by hour forecast from their sensors or from the Energy dashboard, the actual production from the recorder.
