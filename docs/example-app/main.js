// Example app for ReToon, a starting point for your own. The card shows one
// entity from Home Assistant and follows its changes. A tap on the card opens
// a full screen with the temperature for the next 24 hours from Open-Meteo
// (no account needed), fetched every 30 minutes.

const S = () => retoon.settings;

let weather = null;	// { hours: ["08", ...], temps: [12.3, ...] } from the last fetch
let error = "";		// why the last fetch failed

// a state as text: the number with its unit, or the state as it is
function format(st) {
	if (!st) return "-";
	if (!isFinite(st.value)) return st.state;
	return st.value.toFixed(1) + (st.unit ? " " + st.unit : "");
}

function drawTile(el) {
	const st = retoon.state(S().entity);
	const icon = (st && st.attributes.icon) || "mdi:eye";
	el.icon(icon, { x: 0, y: 0, size: "mid", color: "accent" });
	el.text(st ? st.name : "Pick an entity under Apps in the web interface",
		{ x: 46, y: 6, color: "muted" });
	el.text(format(st), { x: 0, y: 0, align: "bottom-left", font: "mid" });
}

function drawScreen(el) {
	if (!weather) {
		el.text(error || "Loading…", { align: "center", color: error ? "bad" : "muted" });
		return;
	}
	const w = el.width, h = el.height, n = weather.temps.length;
	const lo = Math.min(...weather.temps), hi = Math.max(...weather.temps);
	const x = i => 60 + i * (w - 80) / (n - 1);
	const y = t => h - 50 - (t - lo) / (hi - lo || 1) * (h - 120);

	// the curve, one point per hour
	const points = [];
	weather.temps.forEach((t, i) => points.push(x(i), y(t)));
	el.line(points, { width: 4, color: "accent" });

	// the highest and lowest temperature, and every 3rd hour
	el.text(hi.toFixed(1) + "°", { x: 0, y: y(hi) - 12, color: "muted" });
	el.text(lo.toFixed(1) + "°", { x: 0, y: y(lo) - 12, color: "muted" });
	weather.hours.forEach((hour, i) => {
		if (i % 3 === 0)
			el.text(hour, { x: x(i) - 10, y: h - 30, font: "small", color: "muted" });
	});
}

async function load() {
	const url = "https://api.open-meteo.com/v1/forecast" +
		`?latitude=${+S().latitude}&longitude=${+S().longitude}` +
		"&hourly=temperature_2m&forecast_hours=24&timezone=auto";
	try {
		const r = await retoon.fetch(url, { timeout: 30 });
		if (r.status !== 200) throw new Error("HTTP " + r.status);
		const data = JSON.parse(r.text);
		weather = {
			hours: data.hourly.time.map(t => t.slice(11, 13)),
			temps: data.hourly.temperature_2m,
		};
		error = "";
	} catch (e) {
		error = "No weather: " + e.message;
		retoon.log(error);
	}
	retoon.update();
}

// follow the chosen entity: draw again when its state changes
function follow() {
	retoon.watch(S().entity ? [S().entity] : [], () => retoon.update());
}

retoon.tile(drawTile);
retoon.screen(drawScreen);
retoon.onSettings(() => {
	follow();
	load();
});
follow();
load();
setInterval(load, 30 * 60 * 1000);
