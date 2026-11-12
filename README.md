# ReToon apps

Apps for ReToon, the open system for the Eneco/Quby Toon. An app is a small
JavaScript program that draws its own card on a page of the Toon's screen,
and optionally a full screen that opens when the card is tapped.

| App | What it does |
|---|---|
| [analogclock](analogclock) | Analogue clock with a circular dial, configurable colours and black or theme background ([setup](analogclock/README.md)) |
| [buienradarweer](buienradarweer) | Current weather and a five-day forecast from a Home Assistant weather entity ([setup](buienradarweer/README.md)) |
| [afval](afval) | When each kind of waste is collected: the next collection on a card, the next six months on the full screen ([setup](docs/afval-app.md)) |
| [spotenergy](spotenergy) | Dynamic electricity prices for the Netherlands, with taxes, as a card and a full-screen graph |
| [powerflow](powerflow) | Where the power in your home comes from and goes to, with moving dots |
| [sonos](sonos) | Control Sonos speakers through Home Assistant: the playing group, volume, play/pause, building groups and choosing content ([setup](docs/sonos-app.md)) |

## Installing an app

In the Toon's web interface, open **Apps**. Under **Available**, press
**Install**. The app's settings then appear with the installed apps, and an
**Update** button appears when a newer version is published here.

To show the app, add an **App** card to a page.

## Making your own

| | |
|---|---|
| [docs/writing-apps.md](docs/writing-apps.md) | How an app works, and everything it can use |
| [docs/example-app](docs/example-app) | A small working app to copy and change |
| [docs/trying-an-app.md](docs/trying-an-app.md) | Putting your app on your own Toon before it is published |
| [AGENTS.md](AGENTS.md) | The same, written for AI assistants: give it to yours and describe the app you want |

## Adding your app

Open a pull request that adds your app's folder at the top level, or changes
it.

- One folder per app, named after its `id`.
- Raise `version` with every change; the Toons offer an update when the
  version here is higher than the installed one.
- Set `api` to the lowest level your app needs.
- Try it on a Toon first ([docs/trying-an-app.md](docs/trying-an-app.md)).

Every pull request is read before it is merged. An app can read your Home
Assistant states and send data to the internet, so every change is checked.
The automatic check runs `node --check` on the code and
`tools/build-index.py` on all apps.

When a change reaches `main`, every app is packed as `<id>-<version>.tar.gz`
and published, with `index.json` and `index.txt`, in the release
[`apps`](../../releases/tag/apps). That release is what the Toons read.

## Licence

Each app carries its own licence; without one, GPL-2.0-or-later.
