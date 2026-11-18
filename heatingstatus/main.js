const heating = "toon.heating_active";
const hotWater = "toon.hot_water_active";
const heatRequest = "toon.heat_request";

const statuses = {
  heating: { label: "Verwarmt", icon: "mdi:radiator", color: "warn", colorKey: "heatingIconColor" },
  hotWater: { label: "Tapwater actief", icon: "mdi:water-boiler", color: "text", colorKey: "hotWaterIconColor" },
  heatRequest: { label: "Warmtevraag", icon: "mdi:radiator", color: "text", colorKey: "heatRequestIconColor" },
  idle: { label: "Verwarming in rust", icon: "mdi:radiator-off", color: "muted", colorKey: "idleIconColor" },
  unknown: { label: "Status onbekend", icon: "mdi:help-circle-outline", color: "muted", colorKey: "unknownIconColor" }
};

function readSwitch(id) {
  const state = retoon.state(id)?.state;
  if (state === "on" || state === "1") return true;
  if (state === "off" || state === "0") return false;
  return null;
}

function status() {
  const heatingActive = readSwitch(heating);
  if (heatingActive === true) return statuses.heating;
  if (readSwitch(hotWater) === true) return statuses.hotWater;
  if (readSwitch(heatRequest) === true) return statuses.heatRequest;
  if (heatingActive === false) return statuses.idle;
  return statuses.unknown;
}

retoon.tile((el, card) => {
  const { label, icon, color, colorKey } = status();
  const settings = card?.settings;
  const iconColor = settings?.[colorKey] || color;

  if (settings?.blackBackground) el.set({ bg: "#000000", border: 0 });
  if (settings?.iconOnly) {
    const available = Math.min(el.width, el.height);
    const size = available >= 48 ? "big" : available >= 32 ? "mid" : "small";
    el.icon(icon, { align: "center", size, color: iconColor });
    return;
  }

  el.icon(icon, { align: "left-mid", size: "mid", color: iconColor });
  el.text(label, { align: "left-mid", x: 44, font: "head", color: "text" });
});

retoon.watch([heating, hotWater, heatRequest], () => retoon.update());
