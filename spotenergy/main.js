// SpotEnergy for ReToon: dynamic electricity prices (ENTSO-E, easyEnergy as
// backup) as a dashboard card and a full-screen graph. Ported from the
// SpotEnergy app for the original Toon software; the price logic is the same.

const S = () => retoon.settings;

// ---- what was fetched --------------------------------------------------------
let tariffValues = [];		// hourly averages, starting at startTime
let tariffValuesQuarter = [];	// the 15-minute prices, starting at startTime
let startTime = 0;		// ms, the first bar
let minTariff = 0, maxTariff = 0, q1 = 0, median = 0, q3 = 0;
let status = "Loading prices...";

// ---- statistics (spotenergy.js of the original) --------------------------------
function getMedian(args) {
	if (!args.length) return 0;
	const n = args.slice(0).sort((a, b) => a - b);
	const mid = Math.floor(n.length / 2);
	return n.length % 2 === 0 ? (n[mid] + n[mid - 1]) / 2 : n[mid];
}

function getAverage(args) {
	if (!args.length) return 0;
	return args.reduce((p, c) => p + c / args.length, 0);
}

function getQuartiles(args, center) {
	if (!args.length) return [0, 0, 0];
	const m = center(args);
	return [center(args.filter(f => f < m)), m, center(args.filter(f => f > m))];
}

// ---- prices -------------------------------------------------------------------
function normalizeTariff(t) {
	const s = S();
	const v = s.includeTax ?
		(s.tariffEnergyTax + s.tariffODETax + s.tariffBonus + t) * (s.tariffVAT / 100 + 1) : t;
	return Math.trunc(v * 10000) / 10000;
}

function euro(t) {
	return "€" + normalizeTariff(t).toFixed(4);
}

// the bar now; computed again every quarter, not only when prices are fetched
function nowIndex(quarter) {
	const steps = Math.floor((Date.now() - startTime) / (quarter ? 900000 : 3600000));
	return steps;
}

function currentTariff() {
	if (S().showQuarterHour && tariffValuesQuarter.length) {
		const i = nowIndex(true);
		if (i >= 0 && i < tariffValuesQuarter.length) return tariffValuesQuarter[i];
	}
	const i = nowIndex(false);
	return i >= 0 && i < tariffValues.length ? tariffValues[i] : NaN;
}

function tariffTextColor(t) {
	if (t < q1) return "#00ff00";
	if (t < q3) return "#ff6600";
	return "#ff0000";
}

function hex2(n) {
	return ("0" + Math.round(n).toString(16)).slice(-2);
}

function barColor(v) {
	let p = maxTariff > minTariff ? 100 * (v - minTariff) / (maxTariff - minTariff) : 0;
	p = Math.max(0, Math.min(100, p));
	const r = p > 50 ? 255 : 255 * p / 50;
	const g = p < 50 ? 255 : 255 - 255 * (p - 50) / 50;
	return "#" + hex2(r) + hex2(g) + "00";
}

// the window the graph shows: from lookbackHours before the current hour
function graphWindow() {
	const start = new Date();
	start.setHours(start.getHours() - S().lookbackHours, 0, 0, 0);
	const end = new Date(start.getTime() + (S().lookforwardHours + S().lookbackHours) * 3600000);
	return [start, end];
}

// raw (timestamp, tariff) pairs -> hourly averages, quartiles, min and max.
// False when the data does not fit the window, so the backup is tried.
function processTariffs(raw, start, source) {
	raw.sort((a, b) => a.timestamp - b.timestamp);
	const hourly = [];
	for (let i = 0; i < raw.length;) {
		const h = new Date(raw[i].timestamp);
		h.setMinutes(0, 0, 0);
		let sum = 0, count = 0;
		while (i < raw.length && raw[i].timestamp < h.getTime() + 3600000) {
			sum += raw[i].tariff;
			count++;
			i++;
		}
		hourly.push({ timestamp: h.getTime(), tariff: sum / count });
	}
	if (hourly.length < 2) {
		console.log(source + " returned not enough data points");
		return false;
	}
	if (hourly[0].timestamp !== start.getTime()) {
		console.log(source + " data does not start at the expected time, rejected");
		return false;
	}
	tariffValues = hourly.map(h => h.tariff);
	// 15-minute bars only when the source had them
	tariffValuesQuarter = raw.length > hourly.length ? raw.map(r => r.tariff) : [];
	startTime = start.getTime();
	minTariff = Math.min(...tariffValues);
	maxTariff = Math.max(...tariffValues);
	[q1, median, q3] = getQuartiles(tariffValues, S().algoMedian ? getMedian : getAverage);
	status = "";
	return true;
}

function compactUTC(d) {
	const p = n => ("0" + n).slice(-2);
	return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) +
		p(d.getUTCHours()) + p(d.getUTCMinutes());
}

function isoDate(d) {
	const p = n => ("0" + n).slice(-2);
	return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

function between(s, open, close, from) {
	const i = s.indexOf(open, from);
	if (i < 0) return null;
	const j = s.indexOf(close, i + open.length);
	return j < 0 ? null : { text: s.slice(i + open.length, j), end: j + close.length };
}

// ENTSO-E day-ahead prices (XML). Positions with an unchanged price are left
// out by ENTSO-E, also at the end of a period; those gaps are filled.
function parseEntsoe(xml, start, end) {
	const out = [];
	let at = 0, period;
	while ((period = between(xml, "<Period>", "</Period>", at))) {
		at = period.end;
		const p = period.text;
		const res = between(p, "<resolution>", "</resolution>", 0);
		const step = res && res.text === "PT15M" ? 900000 : 3600000;
		const pStart = Date.parse(between(p, "<start>", "</start>", 0).text);
		const e = between(p, "<end>", "</end>", 0);
		const pEnd = e ? Date.parse(e.text) : pStart;
		const points = [];
		let pos = 0, pt;
		while ((pt = between(p, "<Point>", "</Point>", pos))) {
			pos = pt.end;
			points.push({
				position: Number(between(pt.text, "<position>", "</position>", 0).text),
				price: Number(between(pt.text, "<price.amount>", "</price.amount>", 0).text) / 1000,
			});
		}
		const slots = Math.round((pEnd - pStart) / step);
		for (let k = 0; k < points.length; k++) {
			const last = k + 1 < points.length ? points[k + 1].position - 1 : slots;
			for (let q = points[k].position; q <= last; q++) {
				const t = pStart + (q - 1) * step;
				if (t >= start.getTime() && t <= end.getTime())
					out.push({ timestamp: t, tariff: points[k].price });
			}
		}
	}
	return out;
}

async function fetchEntsoe(start, end) {
	if (!S().entsoeToken) throw new Error("no ENTSO-E token set");
	const url = "https://web-api.tp.entsoe.eu/api?securityToken=" + S().entsoeToken +
		"&documentType=A44&Out_Domain=10YNL----------L&In_Domain=10YNL----------L" +
		"&periodStart=" + compactUTC(start) + "&periodEnd=" + compactUTC(end);
	const r = await retoon.fetch(url, { timeout: 30 });
	if (r.status !== 200) throw new Error("ENTSO-E answered " + r.status);
	return parseEntsoe(r.text, start, end);
}

async function fetchEasyenergy(start, end) {
	const url = "https://price-graph.mijn.easyenergy.com/api/prices?start=" + isoDate(start) +
		"&end=" + isoDate(new Date(end.getTime() + 86400000)) +
		"&type=electricity&granularity=quarter";
	const r = await retoon.fetch(url, { timeout: 30 });
	if (r.status !== 200) throw new Error("easyEnergy answered " + r.status);
	return JSON.parse(r.text).prices
		.map(p => ({ timestamp: Date.parse(p.from), tariff: p.price }))
		.filter(p => p.timestamp >= start.getTime() && p.timestamp <= end.getTime());
}

async function refresh() {
	const [start, end] = graphWindow();
	try {
		if (processTariffs(await fetchEntsoe(start, end), start, "ENTSO-E")) return;
	} catch (e) {
		console.log("ENTSO-E: " + e.message);	// the URL holds the token: not logged
	}
	let why = "No prices for this period yet";
	try {
		if (processTariffs(await fetchEasyenergy(start, end), start, "easyEnergy")) return;
	} catch (e) {
		console.log("easyEnergy: " + e.message);
		why = "Prices could not be fetched";
	}
	// keep showing what was fetched before, if it still covers now
	const i = nowIndex(false);
	if (!(i >= 0 && i < tariffValues.length))
		status = why;
}

// ---- drawing ------------------------------------------------------------------
function barHeight(space, t) {
	if (S().scaleGraph)
		return maxTariff > minTariff ? 5 + (space - 5) * (t - minTariff) / (maxTariff - minTariff) : space / 2;
	return space * normalizeTariff(t) / normalizeTariff(maxTariff);
}

// bars, the hour under every third one and the three quartile lines
function drawGraph(el, x, y, w, h, quarter, big) {
	const values = quarter ? tariffValuesQuarter : tariffValues;
	if (!values.length) return;
	const labelH = big ? 24 : 18;
	const space = h - labelH;
	const bw = w / values.length;
	const cur = nowIndex(quarter);
	for (let i = 0; i < values.length; i++) {
		const bh = Math.max(2, barHeight(space, values[i]));
		const current = i === cur;
		const fill = current ? "#0099ff" : S().coloredBars ? barColor(values[i]) : "#ff6600";
		el.box({ x: x + i * bw, y: y + space - bh, w: Math.max(1, bw - (big && bw > 6 ? 3 : 1)), h: bh,
			bg: fill, radius: big && bw > 20 ? 6 : 1 });
		const hour = new Date(startTime + i * (quarter ? 900000 : 3600000));
		if ((!quarter || hour.getMinutes() === 0) && hour.getHours() % 3 === 0)
			el.text(String(hour.getHours()), { x: x + i * bw, y: y + space + 2, font: "small", color: "muted" });
	}
	for (const [t, color] of [[q3, "#ff0000"], [median, "#ffff00"], [q1, "#00ff00"]]) {
		const ly = y + space - barHeight(space, t);
		el.box({ x: x, y: ly, w: w, h: big ? 2 : 1, bg: color, opacity: 0.5 });
		if (big)
			el.text(euro(t), { x: x - 92, y: ly - 10, font: "small", color: "muted" });
	}
}

retoon.tile((el) => {
	const w = el.width, h = el.height;
	const t = currentTariff();
	el.text("Huidig tarief", { x: 0, y: 0, font: "small", color: "muted" });
	if (status || isNaN(t)) {
		el.text(status || "No price for now", { x: 0, y: 26, font: "body" });
		return;
	}
	el.text(euro(t), { x: 0, y: 20, font: "head", color: tariffTextColor(t) });
	drawGraph(el, 0, 56, w, h - 56, false, false);
});

retoon.screen((el) => {
	const w = el.width, h = el.height;
	const t = currentTariff();
	if (status || isNaN(t)) {
		el.text(status || "No price for now", { align: "center", font: "head" });
		return;
	}
	el.text("Huidig tarief", { align: "top-mid", y: 0, font: "body", color: "muted" });
	el.text(euro(t), { align: "top-mid", y: 26, font: "mid", color: tariffTextColor(t) });
	drawGraph(el, 100, 100, w - 120, h - 110, S().showQuarterHour, true);
});

// ---- timing -------------------------------------------------------------------
// prices at the start of every hour, the current bar every quarter
function untilNextQuarter() {
	const now = new Date();
	return (15 - now.getMinutes() % 15) * 60000 - now.getSeconds() * 1000 - now.getMilliseconds() + 2000;
}

async function tick() {
	if (new Date().getMinutes() < 15 || !tariffValues.length || nowIndex(false) >= tariffValues.length)
		await refresh();
	retoon.update();
	// no prices yet (no network at start, a server down): again in a minute
	setTimeout(tick, tariffValues.length ? untilNextQuarter() : 60000);
}

retoon.onSettings(async () => {
	await refresh();
	retoon.update();
});

tick();
