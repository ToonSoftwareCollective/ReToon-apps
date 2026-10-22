#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-2.0-or-later
"""Check every app folder and pack it for the Toons.

    tools/build-index.py <out dir>

Writes <id>-<version>.tar.gz per app (the app's files, without its folder),
index.json (the list the web interface shows) and index.txt (the same as
lines "<id> <version> <api> <sha256> <file>", for the Toon's shell script).
The archives are packed the same way every time, so an app that did not
change keeps its checksum. Stops with an error on the first app that is not
right.
"""
import gzip
import hashlib
import io
import json
import os
import re
import sys
import tarfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REQUIRED = ("id", "name", "version", "api", "main", "description", "author")
ID = re.compile(r"^[a-z0-9][a-z0-9-]{0,46}$")
VERSION = re.compile(r"^\d+\.\d+\.\d+$")
SETTING_TYPES = {"text", "secret", "number", "bool", "entity", "entities"}
MAX_SIZE = 1 << 20	# an app is packed to at most this many bytes


def fail(app, msg):
	sys.exit(f"{app}: {msg}")


def check(folder, m):
	for k in REQUIRED:
		if k not in m:
			fail(folder, f'manifest.json has no "{k}"')
	if m["id"] != folder:
		fail(folder, f'"id" is "{m["id"]}", it must be the folder name')
	if not ID.match(folder):
		fail(folder, "the id may only have a-z, 0-9 and -")
	if not isinstance(m["version"], str) or not VERSION.match(m["version"]):
		fail(folder, '"version" must look like "1.2.3"')
	if not isinstance(m["api"], int) or m["api"] < 1:
		fail(folder, '"api" must be a whole number from 1')
	main = os.path.join(ROOT, folder, m["main"])
	if os.path.dirname(os.path.normpath(m["main"])) or not os.path.isfile(main):
		fail(folder, f'"main" ({m["main"]}) is not a file in the folder')
	for s in m.get("settings", []):
		if "key" not in s or s.get("type") not in SETTING_TYPES:
			fail(folder, f"setting {s.get('key')!r}: needs a key and a type "
			     f"({', '.join(sorted(SETTING_TYPES))})")


def pack(folder):
	"""The app's files as a tar.gz, the same bytes for the same files."""
	raw = io.BytesIO()
	with tarfile.open(fileobj=raw, mode="w", format=tarfile.USTAR_FORMAT) as tar:
		base = os.path.join(ROOT, folder)
		for d, dirs, files in sorted(os.walk(base)):
			dirs.sort()
			for f in sorted(files):
				path = os.path.join(d, f)
				name = os.path.relpath(path, base)
				ti = tarfile.TarInfo(name)
				ti.size = os.path.getsize(path)
				ti.mode = 0o644
				ti.mtime = 0
				with open(path, "rb") as fh:
					tar.addfile(ti, fh)
	out = io.BytesIO()
	with gzip.GzipFile(fileobj=out, mode="wb", mtime=0) as gz:
		gz.write(raw.getvalue())
	return out.getvalue()


def main():
	if len(sys.argv) != 2:
		sys.exit(__doc__)
	out = sys.argv[1]
	os.makedirs(out, exist_ok=True)
	apps = []
	for folder in sorted(os.listdir(ROOT)):
		mf = os.path.join(ROOT, folder, "manifest.json")
		if folder.startswith(".") or not os.path.isfile(mf):
			continue
		try:
			with open(mf, encoding="utf-8") as fh:
				m = json.load(fh)
		except ValueError as e:
			fail(folder, f"manifest.json is not valid JSON: {e}")
		check(folder, m)
		data = pack(folder)
		if len(data) > MAX_SIZE:
			fail(folder, f"packed it is {len(data)} bytes, more than {MAX_SIZE}")
		file = f"{m['id']}-{m['version']}.tar.gz"
		with open(os.path.join(out, file), "wb") as fh:
			fh.write(data)
		apps.append({
			"id": m["id"], "name": m["name"], "version": m["version"],
			"api": m["api"], "description": m["description"],
			"author": m["author"], "file": file, "size": len(data),
			"sha256": hashlib.sha256(data).hexdigest(),
		})
		print(f"{file}: {len(data)} bytes")
	with open(os.path.join(out, "index.json"), "w", encoding="utf-8") as fh:
		json.dump({"apps": apps}, fh, ensure_ascii=False, indent=1)
		fh.write("\n")
	with open(os.path.join(out, "index.txt"), "w", encoding="utf-8") as fh:
		for a in apps:
			fh.write(f"{a['id']} {a['version']} {a['api']} {a['sha256']} {a['file']}\n")


if __name__ == "__main__":
	main()
