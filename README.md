# ReToon apps

Apps for [ReToon](https://github.com/ToonSoftwareCollective/ReToon), the open
system for the Toon. An app is a small JavaScript program that draws its own
card on a page of the Toon's screen, and optionally a full screen that opens
when the card is tapped.

| App | What it does |
|---|---|
| [spotenergy](spotenergy) | Dynamic electricity prices for the Netherlands, with taxes, as a card and a full-screen graph |
| [powerflow](powerflow) | Where the power in your home comes from and goes to, with moving dots |

## Installing an app

In the Toon's web interface, open **Apps**. Under **Available**, press
**Install**. The app's settings then appear under the installed apps, and
an **Update** button appears when a newer version is published.

To show the app, add an **App** card to a page.

## Writing an app

Apps run inside the screen program (QuickJS). Each app has its own
JavaScript runtime with 24 MB of memory and at most 2 s per call. An app
cannot reach files or start processes; it only has what is listed below.

### The folder

```
myapp/
  manifest.json
  main.js
```

`manifest.json`:

```json
{
	"id": "myapp",
	"name": "My app",
	"version": "1.0.0",
	"api": 2,
	"main": "main.js",
	"description": "Shown in the web interface, above the settings.",
	"author": "You",
	"tile": { "height": 150 },
	"settings": [
		{ "key": "entity", "label": "Temperature sensor", "type": "entity", "units": ["°C"] },
		{ "key": "title", "label": "Title", "type": "text", "default": "Outside" },
		{ "key": "warn", "label": "Warn above (°C)", "type": "number", "default": 25 },
		{ "key": "big", "label": "Big numbers", "type": "bool", "default": true }
	]
}
```

- `id` must match the folder name.
- `api` is the level of the interface the app needs. 1 is the basics. 2 adds
  `retoon.watch`, `retoon.state`, `el.icon`, `el.circle`, `el.line`, `el.flow`
  and `el.set`. A ReToon that is too old shows "needs a newer ReToon" on the
  card instead of starting the app.
- `tile.height` is the card's height in pixels (60–520). A page can override
  it with `"height"` on the card.
- Setting types:
  - `text`, `secret` (shown as a password field), `number`, `bool`.
  - `entity`: one entity, picked from Home Assistant.
  - `entities`: a list of entities with extra `fields` per row (`text`,
    `number`, `bool`). It also takes `max` and `addLabel`.
  - `units` limits the entity picker to entities in those units.

### The code

`main.js`, a card showing one temperature:

```js
const S = () => retoon.settings;

function draw(el) {
	const st = retoon.state(S().entity);
	const v = st ? st.value : NaN;
	el.text(S().title, { x: 0, y: 0, color: "muted" });
	el.text(isFinite(v) ? v.toFixed(1) + " °C" : "-", {
		align: "center", font: S().big ? "big" : "mid",
		color: v > S().warn ? "bad" : "text" });
}

function follow() {
	retoon.watch([S().entity], () => retoon.update());
}

retoon.tile(draw);
retoon.onSettings(() => { follow(); retoon.update(); });
follow();
```

What an app can use:

| | |
|---|---|
| `retoon.settings` | The manifest's defaults, with what was saved in the web interface on top |
| `retoon.tile(fn)` | `fn(el, card)` draws the card |
| `retoon.screen(fn)` | `fn(el)` draws the full screen; a tap on the card opens it |
| `retoon.update()` | Draw the card(s) and the open screen again |
| `retoon.onSettings(fn)` | Called after the settings were changed |
| `retoon.watch(ids, fn)` | Keep these entities up to date (Home Assistant, `mqtt.*`, `toon.*`); `fn(id)` is called on a change. A new call replaces the list |
| `retoon.state(id)` | `{ state, value, unit, name, attributes }` or `null`; `value` is the state as a number (`NaN` if it is not one) |
| `retoon.fetch(url, { method, headers, body, timeout })` | A Promise of `{ status, text }` (http and https) |
| `retoon.app` | `{ id, name, version }` |
| `retoon.log()`, `console.log()` | Print to the screen program's output |
| `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval` | As in a browser |

Drawing on `el`. Every element is itself an `el`, so you can draw inside a box:

| | |
|---|---|
| `el.box(opts)` | A rectangle |
| `el.text(string, opts)` | Text |
| `el.button(label, opts, fn)` | A button |
| `el.icon("mdi:name", opts)` | A Material Design icon; `size`: `small`, `mid`, `big` |
| `el.circle(opts)` | `x`, `y` are the centre, `r` the radius |
| `el.line([x1, y1, x2, y2, ...], opts)` | A line through these points; `width` |
| `el.flow(opts)` | Dots moving from `x1, y1` to `x2, y2` by themselves; `speed` in pixels a second (below 0 the other way, 0 still), `gap`, `size` |
| `el.onClick(fn)` | Make it tappable |
| `el.set(opts)` | Change an element in place (a text's `text`, a flow's `speed`) without drawing everything again |
| `el.width`, `el.height` | The size to draw in |

Options: `x`, `y`, `w`, `h`, `align` (`top-left`, `top-mid`, `center`, ...),
`color`, `bg`, `opacity`, `radius`, `border`, `borderColor`, `font` (`small`,
`body`, `head`, `mid`, `big`), `textAlign`. Colours are `#rrggbb` or a theme
name: `text`, `muted`, `accent`, `ok`, `warn`, `bad`, `card`.

`retoon.update()` throws away everything drawn before, then calls your draw
functions again. Drawing costs the Toon's CPU real time. For things that
change several times a second, keep the elements and change them with
`el.set`.

### Trying it on your Toon

While you work on an app, copy its folder over SSH:

1. `mount -o remount,rw /mnt/data`, copy the folder to
   `/mnt/data/toon-os/apps/<id>`, then `mount -o remount,ro /mnt/data`.
2. `/etc/init.d/S50toon-ui restart`: apps are loaded when the screen starts.
3. Its settings appear under **Apps** in the web interface. In a page's JSON,
   the card is `{"type": "custom:retoon-app", "app": "<id>"}`.

If the app fails, its card shows the error. To see `retoon.log` output, stop
the screen (`/etc/init.d/S50toon-ui stop`) and run `/usr/bin/toon-ui` by hand
over SSH.

## Adding your app to the catalogue

Open a pull request that adds your app's folder, or changes it. It is
reviewed before it is merged: an app can read your Home Assistant states and
send data to the internet, so every change is read.

- One folder per app, named after its `id`.
- Raise `version` with every change. The Toons offer an update when the
  version in the catalogue is higher than the installed one.
- Set `api` to the lowest level your app needs.
- The check on the pull request runs `node --check` on the code and
  `tools/build-index.py` on all apps.

When a change reaches `main`, every app is packed as `<id>-<version>.tar.gz`
and published, with `index.json` and `index.txt`, in the release
[`apps`](../../releases/tag/apps). That release is what the Toons read.

## Licence

Each app carries its own licence; without one, GPL-2.0-or-later.
