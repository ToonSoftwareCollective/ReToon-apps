// Agenda for ReToon. Reads one or more Home Assistant calendars with
// retoon.call (calendar.get_events) over the Toon's own connection, so no token.
// The card shows the next events; the full screen the coming days, per day.

const S = () => retoon.settings;

const DAYS = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];
const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const COLORS = {
	groen: "#22c55e", green: "#22c55e", blauw: "#3b82f6", blue: "#3b82f6", oranje: "#f97316", orange: "#f97316",
	rood: "#ef4444", red: "#ef4444", paars: "#a855f7", purple: "#a855f7", geel: "#eab308", yellow: "#eab308",
	teal: "#14b8a6", turquoise: "#14b8a6", roze: "#ec4899", pink: "#ec4899", grijs: "#9ca3af", grey: "#9ca3af"
};
const DEFAULTS = ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ec4899", "#14b8a6"];

let events = null;	// [{ start: Date, end: Date, allDay, summary, location, cal }] sorted, or null before the first load
let error = "";
let retry = null;

function cals() {
	return (S().calendars || []).filter(c => c && c.entity);
}

function two(n) { return n < 10 ? "0" + n : String(n); }

function clip(s, n) {
	s = String(s || "");
	return s.length > n ? s.slice(0, Math.max(1, n - 1)) + "…" : s;
}

function colorOf(i) {
	const c = String((cals()[i] || {}).color || "").trim().toLowerCase();
	if (/^#[0-9a-f]{6}$/.test(c)) return c;
	return COLORS[c] || DEFAULTS[i % DEFAULTS.length];
}

// "2026-11-17" -> local midnight; "2026-11-17T18:00:00+01:00" -> that moment
function parse(v) {
	const s = String(v || "");
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
	if (m) return { date: new Date(+m[1], +m[2] - 1, +m[3]), allDay: true };
	const d = new Date(s);
	return { date: d, allDay: false };
}

function dayStart(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function sameDay(a, b) { return dayStart(a).getTime() === dayStart(b).getTime(); }
function hhmm(d) { return two(d.getHours()) + ":" + two(d.getMinutes()); }
function isoLocal(d) {
	return d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate()) + "T" + hhmm(d) + ":00";
}

// "Vandaag", "Morgen", else "Wo 19 nov"
function dayLabel(d) {
	const today = dayStart(new Date());
	const diff = Math.round((dayStart(d) - today) / 86400000);
	if (diff <= 0) return "Vandaag";
	if (diff === 1) return "Morgen";
	return DAYS[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()];
}

// events that have not ended yet; an all-day event that started earlier counts for today
function upcoming() {
	const now = new Date();
	return (events || []).filter(e => e.end > now);
}

function timeText(e) {
	if (e.allDay) return "hele dag";
	return hhmm(e.start < new Date() && !sameDay(e.start, new Date()) ? dayStart(new Date()) : e.start);
}

// ---- data

async function load() {
	clearTimeout(retry);
	const list = cals();
	if (!list.length) { events = []; error = ""; retoon.update(); return; }
	const from = dayStart(new Date());
	const days = Math.max(1, Math.min(31, Number(S().days) || 7));
	const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days);
	try {
		const ids = list.map(c => c.entity);
		const r = await retoon.call("calendar.get_events",
			{ entity_id: ids, start_date_time: isoLocal(from), end_date_time: isoLocal(to) }, { response: true });
		const out = [];
		ids.forEach((id, i) => {
			((r && r[id] && r[id].events) || []).forEach(ev => {
				const s = parse(ev.start), e = parse(ev.end || ev.start);
				if (!isFinite(s.date.getTime())) return;
				out.push({ start: s.date, end: isFinite(e.date.getTime()) ? e.date : s.date, allDay: s.allDay,
					summary: String(ev.summary || "(geen titel)"), location: String(ev.location || ""), cal: i });
			});
		});
		// all-day first within a day, then by time
		out.sort((a, b) => dayStart(a.start) - dayStart(b.start) || (b.allDay - a.allDay) || (a.start - b.start));
		events = out;
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
	el.box({ x: 0, y: y + 3, w: 6, h: 24, bg: colorOf(e.cal), radius: 3 });
	const left = withDay ? dayLabel(e.start) + "  " + timeText(e) : timeText(e);
	const lw = withDay ? 190 : 100;
	el.text(left, { x: 16, y: y + 4, color: sameDay(e.start, new Date()) || e.start < new Date() ? "accent" : "muted" });
	el.text(clip(e.summary, Math.floor((w - 16 - lw) / 10)), { x: 16 + lw, y: y + 4 });
}

function drawTile(el) {
	if (!cals().length) {
		el.text("Kies je agenda's onder Apps in de webinterface", { align: "center", color: "muted" });
		return;
	}
	if (events === null) {
		el.text(error || "Laden…", { align: "center", color: error ? "bad" : "muted" });
		return;
	}
	const list = upcoming();
	el.icon("mdi:calendar", { x: 0, y: 0, size: "small", color: "accent" });
	el.text(clip(S().title || "Agenda", 40), { x: 34, y: 2, font: "head" });
	if (!list.length) {
		el.text("Niks gepland, lekker rustig", { x: 0, y: 44, color: "muted" });
		return;
	}
	const ROW = 32, n = Math.max(1, Math.floor((el.height - 36) / ROW));
	list.slice(0, n).forEach((e, i) => row(el, e, 36 + i * ROW, el.width, true));
	if (error) el.text("!", { x: 0, y: 0, w: el.width, textAlign: "right", color: "bad" });
}

function drawScreen(el) {
	if (!cals().length) {
		el.text("Kies je agenda's onder Apps in de webinterface", { align: "center", color: "muted" });
		return;
	}
	const list = upcoming();
	if (!list.length) {
		el.text(error || (events === null ? "Laden…" : "Niks gepland"), { align: "center", color: error ? "bad" : "muted" });
		return;
	}
	// two columns of days; each day a heading and its events
	const colW = Math.floor((el.width - 24) / 2), maxY = el.height - 24;
	const areas = [el.box({ x: 0, y: 0, w: colW, h: el.height }), el.box({ x: colW + 24, y: 0, w: colW, h: el.height })];
	let col = 0, y = 0, lastDay = null;
	const today = dayStart(new Date());
	for (const e of list) {
		const d = e.start < today ? today : dayStart(e.start);
		const needs = (lastDay === null || d.getTime() !== lastDay) ? 30 + 30 : 30;
		if (y + needs > maxY) {
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
load();

let loader = setInterval(load, Math.max(5, Number(S().refresh) || 15) * 60 * 1000);
retoon.onSettings(() => {
	clearInterval(loader);
	loader = setInterval(load, Math.max(5, Number(S().refresh) || 15) * 60 * 1000);
	load();
});
// "Vandaag"/"Morgen" and finished events change without new data
setInterval(() => retoon.update(), 5 * 60 * 1000);
