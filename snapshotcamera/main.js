// Snapshot URLs come from watched Home Assistant camera attributes.
// Camera access tokens remain in memory; never log or persist picture URLs.
const S = () => retoon.settings;
let selected = 0;

function cameras() {
    return S().twoCameras ? [S().camera1, S().camera2] : [S().camera1];
}

function pictureUrl(state) {
    const picture = state && state.attributes && state.attributes.entity_picture;
    if (typeof picture !== "string" || !picture) return "";
    const base = String(S().haUrl || "").trim().replace(/\/+$/, "");
    // Only use pictures hosted by the configured HA server.
    if (!/^https?:\/\//i.test(base)) return "";
    if (picture[0] === "/" && picture[1] !== "/") return base + picture;
    if (picture.indexOf(base + "/") === 0) return picture;
    return "";
}

function panel(el, id, index, x, width, height, large) {
    const state = id ? retoon.state(id) : null;
    const box = el.box({ x, y: 0, w: width, h: height, bg: "#000000", border: 0, radius: 0 });
    const customName = String(S()["name" + (index + 1)] || "").trim();
    const name = customName || state && state.name || (id ? "Camera " + (index + 1) : "Camera instellen");
    box.icon("mdi:video", { x: 12, y: 10, size: "small", color: "accent" });
    box.text(name, { x: 46, y: 13, w: Math.max(0, width - 58), font: "head" });
    const imageHeight = Math.max(1, height - 86);
    const imageBox = box.box({ x: 8, y: 52, w: width - 16, h: imageHeight, bg: "#000000", border: 0, radius: 0 });
    const url = pictureUrl(state);
    if (url && state.state !== "unavailable") {
        imageBox.image({ url, w: Math.max(1, Math.min(width - 16, 640)), h: imageHeight,
            align: "center", radius: 0, every: Math.max(2, Math.min(300, Number(S().every) || 5)) });
    } else {
        imageBox.text(!id ? "Kies een camera onder Apps" : !state ? "Camera laden…" :
            state.state === "unavailable" ? "Camera niet beschikbaar" : "Controleer HA-adres en camerabeeld",
            { align: "center", w: Math.max(1, width - 40), textAlign: "center", color: "muted", font: "small" });
    }
    box.text("Snapshot · " + Math.max(2, Math.min(300, Number(S().every) || 5)) + " s", {
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
    retoon.watch(cameras().filter(id => typeof id === "string" && id.indexOf("camera.") === 0), () => retoon.update());
    retoon.update();
}
retoon.tile(el => draw(el, false));
retoon.screen(el => draw(el, true));
retoon.onSettings(follow);
follow();
