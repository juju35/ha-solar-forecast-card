// Renders the solar forecast cards with a mock forecast and saves the README screenshots.
// Usage: npm install && npm run build && node scripts/screenshots/solar-forecast.mjs
import { pair, shoot } from "./harness.mjs";
import { pageScript, setup } from "./mock.mjs";

// Stills: animations: false stops the sun and the current, so a capture only changes when the card does.
const still = (file, s) => pair(file, { ...s, config: { animations: false, ...s.config } });
for (const scene of ["on_track", "above", "below", "night", "sensors"]) {
  await shoot({ prefix: "sf", tag: "solar-forecast-card", shots: still(scene, { scene }), setup, ws: pageScript(scene) });
}
await shoot({ prefix: "sf", tag: "solar-forecast-card", shots: still("narrow", { scene: "on_track", width: 300 }), setup, ws: pageScript("on_track") });
await shoot({ prefix: "sf-mini", tag: "solar-forecast-mini-card", shots: [...still("on_track", { scene: "on_track" }), ...still("zoom", { scene: "on_track", open: ".zoom" })], setup, ws: pageScript("on_track") });
await shoot({ prefix: "sf-mini", tag: "solar-forecast-mini-card", shots: still("night", { scene: "night" }), setup, ws: pageScript("night") });
