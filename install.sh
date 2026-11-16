#!/bin/sh
# Installs or updates Bots from the latest GitHub release.
# Usage: curl -fsSL https://raw.githubusercontent.com/richardamare/bots/main/install.sh | sh
set -eu

repo="richardamare/bots"

if [ "$(uname -s)" != "Darwin" ] || [ "$(uname -m)" != "arm64" ]; then
  echo "Bots ships for macOS on Apple silicon only." >&2
  exit 1
fi

dmg_url=$(curl -fsSL "https://api.github.com/repos/$repo/releases/latest" |
  grep -o '"browser_download_url": *"[^"]*-arm64\.dmg"' |
  sed 's/.*"\(https[^"]*\)"/\1/' | head -n 1)
if [ -z "$dmg_url" ]; then
  echo "No macOS release found at https://github.com/$repo/releases." >&2
  exit 1
fi

work=$(mktemp -d)
mount="$work/mount"
trap 'hdiutil detach "$mount" -quiet 2>/dev/null || true; rm -rf "$work"' EXIT

echo "Downloading $(basename "$dmg_url")"
curl -fL --progress-bar -o "$work/Bots.dmg" "$dmg_url"
hdiutil attach "$work/Bots.dmg" -nobrowse -readonly -mountpoint "$mount" -quiet

if pgrep -xq Bots; then
  echo "Quitting the running Bots"
  osascript -e 'quit app "Bots"' || true
  sleep 2
fi

rm -rf /Applications/Bots.app
ditto "$mount/Bots.app" /Applications/Bots.app
# The app is not notarized, so clear the quarantine flag that would make Gatekeeper block it.
xattr -dr com.apple.quarantine /Applications/Bots.app 2>/dev/null || true

echo "Installed Bots in /Applications. Opening it."
open /Applications/Bots.app
