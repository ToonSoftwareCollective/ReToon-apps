# Agenda app (calendar)

Shows upcoming events from one or more Home Assistant calendars: iCloud,
Google, CalDAV, a local calendar or any other `calendar.*` entity.

**The card** shows the next events with the day and time ("Vandaag hele dag",
"Morgen 18:30", "Wo 19 nov 09:00"), each with a coloured bar for its calendar.
A taller card shows more events.

**The full screen** (tap the card) shows the coming days (7 by default),
grouped per day in two columns.

## What you need

1. One or more calendars in Home Assistant, for example from the
   [CalDAV](https://www.home-assistant.io/integrations/caldav/) (iCloud, Nextcloud…),
   [Google Calendar](https://www.home-assistant.io/integrations/google/) or
   [Local Calendar](https://www.home-assistant.io/integrations/local_calendar/)
   integration.
2. ReToon 1.50 or later, connected to Home Assistant. The app reads the
   calendars with `retoon.call` over that connection, so it needs no address
   and no token of its own.

## Settings

In the Toon's web interface under **Apps**:

| Setting | What to enter |
|---|---|
| Title on the card | The title above the events (default "Agenda") |
| Calendars | One row per calendar (up to 6): the calendar, and optionally a name and a colour |
| Days ahead on the full screen | How many days to read and show (1–31, default 7) |
| Refresh every (minutes) | How often the calendars are read again (at least 5, default 15) |

Colours: type a colour name (green, blue, orange, red, purple, yellow, teal,
pink, grey, or the Dutch groen, blauw, oranje, rood, paars, geel, roze, grijs)
or `#rrggbb`. Without one, each calendar gets its own colour from a fixed list.

## One card per person

Each card can show its own calendars and title. In the card's own editor (on
the page, not under Apps) set:

| Setting | What to enter |
|---|---|
| Title on this card | For example "Anton" (empty: the title under Apps) |
| Calendars on this card | The calendars for this card (empty: the calendars under Apps) |

So you can have a family card with the shared calendar, and a card for each
family member with their own calendar.

## How it reads the calendars

The app calls `calendar.get_events` (listed in the manifest's `services`, the
only service it calls) for all calendars in use at once, from the start of
today until the number of days set. It reads them when it starts, after saving
the settings, when a card shows a calendar that was not read yet, and every
refresh interval. Events that have ended disappear from the card; an all-day
event shows as "hele dag".
