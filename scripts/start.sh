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
  nohup npx tsx server/index.ts >/tmp/pickleball-open-play.log 2>&1 &
  for _ in $(seq 1 40); do
    curl -sf "$URL" >/dev/null 2>&1 && break
    sleep 0.25
  done
fi

open "$URL"
