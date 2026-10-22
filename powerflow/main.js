// Power flow for ReToon: Home Assistant power entities in a circle around one
// middle point, with dots running along the lines; the more power, the
// faster. A positive value runs from the entity to the middle, a negative
// one from the middle to the entity. "Home" at the top is the sum of all.

const S = () => retoon.settings;
const COLORS = ["#ffb300", "#4da3ff", "#4caf50", "#ef5350", "#ab47bc", "#26c6da", "#ff7043", "#9ccc65"];
const HOME_COLOR = "#e9edf3";

let drawings = [];	// what is on screen now: tiles and the full screen

function sources() {
	const list = Array.isArray(S().sources) ? S().sources : [];
	return list.filter(s => s && typeof s.entity === "string" && s.entity.includes("."));
}

// the power of one entity in W, signed as the app uses it; null when unknown
function power(src) {
	const st = retoon.state(src.entity);
	if (!st || !isFinite(st.value)) return null;
	const unit = (st.unit || "W").trim();
	let w = st.value * (unit === "kW" ? 1000 : unit === "MW" ? 1e6 : unit === "mW" ? 0.001 : 1);
	return src.invert ? -w : w;
}

function guessIcon(src) {
	if (src.icon) return src.icon;
	const st = retoon.state(src.entity);
	const icon = st && st.attributes && st.attributes.icon;
	if (icon) return icon;
	const t = (src.entity + " " + (src.name || "") + " " + (st ? st.name : "")).toLowerCase();
	if (/solar|pv|zon|panel/.test(t)) return "mdi:solar-power";
	if (/batter|accu/.test(t)) return "mdi:battery-high";
	if (/grid|net|p1|meter|dsmr/.test(t)) return "mdi:transmission-tower";
	if (/car|auto|ev|charger|laad/.test(t)) return "mdi:car-electric";
	if (/heat ?pump|warmtepomp|heishamon/.test(t)) return "mdi:heat-pump";
	if (/wind/.test(t)) return "mdi:wind-turbine";
	return "mdi:flash";
}

function label(src) {
	if (src.name) return src.name;
	const st = retoon.state(src.entity);
	return st ? st.name : src.entity;
}

function fmt(w) {
	if (w === null) return "-";
	const a = Math.abs(w), sign = w < 0 ? "-" : "";
	if (a >= 10000) return sign + (a / 1000).toFixed(1) + " kW";
	if (a >= 1000) return sign + (a / 1000).toFixed(2) + " kW";
	return sign + Math.round(a) + " W";
}

// pixels a second for this much power: in step with the power, so a large
// flow is clearly faster than a small one
function speed(w) {
	if (w === null || Math.abs(w) < Math.max(0, +S().idle || 0)) return 0;
	const full = Math.max(100, +S().fullSpeed || 5000);
	return 8 + 112 * Math.min(1, Math.abs(w) / full);
}

// ---- drawing ---------------------------------------------------------------------

function draw(el) {
	const W = el.width, H = el.height, list = sources();
	const d = { nodes: [] };
	drawings.push(d);
	if (drawings.length > 4) drawings.shift();	// older ones are gone from the screen

	if (!list.length) {
		el.text("Power flow: add power entities in the web interface (Apps).",
			{ x: 0, y: 0, w: W, font: "small", color: "muted" });
		return;
	}
	const n = list.length + 1;			// with Home
	const labelH = 26;
	const nodeR = Math.max(24, Math.min(48, Math.min(W, H) * 0.11));
	const R = Math.max(nodeR * 2, Math.min(W / 2 - nodeR - 10, H / 2 - nodeR - labelH - 4));
	const cx = W / 2, cy = H / 2;
	const hubR = Math.max(5, nodeR * 0.18);
	const small = nodeR < 36;

	const items = [{ home: true, name: S().homeName || "Home", icon: "mdi:home", color: HOME_COLOR }]
		.concat(list.map((s, i) => ({ src: s, name: label(s), icon: guessIcon(s), color: COLORS[i % COLORS.length] })));
	// names and icons come from Home Assistant: draw again once it has told them
	d.early = list.some(s => !s.name && !retoon.state(s.entity));

	// lines and dots first, so the circles lie on top of them
	items.forEach((it, i) => {
		const a = -Math.PI / 2 + i * 2 * Math.PI / n;
		const ux = Math.cos(a), uy = Math.sin(a);
		it.x = cx + ux * R;
		it.y = cy + uy * R;
		// from the edge of the entity's circle to the edge of the middle point
		const x1 = it.x - ux * nodeR, y1 = it.y - uy * nodeR;
		const x2 = cx + ux * hubR, y2 = cy + uy * hubR;
		el.line([x1, y1, x2, y2], { color: it.color, width: 3, opacity: 0.35 });
		it.flow = el.flow({ x1, y1, x2, y2, color: it.color, size: small ? 8 : 10, gap: small ? 30 : 40, speed: 0 });
		it.top = uy < -0.2;
	});
	el.circle({ x: cx, y: cy, r: hubR, bg: "muted" });

	for (const it of items) {
		const c = el.circle({ x: it.x, y: it.y, r: nodeR, bg: "card", border: 3, borderColor: it.color });
		c.icon(it.icon, { size: small ? "small" : "mid", color: it.color });
		it.value = c.text("-", { font: small ? "small" : "body", textAlign: "center" });
		const ly = it.top ? it.y - nodeR - labelH : it.y + nodeR + 4;
		el.text(it.name, { x: it.x - 90, y: ly, w: 180, font: "small", color: "muted", textAlign: "center" });
		d.nodes.push(it);
	}
	refresh(d);
}

// new values into a drawing, without drawing it again (the dots keep moving)
function refresh(d) {
	let sum = 0, known = false;
	for (const it of d.nodes) {
		if (it.home) continue;
		const w = power(it.src);
		if (w !== null) { sum += w; known = true; }
		it.value.set({ text: fmt(w) });
		// positive: from the entity to the middle, the direction the line was drawn
		it.flow.set({ speed: w === null ? 0 : Math.sign(w) * speed(w) });
	}
	const home = d.nodes.find(it => it.home);
	if (home) {
		const w = known ? sum : null;
		home.value.set({ text: fmt(w) });
		// Home takes what is left in the middle: positive runs towards Home
		home.flow.set({ speed: w === null ? 0 : -Math.sign(w) * speed(w) });
	}
}

function watchAll() {
	retoon.watch(sources().map(s => s.entity), () => {
		if (drawings.some(d => d.early && sources().every(s => s.name || retoon.state(s.entity)))) {
			drawings = [];
			retoon.update();
			return;
		}
		drawings.forEach(refresh);
	});
}

retoon.tile((el) => draw(el));
retoon.screen((el) => draw(el));
retoon.onSettings(() => {
	drawings = [];
	watchAll();
	retoon.update();
});
watchAll();
