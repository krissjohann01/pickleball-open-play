# Architecture

Notes on how this codebase is put together — read this before changing session or matchmaking behavior.

## What this is

A small Node server + React frontend for running pickleball open-play sessions: maintain a player roster with skill ratings, start a session across N courts, and let matchmaking fill each court fairly as games finish. Tracks per-session costs (court rental + entrance fee + individual food orders) and can export a session summary. The server holds the one authoritative copy of the roster/session and pushes live updates to every connected device over a WebSocket — the Mac running it, a phone, an iPad, or a browser anywhere on the internet if deployed (see `deploy/`), all see the same state in real time.

## Commands

- `npm run dev` — runs the Node server (`server/index.ts`, via `tsx`) and the Vite dev server together; Vite proxies `/ws` to the Node server (see `vite.config.ts`)
- `npm run build` — typecheck (`tsc -b`) then production build to `dist/`
- `npm run server` — runs just the Node server (serves the built `dist/` + the WebSocket API on one port)
- `npm run lint` — oxlint

There is no test suite/framework configured in this repo. The server (`server/`) is typechecked separately via `tsconfig.server.json` (not part of `npm run build`, which only covers `src/`) — run `npx tsc -p tsconfig.server.json` to check it.

### Desktop launcher

`Berean Pickleball Open Play.app` (in the project root) is a compiled AppleScript app that runs `scripts/start.sh`: rebuilds the app, starts the Node server (`npx tsx server/index.ts`) if one isn't already running on port 4321, and opens the default browser. The server listens on all network interfaces by default, so phones/tablets on the same Wi-Fi can reach it; the script then shows a macOS notification with the LAN URL (via `ipconfig getifaddr`). If `scripts/launcher.applescript` changes, recompile with:

```
osacompile -o "Berean Pickleball Open Play.app" scripts/launcher.applescript
```

### Deploying off the Mac (EC2)

See `deploy/README.md`. The app needs no code changes to run on a server instead of a laptop — `server/index.ts` already binds to all interfaces and persists to local disk; deploying is purely an ops task (provision a box, run the same Node process, keep it up via systemd). `PORT` is configurable via the `PORT` env var (defaults to 4321) for environments that need a different port.

Infrastructure is defined as code in `deploy/terraform/` (Terraform, AWS provider): EC2 instance, security group, and a generated SSH key pair, with a `user_data` startup script that installs Node and registers (but doesn't start) the systemd service. Deliberately excluded: an Elastic IP (costs the same as the auto-assigned public IP while running, but also while *stopped* — see the cost note in `deploy/README.md`) and any automation of the code-copy step (kept as a plain `rsync`, so the first deploy and later updates use the identical command).

### Installing on a phone/iPad

`index.html` includes PWA meta tags (`apple-touch-icon`, `manifest.json`, `apple-mobile-web-app-capable`) so "Add to Home Screen" in Safari gives a real app icon that launches full-screen with no browser chrome. `public/favicon.svg` / `apple-touch-icon.png` / `icon-512.png` are the app's icon at different sizes — regenerate them together if the branding changes (there's no source design file; they were rasterized from the SVG via a headless-browser screenshot).

## State ownership and flow (`server/index.ts` + `src/App.tsx`)

The **server** is the single source of truth: an in-memory `{ roster: Player[], session: Session | null }`, persisted to `.data/state.json` on every mutation and reloaded on startup — this is what lets a server restart (or an EC2 stop/start) resume an in-progress session rather than losing it.

All mutations are pure functions in `src/matchmaking.ts` of the shape `(session, ...args) => Session`, imported directly by the server (they have no DOM/browser dependencies, so they run fine under Node via `tsx`). The server never has bespoke mutation logic of its own — every WebSocket message maps to one of these functions, then the result is persisted and broadcast.

The **client** (`App.tsx`) holds no independent state of its own beyond a WebSocket connection and a small `localView` (`'roster' | 'setup'`) for pure navigation. On connect, and after every mutation anywhere, the server sends `{type:'state', roster, session}` to *every* connected client, and `App.tsx` just mirrors it into React state. Every user action (add player, next game, pause, etc.) is sent as a `{type, ...payload}` message over the socket rather than computed locally — the round trip is imperceptible on a LAN and keeps every device in sync without any client-side merge logic. See the message list in `server/index.ts`'s `handleMessage` switch for the full protocol.

Rendering is derived from shared state, not local navigation, for anything collaborative:
- `session && !session.endedAt` → `SessionView` (live)
- `session && session.endedAt` → `SessionSummary`
- otherwise → local `localView` (roster/setup) — deliberately *not* synced, so one device composing the "who's attending" form doesn't yank everyone else's screen to it.

Every component in `src/components/` keeps the same prop-callback contracts regardless of this — `RosterView`'s `onChange(roster)`, `SessionView`'s `onNextGame(courtNumber)`, etc. `App.tsx` is the only place that changed when this moved from local `localStorage` state to server-synced state.

## Domain model (`src/types.ts`)

`Player` (roster-level: id/name/skill level) vs `SessionPlayer` (adds session-scoped state: `gamesPlayed`, `lastPlayedSeq`, `partnerHistory`, `paused`, `foodOrders`). A session snapshots each selected roster player into a `SessionPlayer` at start time — roster edits made later don't retroactively affect an in-progress session.

`Session.courts` is an array of independent `CourtSlot`s (`playerIds` + `gamesOnCourt`), not synchronized "rounds" — each court advances on its own schedule via `fillCourt(session, courtNumber)` when the organizer taps that court's "Next Game" button. There is no global round counter.

`Session.endedAt` is `null` while live; `endSession` sets it (so `SessionSummary` can render while keeping the data), and `closeSummary` clears the whole session back to `null`.

## Matchmaking (`src/matchmaking.ts`)

This is the core algorithm and the most important thing to understand before changing session behavior:

- **Waiting pool**: `getWaitingPool` = every player not currently on a *different* court (players on the court being refilled count as free, since refilling frees them). `getEligiblePool` additionally excludes paused players.
- **Fairness is the primary and non-negotiable sort key**: `pickNextGroupForCourt` sorts the eligible pool by `gamesPlayed` ascending, then `lastPlayedSeq` ascending (i.e. longest since they last played), then random. Whoever ranks in the top 4 by this ordering fills the court — anyone strictly ahead on this ranking *must* play.
- **Skill mixing / partner variety is secondary and only applies among ties**: when more than 4 players tie on the fairness cutoff, the code repeatedly samples random 4-player combinations from the tied group (`VARIETY_ATTEMPTS` tries) and keeps the one with the lowest `scoreGroup` score (penalizes repeat partnerships via `partnerHistory`, and an all-one-skill-level group). This is random-sampling-and-scoring, not a constraint solver — keep that in mind if it ever needs to scale to larger tie groups.
- `applyCourtAssignment` is the only place that mutates `gamesPlayed`, `lastPlayedSeq`, `partnerHistory`, and a court's `playerIds`/`gamesOnCourt`, all as one atomic `Session` update.
- `createSession` and `endSession` are the two lifecycle functions the server calls directly for the `startSession`/`endSession` messages.

## Cost splitting

Court rental splits only across players with `gamesPlayed > 0` (someone who signed up but never got on a court owes nothing), plus a flat entrance fee for those same players, plus each player's own `foodOrders` billed to them alone. This computation is duplicated in two places that must be kept in sync if the split logic changes: `components/CostSplit.tsx` (live UI, also used on the summary screen) and `src/fileExport.ts` (`buildSummaryMarkdown`, for the saved file).

## Session file export (`src/fileExport.ts` + server)

`fileExport.ts` is now just the pure Markdown builder (`buildSummaryMarkdown`, `summaryFilename`) — no browser APIs. On a `{type:'saveSummary'}` message, the **server** calls it and writes the file directly to `sessions/` with `fs.writeFileSync`, then broadcasts `{type:'summarySaved', filename}`. This works identically from any device/browser, since the write happens on the machine running the server, not in the requester's browser (which is a simplification from an earlier version of this app that used the browser's File System Access API and only worked in Chrome/Edge).

## Persistence (server-side `.data/state.json`)

There's no client-side persistence anymore (no `localStorage`) — reloading any device's browser just reconnects the WebSocket and gets the current state pushed back down. The server's `.data/state.json` is the only durable copy; it's gitignored.
