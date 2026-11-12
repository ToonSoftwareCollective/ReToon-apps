// SPDX-License-Identifier: GPL-2.0-or-later
// BuienradarWeer: ReToon / QuickJS, no external requests.
const CONDITIONS = {
    sunny: ["Zonnig", "weather-sunny"],
    "clear-night": ["Heldere nacht", "weather-night"],
    partlycloudy: ["Half bewolkt", "weather-partly-cloudy"],
    cloudy: ["Bewolkt", "weather-cloudy"],
    fog: ["Mist", "weather-fog"],
    rainy: ["Regen", "weather-rainy"],
    pouring: ["Zware regen", "weather-pouring"],
    snowy: ["Sneeuw", "weather-snowy"],
    "snowy-rainy": ["Natte sneeuw", "weather-snowy-rainy"],
    hail: ["Hagel", "weather-hail"],
    lightning: ["Onweer", "weather-lightning"],
    "lightning-rainy": ["Onweer met regen", "weather-lightning-rainy"],
    windy: ["Winderig", "weather-windy"],
    "windy-variant": ["Bewolkt en winderig", "weather-windy-variant"],
    exceptional: ["Uitzonderlijk weer", "alert-outline"]
};
function entity() {
    return String(retoon.settings.entity || "").trim();
}
// Only forecasts are cached; current conditions are read live on every draw.
let forecast = [];
let forecastUnit = "";
let forecastMessage = "Kies een weerentiteit bij Apps";
let forecastGeneration = 0;
let forecastInFlight = -1;
let forecastTimer = null;
const FORECAST_INTERVAL = 30 * 60 * 1000;
const FORECAST_RETRY = 60 * 1000;
function dateKey(date) {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}
function forecastDays() {
    const today = dateKey(new Date());
    return forecast.filter(day => day.date >= today).slice(0, 5);
}
async function loadForecast(generation) {
    if (generation !== forecastGeneration || !entity() || forecastInFlight === generation) return;
    const id = entity();
    forecastInFlight = generation;
    let retry = false;
    try {
        const response = await retoon.call("weather.get_forecasts", { entity_id: id, type: "daily" }, { response: true });
        if (generation !== forecastGeneration) return;
        const result = response && response[id];
        if (!result || !Array.isArray(result.forecast)) throw new Error("Invalid forecast response");
        const days = [];
        const seen = new Set();
        result.forecast.slice(0, 32).forEach(item => {
            if (!item || typeof item.datetime !== "string") return;
            const date = item.datetime.slice(0, 10);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || seen.has(date)) return;
            const parsed = new Date(date + "T12:00:00");
            if (!isFinite(parsed.getTime()) || dateKey(parsed) !== date) return;
            seen.add(date);
            days.push({ date: date, condition: String(item.condition || ""),
                high: number(item.temperature), low: number(item.templow), rain: number(item.precipitation_probability) });
        });
        days.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
        forecast = days;
        const current = retoon.state(id);
        forecastUnit = String(current && current.attributes && current.attributes.temperature_unit || "");
        forecastMessage = "Geen dagelijkse voorspelling beschikbaar.";
    } catch (error) {
        if (generation !== forecastGeneration) return;
        forecast = [];
        forecastMessage = "Verwachting niet beschikbaar. Nieuwe poging volgt.";
        retry = true;
    } finally {
        if (generation === forecastGeneration) {
            forecastInFlight = -1;
            retoon.update();
            if (forecastTimer !== null) clearTimeout(forecastTimer);
            forecastTimer = setTimeout(() => loadForecast(generation), retry ? FORECAST_RETRY : FORECAST_INTERVAL);
        }
    }
}
function number(v) {
    if (typeof v !== "number" && typeof v !== "string") return null;
    if (typeof v === "string" && !v.trim()) return null;
    const n = Number(v);
    return isFinite(n) ? n : null;
}
function measure(v, unit, digits) {
    const n = number(v);
    return n === null ? "–" : n.toFixed(digits === undefined ? 0 : digits).replace(".", ",") + (unit ? " " + unit : "");
}
function short(v, length) {
    const s = String(v || "");
    return s.length > length ? s.slice(0, length - 1) + "…" : s;
}
function bearing(v) {
    const n = number(v);
    if (n === null) return typeof v === "string" ? short(v, 12) : "–";
    return ["N", "NNO", "NO", "ONO", "O", "OZO", "ZO", "ZZO", "Z", "ZZW", "ZW", "WZW", "W", "WNW", "NW", "NNW"][Math.round(((n % 360 + 360) % 360) / 22.5) % 16];
}
function model() {
    const id = entity();
    const st = id ? retoon.state(id) : null;
    const available = !!st && !!st.state && st.state !== "unavailable" && st.state !== "unknown";
    const a = available ? (st.attributes || {}) : {};
    const condition = available ? (CONDITIONS[st.state] || ["Onbekende weerconditie", "weather-cloudy"]) : [!id ? "Kies een weerentiteit bij Apps" : st ? "Weer niet beschikbaar" : "Wachten op Home Assistant", "cloud-question"];
    return { id: id, available: available, a: a, condition: condition, state: available ? st.state : "unknown",
        title: short(retoon.settings.title || (st && st.name) || "Weer", 30),
        temp: measure(a.temperature, a.temperature_unit, 1),
        iconColor: !available ? "muted" : ({ sunny: "#f6c453", "clear-night": "#b8b7f0", partlycloudy: "#e4c779", cloudy: "#aebed0", fog: "#aebed0", rainy: "#65b6ef", pouring: "#65b6ef", snowy: "#a9deed", "snowy-rainy": "#a9deed", hail: "#a9deed", lightning: "#e4b268", "lightning-rainy": "#e4b268", exceptional: "#ed956f" }[st.state] || "accent"),
        feels: measure(a.apparent_temperature, a.temperature_unit, 1),
        wind: measure(a.wind_speed, a.wind_speed_unit, 1) };
}
function text(el, value, x, y, font, color, w) {
    return el.text(value, { x: x, y: y, w: w, font: font || "body", color: color || "text" });
}
function temperature(el, m, x, y, large) {
    const value = measure(m.a.temperature, "", 1);
    const unit = number(m.a.temperature) === null ? "" : String(m.a.temperature_unit || "");
    // API fonts are fixed: 34/16 px and 78/34 px give a roughly half-size unit.
    const size = large ? 78 : 34;
    // Let LVGL size the digits naturally: a guessed text-box width can wrap
    // the final digit. This estimate only reserves space before the unit.
    const width = Math.ceil(value.split("").reduce((sum, c) => sum + (c === "," ? 0.30 : c === "-" ? 0.40 : 0.62), 0) * size);
    el.text(value, { x: x, y: y, font: large ? "big" : "mid", color: "text" });
    if (unit) text(el, unit, x + width + 5, y + (large ? 10 : 4), large ? "mid" : "small");
}
// Scalable vector weather symbols using documented API primitives.
function weatherIcon(el, m, x, y, size) {
    const k = size / 100;
    const circle = (cx, cy, r, color) => el.circle({ x: x + cx * k, y: y + cy * k, r: r * k, bg: color });
    const line = (points, color, width) => el.line(points.map((v, i) => (i % 2 ? y : x) + v * k), { color: color, width: Math.max(1, width * k) });
    const cloud = () => {
        circle(30, 56, 19, m.iconColor);
        circle(47, 43, 25, m.iconColor);
        circle(69, 56, 23, m.iconColor);
        el.box({ x: x + 28 * k, y: y + 55 * k, w: 43 * k, h: 24 * k, bg: m.iconColor, radius: 4 * k });
    };
    const sun = (cx, cy, r) => {
        circle(cx, cy, r, "#f6c453");
        for (let i = 0; i < 8; i++) {
            const a = i * Math.PI / 4;
            line([cx + Math.cos(a) * (r + 6), cy + Math.sin(a) * (r + 6), cx + Math.cos(a) * (r + 13), cy + Math.sin(a) * (r + 13)], "#f6c453", 4);
        }
    };
    if (!m.available || m.state === "exceptional") {
        el.icon("mdi:" + m.condition[1], { x: x + size / 4, y: y + size / 4, size: "big", color: m.iconColor });
    } else if (m.state === "sunny") sun(50, 48, 25);
    else if (m.state === "clear-night") {
        // A crescent built from horizontal strokes, without a background mask.
        for (let row = -27; row <= 27; row += 3) {
            const edge = Math.sqrt(30 * 30 - row * row);
            const inner = Math.abs(row + 9) < 28 ? 12 - Math.sqrt(28 * 28 - (row + 9) * (row + 9)) : edge;
            if (inner > -edge) line([50 - edge, 48 + row, 50 + Math.min(edge, inner), 48 + row], m.iconColor, 4);
        }
    } else if (m.state === "windy" || m.state === "windy-variant") {
        line([9, 33, 74, 33, 83, 25, 78, 17, 67, 17], m.iconColor, 5);
        line([3, 51, 89, 51], m.iconColor, 5);
        line([17, 69, 67, 69, 76, 77, 71, 85, 60, 85], m.iconColor, 5);
    } else {
        if (m.state === "partlycloudy") sun(68, 28, 16);
        cloud();
        if (m.state.includes("lightning")) line([54, 64, 42, 82, 56, 82, 46, 98], "#f6c453", 5);
        else if (["rainy", "pouring", "snowy-rainy"].indexOf(m.state) >= 0) {
            [30, 51, 72].forEach(cx => line([cx, 85, cx - 5, 96], "#65b6ef", 4));
        } else if (m.state === "snowy" || m.state === "hail") {
            [30, 51, 72].forEach(cx => circle(cx, 91, 3, "#a9deed"));
        } else if (m.state === "fog") {
            line([15, 86, 83, 86], m.iconColor, 3);
            line([25, 95, 73, 95], m.iconColor, 3);
        }
    }
}
function tile(el) {
    const m = model();
    const compact = el.height < 196;
    const narrow = el.width < 300;
    text(el, short(m.title, narrow ? 15 : 30), 0, 0, "head", "text", el.width - (el.width < 210 ? 76 : 104));
    const iconSize = el.height < 100 || el.width < 210 ? 72 : 96;
    weatherIcon(el, m, el.width - iconSize, 0, iconSize);
    if (el.height < 85) {
        temperature(el, m, 0, 30, false);
        return;
    }
    temperature(el, m, 0, 33, !compact && !narrow);
    text(el, short(m.condition[0], narrow ? 22 : 36), 0, compact || narrow ? 77 : 119, "body", "muted", el.width);
    if (el.height >= 185) {
        const divider = compact || narrow ? 130 : 145;
        el.line([0, divider, el.width, divider], { color: "muted", opacity: 0.25, width: 1 });
        text(el, "Luchtdruk  " + measure(m.a.pressure, m.a.pressure_unit, 1), 0, divider + 9, "small", "muted");
        text(el, short("Wind  " + m.wind, narrow ? 24 : 35), 0, divider + 35, "small", "muted");
        if (!narrow) text(el, "Voelt als  " + m.feels, Math.floor(el.width / 2), divider + 35, "small", "muted");
    }
}
function screen(el) {
    const m = model(), a = m.a;
    const pad = 24, right = el.width - pad;
    text(el, m.title, pad, 4, "head");
    weatherIcon(el, m, pad, 39, 112);
    text(el, m.condition[0], 158, 59, "mid", "text", el.width - 470);
    if (!m.available) text(el, "Controleer de verbinding met Home Assistant", 158, 103, "small", "muted");
    temperature(el, m, el.width - 255, 37, true);
    text(el, "Voelt als  " + m.feels, el.width - 255, 127, "small", "muted");
    const rows = [
        ["gauge", "Luchtdruk", measure(a.pressure, a.pressure_unit, 0)],
        ["water-percent", "Luchtvochtigheid", measure(a.humidity, "%")],
        ["weather-windy", "Windsnelheid", m.wind + (number(a.wind_bearing) !== null || a.wind_bearing ? " (" + bearing(a.wind_bearing) + ")" : "")],
        ["eye-outline", "Zicht", measure(a.visibility, a.visibility_unit, 2)]
    ];
    rows.forEach((row, i) => {
        const y = 171 + i * 39;
        el.icon("mdi:" + row[0], { x: pad, y: y, size: "small", color: "accent" });
        text(el, row[1], 68, y + 3, "body");
        el.text(row[2], { x: right - 360, y: y + 3, w: 360, textAlign: "right", font: "body", color: "text" });
    });
    el.line([pad, 337, right, 337], { color: "muted", opacity: 0.2, width: 1 });
    text(el, "Verwachting", pad, 350, "head");
    const days = forecastDays();
    if (!days.length) {
        text(el, forecastMessage, pad, 393, "body", "muted", el.width - 2 * pad);
        return;
    }
    const unit = a.temperature_unit || forecastUnit;
    const width = (el.width - 2 * pad) / 5;
    days.forEach((day, i) => {
        const x = pad + i * width;
        const date = new Date(day.date + "T12:00:00");
        text(el, day.date === dateKey(new Date()) ? "Vandaag" : ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"][date.getDay()], x + 12, 378, "small", "muted");
        const condition = CONDITIONS[day.condition];
        el.icon("mdi:" + (condition ? condition[1] : "cloud-question"), { x: x + 12, y: 400, size: "big", color: condition ? (day.condition === "sunny" ? "#f6c453" : day.condition.includes("rain") ? "#65b6ef" : "#aebed0") : "muted" });
        text(el, measure(day.high, unit, 0), x + 12, 450, "head");
        text(el, "Min  " + measure(day.low, unit, 0), x + 12, 478, "small", "muted");
        text(el, "Regen  " + measure(day.rain, "%", 0), x + 12, 500, "small", "muted");
    });
}
function follow() {
    const id = entity();
    const generation = ++forecastGeneration;
    if (forecastTimer !== null) clearTimeout(forecastTimer);
    forecastTimer = null;
    forecast = [];
    forecastUnit = "";
    forecastMessage = id ? "Verwachting laden\u2026" : "Kies een weerentiteit bij Apps";
    retoon.watch(id ? [id] : [], () => retoon.update());
    retoon.update();
    if (id) loadForecast(generation);
}
retoon.tile(tile);
retoon.screen(screen);
retoon.onSettings(follow);
follow();
