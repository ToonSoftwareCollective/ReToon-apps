# Afval app (waste calendar)

Shows when each kind of waste is collected, for the Dutch waste collectors
that the Home Assistant integration
[Afvalbeheer](https://github.com/pippyn/Home-Assistant-Sensor-Afvalbeheer)
supports.

**The card** shows the next collection ("GFT + PMD" when two kinds are
collected on the same day) and "Morgen", "Vandaag" or the date. A taller card
also shows the days after it.

![The card on the Home page](images/afval-card.png)

**The full screen** (tap the card) is the whole year: twelve months, each
collection day in the colour of its kind of waste, today with an outline, and
the colours explained above the calendar.

![The full screen](images/afval-year.png)

## What you need in Home Assistant

1. The **Afvalbeheer** integration, which makes a sensor for each kind of waste
   (for example `sensor.meerlanden_gft`) with the attributes `Days_until` and
   `Sort_date`, and a calendar (for example `calendar.afvalbeheer_meerlanden`).
2. ReToon connected to Home Assistant, so the app can read the sensors.
3. For the **whole year** only (without it the full screen shows the next date
   of each kind): a **long-lived access token**. Open
   <https://my.home-assistant.io/redirect/profile_security/> (it asks once for
   the address of your Home Assistant and goes to your profile, tab
   **Security**), and under *Long-lived access tokens* press *Create token*.
   Copy it at once, Home Assistant shows it only one time. Also an address of
   Home Assistant that the Toon can reach, for example
   `http://192.168.1.10:8123`.

## Settings

In the Toon's web interface under **Apps**:

| Setting | What to enter |
|---|---|
| Waste sensors | One row for each kind of waste (up to 6): the sensor, and optionally a name, icon and colour |
| Waste calendar | The calendar of the integration (optional, for the whole year) |
| Home Assistant address | For the calendar, without a path |
| Long-lived access token | The token from step 3 |

You do not have to choose colours or icons: they follow the name of the kind
of waste (a word in it is enough): gft/groen green, pmd/plastic orange,
rest/grijs grey, papier/karton blue, tak/tuin brown, glas teal, textiel purple,
kca red. To choose your own, type a colour name (green, blue, orange, red, grey,
brown, purple, yellow, or the Dutch groen, blauw, oranje, rood, grijs, bruin,
paars, geel) or `#rrggbb`, and an icon such as `mdi:leaf`.

## Why the app needs its own token

An app can read the states of Home Assistant entities (`retoon.watch`), and
that is all the card needs, so the card works without a token. A sensor only
knows the next collection, though. The rest of the year is in the calendar,
and an app cannot read a calendar through the app interface: it asks the Home
Assistant REST API (`/api/calendars/...`) itself with `retoon.fetch`, and for
that it needs a token.

The token is only sent to the address you enter, and the app makes no other
request. It reads the calendar when it starts, after saving the settings, and
every 6 hours. Without a token the card is unchanged.

Collection dates further ahead appear as soon as the waste collector publishes
them: with Meerlanden the calendar currently ends at the end of the year.
