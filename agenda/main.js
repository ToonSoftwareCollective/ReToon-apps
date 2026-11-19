// Agenda for ReToon. Reads one or more Home Assistant calendars with
// retoon.call (calendar.get_events) over the Toon's own connection, so no token.
// The card shows the next events; the full screen the coming days, per day.
// Each card can have its own calendars and title (level 10, cardSettings);
// without them it uses the calendars and title set under Apps.

const S = () => retoon.settings;

const DAYS = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];
const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const COLORS = {
	groen: "#22c55e", green: "#22c55e", blauw: "#3b82f6", blue: "#3b82f6", oranje: "#f97316", orange: "#f97316",
	rood: "#ef4444", red: "#ef4444", paars: "#a855f7", purple: "#a855f7", geel: "#eab308", yellow: "#eab308",
	teal: "#14b8a6", turquoise: "#14b8a6", roze: "#ec4899", pink: "#ec4899", grijs: "#9ca3af", grey: "#9ca3af"
};
const DEFAULTS = ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ec4899", "#14b8a6"];

let byCal = null;	// calendar id -> [{ start: Date, end: Date, allDay, summary, location }], null before the first load
let error = "";
let retry = null;
let wanted = new Set();	// calendar ids asked for by the cards, besides those under Apps
let pending = null;	// timer for a load because a card asked for a new calendar

// ---- settings

function cardOf(card) {
	return Object.assign({}, S(), (card && card.settings) || {});
}

function rows(list) {
	return (list || []).filter(c => c && c.entity);
}

// the calendars of a card: its own, else the ones under Apps
function calsOf(card) {
	const own = rows(cardOf(card).cardCalendars);
	return own.length ? own : rows(S().calendars);
}

function titleOf(card) {
	const c = cardOf(card);
	return String(c.cardTitle || "").trim() || String(c.title || "").trim() || "Agenda";
}

function colorOf(row, i) {
	const c = String((row && row.color) || "").trim().toLowerCase();
	if (/^#[0-9a-f]{6}$/.test(c)) return c;
	return COLORS[c] || DEFAULTS[i % DEFAULTS.length];
}

// make sure every calendar a card shows is loaded
function need(list) {
	let added = false;
	list.forEach(c => { if (!wanted.has(c.entity)) { wanted.add(c.entity); added = true; } });
	if (added && !pending) pending = setTimeout(() => { pending = null; load(); }, 100);
}

// ---- helpers

function two(n) { return n < 10 ? "0" + n : String(n); }

function clip(s, n) {
	s = String(s || "");
	return s.length > n ? s.slice(0, Math.max(1, n - 1)) + "…" : s;
}

// "2026-11-17" -> local midnight; "2026-11-17T18:00:00+01:00" -> that moment
function parse(v) {
	const s = String(v || "");
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
	if (m) return { date: new Date(+m[1], +m[2] - 1, +m[3]), allDay: true };
	return { date: new Date(s), allDay: false };
}

function dayStart(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function sameDay(a, b) { return dayStart(a).getTime() === dayStart(b).getTime(); }
function hhmm(d) { return two(d.getHours()) + ":" + two(d.getMinutes()); }
function isoLocal(d) {
	return d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate()) + "T" + hhmm(d) + ":00";
}

// "Vandaag", "Morgen", else "Wo 19 nov"
function dayLabel(d) {
	const diff = Math.round((dayStart(d) - dayStart(new Date())) / 86400000);
	if (diff <= 0) return "Vandaag";
	if (diff === 1) return "Morgen";
	return DAYS[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()];
}

function timeText(e) {
	if (e.allDay) return "hele dag";
	return e.start < dayStart(new Date()) ? "00:00" : hhmm(e.start);
}

// the events of these calendars that have not ended yet, each with its colour;
// all-day first within a day, then by time
function upcoming(list) {
	const now = new Date(), out = [];
	list.forEach((c, i) => {
		const color = colorOf(c, i);
		((byCal && byCal[c.entity]) || []).forEach(e => {
			if (e.end > now) out.push(Object.assign({ color: color }, e));
		});
	});
	return out.sort((a, b) => dayStart(a.start) - dayStart(b.start) || (b.allDay - a.allDay) || (a.start - b.start));
}

// true until every calendar of this list has been read once
function loading(list) {
	return byCal === null || list.some(c => !(c.entity in byCal));
}

// ---- data

async function load() {
	clearTimeout(retry);
	rows(S().calendars).forEach(c => wanted.add(c.entity));
	const ids = Array.from(wanted);
	if (!ids.length) { byCal = {}; error = ""; retoon.update(); return; }
	const from = dayStart(new Date());
	const days = Math.max(1, Math.min(31, Number(S().days) || 7));
	const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days);
	try {
		const r = await retoon.call("calendar.get_events",
			{ entity_id: ids, start_date_time: isoLocal(from), end_date_time: isoLocal(to) }, { response: true });
		const map = {};
		ids.forEach(id => {
			map[id] = ((r && r[id] && r[id].events) || []).map(ev => {
				const s = parse(ev.start), e = parse(ev.end || ev.start);
				if (!isFinite(s.date.getTime())) return null;
				return { start: s.date, end: isFinite(e.date.getTime()) ? e.date : s.date, allDay: s.allDay,
					summary: String(ev.summary || "(geen titel)"), location: String(ev.location || "") };
			}).filter(e => e);
		});
		byCal = map;
		error = "";
	} catch (e) {
		error = "Agenda laden mislukt: " + (e && e.message ? e.message : e);
		retoon.log(error);
		retry = setTimeout(load, 60 * 1000);
	}
	retoon.update();
}

// ---- drawing

function row(el, e, y, w, withDay) {
	el.box({ x: 0, y: y + 3, w: 6, h: 24, bg: e.color, radius: 3 });
	const left = withDay ? dayLabel(e.start) + "  " + timeText(e) : timeText(e);
	const lw = withDay ? 190 : 100;
	el.text(left, { x: 16, y: y + 4, color: sameDay(e.start, new Date()) || e.start < new Date() ? "accent" : "muted" });
	el.text(clip(e.summary, Math.floor((w - 16 - lw) / 10)), { x: 16 + lw, y: y + 4 });
}

function noCalendars(el) {
	el.text("Kies je agenda's onder Apps in de webinterface", { align: "center", color: "muted" });
}

function drawTile(el, card) {
	const list = calsOf(card);
	if (!list.length) return noCalendars(el);
	need(list);
	el.icon("mdi:calendar", { x: 0, y: 0, size: "small", color: "accent" });
	el.text(clip(titleOf(card), 40), { x: 34, y: 2, font: "head" });
	if (error) el.text("!", { x: 0, y: 0, w: el.width, textAlign: "right", color: "bad" });
	if (loading(list)) {
		el.text(error || "Laden…", { x: 0, y: 44, color: error ? "bad" : "muted" });
		return;
	}
	const events = upcoming(list);
	if (!events.length) {
		el.text("Niks gepland, lekker rustig", { x: 0, y: 44, color: "muted" });
		return;
	}
	const ROW = 32, n = Math.max(1, Math.floor((el.height - 36) / ROW));
	events.slice(0, n).forEach((e, i) => row(el, e, 36 + i * ROW, el.width, true));
}

function drawScreen(el, card) {
	const list = calsOf(card);
	if (!list.length) return noCalendars(el);
	need(list);
	const events = upcoming(list);
	if (!events.length) {
		el.text(error || (loading(list) ? "Laden…" : "Niks gepland"), { align: "center", color: error ? "bad" : "muted" });
		return;
	}
	// two columns of days; each day a heading and its events
	const colW = Math.floor((el.width - 24) / 2), maxY = el.height - 24;
	const areas = [el.box({ x: 0, y: 0, w: colW, h: el.height }), el.box({ x: colW + 24, y: 0, w: colW, h: el.height })];
	const today = dayStart(new Date());
	let col = 0, y = 0, lastDay = null;
	for (const e of events) {
		const d = e.start < today ? today : dayStart(e.start);
		const newDay = lastDay === null || d.getTime() !== lastDay;
		if (y + (newDay ? 60 : 30) > maxY) {
			if (col === 1) break;
			col = 1; y = 0; lastDay = null;
		}
		const area = areas[col];
		if (lastDay === null || d.getTime() !== lastDay) {
			area.text(dayLabel(d), { x: 0, y: y, font: "head", color: d.getTime() === today.getTime() ? "accent" : "text" });
			y += 30;
			lastDay = d.getTime();
		}
		row(area, e, y, colW, false);
		y += 30;
	}
	if (error) el.text(clip(error, 90), { x: 0, y: el.height - 18, font: "small", color: "bad" });
}

retoon.tile(drawTile);
retoon.screen(drawScreen);

let loader = null;
function schedule() {
	clearInterval(loader);
	loader = setInterval(load, Math.max(5, Number(S().refresh) || 15) * 60 * 1000);
}
retoon.onSettings(() => {
	// start over: the cards add their calendars again when they are drawn
	wanted = new Set();
	schedule();
	load();
});
schedule();
load();
// "Vandaag"/"Morgen" and finished events change without new data
setInterval(() => retoon.update(), 5 * 60 * 1000);
