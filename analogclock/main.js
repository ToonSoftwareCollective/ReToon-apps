// Overlapping circles form hands using the documented set({ x, y }) options.
const themes = new Set(["text", "muted", "accent", "ok", "warn", "bad", "card", "background"]);
const palette = { wit: "#ffffff", grijs: "#999999", donkerblauw: "#183b73", rood: "#e53935", donkergroen: "#176b3a" };
let faces = [];
let redrawPending = false;

function color(value, fallback) {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  return Object.prototype.hasOwnProperty.call(palette, v) ? palette[v] : (/^#[0-9a-f]{6}$/.test(v) || themes.has(v) ? v : fallback);
}

function point(cx, cy, distance, turns) {
  const angle = turns * Math.PI * 2 - Math.PI / 2;
  return { x: cx + Math.cos(angle) * distance, y: cy + Math.sin(angle) * distance };
}

function hand(el, face, length, thickness, tint) {
  const count = Math.ceil(length / thickness * 1.5) + 1;
  const dots = [];
  for (let i = 0; i < count; i++) {
    dots.push(el.circle({ x: face.cx, y: face.cy, r: thickness / 2, bg: tint, border: 0 }));
  }
  return { dots, length };
}

function moveHand(face, hand, turns) {
  hand.dots.forEach((dot, i) => {
    dot.set(point(face.cx, face.cy, hand.length * i / (hand.dots.length - 1), turns));
  });
}

function tick() {
  if (redrawPending) return;
  const now = new Date();
  const minutes = now.getMinutes() + now.getSeconds() / 60;
  const hours = now.getHours() % 12 + minutes / 60;
  faces.forEach(face => {
    moveHand(face, face.hour, hours / 12);
    moveHand(face, face.minute, minutes / 60);
  });
}

function draw(el) {
  // update() redraws all cards; collect each card in the same drawing batch.
  if (!redrawPending) {
    faces = [];
    redrawPending = true;
    setTimeout(() => { redrawPending = false; tick(); }, 0);
  }
  const settings = retoon.settings || {};
  const background = settings.blackBackground === false ? "card" : "#000000";
  el.set({ bg: background, border: 0, radius: 0 });
  el.box({ x: 0, y: 0, w: el.width, h: el.height, bg: background, border: 0, radius: 0 });
  const size = Math.min(el.width, el.height);
  if (!(size > 0)) return;
  const r = size * 0.46;
  const face = { cx: el.width / 2, cy: el.height / 2 };
  const base = color(settings.color, "text");
  const hands = color(settings.handsColor, base);
  const hours = color(settings.hoursColor, base);
  const minutes = color(settings.minutesColor, base);
  el.circle({ x: face.cx, y: face.cy, r, bg: background, border: 1, borderColor: base });
  for (let i = 0; i < 60; i++) {
    const isHour = i % 5 === 0;
    const a = point(face.cx, face.cy, r * (isHour ? 0.8 : 0.94), i / 60);
    const b = point(face.cx, face.cy, r * 0.98, i / 60);
    el.line([a.x, a.y, b.x, b.y], { width: Math.max(1, r * (isHour ? 0.022 : 0.007)), color: isHour ? hours : minutes });
  }
  face.hour = hand(el, face, r * 0.5, r * 0.05, hands);
  face.minute = hand(el, face, r * 0.73, r * 0.032, hands);
  el.circle({ x: face.cx, y: face.cy, r: r * 0.045, bg: hands, border: 0 });
  faces.push(face);
}

retoon.tile(draw);
retoon.onSettings(() => { faces = []; retoon.update(); });
setInterval(tick, 1000);
