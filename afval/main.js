// Afvalkalender for ReToon. The card shows the next collection; the full screen
// shows the next months. The next dates come from sensors that give
// the days until the next collection (attribute Days_until, date in Sort_date as
// yyyymmdd). The following months come from a Home Assistant calendar entity
// (optional): that needs the Home Assistant address and a long-lived token,
// because an app can only read states and has to call the REST API for events.

const S = () => retoon.settings;

const DAYS = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];
const MONTHS = ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"];

// colour and icon by kind of waste, found by a word in the name; the settings can override both
const KINDS = [
	{ words: ["gft", "groen", "organisch", "keuken"], color: "#22c55e", icon: "mdi:leaf" },
	{ words: ["pmd", "plastic", "verpakking", "blik", "drank"], color: "#f97316", icon: "mdi:recycle" },
	{ words: ["rest", "grijs", "zwart"], color: "#9ca3af", icon: "mdi:delete" },
	{ words: ["papier", "karton", "blauw"], color: "#3b82f6", icon: "mdi:newspaper" },
	{ words: ["tak", "tuin", "snoei", "boom"], color: "#a16207", icon: "mdi:tree" },
	{ words: ["glas", "fles"], color: "#14b8a6", icon: "mdi:bottle-wine" },
	{ words: ["textiel", "kleding"], color: "#a855f7", icon: "mdi:tshirt-crew" },
	{ words: ["kca", "chemisch"], color: "#ef4444", icon: "mdi:flask" }
];

// colour names that may be typed in the settings (Dutch or English)
const COLORS = {
	groen: "#22c55e", green: "#22c55e", oranje: "#f97316", orange: "#f97316", grijs: "#9ca3af", grey: "#9ca3af", gray: "#9ca3af",
	blauw: "#3b82f6", blue: "#3b82f6", bruin: "#a16207", brown: "#a16207", rood: "#ef4444", red: "#ef4444",
	geel: "#eab308", yellow: "#eab308", paars: "#a855f7", purple: "#a855f7", turquoise: "#14b8a6", teal: "#14b8a6",
	roze: "#ec4899", pink: "#ec4899", wit: "#e5e7eb", white: "#e5e7eb", zwart: "#4b5563", black: "#4b5563"
};

let events = {};	// "yyyy-mm-dd" -> [stream index], from the calendar
let calError = "";

function streams() {
	return (S().streams || []).filter(s => s && s.entity);
}

function kindOf(name) {
	const n = String(name || "").toLowerCase();
	return KINDS.find(k => k.words.some(w => n.indexOf(w) >= 0)) || null;
}

function colorOf(s, name) {
	const c = String(s.color || "").trim().toLowerCase();
	if (/^#[0-9a-f]{6}$/.test(c)) return c;
	if (COLORS[c]) return COLORS[c];
	const k = kindOf(name);
	return k ? k.color : "accent";
}

function iconOf(s, name) {
	const i = String(s.icon || "").trim();
	if (i) return i.indexOf("mdi:") === 0 ? i : "mdi:" + i;
	const k = kindOf(name);
	return k ? k.icon : "mdi:delete";
}

function nameOf(s) {
	const st = retoon.state(s.entity);
	return s.name || (st && st.name) || s.entity;
}

function two(n) {
	return n < 10 ? "0" + n : String(n);
}

function key(y, m, d) {
	return y + "-" + two(m + 1) + "-" + two(d);
}

// the streams that have a next collection, soonest first: { name, icon, color, days, date, index }
function upcoming() {
	const out = [];
	streams().forEach((s, index) => {
		const st = retoon.state(s.entity);
		const a = st ? st.attributes : null;
		const days = a ? Number(a.Days_until) : NaN;
		if (!isFinite(days) || a.Days_until === null || a.Days_until === "") return;
		const sd = Number(a.Sort_date);
		const name = nameOf(s);
		out.push({
			name: name,
			icon: iconOf(s, name),
			color: colorOf(s, name),
			index: index,
			days: days,
			date: isFinite(sd) && sd > 0 ? new Date(Math.floor(sd / 10000), Math.floor(sd / 100) % 100 - 1, sd % 100) : null
		});
	});
	return out.sort((x, y) => x.days - y.days);
}

// "Vandaag", "Morgen", else "Do 12-11"
function when(u) {
	if (u.days <= 0) return "Vandaag";
	if (u.days === 1) return "Morgen";
	return u.date ? DAYS[u.date.getDay()] + " " + two(u.date.getDate()) + "-" + two(u.date.getMonth() + 1) : "Over " + u.days + " dagen";
}

function whenColor(u) {
	return u.days <= 1 ? "warn" : "muted";
}

function clip(s, n) {
	s = String(s || "");
	return s.length > n ? s.slice(0, Math.max(1, n - 1)) + "…" : s;
}

// one row: icon in the stream's colour, name, and when on the right
function row(el, u, y, w) {
	el.icon(u.icon, { x: 0, y: y, size: "mid", color: u.color });
	el.text(clip(u.name, Math.floor((w - 46) / 10) - 8), { x: 46, y: y + 4 });
	el.text(when(u), { x: 0, y: y + 4, w: w, textAlign: "right", color: whenColor(u) });
}

function drawTile(el) {
	if (!streams().length) {
		el.text("Kies je afvalsensoren onder Apps in de webinterface", { align: "center", color: "muted" });
		return;
	}
	const list = upcoming();
	if (!list.length) {
		el.text("Geen ophaaldag bekend", { align: "center", color: "muted" });
		return;
	}
	// everything on the same day as the first collection goes in one row
	const first = list[0];
	const same = list.filter(u => u.days === first.days);
	const row0 = Object.assign({}, first, { name: same.map(u => u.name).join(" + ") });
	row(el, row0, 0, el.width);
	// a taller card shows the following days too
	let y = 44, shown = same.length;
	for (let i = shown; i < list.length && y + 44 <= el.height; i++, y += 44) row(el, list[i], y, el.width);
}

// ---- full screen: the next months

// "yyyy-mm-dd" -> [stream index]: the calendar plus the next date of every sensor
function daysMap() {
	const map = {};
	const add = (k, i) => { (map[k] = map[k] || []); if (map[k].indexOf(i) < 0) map[k].push(i); };
	Object.keys(events).forEach(k => events[k].forEach(i => add(k, i)));
	upcoming().forEach(u => { if (u.date) add(key(u.date.getFullYear(), u.date.getMonth(), u.date.getDate()), u.index); });
	return map;
}

// the next 6 months, starting with the current one: 3 columns x 2 rows
const MONTHS_SHOWN = 6;

function drawYear(el, W, H) {
	const now = new Date();
	const today = key(now.getFullYear(), now.getMonth(), now.getDate());
	const map = daysMap();
	const cols = 3, mw = Math.floor(W / cols), cw = 40, gap = 16;
	// the two rows of months share the height of the card
	const mh = Math.floor((H + gap) / 2), ch = Math.max(20, Math.min(34, Math.floor((mh - 30 - gap) / 6)));
	const colors = streams().map(s => colorOf(s, nameOf(s)));
	for (let i = 0; i < MONTHS_SHOWN; i++) {
		const date = new Date(now.getFullYear(), now.getMonth() + i, 1), year = date.getFullYear(), m = date.getMonth();
		const x0 = (i % cols) * mw + Math.floor((mw - 7 * cw) / 2), y0 = Math.floor(i / cols) * mh;
		el.text(MONTHS[m] + (year !== now.getFullYear() ? " " + year : ""), { x: x0, y: y0, color: i === 0 ? "accent" : "muted" });
		const first = (date.getDay() + 6) % 7;
		const count = new Date(year, m + 1, 0).getDate();
		for (let d = 1; d <= count; d++) {
			const p = first + d - 1, cx = x0 + (p % 7) * cw, cy = y0 + 30 + Math.floor(p / 7) * ch;
			const k = key(year, m, d), on = map[k];
			if (on) {
				const part = Math.floor((cw - 2) / on.length);
				on.forEach((si, j) => el.box({ x: cx + 1 + j * part, y: cy, w: part, h: ch - 3, bg: colors[si] || "accent", radius: 4 }));
			}
			if (k === today) el.box({ x: cx, y: cy - 1, w: cw - 1, h: ch - 1, radius: 5, border: 2, borderColor: "text" });
			el.text(String(d), { x: cx, y: cy + Math.floor((ch - 3 - 19) / 2), w: cw - 1, textAlign: "center",
				color: on ? "background" : k < today ? "muted" : "text" });
		}
	}
}

function drawScreen(root) {
	const TOP = 36;	// the row with the legend lies above the card
	if (!streams().length) {
		root.text("Kies je afvalsensoren onder Apps in de webinterface", { align: "center", color: "muted" });
		return;
	}
	// above the card: what the colours mean
	let lx = 4;
	streams().forEach(s => {
		const n = nameOf(s);
		root.box({ x: lx, y: 7, w: 14, h: 14, bg: colorOf(s, n), radius: 4 });
		root.text(clip(n, 14), { x: lx + 20, y: 4, font: "small" });
		lx += 20 + Math.min(14, n.length) * 9 + 22;
	});
	// the card under it, with the months on it
	const W = root.width - 24, H = root.height - TOP - 24;
	const el = root.box({ x: 0, y: TOP, w: root.width, h: root.height - TOP, bg: "card", radius: 12 }).box({ x: 12, y: 12, w: W, h: H });
	drawYear(el, W, H);
	if (calError) el.text(clip(calError, 80), { x: 0, y: H - 18, font: "small", color: "bad" });
}

// ---- data

async function loadCalendar() {
	const cal = S().calendar, url = (S().haUrl || "").replace(/\/+$/, "");
	if (!cal || !url || !S().token) { events = {}; calError = ""; return; }
	const n = new Date(), from = new Date(n.getFullYear(), n.getMonth(), 1), to = new Date(n.getFullYear(), n.getMonth() + MONTHS_SHOWN + 1, 1);
	const iso = d => key(d.getFullYear(), d.getMonth(), 1) + "T00:00:00Z";
	try {
		const r = await retoon.fetch(url + "/api/calendars/" + cal + "?start=" + iso(from) + "&end=" + iso(to), {
			headers: { "Authorization": "Bearer " + S().token }, timeout: 20 });
		if (r.status === 401) throw new Error("token geweigerd");
		if (r.status >= 300) throw new Error("HTTP " + r.status);
		const list = JSON.parse(r.text), map = {};
		const names = streams().map(s => nameOf(s).toLowerCase());
		list.forEach(e => {
			const day = String((e.start && (e.start.date || e.start.dateTime)) || "").slice(0, 10);
			const sum = String(e.summary || "").toLowerCase();
			const i = names.findIndex(n => n === sum || sum.indexOf(n) >= 0 || n.indexOf(sum) >= 0);
			if (day && i >= 0) { (map[day] = map[day] || []); if (map[day].indexOf(i) < 0) map[day].push(i); }
		});
		events = map;
		calError = "";
	} catch (e) {
		calError = "Kalender laden mislukt: " + e.message;
		retoon.log(calError);
	}
	retoon.update();
}

function follow() {
	retoon.watch(streams().map(s => s.entity), () => retoon.update());
}

retoon.tile(drawTile);
retoon.screen(drawScreen);
retoon.onSettings(() => { follow(); loadCalendar(); retoon.update(); });
follow();
loadCalendar();

// the day changes at midnight without a state change: draw again every 10 minutes;
// the calendar is read again every 6 hours
setInterval(() => retoon.update(), 10 * 60 * 1000);
setInterval(loadCalendar, 6 * 60 * 60 * 1000);
