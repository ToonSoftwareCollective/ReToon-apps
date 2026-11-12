// Sonos for ReToon. The card shows the active group of Sonos speakers (for
// example "P5 + P1") with volume -/+ and play/pause. A tap opens a full screen
// to pick a group, build a group (add or remove speakers) and choose content.
// States come from Home Assistant (retoon.watch); commands go through
// retoon.call, over the Toon's own connection to Home Assistant, so no token.

const S = () => retoon.settings;

const BTN = "#283040";	// the colour of the buttons the Toon draws itself, a bit lighter than a card

let selected = "";	// a speaker of the group the user picked; "" = follow the one that plays
let error = "";		// why the last command failed
let watched = "";	// the entity list given to retoon.watch

function players() {
	return (S().players || []).filter(p => p && p.entity);
}

function stateOf(id) {
	return retoon.state(id);
}

function order(id) {
	const i = players().findIndex(p => p.entity === id);
	return i < 0 ? 99 : i;
}

function shortName(id) {
	const p = players().find(q => q.entity === id);
	const st = stateOf(id);
	const n = (p && p.name) || (st && st.name) || id.replace(/^media_player\./, "");
	return n.replace(/^Sonos\s*-?\s*/i, "") || n;
}

// every distinct group of the chosen speakers: { leader, members }
function groups() {
	const seen = {}, out = [];
	players().forEach(p => {
		const st = stateOf(p.entity);
		const gm = st && Array.isArray(st.attributes.group_members) && st.attributes.group_members.length
			? st.attributes.group_members : [p.entity];
		const key = gm.slice().sort().join(",");
		if (seen[key]) return;
		seen[key] = true;
		out.push({ leader: gm[0], members: gm.slice().sort((a, b) => order(a) - order(b)) });
	});
	return out;
}

// the group on the card: the picked one, else the first that plays, else the first
function currentGroup() {
	const gs = groups();
	if (!gs.length) return null;
	const pick = gs.find(g => g.members.indexOf(selected) >= 0);
	if (pick) return pick;
	const playing = gs.find(g => {
		const st = stateOf(g.leader);
		return st && st.state === "playing";
	});
	return playing || gs[0];
}

function groupName(g) {
	return g.members.map(shortName).join(" + ");
}

function clip(s, n) {
	s = String(s || "");
	return s.length > n ? s.slice(0, Math.max(1, n - 1)) + "…" : s;
}

// some radio stations send everything in capitals: show those as "Chris Brown - Yeah 3x"
function tidy(s) {
	if (!s || s !== s.toUpperCase() || s === s.toLowerCase()) return s;
	return s.toLowerCase().replace(/(^|[\s(\-\/\"'])([a-z])/g, (m, p, c) => p + c.toUpperCase());
}

function title(st) {
	const a = st ? st.attributes : null;
	if (!a) return "";
	const t = a.media_title || a.media_channel || "";
	return tidy(a.media_artist && a.media_title ? a.media_artist + " - " + t : t);
}

const STATE_NL = {
	playing: "Speelt", paused: "Gepauzeerd", idle: "Stil", off: "Uit",
	standby: "Standby", buffering: "Laden", unavailable: "Niet bereikbaar", unknown: "Onbekend"
};

function stateText(st) {
	return STATE_NL[st ? st.state : "unknown"] || (st ? st.state : "");
}

function volumeOf(id) {
	const st = stateOf(id);
	return st && typeof st.attributes.volume_level === "number" ? st.attributes.volume_level : null;
}

function groupVolume(g) {
	const v = g.members.map(volumeOf).filter(x => x !== null);
	return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}

async function call(service, entity, extra) {
	try {
		await retoon.call("media_player." + service, Object.assign({ entity_id: entity }, extra || {}));
		error = "";
	} catch (e) {
		error = "Mislukt: " + (e && e.message ? e.message : e);
		retoon.log(error);
	}
	retoon.update();
}

// volume of every speaker in the group, one step up or down
async function changeVolume(g, dir) {
	const step = (+S().step || 5) / 100;
	for (const m of g.members) {
		const v = volumeOf(m);
		const next = Math.min(1, Math.max(0, +((v === null ? 0.3 : v) + dir * step).toFixed(2)));
		await call("volume_set", m, { volume_level: next });
	}
}

// add a speaker to the group, or take it out (a group keeps at least one speaker)
function toggleMember(g, m) {
	if (g.members.indexOf(m) >= 0) {
		if (g.members.length < 2) return;
		const rest = g.members.find(x => x !== m);
		if (g.members.indexOf(selected) < 0 || selected === m) selected = rest;
		call("unjoin", m);
	} else {
		selected = g.leader;
		call("join", g.leader, { group_members: [m] });
	}
}

// a button with an icon, drawn as a box that can be tapped
function iconButton(el, icon, opts, fn) {
	const b = el.box(Object.assign({ w: 64, h: 48, bg: BTN, radius: 8 }, opts));
	b.icon(icon, { align: "center", size: "mid", color: "text" });
	b.onClick(fn);
	return b;
}

// volume -, play/pause, volume +
function controls(el, g, x, y, w, real) {
	const st = stateOf(g.leader);
	const playing = st && st.state === "playing";
	const gap = 8, n = 3;
	const bw = Math.floor((w - gap * (n - 1)) / n);
	const at = i => x + i * (bw + gap);
	if (real) {
		const btn = (icon, i, fn) => el.button("", { x: at(i), y: y, w: bw }, fn).icon(icon, { align: "center", size: "mid", color: "text" });
		btn("mdi:volume-minus", 0, () => changeVolume(g, -1));
		btn(playing ? "mdi:pause" : "mdi:play", 1, () => call("media_play_pause", g.leader));
		btn("mdi:volume-plus", 2, () => changeVolume(g, 1));
		return;
	}
	iconButton(el, "mdi:volume-minus", { x: at(0), y: y, w: bw }, () => changeVolume(g, -1));
	iconButton(el, playing ? "mdi:pause" : "mdi:play", { x: at(1), y: y, w: bw, bg: "accent" },
		() => call("media_play_pause", g.leader));
	iconButton(el, "mdi:volume-plus", { x: at(2), y: y, w: bw }, () => changeVolume(g, 1));
}

function drawTile(el) {
	if (!players().length) {
		el.text("Kies je Sonos-spelers onder Apps in de webinterface", { align: "center", color: "muted" });
		return;
	}
	const g = currentGroup();
	const st = stateOf(g.leader);
	const max = Math.floor(el.width / 10) - 4;
	el.icon(g.members.length > 1 ? "mdi:speaker-multiple" : "mdi:speaker",
		{ x: 0, y: 0, size: "mid", color: st && st.state === "playing" ? "accent" : "muted" });
	el.text(clip(groupName(g), max), { x: 46, y: 6, color: "muted" });
	el.text(error ? clip(error, max) : clip(title(st) || stateText(st), Math.floor(el.width / 13)),
		{ x: 0, y: 40, color: error ? "bad" : "text" });
	controls(el, g, 0, el.height - 48, el.width, true);
}

function drawScreen(root) {
	// the same look as the card: everything on a card, with lighter buttons
	const W = root.width - 24, H = root.height - 24;
	const el = root.box({ x: 0, y: 0, w: root.width, h: root.height, bg: "card", radius: 12 }).box({ x: 12, y: 12, w: W, h: H });
	const list = players();
	if (!list.length) {
		el.text("Kies je Sonos-spelers onder Apps in de webinterface", { align: "center", color: "muted" });
		return;
	}
	const gs = groups();
	const cur = currentGroup();
	const st = stateOf(cur.leader);
	const listW = 300;

	// left: all groups
	gs.forEach((g, i) => {
		const s = stateOf(g.leader);
		const isCur = g.leader === cur.leader;
		const row = el.box({ x: 0, y: i * 72, w: listW, h: 64, bg: isCur ? "accent" : BTN, radius: 8 });
		row.icon(g.members.length > 1 ? "mdi:speaker-multiple" : (s && s.state === "playing" ? "mdi:volume-high" : "mdi:speaker"),
			{ x: 12, y: 16, size: "mid", color: isCur ? "background" : "text" });
		row.text(clip(groupName(g), 18), { x: 56, y: 8, color: isCur ? "background" : "text" });
		row.text(stateText(s), { x: 56, y: 34, font: "small", color: isCur ? "background" : "muted" });
		row.onClick(() => { selected = g.leader; retoon.update(); });
	});

	// right: the picked group
	const x0 = listW + 24, w = W - x0;
	el.text(clip(groupName(cur), 40), { x: x0, y: 0, font: "head" });
	el.text(clip(title(st) || stateText(st), Math.floor(w / 12)), { x: x0, y: 28, color: "muted" });
	controls(el, cur, x0, 60, w);

	// volume bar (average of the group)
	const vol = groupVolume(cur);
	el.text("Volume " + Math.round(vol * 100) + "%", { x: x0, y: 116, font: "small", color: "muted" });
	el.box({ x: x0, y: 140, w: w, h: 10, bg: BTN, radius: 5 });
	el.box({ x: x0, y: 140, w: Math.max(10, Math.round(w * vol)), h: 10, bg: "accent", radius: 5 });

	// build the group: tap a speaker to add it or take it out
	el.text("Groep samenstellen", { x: x0, y: 160, font: "small", color: "muted" });
	const cols = 3, gw = Math.floor((w - 8 * (cols - 1)) / cols);
	list.forEach((p, i) => {
		const inGroup = cur.members.indexOf(p.entity) >= 0;
		const b = el.box({ x: x0 + (i % cols) * (gw + 8), y: 182 + Math.floor(i / cols) * 50, w: gw, h: 44,
			bg: inGroup ? "accent" : BTN, radius: 8 });
		b.text(clip(shortName(p.entity), Math.floor(gw / 10) - 1),
			{ align: "center", color: inGroup ? "background" : "text" });
		b.onClick(() => toggleMember(cur, p.entity));
	});

	// content: the sources / favourites of the group
	const gridBottom = 182 + Math.ceil(list.length / cols) * 50;
	const src = (st && st.attributes.source_list) || [];
	const activeSrc = st && st.attributes.source;
	if (src.length) el.text("Content", { x: x0, y: gridBottom + 2, font: "small", color: "muted" });
	const bw = Math.floor((w - 8) / 2);
	src.slice(0, 6).forEach((name, i) => {
		const b = el.box({ x: x0 + (i % 2) * (bw + 8), y: gridBottom + 24 + Math.floor(i / 2) * 50, w: bw, h: 44,
			bg: name === activeSrc ? "accent" : BTN, radius: 8 });
		b.text(clip(name, Math.floor(bw / 10) - 1),
			{ align: "center", color: name === activeSrc ? "background" : "text" });
		b.onClick(() => call("select_source", cur.leader, { source: name }));
	});
	if (error) el.text(clip(error, 60), { x: 0, y: H - 30, color: "bad" });
}

// watch the chosen speakers and everyone who is in a group with them
function follow() {
	const set = {};
	players().forEach(p => {
		set[p.entity] = true;
		const st = stateOf(p.entity);
		if (st && Array.isArray(st.attributes.group_members)) st.attributes.group_members.forEach(m => { set[m] = true; });
	});
	const list = Object.keys(set).sort();
	const key = list.join(",");
	if (key === watched) return;
	watched = key;
	retoon.watch(list, onChange);
}

function onChange() {
	follow();
	retoon.update();
}

retoon.tile(drawTile);
retoon.screen(drawScreen);
retoon.onSettings(() => { error = ""; watched = ""; follow(); retoon.update(); });
follow();
