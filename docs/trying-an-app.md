# Trying an app on your Toon

Before an app is in the catalogue, you put it on your Toon yourself, over
SSH. This works the same for a person and for an AI assistant that can run
commands.

You need:

- The Toon's address: tap the Home Assistant icon on the Toon, or look in
  your router.
- SSH as `root`. The password is set in the web interface under Settings,
  System (a new ReToon has `toon`; change it).
- On your computer: `ssh`, `tar` and `python3`. `node` is used for a syntax
  check when it is there.

## With the script

From a copy of this repository:

```sh
tools/push-app.sh 192.168.1.50 path/to/my-app
```

It checks the manifest (the same check the catalogue runs), copies the
folder to the Toon in place of an older copy, and restarts the screen. Run
it again after every change.

## By hand

The app goes to `/mnt/data/toon-os/apps/<id>/`. That partition is mounted
read-only, so:

```sh
# on your computer: copy the folder (scp -O: the Toon has no sftp)
scp -O -r my-app root@192.168.1.50:/tmp/

# on the Toon (ssh root@192.168.1.50)
mount -o remount,rw /mnt/data
rm -rf /mnt/data/toon-os/apps/my-app
mv /tmp/my-app /mnt/data/toon-os/apps/my-app
mount -o remount,ro /mnt/data
/etc/init.d/S50toon-ui restart
```

The screen loads apps when it starts, hence the restart.

## Seeing it

1. In the web interface, open **Apps**. The app is listed with its settings
   form; fill it in and save. The app gets the new settings within a few
   seconds through `retoon.onSettings`, without a restart (so call
   `retoon.update()` there).
2. On a page, add a card of type **App** and pick the app. In a page's JSON
   (the Pages tab, or the import), the card is
   `{"type": "custom:retoon-app", "app": "my-app"}`, with an optional
   `"height"`.

## When it does not work

- **The card shows an error.** That is the exception from the code, with
  where it happened (`start`, `tile`, `screen`, `click`, `fetch`, `state`).
- **"needs a newer ReToon"** on the card: the manifest's `api` is higher than
  this ReToon has. Update ReToon (Status in the web interface), or lower
  `api` if the app does not use the newer functions.
- **The app is not listed under Apps**: the folder is not in
  `/mnt/data/toon-os/apps/`, or `manifest.json` is missing or not valid JSON.
- **`retoon.log` output and stack traces**: they go to the screen program's
  output. Run the screen by hand to see them:

  ```sh
  /etc/init.d/S50toon-ui stop
  toon-ui            # Ctrl-C to stop
  /etc/init.d/S50toon-ui start
  ```

  Lines from your app start with `app <id>:`.

## Removing it

Under **Apps** in the web interface, press **Remove** (this also deletes its
settings). Or by hand: remount read-write as above and
`rm -rf /mnt/data/toon-os/apps/my-app`.

An app installed by hand that has the same id as an app in the catalogue
gets an **Update** button when the catalogue's version is higher. Installing
from the catalogue replaces your copy.
