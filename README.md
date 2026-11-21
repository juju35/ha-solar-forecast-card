# ha-solar-forecast-card

[![Marketplace](https://img.shields.io/badge/Marketplace-Custom-41BDF5.svg)](https://www.home-assistant.io/integrations/marketplace/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/juju35/ha-solar-forecast-card/blob/main/LICENSE)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/julienstep9)

<p align="center"><img src="https://raw.githubusercontent.com/juju35/ha-solar-forecast-card/main/images/icon.svg" alt="Solar Forecast Card" width="120"></p>

<p align="center">
  <img src="https://raw.githubusercontent.com/juju35/ha-solar-forecast-card/main/images/forecast-solar.png" alt="Forecast.Solar" height="36">&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/juju35/ha-solar-forecast-card/main/images/solcast.png" alt="Solcast PV Forecast" height="36">&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/juju35/ha-solar-forecast-card/main/images/open-meteo-solar-forecast.png" alt="Open-Meteo Solar Forecast" height="36">
</p>

A Lovelace card for **solar production forecasts**: today's forecast curve against the actual production, the energy still to come, tomorrow's total and the best time to run the dishwasher or charge the car.

> [!NOTE]
> This card is being designed: there is no release yet. Watch the repository to know when the first version is out.

| Card | Type | What it shows |
|---|---|---|
| Solar forecast | `custom:solar-forecast-card` | Today's forecast against the actual production, tomorrow's total and the best window to run appliances. |
| Solar forecast mini | `custom:solar-forecast-mini-card` | Today's and tomorrow's forecast on two lines, with a zoom to the full card. |

## Supported integrations

The card reads the forecast sensors of these integrations, and the actual production from any power sensor (for example the one shown by [Energy Card](https://github.com/juju35/ha-energy-card)):

| | Integration | What the cards show |
|:---:|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-solar-forecast-card/main/images/forecast-solar.png" alt="Forecast.Solar" height="24"> | [Forecast.Solar](https://www.home-assistant.io/integrations/forecast_solar/) (built in) | Forecast for today and tomorrow, power now and next hour, peak time |
| <img src="https://raw.githubusercontent.com/juju35/ha-solar-forecast-card/main/images/solcast.png" alt="Solcast PV Forecast" height="24"> | [Solcast PV Forecast](https://github.com/BJReplay/ha-solcast-solar) (Marketplace) | Detailed forecast with P10 / P90 estimates, today, tomorrow and the next days |
| <img src="https://raw.githubusercontent.com/juju35/ha-solar-forecast-card/main/images/open-meteo-solar-forecast.png" alt="Open-Meteo Solar Forecast" height="24"> | [Open-Meteo Solar Forecast](https://github.com/rany2/ha-open-meteo-solar-forecast) (Marketplace) | Free forecast with no account, today and the next days |

## Installation

### Via the Marketplace (recommended)

Click the button below to add the repository directly:

[![Add to the Marketplace](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/marketplace_repository/?owner=juju35&repository=ha-solar-forecast-card&category=plugin)

Or manually:

1. Open **Settings → Marketplace → Add from link** (top right; this needs a GitHub account connected)
2. Add `https://github.com/juju35/ha-solar-forecast-card` — Type: **Dashboard**
3. Open **Solar Forecast Card** and click **Install**
4. Clear your browser cache and refresh

The Marketplace registers the dashboard resource for you.

### Manual

1. Download `ha-solar-forecast-card.js` and the `ha-solar-forecast-card.i18n.*.js` translation files from the [latest release](https://github.com/juju35/ha-solar-forecast-card/releases/latest)
2. Copy them all to `/config/www/` (without the translation files, the cards show in English)
3. Go to **Settings → Dashboards → Resources** → Add resource:
   - URL: `/local/ha-solar-forecast-card.js`
   - Type: **JavaScript Module**
4. Clear your browser cache and refresh

## License

[MIT](https://github.com/juju35/ha-solar-forecast-card/blob/main/LICENSE)

## Support

If you find this project useful, you can support its development:

<a href="https://buymeacoffee.com/julienstep9"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" height="50"></a>
