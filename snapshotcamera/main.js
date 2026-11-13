// API 8 resolves cameras through the system Home Assistant connection.
// This app never reads picture URLs, HA addresses or camera access tokens.
const S = () => retoon.settings;
let selected = 0;

function cameras() {
    return S().twoCameras ? [S().camera1, S().camera2] : [S().camera1];
}

function validCamera(id) {
    return typeof id === "string" && /^camera\.[a-z0-9_]+$/.test(id);
}

function bounded(value, fallback, low, high) {
    const number = Number(value);
    return Math.max(low, Math.min(high, Number.isFinite(number) ? number : fallback));
}

function interval() {
    return bounded(S().every, 5, 2, 300);
}

function frameRate() {
    return Math.round(bounded(S().fps, 5, 1, 10));
}

function panel(el, id, index, x, width, height, large) {
    const streaming = large && Boolean(S().stream);
    const valid = validCamera(id);
    const state = valid ? retoon.state(id) : null;
    const box = el.box({ x, y: 0, w: width, h: height, bg: "#000000", border: 0, radius: 0 });
    const customName = String(S()["name" + (index + 1)] || "").trim();
    const name = customName || state && state.name || (id ? "Camera " + (index + 1) : "Camera instellen");
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
            image.fps = frameRate();
        } else {
            image.every = interval();
        }
        imageBox.image(image);
    } else {
        imageBox.text(!valid ? "Kies een camera-entiteit onder Apps" : "Camera niet beschikbaar",
            { align: "center", w: Math.max(1, width - 40), textAlign: "center", color: "muted", font: "small" });
    }
    box.text(streaming ? "MJPEG · max. " + frameRate() + " fps" : "Snapshot · " + interval() + " s", {
        x: 12, y: height - 26, font: "small", color: "muted" });
    if (!large) box.onClick(() => {
        // Let the click bubble to ReToon's card, which opens the full screen.
        // Do not redraw here: the selected screen is drawn by that card click.
        selected = index;
    });
}

function draw(el, full) {
    // Include the card's own background/padding and the gap between panels.
    el.set({ bg: "#000000", border: 0, radius: 0 });
    const ids = cameras();
    const focus = selected >= 0 && selected < ids.length ? selected : 0;
    const shown = full ? [focus] : ids.map((_, index) => index);
    const gap = 12;
    const width = (el.width - gap * (shown.length - 1)) / shown.length;
    shown.forEach((index, column) => panel(el, ids[index], index, column * (width + gap),
        width, Math.max(100, el.height), full));
}

function follow() {
    selected = 0;
    retoon.watch([...new Set(cameras().filter(validCamera))], () => retoon.update());
    retoon.update();
}
retoon.tile(el => draw(el, false));
retoon.screen(el => draw(el, true));
retoon.onSettings(follow);
follow();
