# Meter Studio

One configurable meter app for electricity, gas, solar production, water,
temperature, humidity, VOC, air quality and other numerical sensors.
Requires ReToon 1.50 or later (app API 10).

Add Meter Studio as an app card on a page. In the **card editor**, choose
the meter type and a Home Assistant (or compatible Toon) entity. Each card
has its own settings: period, style, title, range, unit, accent colour,
background and optional detail entities. No global entity configuration is
needed. The same app can be placed on several pages, including the dimmed
home page using the black background option.

## Display options

- Current power or flow: semicircular three-colour gauge with a pointer,
  stepped indicator, or filled bar.
- Daily or monthly consumption: choose a sensor that already reports the
  corresponding period; the gauge does not calculate usage from a lifetime
  counter.
- Daily history: uses Home Assistant recorder statistics from a compatible
  consumption counter, not an instantaneous power or flow sensor.
  Shows three completed days on the card and seven on the full screen.
- Indoor climate and other sensors: a single-colour gauge or large MDI
  icon. Text sensor states can also be displayed.
- Tap a meter to open a larger view with up to eight optional detail
  entities and their values. Configure these independently for each card.

Automatic units use the source unit. Compatible power, energy, volume and
flow units can also be converted. The range is a display scale, not an
alarm or health threshold. Missing values are displayed as unavailable
instead of zero.

The optional history mode calls the read-only Home Assistant service
`recorder.get_statistics` and needs a connection with sufficient permissions.
Other display modes only read entity states.
