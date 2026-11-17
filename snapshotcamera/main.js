// API 8 resolves cameras through the system Home Assistant connection.
// This app never reads picture URLs, HA addresses or camera access tokens.
const DEFAULTS = { camera1: "", camera2: "", name1: "", name2: "", twoCameras: true,
    every: 5, stream: false, fps: 5 };
const KEYS = Object.keys(DEFAULTS);
let selected = null;
const contexts = new Map();
let watchTimer = null;
let watchKey = "[]";

function settingsFor(card) {
    // Read only our public fields, never legacy URLs or unrelated settings.
    const source = card && card.settings && card.settings.useCardSettings === true
        ? card.settings : retoon.settings;
    const settings = {};
    KEYS.forEach(key => { settings[key] = source && source[key] !== undefined ? source[key] : DEFAULTS[key]; });
    return settings;
}

function settingsKey(settings) {
    return JSON.stringify(KEYS.map(key => settings[key]));
}

function cameras(settings) {
    return settings.twoCameras ? [settings.camera1, settings.camera2] : [settings.camera1];
}

function validCamera(id) {
    return typeof id === "string" && /^camera\.[a-z0-9_]+$/.test(id);
}

function bounded(value, fallback, low, high) {
    const number = Number(value);
    return Math.max(low, Math.min(high, Number.isFinite(number) ? number : fallback));
}

function interval(settings) {
    return bounded(settings.every, 5, 2, 300);
}

function frameRate(settings) {
    return Math.round(bounded(settings.fps, 5, 1, 10));
}

function cameraName(settings, id, index, state) {
    const customName = String(settings["name" + (index + 1)] || "").trim();
    return customName || state && state.name || (id ? "Camera " + (index + 1) : "Camera instellen");
}

function displayState(settings) {
    return JSON.stringify(cameras(settings).map((id, index) => {
        const state = validCamera(id) ? retoon.state(id) : null;
        return [cameraName(settings, id, index, state), Boolean(state && state.state === "unavailable")];
    }));
}

function cameraChanged() {
    // Native images manage frames and authentication independently of redraws.
    // Ignore token/attribute changes that do not affect our labels or visibility.
    let changed = false;
    contexts.forEach(context => {
        const next = displayState(context.settings);
        if (next !== context.display) {
            context.display = next;
            changed = true;
        }
    });
    if (changed) retoon.update();
}

function followCameras() {
    watchTimer = null;
    const ids = new Set();
    contexts.forEach(context => cameras(context.settings).filter(validCamera).forEach(id => ids.add(id)));
    const list = [...ids].sort();
    const key = JSON.stringify(list);
    if (key !== watchKey) {
        watchKey = key;
        retoon.watch(list, cameraChanged);
    }
}

function remember(settings) {
    const key = settingsKey(settings);
    if (!contexts.has(key)) {
        contexts.set(key, { settings, display: displayState(settings) });
        // Subscribe after drawing; one card must not replace another's watch list.
        if (watchTimer === null) watchTimer = setTimeout(followCameras, 0);
    }
}

function panel(el, settings, id, index, x, width, height, large) {
    const streaming = large && Boolean(settings.stream);
    const valid = validCamera(id);
    const state = valid ? retoon.state(id) : null;
    const box = el.box({ x, y: 0, w: width, h: height, bg: "#000000", border: 0, radius: 0 });
    const name = cameraName(settings, id, index, state);
    box.icon("mdi:video", { x: 12, y: 10, size: "small", color: "accent" });
    box.text(name, { x: 46, y: 13, w: Math.max(0, width - 58), font: "head" });
    const imageHeight = Math.max(1, height - 86);
    const imageBox = box.box({ x: 8, y: 52, w: width - 16, h: imageHeight, bg: "#000000", border: 0, radius: 0 });
    if (valid && (!state || state.state !== "unavailable")) {
        // ReToon owns authentication, reconnects and visible-image lifecycle.
        const image = { camera: id, w: Math.max(1, Math.min(width - 16, 640)),
            h: streaming ? Math.min(imageHeight, 360) : imageHeight, align: "center", radius: 0 };
        if (streaming) {
            image.stream = true;
            image.fps = frameRate(settings);
        } else {
            image.every = interval(settings);
        }
        imageBox.image(image);
    } else {
        imageBox.text(!valid ? "Kies een camera-entiteit onder Apps" : "Camera niet beschikbaar",
            { align: "center", w: Math.max(1, width - 40), textAlign: "center", color: "muted", font: "small" });
    }
    box.text(streaming ? "MJPEG · max. " + frameRate(settings) + " fps" : "Snapshot · " + interval(settings) + " s", {
        x: 12, y: height - 26, font: "small", color: "muted" });
    if (!large) box.onClick(() => {
        // Let the click bubble to ReToon's card, which opens the full screen.
        // Do not redraw here: the selected screen is drawn by that card click.
        selected = { key: settingsKey(settings), index };
    });
}

function draw(el, full, card) {
    // Include the card's own background/padding and the gap between panels.
    el.set({ bg: "#000000", border: 0, radius: 0 });
    const settings = settingsFor(card);
    remember(settings);
    const ids = cameras(settings);
    const focus = selected && selected.key === settingsKey(settings) && selected.index < ids.length
        ? selected.index : 0;
    const shown = full ? [focus] : ids.map((_, index) => index);
    const gap = 12;
    const width = (el.width - gap * (shown.length - 1)) / shown.length;
    shown.forEach((index, column) => panel(el, settings, ids[index], index, column * (width + gap),
        width, Math.max(100, el.height), full));
}

function follow() {
    selected = null;
    contexts.clear();
    if (watchTimer !== null) clearTimeout(watchTimer);
    watchTimer = null;
    watchKey = "[]";
    retoon.watch([], cameraChanged);
    retoon.update();
}
retoon.tile((el, card) => draw(el, false, card));
retoon.screen((el, card) => draw(el, true, card));
retoon.onSettings(follow);
follow();
