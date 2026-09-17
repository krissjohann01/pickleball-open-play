# Pickleball Open Play

A small self-hosted web app for running pickleball open-play sessions: keep a roster of players with skill ratings, start a session across however many courts you have, and let matchmaking fill each court fairly as games finish — mixing skill levels and making sure everyone gets roughly equal court time. Also tracks court rental / entrance fee / food-order costs per player and can save a summary of each session.

A small Node server holds the one live session, so every connected device — laptop, phone, iPad — sees the same courts, roster, and costs update in real time.

## Features

- **Roster** — add/remove players and set a skill rating (standard 2.0–5.5+ scale), with a built-in guide for self-rating.
- **Independent courts** — each court runs its own game cycle; tap "Next Game" on whichever court finishes first, no need to wait for the others.
- **Fair matchmaking** — always prioritizes whoever has played the fewest games (then whoever's waited longest); only among ties does it optimize for skill mix and avoiding repeat partners.
- **Pause/resume** — a waiting player can step away and skip the rotation until they resume.
- **Late arrivals** — add a player mid-session, from the roster or brand new.
- **Cost split** — court rental + entrance fee split across players who actually played, plus individual food/drink charges billed to whoever ordered them.
- **Session summary** — end-of-session recap (games played, fairness spread, cost split) that can be saved as a Markdown file into `sessions/`.
- **Live-synced** — every connected device (Mac, phone, iPad) sees the same session update in real time; no per-device local data.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for architecture details, or [HOW_IT_WORKS.md](./HOW_IT_WORKS.md) for a plain-English, non-technical walkthrough.

## Running it

```
npm install
npm run dev
```

This starts both the Node server and the Vite dev server; open the printed local URL.

### As a desktop app (local development/testing)

Double-click **`Berean Pickleball Open Play.app`** in the project root. It rebuilds the app, starts the local server, and opens it in your default browser at `http://localhost:4321`. Handy for trying out changes without `npm run dev`. See `scripts/start.sh` / `scripts/launcher.applescript` if you need to change how it launches.

### Running it on AWS EC2 (recommended for real use)

`deploy/` has everything to run this on a low-cost EC2 instance you can stop when not in use (stopped = no compute charges, data stays on disk) — reachable from anywhere with internet, not just one Wi-Fi network, over real free HTTPS (a free [DuckDNS](https://www.duckdns.org) domain + automatic [Caddy](https://caddyserver.com)/Let's Encrypt certificates). Infrastructure is defined with Terraform (`deploy/terraform/`) — `terraform apply` provisions it, `terraform destroy` tears it down cleanly. See `deploy/README.md`.

### Installing it on a phone or iPad

Open the app's URL (the EC2 `app_url`, e.g. `https://yourclubname.duckdns.org`, or `http://localhost:4321` if running locally) in **Safari**, then tap **Share → Add to Home Screen**. That installs a real app icon that opens full-screen with no browser bar. Because the session lives on the server, every device pointed at the same URL — phone, iPad, laptop — shows the exact same live session and updates everywhere instantly.

## Other commands

```
npm run build   # typecheck + production build to dist/
npm run server  # run just the Node server (serves dist/ + the live API)
npm run lint    # oxlint
```

## Saving session summaries

The "Save Summary" button on the end-of-session screen writes a Markdown report directly into `sessions/` on whichever machine is running the server — works the same from any device or browser. See `sessions/README.md`.
