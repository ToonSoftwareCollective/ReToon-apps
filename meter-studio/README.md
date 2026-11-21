# Meter Studio

One configurable meter app for electricity, gas, solar production, water,
temperature, humidity, VOC, air quality and other numerical sensors.
Requires ReToon 1.66 or later (app API 12).

## Changes in 1.3.8

- Semicircular gauges use native LVGL arcs through `el.arc` (API 12).
  Each colour band is one arc. The existing layout, thickness, colours,
  pointer and square colour transitions are preserved, with rounded outer ends.
- Removes the generated ribbon paths and their cache.
- Simplifies the default power scale calculation.

## Changes in 1.3.7

- Choose a custom MDI icon per card using the new icon text field, e.g.
  `mdi:blur` or `blur`. Leave it blank to use the meter's default icon.
- The default VOC icon is now `mdi:blur`.
- Retains the typography, humidity rounding and semicircular gauges of 1.3.6.

## Changes in 1.3.6

- Consistent 22 px value typography across standard dashboard tiles, including
  the semicircle, stepped indicator, bar and icon styles. Values that do not
  fit automatically use a smaller size; full-screen views retain larger text.
- Includes the smooth gauge rendering introduced in 1.3.5.
- Humidity percentages are displayed as whole numbers. Other percentages
  (including VOC) keep their existing precision.

## Changes in 1.3.5

- Uses the same smooth, filled ribbon geometry for every semicircular gauge,
  including the single-colour temperature and indoor-climate gauges.
- Rounded ends on the background track and the coloured progress segment.
- Retains the optimised three-colour gauge from 1.3.4, the pointer, and all
  existing per-card settings. No configuration migration is required.

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
`recorder.get_statistics`, available from **Home Assistant Core 2025.6**,
and needs an administrator connection and a counter with long-term statistics.
On older Home Assistant versions, history mode reports that history is
unavailable.

References: [2025.6 recorder services](https://github.com/home-assistant/core/blob/2025.6.0/homeassistant/components/recorder/services.py)
and [action documentation](https://www.home-assistant.io/actions/recorder.get_statistics/).
Other display modes only read entity states.

Meter Studio 1.3.8 has not yet been tested on physical Toon 1 hardware.
