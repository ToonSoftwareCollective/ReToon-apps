// Local ReToon thermostat presets and their Dutch labels.
const presets = [["away", "Weg"], ["home", "Thuis"], ["sleep", "Slapen"], ["comfort", "Comfort"]];
let thermostat = null;
let commandError = "";

retoon.subscribe("retoon/boiler", (_, payload) => {
  try {
    const message = JSON.parse(payload);
    thermostat = message && typeof message === "object" && !Array.isArray(message) ? message : null;
    commandError = "";
  } catch {
    thermostat = null;
  }
  retoon.update();
});

const formatTemperature = value => Number.isFinite(value)
  ? value.toFixed(1).replace(".", ",") + "°" : "–";

function isOnline() {
  return Number.isFinite(thermostat?.time) && Date.now() / 1000 - thermostat.time <= 90;
}

function sendCommand(command) {
  if (!isOnline() || thermostat.hvac === "off") return;
  if (!retoon.publish("retoon/boiler/set", command)) {
    commandError = "Opdracht niet verzonden";
    retoon.update();
  }
}

function draw(el) {
  const w = el.width;
  if (w < 235 || el.height < 293) {
    el.text("Vergroot de kaart naar 4 × 5", {align: "center", font: "body"});
    return;
  }
  const online = isOnline();
  const heatingEnabled = online && thermostat.hvac !== "off";
  const heating = heatingEnabled && thermostat.heat === 1;
  const canAdjustTarget = heatingEnabled && Number.isFinite(thermostat.target);
  const status = commandError || (!online ? "Thermostaat niet bereikbaar" :
    !heatingEnabled ? "Verwarming uit" : heating ? "Verwarmt" : "Stand-by");
  const activePreset = online && presets.find(([id]) => id === thermostat.preset);
  const presetLabel = !online ? "" : !heatingEnabled ? "Uit" : activePreset?.[1] || "Handmatig";
  const statusColor = commandError || !online ? "bad" : heating ? "warn" : "muted";
  const centered = {w, textAlign: "center"};
  const spareHeight = Math.max(0, Math.floor(el.height - 293));
  const extraButtonHeight = Math.min(8, Math.floor(spareHeight / 3));
  const extraSpacing = Math.min(24, spareHeight - 3 * extraButtonHeight);
  el.text(status, {...centered, y: 0, font: "body", color: statusColor});
  el.text(online ? formatTemperature(thermostat.room) : "–", {...centered, y: 24, font: w >= 270 ? "big" : "mid"});
  const targetY = 101 + extraSpacing;
  const targetLeft = Math.floor((w - 148) / 2);
  el.text("Doel " + (online ? formatTemperature(thermostat.target) : "–"),
    {x: targetLeft, y: targetY, w: 108, textAlign: "right", font: "head"});
  el.icon("mdi:fire", {x: targetLeft + 116, y: targetY - 5, size: "mid",
    color: heating ? "#ff9d36" : "#505963"});
  if (presetLabel) el.text("Stand  ·  " + presetLabel, {...centered, y: 126 + extraSpacing, font: "small", color: heatingEnabled ? "accent" : "muted"});

  function drawButton(label, x, y, width, active, action) {
    const button = el.box({x, y, w: width, h: 43 + extraButtonHeight, radius: 8, bg: active ? "#193550" : "#29333d"});
    button.text(label, {align: "center", font: "head", color: active ? "#a6d7ff" : action ? "text" : "muted"});
    if (action) button.onClick(action);
  }
  const halfWidth = Math.floor((w - 8) / 2);
  function adjustTarget(step) {
    if (!Number.isFinite(thermostat?.target)) return;
    const target = Math.max(6, Math.min(30, Math.round(thermostat.target * 2 + step) / 2));
    if (target !== thermostat.target) sendCommand("target " + target.toFixed(1));
  }
  drawButton("−", 0, 148 + extraSpacing, halfWidth, false, canAdjustTarget ? () => adjustTarget(-1) : null);
  drawButton("+", halfWidth + 8, 148 + extraSpacing, halfWidth, false, canAdjustTarget ? () => adjustTarget(1) : null);
  presets.forEach(([id, label], i) => {
    drawButton(label, (i % 2) * (halfWidth + 8), 202 + extraSpacing + extraButtonHeight + Math.floor(i / 2) * (48 + extraButtonHeight), halfWidth,
      heatingEnabled && thermostat.preset === id, heatingEnabled ? () => sendCommand("preset " + id) : null);
  });
}
retoon.tile(draw);
setInterval(() => retoon.update(), 30000);
