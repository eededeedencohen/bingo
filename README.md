# Summer Question Bingo · בינגו שאלות קיץ

Real-time bilingual (Hebrew/English) question bingo for ~60 concurrent players.
Express + Socket.io + MongoDB on the back, React (Vite) + Tailwind v4 +
Framer Motion on the front.

**How it plays.** Every card holds 24 **answers**, not numbers. The host reveals
a **question**; each player finds the answer on their own card and **taps it
themselves**. Nothing is marked automatically and nothing advances on a timer —
a question appears if and only if the host presses the button. A player who
marked a cell whose question was never asked **cannot win**: the server rejects
the claim with `WRONG_MARKS`.

```
server/   Express + Socket.io + Mongo
  game.js        pure rules: cards, lines, mark validation, claim verdict
  questions.js   the 46-question summer bank (he/en)
  config.js      every process.env read in the app
  db/            connection, schemas, write-behind persistence
  routes/        admin-only history + audit endpoints
client/   Vite + React 19 + Tailwind v4 + motion + canvas-confetti
```

## Run it

```bash
cd server && npm install && npm run dev      # http://localhost:4000
cd client && npm install && npm run dev      # http://localhost:5173
```

Players open <http://localhost:5173>. The host opens
<http://localhost:5173/?admin=dev-admin-key> — same page, plus the **Next
question** button, the answer key, and the live player roster.

Other devices on the same Wi-Fi join at `http://<your-lan-ip>:5173`: the client
derives the socket URL from the page host, and the server accepts private-LAN
origins while `NODE_ENV !== 'production'`.

## Language

Hebrew and English, switchable at runtime from the toggle in the header (and on
the join screen, so a Hebrew speaker never hits an English wall). Choosing
Hebrew flips the document to RTL; a pre-paint script in `index.html` applies the
direction before first paint so an RTL session never flashes left-to-right.

One card serves both languages — cells are dealt as question ids and rendered in
whichever language the player picked, so switching mid-round changes the words
and nothing else. The 5×5 grid itself stays LTR: B-I-N-G-O is the game's
notation, like a phone number, not prose.

## Board sizes

A round is played on **3×3, 4×4 or 5×5** cards — the host picks when starting a
round (the size buttons under "New round" in the host panel). Odd sizes carry a
FREE centre cell; 4×4 has no centre, so no free cell. Everyone in a round plays
the same size.

## Printed boards

150 pre-generated paper cards — numbered **1 to 150** — for players who prefer
pen and paper. Print-ready PDFs (A4, two cards per page, Hebrew, each sheet
carrying its ID and size) live in [`print/`](print/) and can also be downloaded
straight from the host panel ("Download sheets"):

```
print/shekel-bingo-3x3.pdf   boards 1-50
print/shekel-bingo-4x4.pdf   boards 51-100
print/shekel-bingo-5x5.pdf   boards 101-150
```

The host types the IDs of the sheets actually handed out into "Printed boards"
in the host panel. Only boards matching the round's size are accepted — a 3×3
sheet cannot enter a 5×5 game. A paper player marks by hand, so their marks are
by definition the questions asked so far — the roster ticks their cards off
automatically and flags a paper board the moment it reaches bingo, so the host
knows to check the physical sheet.

**The archive is immutable.** On first boot with a database, the 150 boards and
the three PDFs are stored in MongoDB and never overwritten; from then on the
server prefers the archived boards over the bundled file, so no reset, redeploy
or accidental regeneration can change what a printed ID means. (Generators live
under `scripts/` for provenance — do not rerun them after printing.)

## The question bank

`server/questions.js` — 46 entries, each with one unambiguous answer in both
languages. Rules for adding more are documented at the top of that file; the
important ones are **exactly one defensible answer** (a question with two right
answers punishes a correct player) and **no shared answers between entries**.

The bank must hold at least 24 entries; `game.js` throws at boot otherwise.

## Socket protocol

| Direction | Event | Payload |
| --- | --- | --- |
| C→S | `join` | `{ name, playerId? }` → ack `{ ok, player: { playerId, name, board, marks }, state }` |
| C→S | `mark` | `{ row, col }` → ack `{ ok, marks }` (toggles; never validated here) |
| C→S | `bingo_claim` | — → ack `{ ok, lines }` or `{ ok: false, reason, wrongCount? }` |
| C→S | `admin_auth` | `{ key }` → ack `{ ok, roster }` — joins the admin room |
| C→S | `request_state` | — → ack `{ ok, state, marks }` |
| S→C | `next_question` | `{ index, he, en, remaining, at }` |
| S→C | `bingo_winner` | `{ playerId, name, lines, askedCount, at }` |
| S→C | `roster` | admin room only — `{ players[], online, total }` |
| S→C | `game_status` / `game_over` / `game_reset` / `presence` / `new_board` | see `server.js` |

Claim rejection codes: `NO_BINGO`, `WRONG_MARKS`, `NOT_JOINED`, `NOT_STARTED`,
`TOO_FAST`. The server never sends prose — the UI translates the code, which is
also what keeps one broadcast payload identical for every client.

## Admin API

All routes require the `x-admin-key` header.

```bash
curl -XPOST localhost:4000/api/admin/next   -H "x-admin-key: dev-admin-key"  # reveal a question
curl -XPOST localhost:4000/api/admin/pause  -H "x-admin-key: dev-admin-key"
curl -XPOST localhost:4000/api/admin/resume -H "x-admin-key: dev-admin-key"
curl -XPOST localhost:4000/api/admin/reset  -H "x-admin-key: dev-admin-key"  # new round, new cards
curl      localhost:4000/api/admin/players  -H "x-admin-key: dev-admin-key"
curl      localhost:4000/api/admin/answers  -H "x-admin-key: dev-admin-key"  # answer key
curl      localhost:4000/api/history/claims -H "x-admin-key: dev-admin-key"  # audit trail
```

Public: `GET /health`, `GET /api/state`.

## Design notes

**Cards and marks live on the server.** The client is dealt a card and asks the
server to toggle cells; it never reports what it holds or what it ticked. That is
what makes "you can't call bingo with a wrong mark" enforceable rather than
decorative.

**The question id is never broadcast.** `next_question` carries the text in both
languages but not the id, so no client can mechanically map question → cell and
auto-mark. Withholding it is what keeps the marking a genuine act by the player.

**No board ever reaches a player.** The winner broadcast and `GET /api/state`
carry names and line ids only. Cards appear solely in the admin-key-gated
history endpoints.

**Broadcast cost.** One `io.emit()` per question with an identical payload for
everyone, so Socket.io encodes the packet once and reuses the buffer. Measured
with 60 concurrent WebSocket clients: every client received each broadcast within
0–3 ms of the emit. `perMessageDeflate` is off — compressing a ~100-byte payload
costs more CPU than it saves. Past a few thousand clients you would add
`@socket.io/redis-adapter` plus `cluster`; at 60 players a single process is the
right answer.

**Mongo is a write-behind sidecar, never a participant.** Every export of
`db/persistence.js` is synchronous and returns void, so it is structurally
impossible to `await` a database call on the broadcast path. Writes queue in
bounded outboxes that a 2s timer drains (max 200 docs per collection per tick),
behind a circuit breaker. `listen()` runs before `connect()`, and a dead database
degrades history only — the game stays fully playable. `/health` never queries
Mongo, so an Atlas blip can't make an orchestrator restart a healthy game.

**Restart mid-round restores the round.** Cards, marks, and asked questions come
back from Mongo (bounded by `ROUND_RESUME_MAX_AGE_MS`), and the game always
resumes **paused** — the host lost the room for however long the restart took, so
one deliberate click beats silently resuming into a half-empty room.

## Deploying to Render

This deploys as **one** web service. `npm run build` compiles the client into
`client/dist`, and Express serves it from the same process — so the page and the
socket share an origin, there is no CORS to configure, and there is no second
service to pay for.

**Dashboard → New → Web Service → connect this repo, then:**

| Field | Value |
| --- | --- |
| Runtime | Node |
| Build Command | `npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

**Environment variables** (Environment tab):

```
NODE_ENV            production
DATABASE            mongodb+srv://<user>:<PASSWORD>@<cluster>.mongodb.net/bingo?retryWrites=true&w=majority
DATABASE_PASSWORD   <your Atlas password>
ADMIN_KEY           <a long random string — NOT dev-admin-key>
STRICT_MARKS        true
STOP_ON_WIN         true
```

Keep the literal `<PASSWORD>` token inside `DATABASE`; the server substitutes it
at boot. Do **not** set `PORT` — Render provides it. Do **not** set
`CLIENT_ORIGIN`: the client is served from this same service and `config.js`
already trusts Render's `RENDER_EXTERNAL_URL`. (On a custom domain, set
`CLIENT_ORIGIN` to that domain — the server warns at boot if it is missing.)

**In MongoDB Atlas**, add `0.0.0.0/0` to Network Access. Render's free tier has
no static outbound IP, so an IP allowlist cannot work there.

Alternatively the repo ships a [`render.yaml`](render.yaml) blueprint — **New →
Blueprint** picks up everything above and prompts only for the two secrets.

### After it goes live

- Players: `https://<your-service>.onrender.com`
- Host: `https://<your-service>.onrender.com/?admin=<ADMIN_KEY>`

**Free-tier caveat:** the instance sleeps after ~15 minutes idle and takes
~30–60 s to wake. In-memory game state does not survive that, but the round does
— cards, marks and asked questions are restored from Mongo and resume paused.
Open the page yourself a minute before the players arrive, or use a paid instance
for a real event.

## Before deploying publicly

- Set a real `ADMIN_KEY`; the `?admin=` URL parameter is dev-grade and should
  become a real login. That key gates the answer key and the audit trail.
- Pin `CLIENT_ORIGIN` and set `NODE_ENV=production` to disable the LAN-origin
  allowance.
- Add the deploy host's IP to the Atlas Network Access list.
- `FORBIDDEN_DATABASES` refuses to write to `yitav` — the cluster in `.env` also
  hosts an unrelated application's data.
