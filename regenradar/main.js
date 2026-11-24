// Regenradar voor ReToon: de neerslagverwachting van Buienradar voor de komende
// 2 uur, per 5 minuten, als staafgrafiek met regenzwaarte. Kaart: samenvatting
// en grafiek; aantikken: groot scherm met schaal, tijden en totalen.
// Bron: Buienradar.nl (gratis voor persoonlijk, niet-commercieel gebruik).

const S = () => retoon.settings;

const STEP = 5 * 60 * 1000;		// één meting = 5 minuten
const REFRESH = 5 * 60 * 1000;		// Buienradar ververst elke 5 minuten
const RETRY = 60 * 1000;		// na een fout
const URLS = [
	"https://gps.buienradar.nl/getrr.php",		// wat Home Assistant gebruikt
	"https://gpsgadget.buienradar.nl/data/raintext",	// zelfde formaat, reserve
];

let rain = [];		// [{ t: ms, mm: mm/u }], oplopend in tijd
let fetchedAt = 0;	// ms, laatste geslaagde ophaling
let error = "";
let timer = null;

// ---- locatie ---------------------------------------------------------------
// Volgorde: de ingevulde locatie (plaats, adres of postcode), dan de
// coördinaten, dan zone Thuis uit Home Assistant.
let geo = null;		// { query, lat, lon, name }: laatst opgezochte locatie
let where = null;	// { lat, lon, name, src }: de locatie van de huidige gegevens

async function geocode(q) {
	// PDOK Locatieserver (Kadaster): Nederlandse plaatsen, adressen, postcodes
	try {
		const r = await retoon.fetch("https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?rows=1" +
			"&fl=weergavenaam,centroide_ll&q=" + encodeURIComponent(q), { timeout: 15 });
		if (r.status === 200) {
			const doc = JSON.parse(r.text).response.docs[0];
			const m = doc && /POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/.exec(doc.centroide_ll);
			if (m) return { lat: +m[2], lon: +m[1], name: doc.weergavenaam };
		}
	} catch (e) { retoon.log("PDOK: " + e.message); }
	// Open-Meteo: plaatsnamen, ook in België
	try {
		const r = await retoon.fetch("https://geocoding-api.open-meteo.com/v1/search?count=1&language=nl&name=" +
			encodeURIComponent(q), { timeout: 15 });
		if (r.status === 200) {
			const g = (JSON.parse(r.text).results || [])[0];
			if (g) return { lat: g.latitude, lon: g.longitude, name: g.name + (g.admin1 ? ", " + g.admin1 : "") };
		}
	} catch (e) { retoon.log("Open-Meteo: " + e.message); }
	return null;
}

// { lat, lon, name, src } of { error }
async function location() {
	const s = S();
	const q = String(s.location || "").trim();
	if (q) {
		if (!geo || geo.query !== q) {
			const g = await geocode(q);
			if (!g) return { error: "Locatie \"" + q + "\" niet gevonden; controleer de spelling onder Apps" };
			geo = Object.assign({ query: q }, g);
		}
		return { lat: geo.lat, lon: geo.lon, name: geo.name, src: "ingevulde locatie" };
	}
	if (+s.latitude && +s.longitude)
		return { lat: +s.latitude, lon: +s.longitude, name: "", src: "coördinaten" };
	const z = retoon.state("zone.home");
	const a = z && z.attributes;
	if (a && isFinite(+a.latitude) && isFinite(+a.longitude) && +a.latitude && +a.longitude)
		return { lat: +a.latitude, lon: +a.longitude, name: "", src: "Thuis in Home Assistant" };
	return { error: "Vul een locatie in onder Apps, of geef Thuis een locatie in Home Assistant" };
}

// korte plaatsnaam voor de kaart: "Dorpsstraat 1, 3881AA Putten" -> "Putten"
function shortName(name) {
	if (!name) return "";
	const parts = name.split(",").map(p => p.trim());
	const first = parts.length > 1 && /\d/.test(parts[0]) ? parts[parts.length - 1] : parts[0];
	return first.replace(/^\d{4}\s?[A-Z]{2}\s+/, "");
}

// ---- ophalen en lezen --------------------------------------------------------
// Buienradar: regels "waarde|HH:MM", waarde 0-255; mm/u = 10^((waarde-109)/32)
function parse(text) {
	const now = Date.now(), out = [];
	for (const line of text.split(/\r?\n/)) {
		const m = /^\s*([\d.,]+)\s*\|\s*(\d{1,2}):(\d{2})/.exec(line);
		if (!m) continue;
		const v = parseFloat(m[1].replace(",", "."));
		const d = new Date(now);
		d.setHours(+m[2], +m[3], 0, 0);
		let t = d.getTime();
		if (t - now > 12 * 3600000) t -= 86400000;	// rond middernacht
		if (now - t > 12 * 3600000) t += 86400000;
		out.push({ t, mm: v > 0 ? Math.pow(10, (v - 109) / 32) : 0 });
	}
	return out.sort((a, b) => a.t - b.t);
}

// Eén ophaling tegelijk: komt er een aanroep binnen terwijl er al een loopt
// (start, zone.home, gewijzigde instelling), dan volgt er daarna één
// nieuwe ronde in plaats van een tweede, parallelle timer.
let loading = false, again = false;

async function load() {
	if (loading) { again = true; return; }
	loading = true;
	try {
		await fetchRain();
	} finally {
		loading = false;
		if (again) { again = false; load(); }
	}
}

// ---- temperatuur van het dichtstbijzijnde Buienradar-weerstation ------------
const TEMP_URL = "https://data.buienradar.nl/2.0/feed/json";
const TEMP_EVERY = 10 * 60 * 1000;	// stations meten elke 10 minuten
let station = null;	// { temp, name, km, at, lat, lon }: laatst gelezen station
let tempBusy = false, tempTried = 0, tempFor = "";

async function fetchStationTemp(loc) {
	const key = loc.lat.toFixed(2) + "," + loc.lon.toFixed(2);
	if (tempBusy || (tempFor === key && Date.now() - tempTried < TEMP_EVERY)) return;
	tempBusy = true; tempTried = Date.now(); tempFor = key;
	try {
		const r = await retoon.fetch(TEMP_URL, { timeout: 30 });
		if (r.status !== 200) throw new Error("HTTP " + r.status);
		const list = ((JSON.parse(r.text).actual || {}).stationmeasurements) || [];
		let best = null;
		for (const st of list) {
			const t = +st.temperature, la = +st.lat, lo = +st.lon;
			if (st.temperature == null || !isFinite(t) || !isFinite(la) || !isFinite(lo)) continue;
			// afstand in km (vlakke benadering, ruim nauwkeurig genoeg voor NL)
			const dx = (lo - loc.lon) * 111.32 * Math.cos(loc.lat * Math.PI / 180);
			const dy = (la - loc.lat) * 110.57;
			const km = Math.sqrt(dx * dx + dy * dy);
			if (!best || km < best.km)
				best = { temp: t, name: String(st.stationname || "").replace(/^Meetstation\s+/i, ""), km, at: Date.now() };
		}
		if (!best) throw new Error("geen stations met temperatuur");
		station = best;
		retoon.update();
	} catch (e) {
		retoon.log("temperatuur: " + e.message);	// tussen 0 en 1 uur ontbreken de metingen soms
	} finally {
		tempBusy = false;
	}
}

async function fetchRain() {
	if (timer) { clearTimeout(timer); timer = null; }
	const loc = await location();
	if (loc.error) {
		error = loc.error;
		rain = [];
		retoon.update();
		timer = setTimeout(load, RETRY);
		return;
	}
	// temperatuur alleen van Buienradar als er geen eigen sensor gekozen is;
	// los van de regen, zodat die er niet op hoeft te wachten
	if (!S().tempSensor && S().tempBuienradar !== false) fetchStationTemp(loc);
	// andere locatie dan de getoonde gegevens: oude grafiek weg
	if (where && (where.lat !== loc.lat || where.lon !== loc.lon)) rain = [];
	const q = "?lat=" + loc.lat.toFixed(2) + "&lon=" + loc.lon.toFixed(2);
	let why = "";
	for (const base of URLS) {
		try {
			const r = await retoon.fetch(base + q, { timeout: 20 });
			if (r.status !== 200) throw new Error("HTTP " + r.status);
			const data = parse(r.text);
			if (data.length < 2) throw new Error("geen gegevens");
			rain = data;
			where = loc;
			fetchedAt = Date.now();
			error = "";
			retoon.update();
			timer = setTimeout(load, REFRESH);
			return;
		} catch (e) {
			why = e.message;
			retoon.log(base + ": " + why);
		}
	}
	error = "Buienradar niet bereikbaar (" + why + ")";
	retoon.update();
	timer = setTimeout(load, RETRY);
}

// ---- betekenis ---------------------------------------------------------------
const pad = n => ("0" + n).slice(-2);
const hhmm = t => { const d = new Date(t); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };

function threshold() {
	const t = +S().threshold;
	return t > 0 ? t : 0.1;
}

function level(mm) {
	if (mm < threshold()) return "droog";
	if (mm < 1) return "licht";
	if (mm < 5) return "matig";
	if (mm < 30) return "zwaar";
	return "zeer zwaar";
}

// koel wit -> lichtblauw -> donkerder blauw -> donkerrood: dezelfde koele
// grondtoon, oplopend in verzadiging, met rood als duidelijke uitschieter
const COLORS = {
	licht: "#e6edf5",	// wit met een zweem blauw, past bij de blauwtinten
	matig: "#8ec5f2",	// lichtblauw
	zwaar: "#2f6cc9",	// donkerder blauw, nog leesbaar op de donkergrijze kaart
	zeerZwaar: "#b3262e",	// donkerrood, niet fel, wel duidelijk anders
};

function color(mm) {
	if (mm < 1) return COLORS.licht;
	if (mm < 5) return COLORS.matig;
	if (mm < 30) return COLORS.zwaar;
	return COLORS.zeerZwaar;
}

// metingen vanaf het lopende blok van 5 minuten
function upcoming() {
	const now = Date.now();
	return rain.filter(r => r.t + STEP > now);
}

function heaviest(list) {
	return list.reduce((m, r) => Math.max(m, r.mm), 0);
}

// { text, kind: "dry"|"rain"|"soon" }
// short: korte zinnen voor smalle kaarten
function summary(short) {
	const up = upcoming(), thr = threshold();
	if (!up.length) return { text: error || "Bezig met laden…", kind: "none" };
	const wet = r => r.mm >= thr;
	if (wet(up[0])) {
		const i = up.findIndex(r => !wet(r));
		const shower = i < 0 ? up : up.slice(0, i);
		const what = "Regen nu (" + level(heaviest(shower)) + ")";
		const until = i < 0 ? (short ? "" : ", aanhoudend") : (short ? ", tot " : ", droog vanaf ") + hhmm(up[i].t);
		return { text: what + until, kind: "rain" };
	}
	const i = up.findIndex(wet);
	if (i < 0) return { text: short ? "2 uur droog" : "Komende 2 uur droog", kind: "dry" };
	let j = up.slice(i).findIndex(r => !wet(r));
	const shower = j < 0 ? up.slice(i) : up.slice(i, i + j);
	return { text: (short ? "Regen " : "Regen vanaf ") + hhmm(up[i].t) + " (" + level(heaviest(shower)) + ")", kind: "soon" };
}

// ---- vloeiende curve ---------------------------------------------------------
// f: hoogte per blok (0..1); geeft sub waarden per blok terug.
// Elke meting telt in het midden van zijn blok; daartussen een monotone
// kubische kromme. Een droog blok telt als 0 in zijn midden, zodat een bui
// over ongeveer 5 minuten zacht in- en uitloopt (de voet begint halverwege
// het droge blok ervoor). Daarna een lichte afvlakking over de hele reeks.
function smoothCurve(f, sub) {
	const n = f.length;
	const px = [], py = [];
	for (let i = 0; i < n; i++) { px.push(i + 0.5); py.push(f[i]); }
	const curve = monotone(px, py);
	const out = [];
	for (let j = 0; j < n * sub; j++) out.push(Math.max(0, curve((j + 0.5) / sub)));
	const r = Math.max(1, Math.round(sub / 2));
	const res = [];
	for (let j = 0; j < out.length; j++) {
		let sum = 0, wsum = 0;
		for (let k = -r; k <= r; k++) {
			const q = j + k;
			if (q < 0 || q >= out.length) continue;
			const wt = r + 1 - Math.abs(k);
			sum += out[q] * wt; wsum += wt;
		}
		const v = sum / wsum;
		res.push(v < 0.004 ? 0 : v);
	}
	return res;
}

// monotone kubische interpolatie (Fritsch-Carlson); x oplopend
function monotone(xs, ys) {
	const n = xs.length;
	if (n < 2) return () => (n ? ys[0] : 0);
	const d = [], m = new Array(n);
	for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
	m[0] = d[0]; m[n - 1] = d[n - 2];
	for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
	for (let i = 0; i < n - 1; i++) {
		if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
		const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
		if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
	}
	return x => {
		if (x <= xs[0]) return ys[0];
		if (x >= xs[n - 1]) return ys[n - 1];
		let i = 0;
		while (x > xs[i + 1]) i++;
		const hh = xs[i + 1] - xs[i], t = (x - xs[i]) / hh;
		const t2 = t * t, t3 = t2 * t;
		return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * hh * m[i] +
			(-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * hh * m[i + 1];
	};
}

// kleur die geleidelijk overloopt: elk niveau op zijn eigen kleur in het
// midden van zijn bereik, daartussen gemengd
const STOPS = [[0.3, COLORS.licht], [2.2, COLORS.matig], [12, COLORS.zwaar], [40, COLORS.zeerZwaar]];
function blend(mm) {
	const lm = Math.log10(Math.max(mm, 0.01));
	if (lm <= Math.log10(STOPS[0][0])) return STOPS[0][1];
	for (let i = 0; i + 1 < STOPS.length; i++) {
		const a = Math.log10(STOPS[i][0]), b = Math.log10(STOPS[i + 1][0]);
		if (lm <= b) return mix(STOPS[i][1], STOPS[i + 1][1], (lm - a) / (b - a));
	}
	return STOPS[STOPS.length - 1][1];
}

function mix(c1, c2, t) {
	const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
	const a = p(c1), b = p(c2);
	return "#" + a.map((v, i) => ("0" + Math.round(v + (b[i] - v) * t).toString(16)).slice(-2)).join("");
}

// ---- tekenen -----------------------------------------------------------------
// logaritmische schaal: 0,1 mm/u onderaan, 50 mm/u bovenaan
function frac(mm) {
	if (mm < threshold()) return 0;
	const f = (Math.log10(mm) + 1) / (Math.log10(50) + 1);
	return 0.08 + 0.92 * Math.max(0, Math.min(1, f));
}

// terug van hoogte naar mm/u, voor de kleur van tussenliggende staafjes
function unfrac(v) {
	if (v <= 0.08) return 0.1;
	return Math.pow(10, (v - 0.08) / 0.92 * (Math.log10(50) + 1) - 1);
}

// Het regenvlak, zuinig getekend (de Toon 1 is traag bij veel elementen).
// In plaats van een rechthoek per staafje wordt het vlak gevuld met één
// zigzaglijn: op en neer tussen de bodem en de curve, met een lijndikte die
// iets groter is dan de stap, zodat de streken een dicht vlak vormen. Lijnen
// tekent de Toon glad, dus ook de bovenrand is glad. Per kleurtint één lijn
// (12 tinten), plus één lijn als bovenrand: samen meestal 10-30 elementen.
const TINTS = 12;
function drawArea(el, f, x, y, w, gh, big) {
	const n = f.length;
	const step = big ? 3 : 2;				// pixels tussen twee streken
	const cols = Math.max(2, Math.floor(w / step));
	const sub = cols / n;					// streken per blok
	const fine = smoothCurve(f, Math.max(1, Math.ceil(sub)));
	const at = cx => fine[Math.min(fine.length - 1, Math.floor(cx / w * fine.length))];
	const base = y + gh - step / 2;			// ronde lijnkoppen niet onder de as
	let run = null;						// { tint, pts, k }
	const flush = () => {
		if (run && run.pts.length >= 4)
			el.line(run.pts, { width: step + 1, color: blend(unfrac((run.tint + 0.5) / TINTS)) });
		run = null;
	};
	for (let c = 0; c < cols; c++) {
		const cx = (c + 0.5) * step;
		const v = at(cx);
		if (v * gh < 1) { flush(); continue; }
		const tint = Math.min(TINTS - 1, Math.floor(v * TINTS));
		if (run && run.tint !== tint) flush();
		if (!run) run = { tint, pts: [], k: 0 };
		const px = x + cx, top = y + gh - v * gh;
		// zigzag: even streek omhoog, oneven omlaag
		if (run.k % 2 === 0) run.pts.push(px, base, px, top);
		else run.pts.push(px, top, px, base);
		run.k++;
	}
	flush();
	// bovenrand: één gladde lijn met 4 punten per blok
	const pts = [];
	for (let i = 0; i <= n * 4; i++) {
		const cx = i / (n * 4) * w;
		pts.push(x + cx, y + gh - at(Math.min(w - 0.01, cx)) * gh);
	}
	el.line(pts, { width: big ? 3 : 2, color: COLORS.licht, opacity: 0.9 });
}

function drawGraph(el, x, y, w, h, big) {
	const data = upcoming();
	if (!data.length) return;
	const labelH = big ? 26 : 20;
	const gh = h - labelH;			// hoogte van de grafiek zelf
	const n = data.length;
	const bw = w / n;
	const t0 = data[0].t;

	// schaallijnen: licht/matig, matig/zwaar, zwaar/zeer zwaar
	for (const [mm, name] of [[1, "matig"], [5, "zwaar"], [30, "zeer zwaar"]]) {
		const ly = y + gh - frac(mm) * gh;
		el.box({ x, y: ly, w, h: 1, bg: "muted", opacity: 0.35 });
		if (big) el.text(name, { x: x - 104, y: ly - 11, w: 96, textAlign: "right", font: "small", color: "muted" });
	}
	if (big) el.text("licht", { x: x - 104, y: y + gh - 30, w: 96, textAlign: "right", font: "small", color: "muted" });
	el.box({ x, y: y + gh, w, h: 1, bg: "muted", opacity: 0.6 });

	const f = data.map(r => frac(r.mm));
	if (f.some(v => v > 0)) drawArea(el, f, x, y, w, gh, big);

	// tijden
	data.forEach((r, i) => {
		const d = new Date(r.t);
		const every = big ? 15 : 30;
		const lx = x + i * bw - (big ? 4 : 2);
		if (d.getMinutes() % every === 0 && lx + 44 <= x + w)	// geen label dat uit de kaart steekt
			el.text(hhmm(r.t), { x: lx, y: y + gh + 3, font: "small", color: "muted" });
	});

	// nu-lijn
	const nx = x + Math.max(0, Math.min(1, (Date.now() - t0) / (n * STEP))) * w;
	el.box({ x: nx - 1, y, w: 2, h: gh, bg: "accent", opacity: 0.8 });
}

// kopregel; op smalle kaarten kortere tekst, kleinere letter, geen plaatsnaam
// buitentemperatuur, bijv. "7,4 °C": van de gekozen sensor, anders van het
// dichtstbijzijnde Buienradar-station; "– °C" als de sensor geen waarde
// geeft; leeg als er niets te tonen is
function outsideTemp() {
	const id = S().tempSensor;
	if (id) {
		const st = retoon.state(id);
		if (!st || !isFinite(st.value)) return "– °C";
		return st.value.toFixed(1).replace(".", ",") + " " + (st.unit || "°C");
	}
	if (S().tempBuienradar === false || !station) return "";
	if (Date.now() - station.at > 45 * 60 * 1000) return "";	// te oud
	return station.temp.toFixed(1).replace(".", ",") + " °C";
}

function header(el, big) {
	const narrow = !big && el.width < 380;
	const tiny = !big && el.width < 300;
	const temp = outsideTemp();
	// met temperatuur rechtsboven op de kaart: korte tekst, zodat ze elkaar niet raken
	const s = summary(narrow || (!big && !!temp));
	const icon = s.kind === "rain" ? "mdi:weather-pouring" : s.kind === "soon" ? "mdi:weather-partly-rainy"
		: s.kind === "dry" ? "mdi:weather-cloudy" : "mdi:radar";
	const col = s.kind === "rain" ? COLORS.matig : s.kind === "soon" ? "warn" : s.kind === "dry" ? "ok" : "muted";
	el.icon(icon, { x: 0, y: 0, size: big ? "big" : "mid", color: col });
	// op het grote scherm staat rechtsboven de sluitknop: daar komt de
	// temperatuur direct achter de verwachting
	const text = big && temp ? s.text + "   |   " + temp : s.text;
	el.text(text, { x: big ? 60 : 44, y: tiny ? 8 : 4, font: big ? "mid" : tiny ? "small" : narrow ? "body" : "head",
		color: s.kind === "none" && error ? "bad" : "text" });
	if (big) return;
	// kaart: temperatuur rechtsboven, plaatsnaam (als aangevinkt) eronder
	if (temp)
		el.text(temp, { x: 0, y: tiny ? 8 : 4, align: "top-right", font: tiny ? "small" : narrow ? "body" : "head" });
	const place = S().place || (where ? shortName(where.name) : "");
	if (S().showPlace && place && !narrow)
		el.text(place, { x: 0, y: temp ? 28 : 0, align: "top-right", font: "small", color: "muted" });
}

function drawTile(el) {
	header(el, false);
	if (!upcoming().length) return;
	drawGraph(el, 0, 46, el.width, el.height - 46, false);
}

function drawScreen(el) {
	header(el, true);
	const up = upcoming();
	if (!up.length) return;
	const top = 80, left = 110, bottom = 64;
	drawGraph(el, left, top, el.width - left - 10, el.height - top - bottom, true);

	const total = up.reduce((s, r) => s + r.mm / 12, 0);	// mm per 5 min = mm/u / 12
	const max = heaviest(up);
	const info = "Totaal 2 uur: " + total.toFixed(1).replace(".", ",") + " mm" +
		"     Zwaarste: " + max.toFixed(1).replace(".", ",") + " mm/u" +
		"     Bijgewerkt " + hhmm(fetchedAt) + "     Bron: Buienradar";
	if (where) {
		const loc = (where.name || where.src) + " (" + where.lat.toFixed(2).replace(".", ",") + " / " +
			where.lon.toFixed(2).replace(".", ",") + ")";
		let src = "";
		if (S().tempSensor) src = "     Temperatuur: " + S().tempSensor;
		else if (station && outsideTemp()) src = "     Temperatuur: station " + station.name + " (" + Math.round(station.km) + " km)";
		el.text("Locatie: " + loc + src, { x: 0, y: -26, align: "bottom-left", font: "small", color: "muted" });
	}
	el.text(info, { x: 0, y: 0, align: "bottom-left", font: "small", color: error ? "bad" : "muted" });
}

// ---- start -------------------------------------------------------------------
retoon.tile(drawTile);
retoon.screen(drawScreen);
// zone.home (locatie Thuis) en de temperatuursensor bijhouden; een nieuwe
// watch-aanroep vervangt de lijst, dus na een gewijzigde instelling opnieuw
function watchEntities() {
	const ids = ["zone.home"];
	if (S().tempSensor) ids.push(S().tempSensor);
	retoon.watch(ids, id => {
		if (id === "zone.home") { if (!rain.length && !loading) load(); }
		else retoon.update();
	});
}

retoon.onSettings(() => { watchEntities(); load(); });

// locatie Thuis volgen: als die later binnenkomt (HA-verbinding), alsnog laden
watchEntities();

// elke minuut opnieuw tekenen, zodat nu-lijn en samenvatting meeschuiven
setInterval(() => retoon.update(), 60 * 1000);

load();
