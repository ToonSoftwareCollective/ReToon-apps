#!/bin/sh
# SPDX-License-Identifier: GPL-2.0-or-later
# Put an app on a Toon over SSH, to try it before it is in the catalogue.
#
#   tools/push-app.sh <toon address> <app folder>
#
# Checks the app, copies it to /mnt/data/toon-os/apps/<id> (in place of an
# app with the same id), and restarts the screen, which loads apps when it
# starts. Logs in as root; the password is set in the web interface
# (Settings, System). Needs python3; node is used for a syntax check when
# it is there.
set -e
if [ $# != 2 ] || [ ! -f "$2/manifest.json" ]; then
	echo "usage: $0 <toon address> <app folder>" >&2
	exit 2
fi
HOST=$1
DIR=$(cd "$2" && pwd)
ID=$(basename "$DIR")
HERE=$(dirname "$0")

python3 "$HERE/build-index.py" --check "$DIR"
MAIN=$(python3 -c 'import json, sys; print(json.load(open(sys.argv[1]))["main"])' "$DIR/manifest.json")
if command -v node >/dev/null; then
	node --check "$DIR/$MAIN"
fi

APPS=/mnt/data/toon-os/apps
# COPYFILE_DISABLE: no ._ files from macOS tar
COPYFILE_DISABLE=1 tar -C "$DIR" --format=ustar -cf - . |
	ssh "root@$HOST" "set -e
		mount -o remount,rw /mnt/data
		rm -rf $APPS/.$ID.new
		mkdir -p $APPS/.$ID.new
		tar -xf - -o -C $APPS/.$ID.new
		rm -rf $APPS/$ID
		mv $APPS/.$ID.new $APPS/$ID
		sync
		mount -o remount,ro /mnt/data
		/etc/init.d/S50toon-ui restart >/dev/null 2>&1"
echo "$ID is on $HOST. Its settings are under Apps in the web interface."
