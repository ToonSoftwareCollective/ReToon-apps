# Clock Studio

One configurable clock app by Nomzi Design for normal and dimmed ReToon pages. Each card has its own appearance and the full screen uses the settings of the tapped card.

## Installation

Requires **ReToon 1.50 or newer (API 10)**. After the contribution is merged and published, install **Clock Studio** once under Apps → Available in the ReToon web interface. Add an App card to a page and select Clock Studio. Edit that card to choose its own face, theme, colours, seconds, date and other options.

For a dimmed home page, add another card using the very same Clock Studio app. For example, select the minimal analog face, white theme, black background (`#000000`) and corner radius 0. ReToon controls brightness and page switching; the clock app does not change either.

### Upgrading from Clock Studio Duo 1.4.6

The separate `clock-studio-dim` app is no longer needed. Before removing it from your Toon, note its existing settings/profile. Add or edit a Clock Studio card on your dimmed page and copy those settings to its card editor. Do the same for your normal clock card if it previously used app-wide settings. Both cards can now be configured independently. Verify the replacement works before removing the old dim app. The existing global calendar entity remains under Apps.

## Settings

**Shared under Apps:** optional Home Assistant calendar entity, look-ahead window (1–60 days) and whether appointment titles are shown. The clock works without Home Assistant; the optional integration only reads events via `calendar.get_events`.

**Per card in the card editor:** face (`layout`), colour theme, individual colours, seconds, date, title, 12/24-hour time, scale, corner radius and optional advanced profile. Choose Standard for a colour to use the default/theme instead.

- Faces: `world`, `minimal`, `classic`, `square-small`, `square`, `digital`, `stacked`, `calendar`, and `auto`.
- Themes: `blauw`, `paars`, `wit`, `rood`, and `groen`.
- The digital clocks use classic chamfered seven-segment LED digits. The seconds setting blinks the colon in the horizontal digital face.
- The calendar combines an analog clock with the current month. An optional calendar entity adds event dots and, when space permits, upcoming appointments.

Small cards fall back to simpler faces; tapping opens a larger view with the same card's settings. The world-map face shows the local system time, not multiple time zones.

### Advanced customization

Download [Instellen.html](Instellen.html) and open it locally for advanced hand styles, colours, scale and world-map location. Paste the generated JSON into **Uitgebreid profiel** in the specific card's editor. The profile overrides that card's visual settings; clear it or remove the corresponding keys to use the dropdowns and colour pickers again. Calendar preferences are shared under Apps, not in the profile.

The map's example location is Amsterdam. Change `place`, `latitude` and `longitude` in the advanced profile to set the marker and label. No location lookup or external map request is made.

## Release 1.4.7

- Consolidated Clock Studio Duo into a single app using API 10's `cardSettings`. Appearance and full-screen settings are independent for every card; Home Assistant calendar settings are shared.
- Restored the classic chamfered LED digits with three retained elements per logical segment (84 for the four digits, plus two colon dots). Only changed segments are recoloured. Clock hands, text and the static world map continue to update without routine full redraws.
- Validation: JavaScript syntax and simulated drawing/tick tests covering 108 combinations of face, size, theme and seconds setting; additional tests cover simultaneous independent cards/full screen, editing one card, stale handles, month rollover and mocked calendar refreshes. Physical verification of this release on ReToon 1.50 / Toon 1 and Toon 2 is still required.

## Licence and attribution

GPL-2.0-or-later, following this repository's default licence. World-map coordinates are derived from Natural Earth (public domain): https://www.naturalearthdata.com/about/terms-of-use/.

## Screenshots

Earlier Clock Studio 1.4.4 examples from the live ReToon web interface (the settings editor shown predates API 10).

![Calendar on Toon 2](screenshots/calendar-toon2.png)

![Original settings](screenshots/settings.png)
