# Sonos app

Controls your Sonos speakers from the Toon, through Home Assistant.

**The card** shows the active group (for example `P5 + P1`), what plays, and
buttons for volume -, play/pause and volume +.

![The card on the Home page](images/sonos-card.png)

**The full screen** (tap the card) lists the groups, lets you add or take out
speakers (*Groep samenstellen*), shows the volume and the sources of the group
(*Content*, for example radio stations and line-in).

![The full screen](images/sonos-screen.png)

## What you need

1. The **Sonos** integration in Home Assistant, with your speakers as
   `media_player` entities. Grouping (`media_player.join` / `unjoin`) and the
   source list (`media_player.select_source`) are the integration's own; the
   app only calls them.
2. ReToon 1.36 or later, connected to Home Assistant. The app reads the
   speakers' states and sends its commands over that same connection with
   `retoon.call`, so it needs no address and no token of its own.

Then, in the Toon's web interface under **Apps**, fill in the Sonos app:

| Setting | What to enter |
|---|---|
| Sonos speakers | Add each speaker (up to 6); the name is optional, "Sonos - " is cut off |
| Volume step (%) | How much one tap on volume changes (default 5) |

Add an **App** card for `sonos` to a page. It fits well in 6 x 2 cells.

## Which services the app calls

The manifest lists them (`services`), and the web interface shows the list:
`media_player.volume_set`, `media_player.media_play_pause`,
`media_player.join`, `media_player.unjoin` and `media_player.select_source`.
The app can call nothing else in Home Assistant.
