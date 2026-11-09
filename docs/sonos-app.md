# Sonos app

Controls your Sonos speakers from the Toon, through Home Assistant.

**The card** shows the active group (for example `P5 + P1`), what plays, and
buttons for volume -, play/pause and volume +.

![The card on the Home page](images/sonos-card.png)

**The full screen** (tap the card) lists the groups, lets you add or take out
speakers (*Groep samenstellen*), shows the volume and the sources of the group
(*Content*, for example radio stations and line-in).

![The full screen](images/sonos-screen.png)

## What you need in Home Assistant

1. The **Sonos** integration, with your speakers as `media_player` entities.
   Grouping (`media_player.join` / `unjoin`) and the source list
   (`media_player.select_source`) are the integration's own; the app only
   calls them.
2. ReToon connected to Home Assistant, so the app can see the speakers'
   states (the same connection every card that shows an entity uses).
3. A **long-lived access token**: open <https://my.home-assistant.io/redirect/profile_security/> (it asks once for the address of your Home Assistant and goes to your profile, tab
   **Security**), and under *Long-lived access tokens* press *Create token*.
   Copy it at once, Home Assistant shows it only one time.
   A token has the rights of the user who made it, so you may prefer to make a
   separate user for the Toon first and create the token there; it only needs
   to be allowed to control the media players.
4. An address of Home Assistant that the Toon can reach, for example
   `http://192.168.1.10:8123` (use the IP address if the name does not
   resolve on the Toon).

Then, in the Toon's web interface under **Apps**, fill in the Sonos app:

| Setting | What to enter |
|---|---|
| Sonos speakers | Add each speaker (up to 6); the name is optional, "Sonos - " is cut off |
| Home Assistant address | The address from step 4, without a path |
| Long-lived access token | The token from step 3 |
| Volume step (%) | How much one tap on volume changes (default 5) |

Add an **App** card for `sonos` to a page. It fits well in 6 x 2 cells.

## Why the app needs its own token

An app can read states of Home Assistant entities (`retoon.watch`), but the
app interface has no way to call a Home Assistant service, and the apps cannot
use the connection ReToon itself has. So the speakers are shown without a
token, but to change something the app calls the Home Assistant REST API
(`/api/services/media_player/...`) itself with `retoon.fetch`, and for that
it needs a token.

The token is only sent to the address you enter, and the app makes no other
request. It is stored in the app's settings on the Toon. Without it the card
shows the speakers but a button gives the message to fill in the address and
token.

If a later ReToon can call Home Assistant services for an app, the token and
the address can go.
