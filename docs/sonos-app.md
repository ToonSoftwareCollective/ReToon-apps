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
2. ReToon 1.50 or later (settings per card), connected to Home Assistant. The app reads the
   speakers' states and sends its commands over that same connection with
   `retoon.call`, so it needs no address and no token of its own.

Then, in the Toon's web interface under **Apps**, fill in the Sonos app:

| Setting | What to enter |
|---|---|
| Sonos speakers | Add each speaker (up to 6); the name is optional, "Sonos - " is cut off |
| Volume step (%) | How much one tap on volume changes (default 5) |
| Speakers of this card | Set in the card's own editor on the page, not under Apps. Leave empty to use the speakers above; fill it in to give this card its own, for example one card per room |

Add an **App** card for `sonos` to a page. It fits well in 6 x 2 cells. You can add more than one, each with its own speakers.

**Choosing content** marks it (green). While the group plays, it switches to it right away. When the group is paused or stopped, nothing starts yet: the play button starts the marked content, and plays or pauses as usual after that. The mark is kept while the app runs.

## Which services the app calls

The manifest lists them (`services`), and the web interface shows the list:
`media_player.volume_set`, `media_player.media_play_pause`,
`media_player.join`, `media_player.unjoin` and `media_player.select_source`.
The app can call nothing else in Home Assistant.
