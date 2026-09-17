#!/bin/bash
set -e

# GUI-launched apps (double-clicked from Finder) don't inherit a login shell's
# PATH, so make sure Homebrew's node/npm are found regardless of how this runs.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"

PORT=4321
URL="http://localhost:$PORT"

# Rebuild so the app always reflects the latest saved changes (fast: <1s).
npm run build --silent

# Only start a server if one isn't already serving this app.
if ! curl -sf "$URL" >/dev/null 2>&1; then
  # Listens on all network interfaces by default, so a phone/iPad on the same
  # Wi-Fi can open it too (macOS may prompt to allow incoming connections the
  # first time — that's expected, just click Allow).
  nohup npx tsx server/index.ts >/tmp/pickleball-open-play.log 2>&1 &
  for _ in $(seq 1 40); do
    curl -sf "$URL" >/dev/null 2>&1 && break
    sleep 0.25
  done
fi

open "$URL"

LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
if [ -n "$LAN_IP" ]; then
  osascript -e "display notification \"On your phone or iPad (same Wi-Fi): http://$LAN_IP:$PORT\" with title \"Berean Pickleball Open Play\" subtitle \"Also reachable on your network\"" >/dev/null 2>&1 || true
fi
