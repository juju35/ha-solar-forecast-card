/**
 * Shared by the solar forecast cards (its names are used by the other src/ files): the forecast's sensors and hours, i18n helpers,
 * the base card (header, tiles, tap / hold), the mini card, the visual editor and the common styles. Same base as ha-room-card.
 * https://github.com/juju35/ha-solar-forecast-card
 */
const RC_VERSION = "__VERSION__";

const RC_HOLD_MS = 500;
const RC_MOVE_PX = 8;
// A held arrow key repeats some 30 times a second: one brightness step every RC_REPEAT_MS at most.
const RC_REPEAT_MS = 150;

// ── Overviews ────────────────────────────────────────────────────────────────
// Shared by room-overview-card and room-environment-overview-card.

// The zoom / detail button: the same icons on the overviews and the mini cards.
const rcZoomIcon = (card) => (card._zoomed ? "mdi:arrow-collapse" : "mdi:arrow-expand");

// Back to the compact view (mini card, or overview showing the rooms needing a look), when zoomed in.
const rcUnzoom = (card) => {
  if (!card._zoomed) return;
  card._zoomed = false;
  card._sig = null;
  card._render();
};

// True for a click outside `card` that is not in a dialog opened from it (more-info, say): it folds the card back.
const rcOutside = (card, ev) => !ev.composedPath().includes(card) && !rcInDialog(ev);

// "A click elsewhere" is caught on the pointer, not only on the click event: on iOS (Safari and the companion app)
// a tap on something that is not clickable (the background, an empty spot, a card with no action) sends no click to
// the page. The handler runs when the press and the release are both outside the card (a slider dragged out of the
// card does not count), and a scroll does not count (the browser cancels the pointer); keyboard clicks still go
// through the click event. The handler keeps its own checks (outside of the card, not in a dialog).
const watchOutside = (card, handler) => {
  let downOutside = false;
  const onDown = (ev) => {
    downOutside = !ev.composedPath().includes(card);
  };
  const onUp = (ev) => {
    if (downOutside) handler(ev);
    downOutside = false;
  };
  const onClick = (ev) => {
    if (ev.detail === 0) handler(ev);
  };
  return {
    on() {
      document.addEventListener("pointerdown", onDown, true);
      document.addEventListener("pointerup", onUp, true);
      document.addEventListener("click", onClick, true);
    },
    off() {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("click", onClick, true);
    },
    // A tap (press and release at the same spot), for the tests.
    tap(ev) {
      onDown(ev);
      onUp(ev);
    },
  };
};

// A click on the detail button: every room, or back to the rooms needing a look. True when handled.
const rcZoomClick = (card, ev) => {
  if (!ev.target.closest?.(".zoom")) return false;
  ev.stopPropagation();
  card._zoomed = !card._zoomed;
  card._sig = null;
  card._render();
  if (ev.detail === 0) card.shadowRoot.querySelector(".zoom")?.focus({ preventScroll: true });
  return true;
};

// ── i18n ─────────────────────────────────────────────────────────────────────
// Strings shared by the cards; a card's own dictionary wins over these.
const RC_I18N = {
  en: {
    unavailable: "Unavailable",
    turn_all_off: "Turn everything off",
    ed_title: "Title",
    ed_show_title: "Show title",
    ed_advanced: "Advanced",
    ed_language: "Language",
    ed_language_helper: "Empty: the Home Assistant language",
    ed_language_auto: "Automatic",
    ed_navigation_path: "Navigation path",
    err_config: "Set `area` or `entities`",
    zoom_in: "Show the full card",
    zoom_out: "Back to the compact view",
    ed_zoom: "Zoom button",
    ed_zoom_helper: "Switches the mini card to the full card and back",
  },
  fr: {
    unavailable: "Indisponible",
    turn_all_off: "Tout éteindre",
    ed_title: "Titre",
    ed_show_title: "Afficher le titre",
    ed_advanced: "Avancé",
    ed_language: "Langue",
    ed_language_helper: "Vide : la langue de Home Assistant",
    ed_language_auto: "Automatique",
    ed_navigation_path: "Chemin de navigation",
    err_config: "Définis `area` ou `entities`",
    zoom_in: "Afficher la carte complète",
    zoom_out: "Revenir à la vue compacte",
    ed_zoom: "Bouton zoom",
    ed_zoom_helper: "Bascule la mini-carte en carte complète, et inversement",
  },
  de: {
    unavailable: "Nicht verfügbar",
    turn_all_off: "Alles ausschalten",
    ed_title: "Titel",
    ed_show_title: "Titel anzeigen",
    ed_advanced: "Erweitert",
    ed_language: "Sprache",
    ed_language_helper: "Leer: die Sprache von Home Assistant",
    ed_language_auto: "Automatisch",
    ed_navigation_path: "Navigationspfad",
    err_config: "Lege `area` oder `entities` fest",
    zoom_in: "Vollständige Karte anzeigen",
    zoom_out: "Zurück zur kompakten Ansicht",
    ed_zoom: "Zoom-Schaltfläche",
    ed_zoom_helper: "Wechselt von der Mini-Karte zur vollständigen Karte und zurück",
  },
  es: {
    unavailable: "No disponible",
    turn_all_off: "Apagar todo",
    ed_title: "Título",
    ed_show_title: "Mostrar el título",
    ed_advanced: "Avanzado",
    ed_language: "Idioma",
    ed_language_helper: "Vacío: el idioma de Home Assistant",
    ed_language_auto: "Automático",
    ed_navigation_path: "Ruta de navegación",
    err_config: "Define `area` o `entities`",
    zoom_in: "Mostrar la tarjeta completa",
    zoom_out: "Volver a la vista compacta",
    ed_zoom: "Botón de zoom",
    ed_zoom_helper: "Cambia de la minitarjeta a la tarjeta completa y viceversa",
  },
  sr: {
    unavailable: "Недоступно",
    turn_all_off: "Искључи све",
    ed_title: "Наслов",
    ed_show_title: "Прикажи наслов",
    ed_advanced: "Напредно",
    ed_language: "Језик",
    ed_language_helper: "Празно: језик Home Assistant-а",
    ed_language_auto: "Аутоматски",
    ed_navigation_path: "Путања за навигацију",
    err_config: "Подесите `area` или `entities`",
    zoom_in: "Прикажи целу картицу",
    zoom_out: "Назад на компактни приказ",
    ed_zoom: "Дугме за увећање",
    ed_zoom_helper: "Пребацује мини картицу на пун приказ и назад",
  },
  "sr-Latn": {
    unavailable: "Nedostupno",
    turn_all_off: "Isključi sve",
    ed_title: "Naslov",
    ed_show_title: "Prikaži naslov",
    ed_advanced: "Napredno",
    ed_language: "Jezik",
    ed_language_helper: "Prazno: jezik Home Assistant-a",
    ed_language_auto: "Automatski",
    ed_navigation_path: "Putanja za navigaciju",
    err_config: "Podesite `area` ili `entities`",
    zoom_in: "Prikaži celu karticu",
    zoom_out: "Nazad na kompaktni prikaz",
    ed_zoom: "Dugme za uvećanje",
    ed_zoom_helper: "Prebacuje mini karticu na pun prikaz i nazad",
  },
  it: {
    unavailable: "Non disponibile",
    turn_all_off: "Spegni tutto",
    ed_title: "Titolo",
    ed_show_title: "Mostra il titolo",
    ed_advanced: "Avanzate",
    ed_language: "Lingua",
    ed_language_helper: "Vuoto: la lingua di Home Assistant",
    ed_language_auto: "Automatica",
    ed_navigation_path: "Percorso di navigazione",
    err_config: "Imposta `area` o `entities`",
    zoom_in: "Mostra la scheda completa",
    zoom_out: "Torna alla vista compatta",
    ed_zoom: "Pulsante zoom",
    ed_zoom_helper: "Passa dalla mini scheda alla scheda completa e viceversa",
  },
  nl: {
    unavailable: "Niet beschikbaar",
    turn_all_off: "Alles uitschakelen",
    ed_title: "Titel",
    ed_show_title: "Titel tonen",
    ed_advanced: "Geavanceerd",
    ed_language: "Taal",
    ed_language_helper: "Leeg: de taal van Home Assistant",
    ed_language_auto: "Automatisch",
    ed_navigation_path: "Navigatiepad",
    err_config: "Stel `area` of `entities` in",
    zoom_in: "Volledige kaart tonen",
    zoom_out: "Terug naar de compacte weergave",
    ed_zoom: "Zoomknop",
    ed_zoom_helper: "Schakelt de minikaart naar de volledige kaart en terug",
  },
  pt: {
    unavailable: "Indisponível",
    turn_all_off: "Desligar tudo",
    ed_title: "Título",
    ed_show_title: "Mostrar o título",
    ed_advanced: "Avançado",
    ed_language: "Idioma",
    ed_language_helper: "Vazio: o idioma do Home Assistant",
    ed_language_auto: "Automático",
    ed_navigation_path: "Caminho de navegação",
    err_config: "Defina `area` ou `entities`",
    zoom_in: "Mostrar o cartão completo",
    zoom_out: "Voltar à vista compacta",
    ed_zoom: "Botão de zoom",
    ed_zoom_helper: "Alterna entre o minicartão e o cartão completo",
  },
  pl: {
    unavailable: "Niedostępne",
    turn_all_off: "Wyłącz wszystko",
    ed_title: "Tytuł",
    ed_show_title: "Pokaż tytuł",
    ed_advanced: "Zaawansowane",
    ed_language: "Język",
    ed_language_helper: "Puste: język Home Assistanta",
    ed_language_auto: "Automatyczny",
    ed_navigation_path: "Ścieżka nawigacji",
    err_config: "Ustaw `area` lub `entities`",
    zoom_in: "Pokaż pełną kartę",
    zoom_out: "Wróć do widoku kompaktowego",
    ed_zoom: "Przycisk powiększenia",
    ed_zoom_helper: "Przełącza minikartę na pełną kartę i z powrotem",
  },
  ro: {
    unavailable: "Indisponibil",
    turn_all_off: "Oprește tot",
    ed_title: "Titlu",
    ed_show_title: "Afișează titlul",
    ed_advanced: "Avansat",
    ed_language: "Limbă",
    ed_language_helper: "Gol: limba Home Assistant",
    ed_language_auto: "Automată",
    ed_navigation_path: "Cale de navigare",
    err_config: "Setează `area` sau `entities`",
    zoom_in: "Afișează cardul complet",
    zoom_out: "Înapoi la vizualizarea compactă",
    ed_zoom: "Buton de zoom",
    ed_zoom_helper: "Comută între mini-card și cardul complet",
  },
  da: {
    unavailable: "Utilgængelig",
    turn_all_off: "Sluk alt",
    ed_title: "Titel",
    ed_show_title: "Vis titel",
    ed_advanced: "Avanceret",
    ed_language: "Sprog",
    ed_language_helper: "Tomt: Home Assistants sprog",
    ed_language_auto: "Automatisk",
    ed_navigation_path: "Navigationssti",
    err_config: "Angiv `area` eller `entities`",
    zoom_in: "Vis hele kortet",
    zoom_out: "Tilbage til den kompakte visning",
    ed_zoom: "Zoomknap",
    ed_zoom_helper: "Skifter fra minikortet til hele kortet og tilbage",
  },
  sv: {
    unavailable: "Ej tillgänglig",
    turn_all_off: "Stäng av allt",
    ed_title: "Titel",
    ed_show_title: "Visa rubrik",
    ed_advanced: "Avancerat",
    ed_language: "Språk",
    ed_language_helper: "Tomt: Home Assistants språk",
    ed_language_auto: "Automatiskt",
    ed_navigation_path: "Navigeringssökväg",
    err_config: "Ange `area` eller `entities`",
    zoom_in: "Visa hela kortet",
    zoom_out: "Tillbaka till kompakt vy",
    ed_zoom: "Zoomknapp",
    ed_zoom_helper: "Växlar mellan minikortet och hela kortet",
  },
  bg: {
    unavailable: "Недостъпно",
    turn_all_off: "Изключи всичко",
    ed_title: "Заглавие",
    ed_show_title: "Показване на заглавието",
    ed_advanced: "Разширени",
    ed_language: "Език",
    ed_language_helper: "Празно: езикът на Home Assistant",
    ed_language_auto: "Автоматично",
    ed_navigation_path: "Път за навигация",
    err_config: "Задайте `area` или `entities`",
    zoom_in: "Покажи пълната карта",
    zoom_out: "Обратно към компактния изглед",
    ed_zoom: "Бутон за увеличение",
    ed_zoom_helper: "Превключва от мини картата към пълната карта и обратно",
  },
  ru: {
    unavailable: "Недоступно",
    turn_all_off: "Выключить всё",
    ed_title: "Заголовок",
    ed_show_title: "Показывать заголовок",
    ed_advanced: "Дополнительно",
    ed_language: "Язык",
    ed_language_helper: "Пусто: язык Home Assistant",
    ed_language_auto: "Автоматически",
    ed_navigation_path: "Путь навигации",
    err_config: "Укажите `area` или `entities`",
    zoom_in: "Показать полную карточку",
    zoom_out: "Вернуться к компактному виду",
    ed_zoom: "Кнопка масштаба",
    ed_zoom_helper: "Переключает мини-карточку на полную карточку и обратно",
  },
  uk: {
    unavailable: "Недоступно",
    turn_all_off: "Вимкнути все",
    ed_title: "Заголовок",
    ed_show_title: "Показувати заголовок",
    ed_advanced: "Додатково",
    ed_language: "Мова",
    ed_language_helper: "Порожньо: мова Home Assistant",
    ed_language_auto: "Автоматично",
    ed_navigation_path: "Шлях навігації",
    err_config: "Вкажіть `area` або `entities`",
    zoom_in: "Показати повну картку",
    zoom_out: "Повернутися до компактного вигляду",
    ed_zoom: "Кнопка масштабу",
    ed_zoom_helper: "Перемикає міні-картку на повну картку й назад",
  },
  hu: {
    unavailable: "Nem elérhető",
    turn_all_off: "Minden kikapcsolása",
    ed_title: "Cím",
    ed_show_title: "Cím megjelenítése",
    ed_advanced: "Speciális",
    ed_language: "Nyelv",
    ed_language_helper: "Üres: a Home Assistant nyelve",
    ed_language_auto: "Automatikus",
    ed_navigation_path: "Navigációs útvonal",
    err_config: "Állítsd be az `area` vagy az `entities` értékét",
    zoom_in: "A teljes kártya megjelenítése",
    zoom_out: "Vissza a kompakt nézethez",
    ed_zoom: "Nagyítás gomb",
    ed_zoom_helper: "Vált a mini kártya és a teljes kártya között",
  },
  sk: {
    unavailable: "Nedostupné",
    turn_all_off: "Vypnúť všetko",
    ed_title: "Názov",
    ed_show_title: "Zobraziť názov",
    ed_advanced: "Rozšírené",
    ed_language: "Jazyk",
    ed_language_helper: "Prázdne: jazyk Home Assistanta",
    ed_language_auto: "Automaticky",
    ed_navigation_path: "Navigačná cesta",
    err_config: "Nastavte `area` alebo `entities`",
    zoom_in: "Zobraziť celú kartu",
    zoom_out: "Späť na kompaktné zobrazenie",
    ed_zoom: "Tlačidlo priblíženia",
    ed_zoom_helper: "Prepína minikartu na celú kartu a späť",
  },
  cs: {
    unavailable: "Nedostupné",
    turn_all_off: "Vypnout vše",
    ed_title: "Název",
    ed_show_title: "Zobrazit název",
    ed_advanced: "Pokročilé",
    ed_language: "Jazyk",
    ed_language_helper: "Prázdné: jazyk Home Assistanta",
    ed_language_auto: "Automaticky",
    ed_navigation_path: "Navigační cesta",
    err_config: "Nastavte `area` nebo `entities`",
    zoom_in: "Zobrazit celou kartu",
    zoom_out: "Zpět na kompaktní zobrazení",
    ed_zoom: "Tlačítko přiblížení",
    ed_zoom_helper: "Přepíná minikartu na celou kartu a zpět",
  },
  sl: {
    unavailable: "Ni na voljo",
    turn_all_off: "Izklopi vse",
    ed_title: "Naslov",
    ed_show_title: "Prikaži naslov",
    ed_advanced: "Napredno",
    ed_language: "Jezik",
    ed_language_helper: "Prazno: jezik Home Assistanta",
    ed_language_auto: "Samodejno",
    ed_navigation_path: "Navigacijska pot",
    err_config: "Nastavite `area` ali `entities`",
    zoom_in: "Prikaži celotno kartico",
    zoom_out: "Nazaj na strnjen pogled",
    ed_zoom: "Gumb za povečavo",
    ed_zoom_helper: "Preklopi mini kartico v celotno kartico in nazaj",
  },
  lv: {
    unavailable: "Nav pieejams",
    turn_all_off: "Izslēgt visu",
    ed_title: "Virsraksts",
    ed_show_title: "Rādīt virsrakstu",
    ed_advanced: "Papildu",
    ed_language: "Valoda",
    ed_language_helper: "Tukšs: Home Assistant valoda",
    ed_language_auto: "Automātiski",
    ed_navigation_path: "Navigācijas ceļš",
    err_config: "Iestatiet `area` vai `entities`",
    zoom_in: "Rādīt pilno karti",
    zoom_out: "Atpakaļ uz kompakto skatu",
    ed_zoom: "Tālummaiņas poga",
    ed_zoom_helper: "Pārslēdz mini karti uz pilno karti un atpakaļ",
  },
  el: {
    unavailable: "Μη διαθέσιμο",
    turn_all_off: "Απενεργοποίηση όλων",
    ed_title: "Τίτλος",
    ed_show_title: "Εμφάνιση τίτλου",
    ed_advanced: "Για προχωρημένους",
    ed_language: "Γλώσσα",
    ed_language_helper: "Κενό: η γλώσσα του Home Assistant",
    ed_language_auto: "Αυτόματα",
    ed_navigation_path: "Διαδρομή πλοήγησης",
    err_config: "Ορίστε `area` ή `entities`",
    zoom_in: "Εμφάνιση της πλήρους κάρτας",
    zoom_out: "Επιστροφή στη συμπαγή προβολή",
    ed_zoom: "Κουμπί ζουμ",
    ed_zoom_helper: "Εναλλάσσει τη μίνι κάρτα με την πλήρη κάρτα",
  },
};

// ── Solar forecast ───────────────────────────────────────────────────────────
// The forecast comes from the sensors of a solar forecast integration (Forecast.Solar, Solcast, Open-Meteo Solar
// Forecast): today's, the rest of today's and tomorrow's energy, the power now, the peak time. The sensors of the same
// device (one per forecast integration entry) are found by their translation key or entity id. `entities` overrides
// any role. The hour by hour forecast comes from those sensors' attributes when they carry it (Solcast's detailed
// forecast, Open-Meteo's `wh_period`), else from the Energy dashboard's forecast (energy/solar_forecast). The actual
// production, hour by hour, comes from the recorder's statistics of the panels' energy sensor.
const SF_PLATFORMS = ["forecast_solar", "solcast_solar", "open_meteo_solar_forecast"];
// Matched against "<translation key> <entity id>".
const SF_ROLES = {
  remaining: /(today_remaining|remaining_today|get_remaining_today)\b/,
  today: /(energy_production_today|forecast_today|total_kwh_forecast_today)\b/,
  tomorrow: /(energy_production_tomorrow|forecast_tomorrow|total_kwh_forecast_tomorrow)\b/,
  day3: /(forecast_day_3|total_kwh_forecast_d3)\b/,
  now: /(power_production_now|power_now)\b/,
  peak: /(highest_peak_time_today|peak_time_today|peak_w_time_today)\b/,
};

const sfNum = (st) => {
  if (!st || ["unavailable", "unknown", ""].includes(st.state)) return null;
  const v = Number(st.state);
  return Number.isFinite(v) ? v : null;
};
// An energy in kWh, a power in W, whatever the sensor's unit.
const sfKwh = (st) => {
  const v = sfNum(st);
  if (v == null) return null;
  const u = st.attributes?.unit_of_measurement || "kWh";
  return /^Wh$/i.test(u) ? v / 1000 : /^MWh$/i.test(u) ? v * 1000 : v;
};
const sfWatts = (st) => {
  const v = sfNum(st);
  if (v == null) return null;
  const u = st.attributes?.unit_of_measurement || "W";
  return /^kW$/i.test(u) ? v * 1000 : /^MW$/i.test(u) ? v * 1e6 : v;
};

// The role of a sensor, from its translation key and its entity id.
const sfRole = (hass, id) => {
  if (!id.startsWith("sensor.")) return null;
  const key = `${hass.entities?.[id]?.translation_key || ""} ${id}`;
  return Object.keys(SF_ROLES).find((r) => SF_ROLES[r].test(key)) || null;
};

// Today's forecast sensors of the home, one per forecast integration entry: for the card picker's first config.
const sfSources = (hass) =>
  Object.keys(hass.entities || {}).filter((id) => SF_PLATFORMS.includes(hass.entities[id].platform) && sfRole(hass, id) === "today");

// The sensor of each role: those of `entity`'s device, else of every forecast integration of the home.
const sfFind = (hass, entity, overrides = {}) => {
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

// The start of the hour holding `t` (ms), in the browser's time zone.
const sfHour = (t) => {
  const d = new Date(t);
  d.setMinutes(0, 0, 0);
  return d.getTime();
};
// Midnight `offset` days from the day of `t`.
const sfDay = (t, offset = 0) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d.getTime();
};

// The hour by hour forecast (kWh per hour start) a sensor's attributes carry: Solcast's detailedHourly or
// detailedForecast (average kW over each period), Open-Meteo's wh_period (Wh per period start).
const sfAttrHours = (st, into = new Map()) => {
  const a = st?.attributes || {};
  const add = (t, kwh) => {
    if (!Number.isFinite(t) || !Number.isFinite(kwh)) return;
    const h = sfHour(t);
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

// The Energy dashboard's forecast (energy/solar_forecast: Wh per hour, per config entry), summed over the entries.
const sfWsHours = (forecasts, into = new Map()) => {
  for (const f of Object.values(forecasts || {}))
    for (const [k, v] of Object.entries(f?.wh_hours || {})) {
      const h = sfHour(new Date(k).getTime());
      if (Number.isFinite(h)) into.set(h, (into.get(h) || 0) + Number(v) / 1000);
    }
  return into;
};

// The hours of `w` in a row with the most forecast energy among `hours` ([{ t, f }]), from `from` on; null when none
// has any.
const sfBestWindow = (hours, from, w) => {
  let best = null;
  for (let i = 0; i + w <= hours.length; i++) {
    if (hours[i].t < from) continue;
    const sum = hours.slice(i, i + w).reduce((s, h) => s + (h.f || 0), 0);
    if (sum > 0.001 && (!best || sum > best.sum)) best = { start: hours[i].t, end: hours[i + w - 1].t + 3.6e6, sum };
  }
  return best;
};

// The Intl formats, made once per language and options (a render formats many numbers).
const sfIntlCache = new Map();
const sfIntl = (Kind, lang, opts) => {
  const key = `${Kind.name}|${lang}|${JSON.stringify(opts)}`;
  if (!sfIntlCache.has(key)) sfIntlCache.set(key, new Kind(lang, opts));
  return sfIntlCache.get(key);
};

// Strings of the solar forecast cards; the shared ones above (editor basics) complete them.
const SF_I18N = {
  en: {
    title: "Solar forecast",
    st_on_track: "On track",
    st_above: "Above forecast",
    st_below: "Below forecast",
    st_forecast: "Forecast",
    st_night: "Night",
    st_offline: "Unavailable",
    produced: "Produced",
    forecast_today: "Forecast today",
    to_come: "Still to come",
    now: "Now",
    now_forecast: "Forecast now",
    today_hours: "Today, hour by hour",
    forecast_total: "forecast {v}",
    best: "best {from} – {to}",
    best_tomorrow: "best tomorrow {from} – {to}",
    tomorrow: "Tomorrow",
    less_sun: "Less sun",
    more_sun: "More sun",
    faded: "faded = already produced",
    now_marker: "now",
    no_forecast: "No solar forecast found",
    no_hourly: "No hour by hour forecast: add the forecast to the Energy dashboard's solar panels",
    chip_to_come: "{v} to come",
    chip_tomorrow: "Tomorrow {v}",
    sub_to_come: "{v} still to come today",
    hour_title: "{h} · forecast {f} · produced {a}",
    hour_title_f: "{h} · forecast {f}",
    ed_entity: "Forecast sensor",
    ed_entity_helper: "Any sensor of the forecast integration (Forecast.Solar, Solcast, Open-Meteo); its other sensors are found with it",
    ed_production: "Production energy",
    ed_production_helper: "The panels' energy sensor (kWh) for the actual production; empty: the Energy dashboard's solar source",
    ed_power: "Production power",
    ed_power_helper: "The panels' power sensor (W) for the power now; empty: the forecast power",
    ed_window_hours: "Best time length",
    ed_window_hours_helper: "Hours the appliances need, for the best time window",
    ed_show_days: "Next days",
    ed_show_subtitle: "Show subtitle",
    ed_illustration: "Illustrated header",
    ed_illustration_theme: "Header theme",
    ed_theme_auto: "Automatic (follows the theme)",
    ed_theme_day: "Day",
    ed_theme_night: "Night",
    ed_animations: "Animations",
    ed_entities: "Entities (YAML)",
    ed_entities_helper: "Overrides of the found sensors, by role: today, remaining, tomorrow, day3, now, peak",
    ed_title_helper: "Empty: Solar forecast",
  },
  fr: {
    title: "Prévision solaire",
    st_on_track: "Dans les clous",
    st_above: "Au-dessus de la prévision",
    st_below: "Sous la prévision",
    st_forecast: "Prévision",
    st_night: "Nuit",
    st_offline: "Indisponible",
    produced: "Produit",
    forecast_today: "Prévu aujourd'hui",
    to_come: "Reste à venir",
    now: "Maintenant",
    now_forecast: "Prévu maintenant",
    today_hours: "Aujourd'hui, heure par heure",
    forecast_total: "prévu {v}",
    best: "idéal {from} – {to}",
    best_tomorrow: "idéal demain {from} – {to}",
    tomorrow: "Demain",
    less_sun: "Moins de soleil",
    more_sun: "Plus de soleil",
    faded: "estompé = déjà produit",
    now_marker: "maintenant",
    no_forecast: "Aucune prévision solaire trouvée",
    no_hourly: "Pas de prévision heure par heure : ajoute la prévision aux panneaux solaires du tableau Énergie",
    chip_to_come: "{v} à venir",
    chip_tomorrow: "Demain {v}",
    sub_to_come: "{v} encore à venir aujourd'hui",
    hour_title: "{h} · prévu {f} · produit {a}",
    hour_title_f: "{h} · prévu {f}",
    ed_entity: "Capteur de prévision",
    ed_entity_helper: "N'importe quel capteur de l'intégration de prévision (Forecast.Solar, Solcast, Open-Meteo) ; ses autres capteurs sont trouvés avec",
    ed_production: "Énergie produite",
    ed_production_helper: "Le capteur d'énergie des panneaux (kWh) pour la production réelle ; vide : la source solaire du tableau Énergie",
    ed_power: "Puissance produite",
    ed_power_helper: "Le capteur de puissance des panneaux (W) pour la puissance actuelle ; vide : la puissance prévue",
    ed_window_hours: "Durée du créneau idéal",
    ed_window_hours_helper: "Heures dont les appareils ont besoin, pour le créneau idéal",
    ed_show_days: "Jours suivants",
    ed_show_subtitle: "Afficher le sous-titre",
    ed_illustration: "En-tête illustré",
    ed_illustration_theme: "Thème de l'en-tête",
    ed_theme_auto: "Automatique (suit le thème)",
    ed_theme_day: "Jour",
    ed_theme_night: "Nuit",
    ed_animations: "Animations",
    ed_entities: "Entités (YAML)",
    ed_entities_helper: "Remplace les capteurs trouvés, par rôle : today, remaining, tomorrow, day3, now, peak",
    ed_title_helper: "Vide : Prévision solaire",
  },
  de: {
    title: "Solarprognose",
    st_on_track: "Im Plan",
    st_above: "Über der Prognose",
    st_below: "Unter der Prognose",
    st_forecast: "Prognose",
    st_night: "Nacht",
    st_offline: "Nicht verfügbar",
    produced: "Erzeugt",
    forecast_today: "Prognose heute",
    to_come: "Noch zu erwarten",
    now: "Jetzt",
    now_forecast: "Prognose jetzt",
    today_hours: "Heute, Stunde für Stunde",
    forecast_total: "Prognose {v}",
    best: "ideal {from} – {to}",
    best_tomorrow: "ideal morgen {from} – {to}",
    tomorrow: "Morgen",
    less_sun: "Weniger Sonne",
    more_sun: "Mehr Sonne",
    faded: "blass = bereits erzeugt",
    now_marker: "jetzt",
    no_forecast: "Keine Solarprognose gefunden",
    no_hourly: "Keine stündliche Prognose: Füge die Prognose den Solarmodulen im Energie-Dashboard hinzu",
    chip_to_come: "{v} noch zu erwarten",
    chip_tomorrow: "Morgen {v}",
    sub_to_come: "{v} heute noch zu erwarten",
    hour_title: "{h} · Prognose {f} · erzeugt {a}",
    hour_title_f: "{h} · Prognose {f}",
    ed_entity: "Prognosesensor",
    ed_entity_helper: "Ein beliebiger Sensor der Prognose-Integration (Forecast.Solar, Solcast, Open-Meteo); ihre anderen Sensoren werden mitgefunden",
    ed_production: "Erzeugte Energie",
    ed_production_helper: "Der Energiesensor der Module (kWh) für die tatsächliche Erzeugung; leer: die Solarquelle des Energie-Dashboards",
    ed_power: "Erzeugte Leistung",
    ed_power_helper: "Der Leistungssensor der Module (W) für die aktuelle Leistung; leer: die prognostizierte Leistung",
    ed_window_hours: "Dauer des idealen Zeitfensters",
    ed_window_hours_helper: "Stunden, die die Geräte brauchen, für das ideale Zeitfenster",
    ed_show_days: "Nächste Tage",
    ed_show_subtitle: "Untertitel anzeigen",
    ed_illustration: "Illustrierte Kopfzeile",
    ed_illustration_theme: "Design der Kopfzeile",
    ed_theme_auto: "Automatisch (folgt dem Design)",
    ed_theme_day: "Tag",
    ed_theme_night: "Nacht",
    ed_animations: "Animationen",
    ed_entities: "Entitäten (YAML)",
    ed_entities_helper: "Ersetzt die gefundenen Sensoren, nach Rolle: today, remaining, tomorrow, day3, now, peak",
    ed_title_helper: "Leer: Solarprognose",
  },
  es: {
    title: "Previsión solar",
    st_on_track: "Según lo previsto",
    st_above: "Por encima de la previsión",
    st_below: "Por debajo de la previsión",
    st_forecast: "Previsión",
    st_night: "Noche",
    st_offline: "No disponible",
    produced: "Producido",
    forecast_today: "Previsto hoy",
    to_come: "Por venir",
    now: "Ahora",
    now_forecast: "Previsto ahora",
    today_hours: "Hoy, hora a hora",
    forecast_total: "previsto {v}",
    best: "ideal {from} – {to}",
    best_tomorrow: "ideal mañana {from} – {to}",
    tomorrow: "Mañana",
    less_sun: "Menos sol",
    more_sun: "Más sol",
    faded: "atenuado = ya producido",
    now_marker: "ahora",
    no_forecast: "No se encontró ninguna previsión solar",
    no_hourly: "Sin previsión hora a hora: añade la previsión a los paneles solares del panel de Energía",
    chip_to_come: "{v} por venir",
    chip_tomorrow: "Mañana {v}",
    sub_to_come: "{v} aún por venir hoy",
    hour_title: "{h} · previsto {f} · producido {a}",
    hour_title_f: "{h} · previsto {f}",
    ed_entity: "Sensor de previsión",
    ed_entity_helper: "Cualquier sensor de la integración de previsión (Forecast.Solar, Solcast, Open-Meteo); sus otros sensores se encuentran con él",
    ed_production: "Energía producida",
    ed_production_helper: "El sensor de energía de los paneles (kWh) para la producción real; vacío: la fuente solar del panel de Energía",
    ed_power: "Potencia producida",
    ed_power_helper: "El sensor de potencia de los paneles (W) para la potencia actual; vacío: la potencia prevista",
    ed_window_hours: "Duración de la franja ideal",
    ed_window_hours_helper: "Horas que necesitan los aparatos, para la franja ideal",
    ed_show_days: "Próximos días",
    ed_show_subtitle: "Mostrar subtítulo",
    ed_illustration: "Encabezado ilustrado",
    ed_illustration_theme: "Tema del encabezado",
    ed_theme_auto: "Automático (sigue el tema)",
    ed_theme_day: "Día",
    ed_theme_night: "Noche",
    ed_animations: "Animaciones",
    ed_entities: "Entidades (YAML)",
    ed_entities_helper: "Sustituye los sensores encontrados, por rol: today, remaining, tomorrow, day3, now, peak",
    ed_title_helper: "Vacío: Previsión solar",
  },
  sr: {
    title: "Соларна прогноза",
    st_on_track: "По плану",
    st_above: "Изнад прогнозе",
    st_below: "Испод прогнозе",
    st_forecast: "Прогноза",
    st_night: "Ноћ",
    st_offline: "Недоступно",
    produced: "Произведено",
    forecast_today: "Прогноза за данас",
    to_come: "Још долази",
    now: "Сада",
    now_forecast: "Прогноза сада",
    today_hours: "Данас, сат по сат",
    forecast_total: "прогноза {v}",
    best: "најбоље {from} – {to}",
    best_tomorrow: "најбоље сутра {from} – {to}",
    tomorrow: "Сутра",
    less_sun: "Мање сунца",
    more_sun: "Више сунца",
    faded: "бледо = већ произведено",
    now_marker: "сада",
    no_forecast: "Није пронађена соларна прогноза",
    no_hourly: "Нема прогнозе по сатима: додајте прогнозу соларним панелима на контролној табли Енергија",
    chip_to_come: "{v} још долази",
    chip_tomorrow: "Сутра {v}",
    sub_to_come: "{v} још долази данас",
    hour_title: "{h} · прогноза {f} · произведено {a}",
    hour_title_f: "{h} · прогноза {f}",
    ed_entity: "Сензор прогнозе",
    ed_entity_helper: "Било који сензор интеграције прогнозе (Forecast.Solar, Solcast, Open-Meteo); њени остали сензори се проналазе са њим",
    ed_production: "Произведена енергија",
    ed_production_helper: "Сензор енергије панела (kWh) за стварну производњу; празно: соларни извор контролне табле Енергија",
    ed_power: "Произведена снага",
    ed_power_helper: "Сензор снаге панела (W) за тренутну снагу; празно: предвиђена снага",
    ed_window_hours: "Трајање најбољег термина",
    ed_window_hours_helper: "Сати који су потребни уређајима, за најбољи термин",
    ed_show_days: "Наредни дани",
    ed_show_subtitle: "Прикажи поднаслов",
    ed_illustration: "Илустровано заглавље",
    ed_illustration_theme: "Тема заглавља",
    ed_theme_auto: "Аутоматски (прати тему)",
    ed_theme_day: "Дан",
    ed_theme_night: "Ноћ",
    ed_animations: "Анимације",
    ed_entities: "Ентитети (YAML)",
    ed_entities_helper: "Замењује пронађене сензоре, по улози: today, remaining, tomorrow, day3, now, peak",
    ed_title_helper: "Празно: Соларна прогноза",
  },
  "sr-Latn": {
    title: "Solarna prognoza",
    st_on_track: "Po planu",
    st_above: "Iznad prognoze",
    st_below: "Ispod prognoze",
    st_forecast: "Prognoza",
    st_night: "Noć",
    st_offline: "Nedostupno",
    produced: "Proizvedeno",
    forecast_today: "Prognoza za danas",
    to_come: "Još dolazi",
    now: "Sada",
    now_forecast: "Prognoza sada",
    today_hours: "Danas, sat po sat",
    forecast_total: "prognoza {v}",
    best: "najbolje {from} – {to}",
    best_tomorrow: "najbolje sutra {from} – {to}",
    tomorrow: "Sutra",
    less_sun: "Manje sunca",
    more_sun: "Više sunca",
    faded: "bledo = već proizvedeno",
    now_marker: "sada",
    no_forecast: "Nije pronađena solarna prognoza",
    no_hourly: "Nema prognoze po satima: dodajte prognozu solarnim panelima na kontrolnoj tabli Energija",
    chip_to_come: "{v} još dolazi",
    chip_tomorrow: "Sutra {v}",
    sub_to_come: "{v} još dolazi danas",
    hour_title: "{h} · prognoza {f} · proizvedeno {a}",
    hour_title_f: "{h} · prognoza {f}",
    ed_entity: "Senzor prognoze",
    ed_entity_helper: "Bilo koji senzor integracije prognoze (Forecast.Solar, Solcast, Open-Meteo); njeni ostali senzori se pronalaze sa njim",
    ed_production: "Proizvedena energija",
    ed_production_helper: "Senzor energije panela (kWh) za stvarnu proizvodnju; prazno: solarni izvor kontrolne table Energija",
    ed_power: "Proizvedena snaga",
    ed_power_helper: "Senzor snage panela (W) za trenutnu snagu; prazno: predviđena snaga",
    ed_window_hours: "Trajanje najboljeg termina",
    ed_window_hours_helper: "Sati koji su potrebni uređajima, za najbolji termin",
    ed_show_days: "Naredni dani",
    ed_show_subtitle: "Prikaži podnaslov",
    ed_illustration: "Ilustrovano zaglavlje",
    ed_illustration_theme: "Tema zaglavlja",
    ed_theme_auto: "Automatski (prati temu)",
    ed_theme_day: "Dan",
    ed_theme_night: "Noć",
    ed_animations: "Animacije",
    ed_entities: "Entiteti (YAML)",
    ed_entities_helper: "Zamenjuje pronađene senzore, po ulozi: today, remaining, tomorrow, day3, now, peak",
    ed_title_helper: "Prazno: Solarna prognoza",
  },
  it: {
    title: "Previsione solare",
    st_on_track: "In linea",
    st_above: "Sopra la previsione",
    st_below: "Sotto la previsione",
    st_forecast: "Previsione",
    st_night: "Notte",
    st_offline: "Non disponibile",
    produced: "Prodotto",
    forecast_today: "Previsto oggi",
    to_come: "Ancora da produrre",
    now: "Adesso",
    now_forecast: "Previsto adesso",
    today_hours: "Oggi, ora per ora",
    forecast_total: "previsto {v}",
    best: "ideale {from} – {to}",
    best_tomorrow: "ideale domani {from} – {to}",
    tomorrow: "Domani",
    less_sun: "Meno sole",
    more_sun: "Più sole",
    faded: "sbiadito = già prodotto",
    now_marker: "adesso",
    no_forecast: "Nessuna previsione solare trovata",
    no_hourly: "Nessuna previsione oraria: aggiungi la previsione ai pannelli solari della dashboard Energia",
    chip_to_come: "{v} ancora da produrre",
    chip_tomorrow: "Domani {v}",
    sub_to_come: "{v} ancora da produrre oggi",
    hour_title: "{h} · previsto {f} · prodotto {a}",
    hour_title_f: "{h} · previsto {f}",
    ed_entity: "Sensore di previsione",
    ed_entity_helper: "Qualsiasi sensore dell'integrazione di previsione (Forecast.Solar, Solcast, Open-Meteo); gli altri suoi sensori vengono trovati con esso",
    ed_production: "Energia prodotta",
    ed_production_helper: "Il sensore di energia dei pannelli (kWh) per la produzione reale; vuoto: la fonte solare della dashboard Energia",
    ed_power: "Potenza prodotta",
    ed_power_helper: "Il sensore di potenza dei pannelli (W) per la potenza attuale; vuoto: la potenza prevista",
    ed_window_hours: "Durata della fascia ideale",
    ed_window_hours_helper: "Ore di cui hanno bisogno gli apparecchi, per la fascia ideale",
    ed_show_days: "Prossimi giorni",
    ed_show_subtitle: "Mostra sottotitolo",
    ed_illustration: "Intestazione illustrata",
    ed_illustration_theme: "Tema dell'intestazione",
    ed_theme_auto: "Automatico (segue il tema)",
    ed_theme_day: "Giorno",
    ed_theme_night: "Notte",
    ed_animations: "Animazioni",
    ed_entities: "Entità (YAML)",
    ed_entities_helper: "Sostituisce i sensori trovati, per ruolo: today, remaining, tomorrow, day3, now, peak",
    ed_title_helper: "Vuoto: Previsione solare",
  },
  nl: {
    title: "Zonneprognose",
    st_on_track: "Op schema",
    st_above: "Boven de prognose",
    st_below: "Onder de prognose",
    st_forecast: "Prognose",
    st_night: "Nacht",
    st_offline: "Niet beschikbaar",
    produced: "Opgewekt",
    forecast_today: "Prognose vandaag",
    to_come: "Nog te verwachten",
    now: "Nu",
    now_forecast: "Prognose nu",
    today_hours: "Vandaag, uur per uur",
    forecast_total: "prognose {v}",
    best: "ideaal {from} – {to}",
    best_tomorrow: "ideaal morgen {from} – {to}",
    tomorrow: "Morgen",
    less_sun: "Minder zon",
    more_sun: "Meer zon",
    faded: "vervaagd = al opgewekt",
    now_marker: "nu",
    no_forecast: "Geen zonneprognose gevonden",
    no_hourly: "Geen prognose per uur: voeg de prognose toe aan de zonnepanelen van het Energie-dashboard",
    chip_to_come: "{v} nog te verwachten",
    chip_tomorrow: "Morgen {v}",
    sub_to_come: "{v} vandaag nog te verwachten",
    hour_title: "{h} · prognose {f} · opgewekt {a}",
    hour_title_f: "{h} · prognose {f}",
    ed_entity: "Prognosesensor",
    ed_entity_helper: "Een willekeurige sensor van de prognose-integratie (Forecast.Solar, Solcast, Open-Meteo); de andere sensoren worden ermee gevonden",
    ed_production: "Opgewekte energie",
    ed_production_helper: "De energiesensor van de panelen (kWh) voor de werkelijke opwek; leeg: de zonnebron van het Energie-dashboard",
    ed_power: "Opgewekt vermogen",
    ed_power_helper: "De vermogenssensor van de panelen (W) voor het huidige vermogen; leeg: het voorspelde vermogen",
    ed_window_hours: "Duur van het ideale tijdvak",
    ed_window_hours_helper: "Uren die de apparaten nodig hebben, voor het ideale tijdvak",
    ed_show_days: "Volgende dagen",
    ed_show_subtitle: "Ondertitel tonen",
    ed_illustration: "Geïllustreerde koptekst",
    ed_illustration_theme: "Thema van de koptekst",
    ed_theme_auto: "Automatisch (volgt het thema)",
    ed_theme_day: "Dag",
    ed_theme_night: "Nacht",
    ed_animations: "Animaties",
    ed_entities: "Entiteiten (YAML)",
    ed_entities_helper: "Vervangt de gevonden sensoren, per rol: today, remaining, tomorrow, day3, now, peak",
    ed_title_helper: "Leeg: Zonneprognose",
  },
  pt: {
    title: "Previsão solar",
    st_on_track: "Dentro do previsto",
    st_above: "Acima da previsão",
    st_below: "Abaixo da previsão",
    st_forecast: "Previsão",
    st_night: "Noite",
    st_offline: "Indisponível",
    produced: "Produzido",
    forecast_today: "Previsto hoje",
    to_come: "Ainda por vir",
    now: "Agora",
    now_forecast: "Previsto agora",
    today_hours: "Hoje, hora a hora",
    forecast_total: "previsto {v}",
    best: "ideal {from} – {to}",
    best_tomorrow: "ideal amanhã {from} – {to}",
    tomorrow: "Amanhã",
    less_sun: "Menos sol",
    more_sun: "Mais sol",
    faded: "esbatido = já produzido",
    now_marker: "agora",
    no_forecast: "Nenhuma previsão solar encontrada",
    no_hourly: "Sem previsão hora a hora: adicione a previsão aos painéis solares do painel Energia",
    chip_to_come: "{v} por vir",
    chip_tomorrow: "Amanhã {v}",
    sub_to_come: "{v} ainda por vir hoje",
    hour_title: "{h} · previsto {f} · produzido {a}",
    hour_title_f: "{h} · previsto {f}",
    ed_entity: "Sensor de previsão",
    ed_entity_helper: "Qualquer sensor da integração de previsão (Forecast.Solar, Solcast, Open-Meteo); os seus outros sensores são encontrados com ele",
    ed_production: "Energia produzida",
    ed_production_helper: "O sensor de energia dos painéis (kWh) para a produção real; vazio: a fonte solar do painel Energia",
    ed_power: "Potência produzida",
    ed_power_helper: "O sensor de potência dos painéis (W) para a potência atual; vazio: a potência prevista",
    ed_window_hours: "Duração do período ideal",
    ed_window_hours_helper: "Horas de que os aparelhos precisam, para o período ideal",
    ed_show_days: "Próximos dias",
    ed_show_subtitle: "Mostrar subtítulo",
    ed_illustration: "Cabeçalho ilustrado",
    ed_illustration_theme: "Tema do cabeçalho",
    ed_theme_auto: "Automático (segue o tema)",
    ed_theme_day: "Dia",
    ed_theme_night: "Noite",
    ed_animations: "Animações",
    ed_entities: "Entidades (YAML)",
    ed_entities_helper: "Substitui os sensores encontrados, por função: today, remaining, tomorrow, day3, now, peak",
    ed_title_helper: "Vazio: Previsão solar",
  },
  pl: {
    title: "Prognoza solarna",
    st_on_track: "Zgodnie z prognozą",
    st_above: "Powyżej prognozy",
    st_below: "Poniżej prognozy",
    st_forecast: "Prognoza",
    st_night: "Noc",
    st_offline: "Niedostępne",
    produced: "Wyprodukowano",
    forecast_today: "Prognoza na dziś",
    to_come: "Jeszcze przed nami",
    now: "Teraz",
    now_forecast: "Prognoza teraz",
    today_hours: "Dziś, godzina po godzinie",
    forecast_total: "prognoza {v}",
    best: "najlepiej {from} – {to}",
    best_tomorrow: "najlepiej jutro {from} – {to}",
    tomorrow: "Jutro",
    less_sun: "Mniej słońca",
    more_sun: "Więcej słońca",
    faded: "wyblakłe = już wyprodukowane",
    now_marker: "teraz",
    no_forecast: "Nie znaleziono prognozy solarnej",
    no_hourly: "Brak prognozy godzinowej: dodaj prognozę do paneli słonecznych w panelu Energia",
    chip_to_come: "{v} jeszcze przed nami",
    chip_tomorrow: "Jutro {v}",
    sub_to_come: "{v} jeszcze dziś przed nami",
    hour_title: "{h} · prognoza {f} · wyprodukowano {a}",
    hour_title_f: "{h} · prognoza {f}",
    ed_entity: "Czujnik prognozy",
    ed_entity_helper: "Dowolny czujnik integracji prognozy (Forecast.Solar, Solcast, Open-Meteo); jej pozostałe czujniki zostaną znalezione razem z nim",
    ed_production: "Wyprodukowana energia",
    ed_production_helper: "Czujnik energii paneli (kWh) dla rzeczywistej produkcji; puste: źródło solarne panelu Energia",
    ed_power: "Wyprodukowana moc",
    ed_power_helper: "Czujnik mocy paneli (W) dla bieżącej mocy; puste: moc z prognozy",
    ed_window_hours: "Długość najlepszego okna",
    ed_window_hours_helper: "Liczba godzin potrzebnych urządzeniom, dla najlepszego okna",
    ed_show_days: "Kolejne dni",
    ed_show_subtitle: "Pokaż podtytuł",
    ed_illustration: "Ilustrowany nagłówek",
    ed_illustration_theme: "Motyw nagłówka",
    ed_theme_auto: "Automatycznie (zgodnie z motywem)",
    ed_theme_day: "Dzień",
    ed_theme_night: "Noc",
    ed_animations: "Animacje",
    ed_entities: "Encje (YAML)",
    ed_entities_helper: "Zastępuje znalezione czujniki, według roli: today, remaining, tomorrow, day3, now, peak",
    ed_title_helper: "Puste: Prognoza solarna",
  },
  ro: {
    title: "Prognoză solară",
    st_on_track: "Conform prognozei",
    st_above: "Peste prognoză",
    st_below: "Sub prognoză",
    st_forecast: "Prognoză",
    st_night: "Noapte",
    st_offline: "Indisponibil",
    produced: "Produs",
    forecast_today: "Prognoză azi",
    to_come: "Încă de venit",
    now: "Acum",
    now_forecast: "Prognoză acum",
    today_hours: "Azi, oră cu oră",
    forecast_total: "prognoză {v}",
    best: "ideal {from} – {to}",
    best_tomorrow: "ideal mâine {from} – {to}",
    tomorrow: "Mâine",
    less_sun: "Mai puțin soare",
    more_sun: "Mai mult soare",
    faded: "estompat = deja produs",
    now_marker: "acum",
    no_forecast: "Nu s-a găsit nicio prognoză solară",
    no_hourly: "Fără prognoză orară: adaugă prognoza la panourile solare din tabloul Energie",
    chip_to_come: "{v} încă de venit",
    chip_tomorrow: "Mâine {v}",
    sub_to_come: "{v} încă de venit azi",
    hour_title: "{h} · prognoză {f} · produs {a}",
    hour_title_f: "{h} · prognoză {f}",
    ed_entity: "Senzor de prognoză",
    ed_entity_helper: "Orice senzor al integrării de prognoză (Forecast.Solar, Solcast, Open-Meteo); ceilalți senzori ai ei sunt găsiți odată cu el",
    ed_production: "Energie produsă",
    ed_production_helper: "Senzorul de energie al panourilor (kWh) pentru producția reală; gol: sursa solară a tabloului Energie",
    ed_power: "Putere produsă",
    ed_power_helper: "Senzorul de putere al panourilor (W) pentru puterea actuală; gol: puterea prognozată",
    ed_window_hours: "Durata intervalului ideal",
    ed_window_hours_helper: "Orele de care au nevoie aparatele, pentru intervalul ideal",
    ed_show_days: "Zilele următoare",
    ed_show_subtitle: "Afișează subtitlul",
    ed_illustration: "Antet ilustrat",
    ed_illustration_theme: "Tema antetului",
    ed_theme_auto: "Automat (urmează tema)",
    ed_theme_day: "Zi",
    ed_theme_night: "Noapte",
    ed_animations: "Animații",
    ed_entities: "Entități (YAML)",
    ed_entities_helper: "Înlocuiește senzorii găsiți, după rol: today, remaining, tomorrow, day3, now, peak",
    ed_title_helper: "Gol: Prognoză solară",
  },
  da: {
    title: "Solprognose",
    st_on_track: "Efter planen",
    st_above: "Over prognosen",
    st_below: "Under prognosen",
    st_forecast: "Prognose",
    st_night: "Nat",
    st_offline: "Utilgængelig",
    produced: "Produceret",
    forecast_today: "Prognose i dag",
    to_come: "Stadig på vej",
    now: "Nu",
    now_forecast: "Prognose nu",
    today_hours: "I dag, time for time",
    forecast_total: "prognose {v}",
    best: "bedst {from} – {to}",
    best_tomorrow: "bedst i morgen {from} – {to}",
    tomorrow: "I morgen",
    less_sun: "Mindre sol",
    more_sun: "Mere sol",
    faded: "falmet = allerede produceret",
    now_marker: "nu",
    no_forecast: "Ingen solprognose fundet",
    no_hourly: "Ingen prognose time for time: tilføj prognosen til solpanelerne i Energi-dashboardet",
    chip_to_come: "{v} på vej",
    chip_tomorrow: "I morgen {v}",
    sub_to_come: "{v} stadig på vej i dag",
    hour_title: "{h} · prognose {f} · produceret {a}",
    hour_title_f: "{h} · prognose {f}",
    ed_entity: "Prognosesensor",
    ed_entity_helper: "En vilkårlig sensor fra prognoseintegrationen (Forecast.Solar, Solcast, Open-Meteo); dens andre sensorer findes sammen med den",
    ed_production: "Produceret energi",
    ed_production_helper: "Panelernes energisensor (kWh) til den faktiske produktion; tom: Energi-dashboardets solkilde",
    ed_power: "Produceret effekt",
    ed_power_helper: "Panelernes effektsensor (W) til den aktuelle effekt; tom: den forventede effekt",
    ed_window_hours: "Længde på bedste tidsrum",
    ed_window_hours_helper: "Timer apparaterne skal bruge, til det bedste tidsrum",
    ed_show_days: "Næste dage",
    ed_show_subtitle: "Vis undertitel",
    ed_illustration: "Illustreret overskrift",
    ed_illustration_theme: "Overskriftens tema",
    ed_theme_auto: "Automatisk (følger temaet)",
    ed_theme_day: "Dag",
    ed_theme_night: "Nat",
    ed_animations: "Animationer",
    ed_entities: "Enheder (YAML)",
    ed_entities_helper: "Erstatter de fundne sensorer, efter rolle: today, remaining, tomorrow, day3, now, peak",
    ed_title_helper: "Tom: Solprognose",
  },
  sv: {
    title: "Solprognos",
    st_on_track: "Enligt plan",
    st_above: "Över prognosen",
    st_below: "Under prognosen",
    st_forecast: "Prognos",
    st_night: "Natt",
    st_offline: "Otillgänglig",
    produced: "Producerat",
    forecast_today: "Prognos i dag",
    to_come: "Kvar att vänta",
    now: "Nu",
    now_forecast: "Prognos nu",
    today_hours: "I dag, timme för timme",
    forecast_total: "prognos {v}",
    best: "bäst {from} – {to}",
    best_tomorrow: "bäst i morgon {from} – {to}",
    tomorrow: "I morgon",
    less_sun: "Mindre sol",
    more_sun: "Mer sol",
    faded: "blekt = redan producerat",
    now_marker: "nu",
    no_forecast: "Ingen solprognos hittades",
    no_hourly: "Ingen prognos timme för timme: lägg till prognosen för solpanelerna i Energi-instrumentpanelen",
    chip_to_come: "{v} kvar att vänta",
    chip_tomorrow: "I morgon {v}",
    sub_to_come: "{v} kvar att vänta i dag",
    hour_title: "{h} · prognos {f} · producerat {a}",
    hour_title_f: "{h} · prognos {f}",
    ed_entity: "Prognossensor",
    ed_entity_helper: "Valfri sensor från prognosintegrationen (Forecast.Solar, Solcast, Open-Meteo); dess andra sensorer hittas tillsammans med den",
    ed_production: "Producerad energi",
    ed_production_helper: "Panelernas energisensor (kWh) för den faktiska produktionen; tom: Energi-instrumentpanelens solkälla",
    ed_power: "Producerad effekt",
    ed_power_helper: "Panelernas effektsensor (W) för aktuell effekt; tom: den prognostiserade effekten",
    ed_window_hours: "Längd på bästa tidsfönster",
    ed_window_hours_helper: "Timmar som apparaterna behöver, för det bästa tidsfönstret",
    ed_show_days: "Kommande dagar",
    ed_show_subtitle: "Visa underrubrik",
    ed_illustration: "Illustrerad rubrik",
    ed_illustration_theme: "Rubrikens tema",
    ed_theme_auto: "Automatiskt (följer temat)",
    ed_theme_day: "Dag",
    ed_theme_night: "Natt",
    ed_animations: "Animationer",
    ed_entities: "Entiteter (YAML)",
    ed_entities_helper: "Ersätter de hittade sensorerna, per roll: today, remaining, tomorrow, day3, now, peak",
    ed_title_helper: "Tom: Solprognos",
  },
  bg: {
    title: "Слънчева прогноза",
    st_on_track: "По план",
    st_above: "Над прогнозата",
    st_below: "Под прогнозата",
    st_forecast: "Прогноза",
    st_night: "Нощ",
    st_offline: "Недостъпно",
    produced: "Произведено",
    forecast_today: "Прогноза за днес",
    to_come: "Предстои",
    now: "Сега",
    now_forecast: "Прогноза сега",
    today_hours: "Днес, час по час",
    forecast_total: "прогноза {v}",
    best: "най-добре {from} – {to}",
    best_tomorrow: "най-добре утре {from} – {to}",
    tomorrow: "Утре",
    less_sun: "По-малко слънце",
    more_sun: "Повече слънце",
    faded: "избледняло = вече произведено",
    now_marker: "сега",
    no_forecast: "Не е намерена слънчева прогноза",
    no_hourly: "Няма почасова прогноза: добавете прогнозата към слънчевите панели в таблото Енергия",
    chip_to_come: "{v} предстои",
    chip_tomorrow: "Утре {v}",
    sub_to_come: "{v} още предстоят днес",
    hour_title: "{h} · прогноза {f} · произведено {a}",
    hour_title_f: "{h} · прогноза {f}",
    ed_entity: "Сензор за прогноза",
    ed_entity_helper: "Произволен сензор на интеграцията за прогноза (Forecast.Solar, Solcast, Open-Meteo); другите ѝ сензори се намират заедно с него",
    ed_production: "Произведена енергия",
    ed_production_helper: "Сензорът за енергия на панелите (kWh) за реалното производство; празно: слънчевият източник на таблото Енергия",
    ed_power: "Произведена мощност",
    ed_power_helper: "Сензорът за мощност на панелите (W) за текущата мощност; празно: прогнозната мощност",
    ed_window_hours: "Продължителност на най-добрия интервал",
    ed_window_hours_helper: "Часове, нужни на уредите, за най-добрия интервал",
    ed_show_days: "Следващи дни",
    ed_show_subtitle: "Показване на подзаглавие",
    ed_illustration: "Илюстрирано заглавие",
    ed_illustration_theme: "Тема на заглавието",
    ed_theme_auto: "Автоматично (следва темата)",
    ed_theme_day: "Ден",
    ed_theme_night: "Нощ",
    ed_animations: "Анимации",
    ed_entities: "Обекти (YAML)",
    ed_entities_helper: "Замества намерените сензори, по роля: today, remaining, tomorrow, day3, now, peak",
    ed_title_helper: "Празно: Слънчева прогноза",
  },
  ru: {
    title: "Солнечный прогноз",
    st_on_track: "По плану",
    st_above: "Выше прогноза",
    st_below: "Ниже прогноза",
    st_forecast: "Прогноз",
    st_night: "Ночь",
    st_offline: "Недоступно",
    produced: "Выработано",
    forecast_today: "Прогноз на сегодня",
    to_come: "Ещё впереди",
    now: "Сейчас",
    now_forecast: "Прогноз сейчас",
    today_hours: "Сегодня, по часам",
    forecast_total: "прогноз {v}",
    best: "лучше всего {from} – {to}",
    best_tomorrow: "лучше всего завтра {from} – {to}",
    tomorrow: "Завтра",
    less_sun: "Меньше солнца",
    more_sun: "Больше солнца",
    faded: "бледное = уже выработано",
    now_marker: "сейчас",
    no_forecast: "Солнечный прогноз не найден",
    no_hourly: "Нет почасового прогноза: добавьте прогноз к солнечным панелям на панели «Энергия»",
    chip_to_come: "{v} впереди",
    chip_tomorrow: "Завтра {v}",
    sub_to_come: "{v} ещё впереди сегодня",
    hour_title: "{h} · прогноз {f} · выработано {a}",
    hour_title_f: "{h} · прогноз {f}",
    ed_entity: "Датчик прогноза",
    ed_entity_helper: "Любой датчик интеграции прогноза (Forecast.Solar, Solcast, Open-Meteo); остальные её датчики находятся вместе с ним",
    ed_production: "Выработанная энергия",
    ed_production_helper: "Датчик энергии панелей (кВт·ч) для фактической выработки; пусто: солнечный источник панели «Энергия»",
    ed_power: "Выработанная мощность",
    ed_power_helper: "Датчик мощности панелей (Вт) для текущей мощности; пусто: прогнозная мощность",
    ed_window_hours: "Длительность лучшего окна",
    ed_window_hours_helper: "Сколько часов нужно приборам, для лучшего окна",
    ed_show_days: "Следующие дни",
    ed_show_subtitle: "Показывать подзаголовок",
    ed_illustration: "Иллюстрированный заголовок",
    ed_illustration_theme: "Тема заголовка",
    ed_theme_auto: "Автоматически (по теме)",
    ed_theme_day: "День",
    ed_theme_night: "Ночь",
    ed_animations: "Анимации",
    ed_entities: "Объекты (YAML)",
    ed_entities_helper: "Заменяет найденные датчики, по роли: today, remaining, tomorrow, day3, now, peak",
    ed_title_helper: "Пусто: Солнечный прогноз",
  },
  uk: {
    title: "Сонячний прогноз",
    st_on_track: "За планом",
    st_above: "Вище прогнозу",
    st_below: "Нижче прогнозу",
    st_forecast: "Прогноз",
    st_night: "Ніч",
    st_offline: "Недоступно",
    produced: "Вироблено",
    forecast_today: "Прогноз на сьогодні",
    to_come: "Ще попереду",
    now: "Зараз",
    now_forecast: "Прогноз зараз",
    today_hours: "Сьогодні, щогодини",
    forecast_total: "прогноз {v}",
    best: "найкраще {from} – {to}",
    best_tomorrow: "найкраще завтра {from} – {to}",
    tomorrow: "Завтра",
    less_sun: "Менше сонця",
    more_sun: "Більше сонця",
    faded: "бліде = вже вироблено",
    now_marker: "зараз",
    no_forecast: "Сонячний прогноз не знайдено",
    no_hourly: "Немає погодинного прогнозу: додайте прогноз до сонячних панелей на панелі «Енергія»",
    chip_to_come: "{v} попереду",
    chip_tomorrow: "Завтра {v}",
    sub_to_come: "{v} ще попереду сьогодні",
    hour_title: "{h} · прогноз {f} · вироблено {a}",
    hour_title_f: "{h} · прогноз {f}",
    ed_entity: "Датчик прогнозу",
    ed_entity_helper: "Будь-який датчик інтеграції прогнозу (Forecast.Solar, Solcast, Open-Meteo); інші її датчики знаходяться разом з ним",
    ed_production: "Вироблена енергія",
    ed_production_helper: "Датчик енергії панелей (кВт·год) для фактичного виробітку; порожньо: сонячне джерело панелі «Енергія»",
    ed_power: "Вироблена потужність",
    ed_power_helper: "Датчик потужності панелей (Вт) для поточної потужності; порожньо: прогнозована потужність",
    ed_window_hours: "Тривалість найкращого вікна",
    ed_window_hours_helper: "Скільки годин потрібно приладам, для найкращого вікна",
    ed_show_days: "Наступні дні",
    ed_show_subtitle: "Показувати підзаголовок",
    ed_illustration: "Ілюстрований заголовок",
    ed_illustration_theme: "Тема заголовка",
    ed_theme_auto: "Автоматично (за темою)",
    ed_theme_day: "День",
    ed_theme_night: "Ніч",
    ed_animations: "Анімації",
    ed_entities: "Об'єкти (YAML)",
    ed_entities_helper: "Замінює знайдені датчики, за роллю: today, remaining, tomorrow, day3, now, peak",
    ed_title_helper: "Порожньо: Сонячний прогноз",
  },
  hu: {
    title: "Napelemes előrejelzés",
    st_on_track: "Terv szerint",
    st_above: "Az előrejelzés felett",
    st_below: "Az előrejelzés alatt",
    st_forecast: "Előrejelzés",
    st_night: "Éjszaka",
    st_offline: "Nem elérhető",
    produced: "Megtermelt",
    forecast_today: "Mai előrejelzés",
    to_come: "Még várható",
    now: "Most",
    now_forecast: "Előrejelzés most",
    today_hours: "Ma, óráról órára",
    forecast_total: "előrejelzés {v}",
    best: "legjobb {from} – {to}",
    best_tomorrow: "legjobb holnap {from} – {to}",
    tomorrow: "Holnap",
    less_sun: "Kevesebb nap",
    more_sun: "Több nap",
    faded: "halvány = már megtermelt",
    now_marker: "most",
    no_forecast: "Nem található napelemes előrejelzés",
    no_hourly: "Nincs óránkénti előrejelzés: add hozzá az előrejelzést az Energia irányítópult napelemeihez",
    chip_to_come: "{v} még várható",
    chip_tomorrow: "Holnap {v}",
    sub_to_come: "{v} még várható ma",
    hour_title: "{h} · előrejelzés {f} · megtermelt {a}",
    hour_title_f: "{h} · előrejelzés {f}",
    ed_entity: "Előrejelzés-érzékelő",
    ed_entity_helper: "Az előrejelző integráció (Forecast.Solar, Solcast, Open-Meteo) bármely érzékelője; a többi érzékelője vele együtt megtalálható",
    ed_production: "Megtermelt energia",
    ed_production_helper: "A panelek energiaérzékelője (kWh) a tényleges termeléshez; üres: az Energia irányítópult napelemes forrása",
    ed_power: "Megtermelt teljesítmény",
    ed_power_helper: "A panelek teljesítményérzékelője (W) a pillanatnyi teljesítményhez; üres: az előre jelzett teljesítmény",
    ed_window_hours: "A legjobb idősáv hossza",
    ed_window_hours_helper: "Hány órára van szükségük a készülékeknek, a legjobb idősávhoz",
    ed_show_days: "Következő napok",
    ed_show_subtitle: "Alcím megjelenítése",
    ed_illustration: "Illusztrált fejléc",
    ed_illustration_theme: "Fejléc témája",
    ed_theme_auto: "Automatikus (követi a témát)",
    ed_theme_day: "Nappal",
    ed_theme_night: "Éjszaka",
    ed_animations: "Animációk",
    ed_entities: "Entitások (YAML)",
    ed_entities_helper: "Felülírja a talált érzékelőket, szerepkör szerint: today, remaining, tomorrow, day3, now, peak",
    ed_title_helper: "Üres: Napelemes előrejelzés",
  },
  sk: {
    title: "Solárna predpoveď",
    st_on_track: "Podľa plánu",
    st_above: "Nad predpoveďou",
    st_below: "Pod predpoveďou",
    st_forecast: "Predpoveď",
    st_night: "Noc",
    st_offline: "Nedostupné",
    produced: "Vyrobené",
    forecast_today: "Predpoveď na dnes",
    to_come: "Ešte sa očakáva",
    now: "Teraz",
    now_forecast: "Predpoveď teraz",
    today_hours: "Dnes, hodinu po hodine",
    forecast_total: "predpoveď {v}",
    best: "ideálne {from} – {to}",
    best_tomorrow: "ideálne zajtra {from} – {to}",
    tomorrow: "Zajtra",
    less_sun: "Menej slnka",
    more_sun: "Viac slnka",
    faded: "vyblednuté = už vyrobené",
    now_marker: "teraz",
    no_forecast: "Nenašla sa žiadna solárna predpoveď",
    no_hourly: "Žiadna hodinová predpoveď: pridajte predpoveď k solárnym panelom v paneli Energia",
    chip_to_come: "{v} sa ešte očakáva",
    chip_tomorrow: "Zajtra {v}",
    sub_to_come: "{v} sa dnes ešte očakáva",
    hour_title: "{h} · predpoveď {f} · vyrobené {a}",
    hour_title_f: "{h} · predpoveď {f}",
    ed_entity: "Senzor predpovede",
    ed_entity_helper: "Ľubovoľný senzor integrácie predpovede (Forecast.Solar, Solcast, Open-Meteo); jej ďalšie senzory sa nájdu spolu s ním",
    ed_production: "Vyrobená energia",
    ed_production_helper: "Senzor energie panelov (kWh) pre skutočnú výrobu; prázdne: solárny zdroj panela Energia",
    ed_power: "Vyrobený výkon",
    ed_power_helper: "Senzor výkonu panelov (W) pre aktuálny výkon; prázdne: predpovedaný výkon",
    ed_window_hours: "Dĺžka ideálneho okna",
    ed_window_hours_helper: "Hodiny, ktoré spotrebiče potrebujú, pre ideálne okno",
    ed_show_days: "Ďalšie dni",
    ed_show_subtitle: "Zobraziť podnadpis",
    ed_illustration: "Ilustrovaná hlavička",
    ed_illustration_theme: "Téma hlavičky",
    ed_theme_auto: "Automaticky (podľa témy)",
    ed_theme_day: "Deň",
    ed_theme_night: "Noc",
    ed_animations: "Animácie",
    ed_entities: "Entity (YAML)",
    ed_entities_helper: "Nahrádza nájdené senzory, podľa roly: today, remaining, tomorrow, day3, now, peak",
    ed_title_helper: "Prázdne: Solárna predpoveď",
  },
  cs: {
    title: "Solární předpověď",
    st_on_track: "Podle plánu",
    st_above: "Nad předpovědí",
    st_below: "Pod předpovědí",
    st_forecast: "Předpověď",
    st_night: "Noc",
    st_offline: "Nedostupné",
    produced: "Vyrobeno",
    forecast_today: "Předpověď na dnes",
    to_come: "Ještě se očekává",
    now: "Teď",
    now_forecast: "Předpověď teď",
    today_hours: "Dnes, hodinu po hodině",
    forecast_total: "předpověď {v}",
    best: "ideálně {from} – {to}",
    best_tomorrow: "ideálně zítra {from} – {to}",
    tomorrow: "Zítra",
    less_sun: "Méně slunce",
    more_sun: "Více slunce",
    faded: "vybledlé = už vyrobeno",
    now_marker: "teď",
    no_forecast: "Nebyla nalezena žádná solární předpověď",
    no_hourly: "Žádná hodinová předpověď: přidejte předpověď k solárním panelům v panelu Energie",
    chip_to_come: "{v} se ještě očekává",
    chip_tomorrow: "Zítra {v}",
    sub_to_come: "{v} se dnes ještě očekává",
    hour_title: "{h} · předpověď {f} · vyrobeno {a}",
    hour_title_f: "{h} · předpověď {f}",
    ed_entity: "Senzor předpovědi",
    ed_entity_helper: "Libovolný senzor integrace předpovědi (Forecast.Solar, Solcast, Open-Meteo); její další senzory se najdou spolu s ním",
    ed_production: "Vyrobená energie",
    ed_production_helper: "Senzor energie panelů (kWh) pro skutečnou výrobu; prázdné: solární zdroj panelu Energie",
    ed_power: "Vyrobený výkon",
    ed_power_helper: "Senzor výkonu panelů (W) pro aktuální výkon; prázdné: předpovídaný výkon",
    ed_window_hours: "Délka ideálního okna",
    ed_window_hours_helper: "Hodiny, které spotřebiče potřebují, pro ideální okno",
    ed_show_days: "Další dny",
    ed_show_subtitle: "Zobrazit podtitul",
    ed_illustration: "Ilustrovaná hlavička",
    ed_illustration_theme: "Motiv hlavičky",
    ed_theme_auto: "Automaticky (podle motivu)",
    ed_theme_day: "Den",
    ed_theme_night: "Noc",
    ed_animations: "Animace",
    ed_entities: "Entity (YAML)",
    ed_entities_helper: "Nahrazuje nalezené senzory, podle role: today, remaining, tomorrow, day3, now, peak",
    ed_title_helper: "Prázdné: Solární předpověď",
  },
  sl: {
    title: "Sončna napoved",
    st_on_track: "Po načrtu",
    st_above: "Nad napovedjo",
    st_below: "Pod napovedjo",
    st_forecast: "Napoved",
    st_night: "Noč",
    st_offline: "Ni na voljo",
    produced: "Proizvedeno",
    forecast_today: "Napoved za danes",
    to_come: "Še pričakovano",
    now: "Zdaj",
    now_forecast: "Napoved zdaj",
    today_hours: "Danes, uro za uro",
    forecast_total: "napoved {v}",
    best: "najbolje {from} – {to}",
    best_tomorrow: "najbolje jutri {from} – {to}",
    tomorrow: "Jutri",
    less_sun: "Manj sonca",
    more_sun: "Več sonca",
    faded: "zbledelo = že proizvedeno",
    now_marker: "zdaj",
    no_forecast: "Sončna napoved ni bila najdena",
    no_hourly: "Ni urne napovedi: dodajte napoved sončnim panelom na nadzorni plošči Energija",
    chip_to_come: "{v} še pričakovano",
    chip_tomorrow: "Jutri {v}",
    sub_to_come: "{v} še pričakovano danes",
    hour_title: "{h} · napoved {f} · proizvedeno {a}",
    hour_title_f: "{h} · napoved {f}",
    ed_entity: "Senzor napovedi",
    ed_entity_helper: "Katerikoli senzor integracije napovedi (Forecast.Solar, Solcast, Open-Meteo); njeni drugi senzorji so najdeni skupaj z njim",
    ed_production: "Proizvedena energija",
    ed_production_helper: "Senzor energije panelov (kWh) za dejansko proizvodnjo; prazno: sončni vir nadzorne plošče Energija",
    ed_power: "Proizvedena moč",
    ed_power_helper: "Senzor moči panelov (W) za trenutno moč; prazno: napovedana moč",
    ed_window_hours: "Dolžina najboljšega okna",
    ed_window_hours_helper: "Ure, ki jih potrebujejo naprave, za najboljše okno",
    ed_show_days: "Naslednji dnevi",
    ed_show_subtitle: "Prikaži podnaslov",
    ed_illustration: "Ilustrirana glava",
    ed_illustration_theme: "Tema glave",
    ed_theme_auto: "Samodejno (sledi temi)",
    ed_theme_day: "Dan",
    ed_theme_night: "Noč",
    ed_animations: "Animacije",
    ed_entities: "Entitete (YAML)",
    ed_entities_helper: "Nadomesti najdene senzorje, po vlogi: today, remaining, tomorrow, day3, now, peak",
    ed_title_helper: "Prazno: Sončna napoved",
  },
  lv: {
    title: "Saules prognoze",
    st_on_track: "Pēc plāna",
    st_above: "Virs prognozes",
    st_below: "Zem prognozes",
    st_forecast: "Prognoze",
    st_night: "Nakts",
    st_offline: "Nav pieejams",
    produced: "Saražots",
    forecast_today: "Prognoze šodienai",
    to_come: "Vēl gaidāms",
    now: "Tagad",
    now_forecast: "Prognoze tagad",
    today_hours: "Šodien, stundu pa stundai",
    forecast_total: "prognoze {v}",
    best: "labākais {from} – {to}",
    best_tomorrow: "labākais rīt {from} – {to}",
    tomorrow: "Rīt",
    less_sun: "Mazāk saules",
    more_sun: "Vairāk saules",
    faded: "izbalējis = jau saražots",
    now_marker: "tagad",
    no_forecast: "Saules prognoze nav atrasta",
    no_hourly: "Nav stundu prognozes: pievienojiet prognozi saules paneļiem Enerģijas panelī",
    chip_to_come: "{v} vēl gaidāms",
    chip_tomorrow: "Rīt {v}",
    sub_to_come: "{v} vēl gaidāms šodien",
    hour_title: "{h} · prognoze {f} · saražots {a}",
    hour_title_f: "{h} · prognoze {f}",
    ed_entity: "Prognozes sensors",
    ed_entity_helper: "Jebkurš prognozes integrācijas (Forecast.Solar, Solcast, Open-Meteo) sensors; tās pārējie sensori tiek atrasti kopā ar to",
    ed_production: "Saražotā enerģija",
    ed_production_helper: "Paneļu enerģijas sensors (kWh) faktiskajai ražošanai; tukšs: Enerģijas paneļa saules avots",
    ed_power: "Saražotā jauda",
    ed_power_helper: "Paneļu jaudas sensors (W) pašreizējai jaudai; tukšs: prognozētā jauda",
    ed_window_hours: "Labākā loga ilgums",
    ed_window_hours_helper: "Stundas, kas vajadzīgas ierīcēm, labākajam logam",
    ed_show_days: "Nākamās dienas",
    ed_show_subtitle: "Rādīt apakšvirsrakstu",
    ed_illustration: "Ilustrēta galvene",
    ed_illustration_theme: "Galvenes motīvs",
    ed_theme_auto: "Automātiski (pēc motīva)",
    ed_theme_day: "Diena",
    ed_theme_night: "Nakts",
    ed_animations: "Animācijas",
    ed_entities: "Entītijas (YAML)",
    ed_entities_helper: "Aizstāj atrastos sensorus, pēc lomas: today, remaining, tomorrow, day3, now, peak",
    ed_title_helper: "Tukšs: Saules prognoze",
  },
  el: {
    title: "Ηλιακή πρόβλεψη",
    st_on_track: "Εντός πρόβλεψης",
    st_above: "Πάνω από την πρόβλεψη",
    st_below: "Κάτω από την πρόβλεψη",
    st_forecast: "Πρόβλεψη",
    st_night: "Νύχτα",
    st_offline: "Μη διαθέσιμο",
    produced: "Παραγωγή",
    forecast_today: "Πρόβλεψη σήμερα",
    to_come: "Απομένει",
    now: "Τώρα",
    now_forecast: "Πρόβλεψη τώρα",
    today_hours: "Σήμερα, ώρα προς ώρα",
    forecast_total: "πρόβλεψη {v}",
    best: "ιδανικά {from} – {to}",
    best_tomorrow: "ιδανικά αύριο {from} – {to}",
    tomorrow: "Αύριο",
    less_sun: "Λιγότερος ήλιος",
    more_sun: "Περισσότερος ήλιος",
    faded: "αχνό = ήδη παραγμένο",
    now_marker: "τώρα",
    no_forecast: "Δεν βρέθηκε ηλιακή πρόβλεψη",
    no_hourly: "Δεν υπάρχει ωριαία πρόβλεψη: προσθέστε την πρόβλεψη στα ηλιακά πάνελ του πίνακα Ενέργειας",
    chip_to_come: "{v} απομένει",
    chip_tomorrow: "Αύριο {v}",
    sub_to_come: "{v} απομένει ακόμα σήμερα",
    hour_title: "{h} · πρόβλεψη {f} · παραγωγή {a}",
    hour_title_f: "{h} · πρόβλεψη {f}",
    ed_entity: "Αισθητήρας πρόβλεψης",
    ed_entity_helper: "Οποιοσδήποτε αισθητήρας της ενσωμάτωσης πρόβλεψης (Forecast.Solar, Solcast, Open-Meteo); οι άλλοι αισθητήρες της βρίσκονται μαζί του",
    ed_production: "Παραγόμενη ενέργεια",
    ed_production_helper: "Ο αισθητήρας ενέργειας των πάνελ (kWh) για την πραγματική παραγωγή· κενό: η ηλιακή πηγή του πίνακα Ενέργειας",
    ed_power: "Παραγόμενη ισχύς",
    ed_power_helper: "Ο αισθητήρας ισχύος των πάνελ (W) για την τρέχουσα ισχύ· κενό: η προβλεπόμενη ισχύς",
    ed_window_hours: "Διάρκεια ιδανικού διαστήματος",
    ed_window_hours_helper: "Ώρες που χρειάζονται οι συσκευές, για το ιδανικό διάστημα",
    ed_show_days: "Επόμενες ημέρες",
    ed_show_subtitle: "Εμφάνιση υπότιτλου",
    ed_illustration: "Εικονογραφημένη κεφαλίδα",
    ed_illustration_theme: "Θέμα κεφαλίδας",
    ed_theme_auto: "Αυτόματο (ακολουθεί το θέμα)",
    ed_theme_day: "Ημέρα",
    ed_theme_night: "Νύχτα",
    ed_animations: "Κινούμενα σχέδια",
    ed_entities: "Οντότητες (YAML)",
    ed_entities_helper: "Αντικαθιστά τους αισθητήρες που βρέθηκαν, ανά ρόλο: today, remaining, tomorrow, day3, now, peak",
    ed_title_helper: "Κενό: Ηλιακή πρόβλεψη",
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const rcLang = (i18n, hass, config) => {
  // The full tag when the card has it (sr-Latn), else its base language (fr-FR → fr, pt-BR → pt), else English.
  const l = config?.language || hass?.locale?.language || hass?.language || "en";
  const base = l.split("-")[0];
  return i18n[l] ? l : i18n[base] ? base : "en";
};

const rcT = (i18n, lang, key, vars = {}) => {
  const s = i18n[lang]?.[key] ?? RC_I18N[lang]?.[key] ?? i18n.en[key] ?? RC_I18N.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
};

const rcEsc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

const rcMoreInfo = (node, entityId) => {
  const ev = new Event("hass-more-info", { bubbles: true, composed: true });
  ev.detail = { entityId };
  node.dispatchEvent(ev);
};

const rcNavigate = (path) => {
  history.pushState(null, "", path);
  window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
};

// Wires a card header to its `navigation_path`: click, and Enter on the header itself.
const rcBindNav = (head, path) => {
  head.addEventListener("click", () => rcNavigate(path));
  head.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && ev.target === head) rcNavigate(path);
  });
};

// HA's callService already shows a toast when the call fails, then rejects: the rejection is only swallowed here
// so that it does not end up as "Uncaught (in promise)".
const rcCall = (hass, domain, service, data) => Promise.resolve(hass.callService(domain, service, data)).catch(() => {});

// A click inside a dialog (more-info opened from the card, say) is not a click outside the card.
const rcInDialog = (ev) => ev.composedPath().some((n) => ["ha-more-info-dialog", "ha-dialog", "dialog"].includes(n.localName));

// `fn()`, computed again only when one of `deps` is no longer the same object (or value) as last time.
const rcMemo = (store, key, deps, fn) => {
  const hit = store[key];
  if (hit && hit.deps.length === deps.length && hit.deps.every((d, i) => d === deps[i])) return hit.value;
  const value = fn();
  store[key] = { deps, value };
  return value;
};

// ── Base card ────────────────────────────────────────────────────────────────
class RcCard extends HTMLElement {
  static getStubConfig(hass) {
    const areas = Object.keys(hass?.areas ?? {});
    return { area: areas[0] ?? "" };
  }

  // Subclasses set: static i18n, static defaults, static tag, static styles.
  static getConfigElement() {
    // biome-ignore lint/complexity/noThisInStatic: each subclass opens its own editor.
    return document.createElement(`${this.tag}-editor`);
  }

  setConfig(config) {
    if (this.constructor.needsArea && !config.area && !config.entities?.length && !config.include?.length) {
      throw new Error(rcT(this.constructor.i18n, rcLang(this.constructor.i18n, this._hass, config), "err_config"));
    }
    this._config = { ...this.constructor.defaults, ...config };
    // show_title: the header's title, hidden by the stylesheet
    this.toggleAttribute?.("hide-title", config.show_title === false);
    if (!this.shadowRoot) this._attach();
    this._sig = null;
    this._render();
  }

  // The shadow root, and no rewrite of the card between a press anywhere in it and the end of the click: Home
  // Assistant updates the card several times a second, and a rewrite under the pointer replaces the element pressed,
  // so that the click lands on the card itself and does nothing (the tiles already hold it, see _bindPress; this
  // covers the rest: header button, detail button, rows, popup). The pending update is rendered once released.
  _attach() {
    const root = this.attachShadow({ mode: "open" });
    this._onPressEnd = () => {
      window.removeEventListener("pointerup", this._onPressEnd, true);
      window.removeEventListener("pointercancel", this._onPressEnd, true);
      // After the click, which comes in the same task as the release.
      setTimeout(() => {
        if (this._pressing) this._released();
      }, 0);
    };
    root.addEventListener("pointerdown", (ev) => {
      this._byPointer = true;
      if (ev.button !== 0) return;
      this._pressing = true;
      window.addEventListener("pointerup", this._onPressEnd, true);
      window.addEventListener("pointercancel", this._onPressEnd, true);
    });
    // The focus is kept across rewrites for the keyboard only (no focus ring after a mouse click or a tap).
    root.addEventListener("keydown", () => {
      this._byPointer = false;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback?.();
    window.removeEventListener("pointerup", this._onPressEnd, true);
    window.removeEventListener("pointercancel", this._onPressEnd, true);
    // A press cut short by the detach never gets its release: rendered now, and the next updates too.
    if (this._pressing) this._released();
  }

  set hass(hass) {
    this._hass = hass;
    // No re-render during a drag or a press: it would replace the tile under the finger.
    if (this._dragging || this._pressing) this._deferred = true;
    else this._render();
  }

  // The tiles actually shown (`only_on` / `only_alerts` applied), nothing when the card is hidden.
  getCardSize() {
    if (this.style.display === "none") return 0;
    const n = this._shown ?? this._items?.length ?? 0;
    if (!n || !this._config) return 1;
    // A row of large tiles (`layout: tiles`) is about one and a half rows of compact ones.
    const rows = Math.ceil(n / this._cols());
    return 1 + (this._tiles() ? Math.ceil(rows * 1.5) : rows);
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6, rows: "auto" };
  }

  _lang() {
    return rcLang(this.constructor.i18n, this._hass, this._config);
  }

  _t(key, vars) {
    return rcT(this.constructor.i18n, this._lang(), key, vars);
  }

  _areaName() {
    const c = this._config;
    return c.area ? (this._hass.areas?.[c.area]?.name ?? c.area) : "";
  }

  // Re-render only when something visible changed.
  _changed(parts) {
    const sig = JSON.stringify([this._config, this._lang(), parts]);
    if (sig === this._sig) return false;
    this._sig = sig;
    return true;
  }

  // Subclasses implement `_collect()` (the tiles) and `_draw(items)`.
  _render() {
    if (!this._config || !this._hass || !this.shadowRoot) return;
    this._items = this._collect();
    this._draw(this._items);
  }

  _cols() {
    return Math.min(4, Math.max(1, Number(this._config.columns) || 2));
  }

  // `layout: tiles`: one large tile per entity, the size of Home Assistant's Tile card (easier to tap on a phone).
  _tiles() {
    return this._config?.layout === "tiles";
  }

  _paint(level, head, tiles, extraClass = "") {
    // The tile or control with the keyboard focus keeps it through the redraw (a toggle, a step or a two-tap
    // confirmation from the keyboard): tiles by their data-id, controls by their data-k.
    const active = this._byPointer ? null : this.shadowRoot.activeElement;
    const focused = active?.dataset?.id;
    const focusKey = active?.dataset?.k;
    this.shadowRoot.innerHTML = `
      <style>${RC_BASE_STYLES}${this.constructor.styles}</style>
      <ha-card class="lvl-${level}${extraClass}${this._tiles() ? " layout-tiles" : ""}">
        ${head}
        ${tiles ? `<div class="grid" style="--cols:${this._cols()}">${tiles}</div>` : ""}
        ${this._afterGrid()}
      </ha-card>`;
    const root = this.shadowRoot;
    root.querySelector(".pill.action")?.addEventListener("click", (ev) => this._allOff(ev));
    if (this._config.navigation_path) rcBindNav(root.querySelector(".head"), this._config.navigation_path);
    for (const el of root.querySelectorAll(".tile")) {
      this._bindTile(el, (this._items || []).find((i) => i.id === el.dataset.id));
      if (focused && el.dataset.id === focused) el.focus({ preventScroll: true });
    }
    this._bindAfter(root);
    if (focusKey) root.querySelector(`[data-k="${focusKey}"]`)?.focus({ preventScroll: true });
  }

  // What a card adds under its tiles (the Lights card's scenes), and its event wiring.
  _afterGrid() {
    return "";
  }

  _bindAfter() {}

  // The "turn everything off" button of the header (full card) or of the status (mini card).
  _allOff(ev) {
    ev.stopPropagation();
    const ids = (this._items || []).filter((i) => i.on).map((i) => i.id);
    if (!ids.length) return;
    // A host card may ask first (the Overview confirms before turning plugs off); otherwise off at once.
    if (this._confirmOff) this._confirmOff(ids);
    else rcCall(this._hass, "homeassistant", "turn_off", { entity_id: ids });
  }

  // Tap, hold for more-info, and an optional horizontal drag ({ move(x), end(x), step(delta), flush() }). From the
  // keyboard: Enter / Space tap, Shift+Enter or the context-menu key open the details, ←/→ step the drag by ∓/±10
  // (a held key at most every RC_REPEAT_MS), and releasing the arrow calls `flush`.
  _bindPress(el, { onTap, onHold, drag }) {
    let start = null;
    let mode = null; // null | "hold" | "drag"
    let timer = null;
    let lastStep = 0;
    el.addEventListener("pointerdown", (ev) => {
      if (ev.button !== 0) return;
      start = { x: ev.clientX, y: ev.clientY };
      mode = null;
      this._pressing = true;
      clearTimeout(timer);
      timer = setTimeout(() => {
        // The card may have been detached mid-press (nothing else clears this timer): no hold on a dead node.
        if (mode || !this.isConnected) return;
        mode = "hold";
        // The press is settled (no tap): the details may open over the tile, so its pointerup may never come.
        this._released();
        onHold();
      }, RC_HOLD_MS);
    });
    el.addEventListener("pointermove", (ev) => {
      if (!start || mode === "hold") return;
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (!mode && drag && Math.abs(dx) > RC_MOVE_PX && Math.abs(dx) > Math.abs(dy)) {
        mode = "drag";
        clearTimeout(timer);
        this._dragging = true;
        el.setPointerCapture(ev.pointerId);
        el.classList.add("dragging");
      } else if (!mode && (Math.abs(dx) > RC_MOVE_PX || Math.abs(dy) > RC_MOVE_PX)) {
        clearTimeout(timer); // scrolling, or dragging what cannot be dragged: not a tap
        start = null;
        this._released();
      }
      if (mode === "drag") drag.move(ev.clientX);
    });
    const end = (ev, cancelled) => {
      clearTimeout(timer);
      if (!start) return;
      const wasDrag = mode === "drag";
      if (wasDrag) {
        this._dragging = false;
        el.classList.remove("dragging");
        if (!cancelled) drag.end(ev.clientX);
        this._sig = null;
      } else if (!mode && !cancelled) {
        onTap();
      }
      start = null;
      mode = null;
      // After a drag, the next update redraws (the bar keeps the new level until the light reports it).
      this._released(!wasDrag);
    };
    // The mouse leaving the tile mid-press (no capture outside a drag) cancels it: neither a tap nor a hold.
    el.addEventListener("pointerleave", () => {
      if (!start || mode) return;
      clearTimeout(timer);
      start = null;
      this._released();
    });
    el.addEventListener("pointerup", (ev) => end(ev, false));
    el.addEventListener("pointercancel", (ev) => end(ev, true));
    el.addEventListener("contextmenu", (ev) => ev.preventDefault());
    el.addEventListener("keydown", (ev) => {
      if ((ev.key === "Enter" && ev.shiftKey) || ev.key === "ContextMenu") {
        ev.preventDefault();
        if (!ev.repeat) onHold();
      } else if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        if (!ev.repeat) onTap();
      } else if (drag?.step && (ev.key === "ArrowLeft" || ev.key === "ArrowRight")) {
        ev.preventDefault();
        if (ev.repeat && ev.timeStamp - lastStep < RC_REPEAT_MS) return;
        lastStep = ev.timeStamp;
        drag.step(ev.key === "ArrowRight" ? 10 : -10);
      }
    });
    // The arrow released: the stepped level goes out now rather than after the pause.
    el.addEventListener("keyup", (ev) => {
      if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") drag?.flush?.();
    });
  }

  // End of a press: renders now what an update brought during it.
  _released(flush = true) {
    this._pressing = false;
    if (!this._deferred || this._dragging) return;
    this._deferred = false;
    if (flush) this._render();
  }

  // Default tile: tap toggles, hold opens the details.
  _bindTile(el, item) {
    this._bindPress(el, {
      onTap: () => !item?.unavailable && rcCall(this._hass, "homeassistant", "toggle", { entity_id: el.dataset.id }),
      onHold: () => rcMoreInfo(this, el.dataset.id),
    });
  }
}

// ── Mini cards ───────────────────────────────────────────────────────────────
// A mini card shows what its full card (`Base`) shows on two lines: the room badge, title and status, then one chip
// per entity. Its zoom button (top right, `zoom: false` removes it) switches it to the full card and back; a click
// anywhere else brings it back too.
// The subclass implements `_drawMini(items)`, which builds the chips and calls `_paintMini`.
// Zoomed in, everything is shown (`only_alerts` and `hide_when_clear` only apply to the compact view). With
// `alertsOnly`, the compact view always shows only what needs a look (no `only_alerts` option then): quiet entities
// show once zoomed in.
const rcMini = (Base, tag, styles, { alertsOnly = false } = {}) =>
  class extends Base {
    static tag = tag;
    static defaults = (({ only_alerts, ...rest }) => ({ ...rest, ...(alertsOnly ? {} : { only_alerts }), zoom: true }))(
      Base.defaults,
    );
    static styles = `${Base.styles}${RC_MINI_STYLES}${styles}`;

    constructor() {
      super();
      // A click anywhere else brings the card back to its compact view.
      this._onUnzoom = (ev) => {
        if (rcOutside(this, ev)) rcUnzoom(this);
      };
    }

    connectedCallback() {
      super.connectedCallback?.();
      this._unzoom ??= watchOutside(this, this._onUnzoom);
      this._unzoom.on();
    }

    disconnectedCallback() {
      super.disconnectedCallback?.();
      this._unzoom?.off();
      // Left (another dashboard view, a conditional card hidden): back to the compact view.
      rcUnzoom(this);
    }

    getCardSize() {
      if (this._zoomed) return super.getCardSize();
      return this.style.display === "none" ? 0 : 1;
    }

    getGridOptions() {
      return { columns: 12, min_columns: 6, rows: "auto" };
    }

    _draw(items) {
      const config = this._config;
      // The base card's own filter does the work: off zoomed in, always on in an `alertsOnly` compact view.
      if (this._zoomed) this._config = { ...config, only_alerts: false, hide_when_clear: false };
      else if (alertsOnly) this._config = { ...config, only_alerts: true };
      try {
        if (this._zoomed) super._draw(items);
        else this._drawMini(items);
      } finally {
        this._config = config;
      }
      this._addZoom();
    }

    _paintMini({ level, icon, status, chips, cls = "", allOff = false }) {
      const c = this._config;
      const nav = c.navigation_path;
      // With `allOff` the status is the "turn everything off" button, like the full card's pill.
      const st = allOff
        ? `<button class="st action" title="${rcEsc(this._t("turn_all_off"))}"><ha-icon icon="mdi:power"></ha-icon><span class="pt">${rcEsc(status)}</span></button>`
        : `<span class="st" title="${rcEsc(status)}"><span class="pt">${rcEsc(status)}</span></span>`;
      this.shadowRoot.innerHTML = `
        <style>${RC_BASE_STYLES}${this.constructor.styles}</style>
        <ha-card class="lvl-${level}${cls}">
          <div class="mini">
            <div class="badge" title="${rcEsc(status)}"><ha-icon icon="${rcEsc(icon)}"></ha-icon></div>
            <div class="body">
              <div class="head${nav ? " nav" : ""}"${nav ? ' role="link" tabindex="0"' : ""}>
                <div class="title">${rcEsc(c.title || this._areaName() || this._t("title"))}</div>
                ${st}
              </div>
              <div class="rs">${chips}</div>
            </div>
          </div>
        </ha-card>`;
      const root = this.shadowRoot;
      if (nav) rcBindNav(root.querySelector(".head"), nav);
      root.querySelector(".st.action")?.addEventListener("click", (ev) => this._allOff(ev));
      for (const el of root.querySelectorAll(".r")) el.addEventListener("click", () => rcMoreInfo(this, el.dataset.id));
    }

    // Zoom button at the end of the header, top right in both views, added once per render.
    // Its click is the overviews' (rcZoomClick): stop the tap on the title (navigation_path), toggle, keep the
    // keyboard focus (Enter / Space: no click count) on the button that replaced this one.
    _addZoom() {
      const head = this._config.zoom && this.shadowRoot.querySelector(".head");
      if (!head || head.querySelector(".zoom")) return;
      const button = document.createElement("button");
      button.className = "zoom";
      button.title = this._t(this._zoomed ? "zoom_out" : "zoom_in");
      button.innerHTML = `<ha-icon icon="${rcZoomIcon(this)}"></ha-icon>`;
      button.addEventListener("click", (ev) => rcZoomClick(this, ev));
      head.appendChild(button);
    }
  };

const rcBooleans = (...names) => names.map((name) => ({ name, selector: { boolean: {} } }));

const rcAdvanced = (i18n, lang, ...names) => [
  {
    name: "advanced",
    type: "expandable",
    flatten: true,
    schema: names.map((name) =>
      name === "language"
        ? {
            name,
            selector: {
              select: {
                mode: "dropdown",
                options: [
                  { value: "", label: rcT(i18n, lang, "ed_language_auto") },
                  { value: "en", label: "English" },
                  { value: "fr", label: "Français" },
                  { value: "de", label: "Deutsch" },
                  { value: "es", label: "Español" },
                  { value: "sr", label: "Српски" },
                  { value: "sr-Latn", label: "Srpski (latinica)" },
                  { value: "it", label: "Italiano" },
                  { value: "nl", label: "Nederlands" },
                  { value: "pt", label: "Português (Portugal)" },
                  { value: "pl", label: "Polski" },
                  { value: "ro", label: "Română" },
                  { value: "da", label: "Dansk" },
                  { value: "sv", label: "Svenska" },
                  { value: "bg", label: "Български" },
                  { value: "ru", label: "Русский" },
                  { value: "uk", label: "Українська" },
                  { value: "hu", label: "Magyar" },
                  { value: "sk", label: "Slovenčina" },
                  { value: "cs", label: "Čeština" },
                  { value: "sl", label: "Slovenščina" },
                  { value: "lv", label: "Latviešu" },
                  { value: "el", label: "Ελληνικά" },
                ],
              },
            },
          }
        : { name, selector: { object: {} } },
    ),
  },
];
// `schema(lang, hass, config)` lists the fields; options left at the card's default are not written to the YAML
// (list defaults such as `exclude: []` are not shown in the form: an empty list is never written anyway).
// `autos` maps an option to its default worked out from the config (`(hass, config) => value`): shown in the form
// while unset, and kept out of the YAML when left at it.
// Entity lists the form edits with an entity picker (ids only): an item written `{ entity, name, icon }` in YAML shows as its entity,
// and gets its name and icon back when the form changes the list (ha-room-card#77).
const RC_ENTITY_LISTS = ["include"];
const rcListIds = (list) => (Array.isArray(list) ? list.map((e) => (typeof e === "string" ? e : e?.entity)).filter(Boolean) : list);
const rcListKeep = (ids, before) =>
  Array.isArray(ids) ? ids.map((id) => (Array.isArray(before) ? before.find((e) => typeof e === "object" && e?.entity === id) : undefined) ?? id) : ids;

const rcEditor = ({ card, helpers, schema, autos = {} }) => {
  const i18n = card.i18n;
  const defaults = { show_title: true, ...Object.fromEntries(Object.entries(card.defaults).filter(([, v]) => !Array.isArray(v))) };
  return class extends HTMLElement {
    setConfig(config) {
      this._config = config;
      this._update();
    }

    set hass(hass) {
      this._hass = hass;
      this._update();
    }

    _update() {
      if (!this._hass || !this._config) return;
      const lang = rcLang(i18n, this._hass, this._config);
      // Read by the label and helper callbacks, set once on the form: a language change must reach them too.
      this._lang = lang;
      if (!this._form) {
        this._form = document.createElement("ha-form");
        this._form.computeLabel = (s) => rcT(i18n, this._lang, `ed_${s.name}`);
        this._form.computeHelper = (s) =>
          helpers.includes(s.name) ? rcT(i18n, this._lang, `ed_${s.name}_helper`) : undefined;
        this._form.addEventListener("value-changed", (ev) => {
          const config = { ...ev.detail.value };
          for (const k of RC_ENTITY_LISTS) if (k in config) config[k] = rcListKeep(config[k], this._config[k]);
          for (const k of Object.keys(config)) {
            const v = config[k];
            if (v === "" || v == null || (Array.isArray(v) && !v.length) || defaults[k] === v) delete config[k];
          }
          for (const [k, auto] of Object.entries(autos)) {
            const untouched = this._config[k] === undefined && config[k] === auto(this._hass, this._config);
            if (untouched || config[k] === auto(this._hass, config)) delete config[k];
          }
          this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
        });
        this.appendChild(this._form);
      }
      this._form.hass = this._hass;
      // A new data or schema object re-renders the whole form, and the schema runs the card's discovery:
      // both only change with the config, the language or the registries.
      const memo = (this._memo ||= {});
      const h = this._hass;
      this._form.data = rcMemo(memo, "data", [this._config, h.areas], () => {
        const data = { ...defaults, ...this._config };
        for (const k of RC_ENTITY_LISTS) if (k in data) data[k] = rcListIds(data[k]);
        for (const [k, auto] of Object.entries(autos)) data[k] ??= auto(h, this._config);
        return data;
      });
      this._form.schema = rcMemo(memo, "schema", [lang, this._config, h.entities, h.devices, h.areas], () =>
        schema(lang, h, this._config),
      );
    }
  };
};

const rcRegister = (card, editor, name, description) => {
  if (customElements.get(card.tag)) return;
  customElements.define(card.tag, card);
  customElements.define(`${card.tag}-editor`, editor);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: card.tag,
    name,
    description,
    preview: true,
    documentationURL: "https://github.com/juju35/ha-solar-forecast-card",
  });
};

if (!customElements.get("solar-forecast-card")) {
  console.info(`%c HA-SOLAR-FORECAST-CARD %c v${RC_VERSION} `, "background:#f59f00;color:#fff;font-weight:700", "");
}

// ── Common styles ────────────────────────────────────────────────────────────
const RC_BASE_STYLES = `
  :host {
    --rc-ok: var(--success-color, #43a047);
    --rc-warn: var(--warning-color, #ffa600);
    --rc-alert: var(--error-color, #db4437);
    --rc-info: var(--info-color, #039be5);
    --rc-light: var(--state-light-active-color, #ffb300);
    --rc-plug: var(--state-switch-on-color, var(--primary-color, #03a9f4));
    --rc-idle: var(--secondary-text-color, #9e9e9e);
    --rc-na: var(--disabled-color, #9e9e9e);
    display: block;
    min-width: 0;
  }
  /* The card answers its own width (container queries). That containment drops its content from its natural width: in
     a wrapper sized by its content (inline-block, a grid's auto column, a flex row: layout-card, button-card…) it would
     shrink to its padding. The empty grid below (no height) gives the host a natural width of 344 px there, as a
     preferred width only: its column is minmax(0, …), so the card still shrinks to its column in a grid card, a
     horizontal stack or a 1fr column, even wrapped in a <div> (hui-card in layout-card). contain-intrinsic-inline-size
     or a min-width in px would be a minimum there, and the card would overflow. */
  :host::before { content: ""; display: grid; grid-template-columns: minmax(0, 344px); height: 0; }
  ha-card { padding: 12px; overflow: hidden; container-type: inline-size; }
  ha-card.lvl-alert { box-shadow: 0 0 0 1px color-mix(in srgb, var(--rc-alert) 45%, transparent), var(--ha-card-box-shadow, none); }

  .head { display: flex; align-items: center; gap: 10px; }
  .head.nav { cursor: pointer; }
  .head.nav:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; border-radius: 4px; }
  .badge { flex: none; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;
           background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); }
  .badge ha-icon { --mdc-icon-size: 24px; }
  .lvl-alert .badge { animation: rc-pulse 1.6s ease-in-out infinite; }
  /* Narrow header: the title keeps a few letters (never 0 px), the status pill shrinks and ellipsises, the icon buttons
     (zoom, power) never shrink; under 200 px the pill is only its coloured dot, its text kept for screen readers. */
  .title { flex: 1 1 0; min-width: 5ch; font-size: 16px; font-weight: 500; color: var(--primary-text-color);
           white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
           /* show_title: false keeps the title's room (the pill and buttons stay in place) */
  :host([hide-title]) .head > .title { visibility: hidden; }
  .pill { all: unset; flex: 0 1 auto; min-width: 0; box-sizing: border-box; position: relative;
          display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 500;
          padding: 1px 8px; border-radius: 999px; background: color-mix(in srgb, var(--c) 14%, transparent);
          /* Coloured text is half the accent, half the text colour: 4.5:1 on its tint in light and dark themes, where
             the bare accent (amber above all) is not. */
          color: color-mix(in srgb, var(--c) 50%, var(--primary-text-color, #212121)); }
  .pt { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pill ha-icon { flex: none; }
  /* A card this narrow (6 columns of the Sections view on a phone): the title is at its few letters already, so the
     status pill goes to a line of its own under it, where its whole label fits, rather than end with "…". */
  @container (max-width: 260px) {
    .head { flex-wrap: wrap; row-gap: 4px; }
    .head::after { content: ""; order: 1; flex: 1 0 100%; }
    .head > .pill { order: 2; margin-left: 50px; max-width: calc(100% - 50px); }
  }
  @container (max-width: 200px) {
    /* Under 200 px the pill is only its dot again: back on the title's line. */
    .head { flex-wrap: nowrap; }
    .head::after { content: none; }
    .head > .pill { order: 0; margin-left: 0; max-width: none; }
    .head > .pill .pt, .st .pt { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
    .head > .pill:not(.action), .st { flex: none; padding: 0; width: 18px; height: 18px; justify-content: center; background: none; }
    .head > .pill:not(.action)::before, .st::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
    .head > .pill.action { padding: 1px 4px; }
    /* A full card this narrow (6 columns of the Sections view on a phone): a smaller badge, no side chip in the header. */
    .head { gap: 6px; }
    .head > .badge { width: 32px; height: 32px; }
    .head > .badge ha-icon { --mdc-icon-size: 20px; }
    .head > .chip { display: none; }
  }
  .pill.action { cursor: pointer; }
  .pill.action:hover { background: color-mix(in srgb, var(--c) 24%, transparent); }
  .pill.action:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
  .pill ha-icon { --mdc-icon-size: 12px; margin-left: -2px; }

  .grid { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: 6px; margin-top: 8px; }
  .tile { all: unset; position: relative; overflow: hidden; box-sizing: border-box; cursor: pointer; min-width: 0;
          display: flex; align-items: center; gap: 8px; padding: 5px 8px 5px 5px; border-radius: 10px;
          touch-action: pan-y; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
          background: color-mix(in srgb, var(--t) 9%, var(--secondary-background-color, transparent));
          border: 1px solid color-mix(in srgb, var(--t) 22%, transparent); transition: background .2s, border-color .2s; }
  .tile.off, .tile.na { background: var(--secondary-background-color, transparent); border-color: transparent; }
  .tile.na { --t: var(--rc-na); opacity: .7; }
  .tile:hover { background: color-mix(in srgb, var(--t) 15%, var(--secondary-background-color, transparent)); }
  .tile:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
  .ic, .txt { position: relative; }
  .ic { flex: none; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center;
        color: var(--t); background: color-mix(in srgb, var(--t) 20%, transparent); }
  .ic ha-icon { --mdc-icon-size: 16px; }
  .txt { display: flex; flex-direction: column; min-width: 0; }
  .name { font-size: 13px; font-weight: 500; line-height: 1.2; color: var(--primary-text-color);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* A reading is never cut: on a narrow tile it goes on to a second line (the name, a label, keeps its ellipsis). */
  .state { font-size: 11px; line-height: 1.2; color: var(--secondary-text-color); overflow-wrap: break-word; }
  /* A card this narrow (a phone, 6 columns of the Sections view): one tile per row, whatever the columns option. */
  @container (max-width: 260px) { .grid { grid-template-columns: minmax(0, 1fr); } }
  /* layout: tiles — the size of Home Assistant's Tile card — 56 px high, a 40 px icon, the name over the state. */
  .layout-tiles .grid { gap: 8px; }
  .layout-tiles .tile { min-height: 56px; gap: 10px; padding: 8px 10px 8px 8px; border-radius: 12px; }
  .layout-tiles .ic { width: 40px; height: 40px; }
  .layout-tiles .ic ha-icon { --mdc-icon-size: 24px; }
  .layout-tiles .txt { gap: 2px; }
  .layout-tiles .name { font-size: 14px; line-height: 1.25; }
  .layout-tiles .state { font-size: 12px; line-height: 1.25; }

  @keyframes rc-blink { 0%, 100% { opacity: 1 } 50% { opacity: .35 } }
  @keyframes rc-pulse { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--c) 45%, transparent) }
                        50% { box-shadow: 0 0 0 7px transparent } }
  @media (prefers-reduced-motion: reduce) { .tile, .lvl-alert .badge { animation: none; transition: none; } }
`;

// Mini cards: layout, chips and zoom button. A chip is plain (icon and text) until it needs a look: then a tinted pill.
// The zoom / detail button of the mini cards and the overviews.
const RC_ZOOM_STYLES = `
  /* 40 px to tap, laid out as the 24 px it looks (the negative margins). */
  .zoom { all: unset; flex: none; cursor: pointer; width: 40px; height: 40px; margin: -12px -12px -12px -8px; border-radius: 50%;
          display: grid; place-items: center; color: var(--secondary-text-color); }
  .zoom ha-icon { --mdc-icon-size: 16px; }
  .zoom:hover { background: color-mix(in srgb, var(--rc-idle) 16%, transparent); color: var(--primary-text-color); }
  .zoom:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 1px; }
`;

const RC_MINI_STYLES = `${RC_ZOOM_STYLES}
  /* The badge sits 12px from the card's top-left corner, like the other ha-* cards, beside the title and the readings. */
  ha-card:has(.mini) { padding: 12px; }
  .mini { display: flex; align-items: flex-start; gap: 10px; }
  /* The badge keeps the full card's size (40 px, icon 24 px): the body is at least as tall, a lone title line centred
     beside it. */
  .body { flex: 1; min-width: 0; min-height: 40px; display: flex; flex-direction: column; justify-content: center; gap: 4px; }
  .mini .head { gap: 8px; }
  .mini .title { line-height: 1.25; }
  .st { flex: 0 1 auto; min-width: 0; position: relative; display: inline-flex; align-items: center;
        margin-left: auto; font-size: 11px; font-weight: 500; color: var(--c); }
  .rs { display: flex; flex-wrap: wrap; gap: 2px 4px; margin-left: -4px; }
  .rs:empty { display: none; }
  /* A chip never runs past the card: a long name ends with an ellipsis. */
  .r { all: unset; cursor: pointer; display: inline-flex; align-items: baseline; gap: 1px; padding: 0 5px 0 4px;
       box-sizing: border-box; min-width: 0; max-width: 100%; overflow: hidden;
       border-radius: 999px; font-size: 12px; font-weight: 500; line-height: 24px; white-space: nowrap; --t: var(--rc-ok);
       color: var(--primary-text-color); }
  .r ha-icon { --mdc-icon-size: 13px; flex: none; color: var(--t); align-self: center; margin-right: 2px; }
  .r > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .r.pill { color: color-mix(in srgb, var(--t) 50%, var(--primary-text-color, #212121)); background: color-mix(in srgb, var(--t) 14%, transparent); }
  .r:hover { background: color-mix(in srgb, var(--t) 20%, var(--secondary-background-color, transparent)); }
  .r:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
`;
