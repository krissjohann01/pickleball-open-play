# How It Works (Plain English)

A non-technical walkthrough of what this app does and how the pieces fit together. For the version with code details, see `ARCHITECTURE.md`.

## The big idea

Think of it like a shared whiteboard for running open play. There's **one copy** of the whiteboard — the player list, who's on which court, who's waiting, what everyone owes — and every phone, tablet, or laptop that opens the app is just looking at that same whiteboard, live. If someone adds a player from their phone, it shows up instantly on everyone else's screen too, the same way a Google Doc updates for everyone watching it at once.

That "one copy" lives on a single computer — right now, that's your MacBook. Everything else (a phone, an iPad) is just a window looking at it, not a separate copy. That's why the MacBook has to be running for the app to work: it's not that each device needs its own connection to the internet, it's that they all need to reach the one computer holding the whiteboard.

## A typical session, step by step

1. **Add players to the roster** ahead of time — name and a skill rating for each person. This list is saved and carries over week to week.
2. **Start a session**: pick who showed up today, how many courts you have, how long you're playing, and optionally how much the court rental and any entrance fee cost.
3. The app immediately **fills every court** with a fair, mixed-skill group of four.
4. As each court finishes its game, whoever's running that court taps **"Next Game"** — just for that court. Courts don't wait on each other; one can be on its third game while another's still on its first.
5. Anyone can **add a player who arrives late**, right from the same screen.
6. If someone orders food or drinks at the court, it gets logged against **that person specifically** — not split evenly with everyone else.
7. When play wraps up, **end the session** to see a recap: total games, how evenly everyone played, and what each person owes (their share of the court cost plus their own food tab).
8. That recap can be **saved as a file** you can look back on later.

## How it decides who plays next

Every time a court needs new players, the app looks at everyone not currently playing and asks one question first: *who has played the fewest games so far?* Whoever's behind gets priority — no one sits out repeatedly while others rack up games. If there's a tie between several people, only then does it also try to mix skill levels within the group and avoid pairing the same people together again and again. Fairness always wins over skill-matching if the two ever pull in different directions.

## Where the "one computer" can live

- **Right now: your MacBook.** Double-click the app icon, it starts up, and anyone on the same Wi-Fi (a phone, an iPad) can open it in their browser and see the same live session.
- **A phone or iPad can even get its own icon** on the home screen (via Safari's "Add to Home Screen") so it opens full-screen like a real app — but it's still just looking at whatever computer is running the whiteboard.
- **Optionally, a small rented computer in the cloud** (through AWS) instead of your laptop — so it doesn't depend on your MacBook being on, and it can be reached from anywhere with internet, not just your home Wi-Fi. You can turn that rented computer off between uses to avoid paying for it while it's idle, and turn it back on before your next session. See `deploy/README.md` for how that's set up.

## What happens to your data

Everything — the roster, the live session, saved recaps — is written to a file on whichever computer is running the app, automatically, every time something changes. If that computer restarts, it picks up right where it left off. There's no separate "save" step to remember.

## What happens if the computer running it goes to sleep or turns off

Nobody can view or change anything until it's back up — the phones/tablets aren't holding their own copy, so there's nothing for them to show. Once the computer's back on and the app is running again, everyone's screens catch up automatically.
