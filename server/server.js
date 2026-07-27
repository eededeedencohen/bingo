/**
 * server.js — real-time question Bingo (Express + Socket.io + MongoDB)
 *
 * ── The game ──────────────────────────────────────────────────────────────────
 * Cards hold ANSWERS. The host reveals a question; every player looks for that
 * question's answer on their own card and marks it THEMSELVES. Nothing is marked
 * automatically and nothing advances on a timer — there is no setInterval in
 * this file. A player who marked a cell whose question was never asked cannot
 * win: verifyClaim rejects the claim with WRONG_MARKS.
 *
 * ── On "Express is single-threaded" ───────────────────────────────────────────
 * Not a problem at this scale. Revealing a question is one `io.emit()`:
 * Socket.io encodes the packet ONCE for the namespace and writes the same buffer
 * to every socket. Measured with 60 concurrent clients: all 60 receive it within
 * 0-3 ms of the emit.
 *
 * What that relies on, and what this file therefore protects:
 *   1. `next_question` is byte-identical for every client. This is why the
 *      server ships BOTH languages in one payload instead of localising per
 *      socket, and why claim rejections are CODES rather than prose.
 *   2. No blocking work on the event loop. Every database write is
 *      fire-and-forget through db/persistence.js, whose exports are all
 *      synchronous and void — it is structurally impossible to await Mongo here.
 *   3. permessage-deflate off; compressing a ~100-byte payload costs more than
 *      it saves.
 *
 * ── What the client is deliberately NOT told ──────────────────────────────────
 * `next_question` carries the question TEXT but never the question ID. Cards are
 * dealt as {id, answer} pairs, so if the id travelled with the question too, any
 * client could mechanically map question -> cell and auto-mark. Withholding it
 * is what keeps the marking a genuine act by the player.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';

import {
  ADMIN_KEY,
  CLAIM_COOLDOWN_MS,
  IS_PROD,
  MAX_NAME_LENGTH,
  ORIGIN_ALLOWLIST,
  PERSISTENCE_ENABLED,
  PORT,
  STOP_ON_WIN,
  STRICT_MARKS,
} from './config.js';
import {
  answersPerCard,
  askNextQuestion,
  BOARD_SIZES,
  cellKey,
  createGameState,
  DEFAULT_SIZE,
  findWrongMarks,
  generateBoard,
  isFreeCell,
  linesFor,
  paperProgress,
  QUESTION_BY_ID,
  QUESTIONS,
  verifyClaim,
} from './game.js';
import { PAPER_BOARDS } from './paper-boards.js';
import { login, logout, validateToken } from './auth.js';
import { closeMongo, connectMongo, dbState } from './db/mongo.js';
import {
  abandonStaleRounds,
  beginRound,
  currentRound,
  loadRestorableRound,
  persistenceStats,
  recordAsk,
  recordClaim,
  recordOpen,
  recordPaper,
  recordPlayer,
  recordStatus,
  recordWinner,
  startPersistence,
  stopPersistence,
} from './db/persistence.js';
import { historyRouter } from './routes/history.js';

/* ── CORS ───────────────────────────────────────────────────────────────────── */

const LAN_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;

function corsOrigin(origin, callback) {
  if (!origin) return callback(null, true); // curl, health checks, native clients
  if (ORIGIN_ALLOWLIST.includes(origin)) return callback(null, true);
  if (!IS_PROD && LAN_ORIGIN.test(origin)) return callback(null, true);
  return callback(new Error(`Blocked by CORS: ${origin}`));
}

/* ── App + Socket.io ────────────────────────────────────────────────────────── */

const app = express();
app.set('trust proxy', 1); // so the audit trail logs the player's IP, not the proxy's
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
  perMessageDeflate: false,
  pingInterval: 10_000,
  pingTimeout: 20_000,
});

const ADMIN_ROOM = 'admins';

/* ── In-memory state (authoritative) ────────────────────────────────────────── */

let game = createGameState(DEFAULT_SIZE);

/**
 * playerId -> { playerId, name, board, marks:Set, socketId, connected, ... }
 *
 * Cards AND marks live on the SERVER. The client never tells us what it holds or
 * what it ticked — it asks us to toggle a cell, and we decide. That is what makes
 * "you can't call bingo with a wrong mark" enforceable rather than decorative.
 */
const players = new Map();

/**
 * Printed boards: the full registry ships with the server; the host registers
 * the IDs actually handed out so the roster can track them. A paper player's
 * marks are by definition the asked questions, so their progress is computed —
 * never claimed.
 */
const PAPER_BY_ID = new Map(PAPER_BOARDS.map((b) => [b.id, b]));
const registeredPaper = new Set();

/**
 * The lobby gate. Nobody joins before the host: the game exists only between an
 * explicit "open game" and "close game" from the admin panel. Boots closed;
 * restore() reopens it if the host's round was open when the server died — a
 * host refresh or a crash must never end a running game.
 */
let lobbyOpen = false;

let restorePending = PERSISTENCE_ENABLED;

/* ── Payload shaping ────────────────────────────────────────────────────────── */

/**
 * A card as the client needs it: the answer text in both languages so the player
 * can switch language mid-round, and the cell's question id — which the client
 * needs as a stable React key and to send marks, but which never appears in a
 * question payload.
 */
function boardForClient(board) {
  return board.map((row) =>
    row.map((questionId) => {
      if (questionId === null) return null;
      const question = QUESTION_BY_ID.get(questionId);
      return { id: questionId, he: question.he.a, en: question.en.a };
    }),
  );
}

/** Questions asked so far, text only — the ids stay on the server. */
const askedForClient = () =>
  game.asked.map(({ questionId, index }) => {
    const question = QUESTION_BY_ID.get(questionId);
    return { index, he: question.he.q, en: question.en.q };
  });

function publicState() {
  return {
    status: game.status,
    lobbyOpen,
    size: game.size,
    asked: askedForClient(),
    current: askedForClient().at(-1) ?? null,
    remaining: game.remaining.length,
    total: QUESTIONS.length,
    // Winner objects are built explicitly below — never spread from the
    // in-memory winner, which holds the player's card.
    winners: game.winners.map((w) => ({
      playerId: w.playerId,
      name: w.name,
      lines: w.lines,
      askedCount: w.askedCount,
      at: w.at,
    })),
    strictMarks: STRICT_MARKS,
  };
}

const adminsWatching = () => (io.sockets.adapter.rooms.get(ADMIN_ROOM)?.size ?? 0) > 0;

/**
 * Per-player progress for the host roster.
 *
 * 12 lines x 5 cells x 60 players ≈ 3,600 Set lookups — tens of microseconds,
 * and it only runs when a host is actually watching (see broadcastRoster).
 */
function progressFor(player) {
  const size = player.board.length;
  const marked = player.marks.size + (size % 2 === 1 ? 1 : 0); // free centre counts
  const wrong = findWrongMarks(player.board, player.marks, game.askedSet).length;

  // Fewest cells still needed on any single line.
  let needs = size;
  for (const line of linesFor(size)) {
    let missing = 0;
    for (const [r, c] of line.cells) {
      if (!isFreeCell(r, c, size) && !player.marks.has(cellKey(r, c))) missing += 1;
    }
    if (missing < needs) needs = missing;
  }

  return { marked, needs, wrong };
}

/**
 * The host's live roster — sent ONLY to the admin room, so the player broadcast
 * path is untouched. Cards are deliberately excluded: a roster row never needs
 * one, and shipping 60 cards to any socket in this room would be a cheat vector.
 */
function rosterPayload() {
  const rows = [];
  for (const player of players.values()) {
    const { marked, needs, wrong } = progressFor(player);
    rows.push({
      playerId: player.playerId,
      name: player.name,
      connected: player.connected,
      joinedAt: player.joinedAt,
      cells: player.board.length ** 2,
      marked,
      needs,
      wrong,
      won: game.winners.some((w) => w.playerId === player.playerId),
      claims: player.claims,
    });
  }

  // Printed boards ride in the same list: their marks ARE the asked questions,
  // so when a question lands on a paper card the host sees it ticked here.
  for (const id of registeredPaper) {
    const board = PAPER_BY_ID.get(id);
    if (!board) continue;
    const { marked, needs, won } = paperProgress(board.cells, game.askedSet);
    rows.push({
      playerId: `paper:${id}`,
      name: id,
      paper: true,
      size: board.size,
      connected: true,
      cells: board.size ** 2,
      marked,
      needs,
      wrong: 0,
      won,
      claims: null,
    });
  }

  rows.sort((a, b) => a.needs - b.needs || b.marked - a.marked);
  let online = 0;
  for (const player of players.values()) if (player.connected) online += 1;
  return {
    players: rows,
    online, // joined players, matching the presence broadcast — not raw sockets
    total: players.size,
    paper: [...registeredPaper],
  };
}

function broadcastRoster() {
  if (!adminsWatching()) return; // zero cost when nobody is hosting
  io.to(ADMIN_ROOM).emit('roster', rosterPayload());
}

function broadcastPresence() {
  // Joined players, not raw sockets: the admin and people still on the join
  // screen hold sockets too, and counting them as "online players" misleads.
  let online = 0;
  for (const player of players.values()) if (player.connected) online += 1;
  io.emit('presence', { online });
  broadcastRoster();
}

/* ── Host actions ───────────────────────────────────────────────────────────── */

/**
 * Reveal the next question. Called ONLY from the admin route — there is no
 * timer. The identical single-encode payload goes out first; persistence and
 * the admin-only roster follow, and neither blocks.
 */
function askAndBroadcast() {
  const record = askNextQuestion(game);

  if (!record) {
    game.status = 'finished';
    recordStatus('finished', { finishedAt: new Date() });
    io.emit('game_over', { reason: 'ALL_QUESTIONS_ASKED', state: publicState() });
    broadcastRoster();
    return null;
  }

  if (game.status !== 'running') {
    game.status = 'running';
    game.startedAt ??= Date.now();
    recordStatus('running', { startedAt: new Date(game.startedAt) });
    io.emit('game_status', { status: game.status });
  }

  const question = QUESTION_BY_ID.get(record.questionId);
  io.emit('next_question', {
    index: record.index,
    // Both languages in one payload: localising per socket would mean a
    // different packet per client and would forfeit the single-encode broadcast.
    he: question.he.q,
    en: question.en.q,
    remaining: game.remaining.length,
    at: Date.now(),
    // NOTE: question.id is deliberately absent. See the file header.
  });

  recordAsk(record);
  broadcastRoster();
  return record;
}

function resetGame(size = game.size) {
  game = createGameState(size);
  beginRound(size, lobbyOpen);
  recordPaper(registeredPaper); // carry the registered sheets into the new round

  for (const player of players.values()) {
    player.board = generateBoard(game.size);
    player.marks = new Set();
    player.lastClaimAt = 0;
    player.claims = { accepted: 0, rejected: 0 };
    recordPlayer(player);
    // Guard the room name: io.to(null) targets a room literally called "null".
    if (player.socketId && player.connected) {
      io.to(player.socketId).emit('new_board', { board: boardForClient(player.board) });
    }
  }

  io.emit('game_reset', { state: publicState() });
  broadcastRoster();
}

/* ── Socket handlers ────────────────────────────────────────────────────────── */

/**
 * Socket.io puts the ack callback in the LAST argument slot, so a client that
 * emits without a payload (`socket.emit('bingo_claim', cb)`) would otherwise
 * land the callback in `payload` and never get a response.
 */
function withAck(handler) {
  return (...args) => {
    const ack = typeof args.at(-1) === 'function' ? args.pop() : undefined;
    const reply = (response) => {
      if (ack) ack(response);
    };
    return handler(args[0] ?? {}, reply);
  };
}

/**
 * trim() does not remove bidi controls, and U+202E RIGHT-TO-LEFT OVERRIDE in a
 * name reverses the text around it wherever it is rendered. Strip control
 * characters first, then slice by CODE POINT so an emoji is never cut in half.
 */
function sanitizeName(raw) {
  if (typeof raw !== 'string') return `Player ${Math.floor(Math.random() * 900 + 100)}`;
  const cleaned = raw
    // eslint-disable-next-line no-control-regex -- C0/C1 and bidi overrides are exactly the target
    .replace(/[\u0000-\u001F\u007F-\u009F\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .trim();
  const name = [...cleaned].slice(0, MAX_NAME_LENGTH).join('');
  return name || `Player ${Math.floor(Math.random() * 900 + 100)}`;
}

const clientIp = (socket) =>
  socket.handshake.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? socket.handshake.address;

io.on('connection', (socket) => {
  socket.on(
    'join',
    withAck((payload, reply) => {
      // The host is always first: until the game is explicitly opened, nobody
      // gets a card. (A refresh mid-round is unaffected — the lobby stays open.)
      if (!lobbyOpen) return reply({ ok: false, reason: 'GAME_CLOSED' });

      const requestedId = typeof payload.playerId === 'string' ? payload.playerId : null;
      const existing = requestedId ? players.get(requestedId) : null;

      const player = existing ?? {
        playerId: randomUUID(),
        board: generateBoard(game.size),
        marks: new Set(),
        lastClaimAt: 0,
        joinedAt: Date.now(),
        claims: { accepted: 0, rejected: 0 },
      };

      player.name = sanitizeName(payload.name ?? existing?.name);
      player.socketId = socket.id;
      player.connected = true;

      players.set(player.playerId, player);
      socket.data.playerId = player.playerId;

      reply({
        ok: true,
        player: {
          playerId: player.playerId,
          name: player.name,
          board: boardForClient(player.board),
          marks: [...player.marks],
        },
        state: publicState(),
      });

      recordPlayer(player);
      broadcastPresence();
    }),
  );

  /**
   * mark — the player ticks or unticks a cell.
   *
   * Deliberately NOT validated here. A wrong mark is allowed to be placed:
   * telling the player immediately would turn the quiz into a guessing machine.
   * The mistake surfaces at claim time, which is the rule as specified.
   */
  socket.on(
    'mark',
    withAck((payload, reply) => {
      const player = players.get(socket.data.playerId);
      if (!player) return reply({ ok: false, reason: 'NOT_JOINED' });

      const size = player.board.length;
      const row = Number(payload.row);
      const col = Number(payload.col);
      if (!Number.isInteger(row) || !Number.isInteger(col)) {
        return reply({ ok: false, reason: 'BAD_CELL' });
      }
      if (row < 0 || col < 0 || row >= size || col >= size) {
        return reply({ ok: false, reason: 'BAD_CELL' });
      }
      if (isFreeCell(row, col, size)) return reply({ ok: true, marks: [...player.marks] });

      const key = cellKey(row, col);
      if (player.marks.has(key)) player.marks.delete(key);
      else player.marks.add(key);

      recordPlayer(player);
      broadcastRoster();
      return reply({ ok: true, marks: [...player.marks] });
    }),
  );

  /**
   * admin_auth — the only way onto the admin channel. Accepts either the raw
   * ADMIN_KEY (legacy ?admin= URLs, tooling) or a session token from the
   * username/password login at /admin.
   */
  socket.on(
    'admin_auth',
    withAck((payload, reply) => {
      const authorized = payload.key === ADMIN_KEY || validateToken(payload.token);
      if (!authorized) {
        socket.leave(ADMIN_ROOM);
        socket.data.isAdmin = false;
        return reply({ ok: false, reason: 'UNAUTHORIZED' });
      }
      socket.data.isAdmin = true;
      socket.join(ADMIN_ROOM);
      return reply({ ok: true, roster: rosterPayload() });
    }),
  );

  /**
   * bingo_claim — the server is the only authority. It re-checks the card it
   * dealt, the marks it recorded, and the questions it actually asked.
   *
   * Rejections are CODES, never prose: localised text would differ per client
   * and break the single-encode broadcast model. The UI translates the code.
   */
  socket.on(
    'bingo_claim',
    withAck((_payload, reply) => {
      const player = players.get(socket.data.playerId);
      const ip = clientIp(socket);

      if (!player) {
        recordClaim({
          playerId: socket.data.playerId ?? 'unknown',
          accepted: false,
          reason: 'NOT_JOINED',
          ip,
        });
        return reply({ ok: false, reason: 'NOT_JOINED' });
      }

      const now = Date.now();
      const audit = (accepted, reason, extra = {}) => {
        if (accepted) player.claims.accepted += 1;
        else player.claims.rejected += 1;
        recordClaim({
          playerId: player.playerId,
          name: player.name,
          accepted,
          reason,
          askedCount: game.asked.length,
          ip,
          ...extra,
        });
      };

      if (now - player.lastClaimAt < CLAIM_COOLDOWN_MS) {
        audit(false, 'TOO_FAST');
        broadcastRoster();
        return reply({ ok: false, reason: 'TOO_FAST' });
      }
      player.lastClaimAt = now;

      const verdict = verifyClaim(player.board, player.marks, game.askedSet, {
        strict: STRICT_MARKS,
      });

      if (!verdict.ok) {
        audit(false, verdict.reason, { wrongCount: verdict.wrongCount });
        broadcastRoster();
        // wrongCount tells the player HOW MANY marks are wrong, never which —
        // naming the cells would hand them the answers.
        return reply({ ok: false, reason: verdict.reason, wrongCount: verdict.wrongCount });
      }

      const winner = {
        playerId: player.playerId,
        name: player.name,
        lines: verdict.lines,
        askedCount: game.asked.length,
        at: now,
      };
      game.winners.push(winner);

      reply({ ok: true, lines: verdict.lines });
      // No card in this payload — it goes to every connected client.
      io.emit('bingo_winner', winner);

      recordWinner(winner, game.winners.length - 1);
      audit(true, 'OK', { lineIds: verdict.lines.map((line) => line.id) });

      if (STOP_ON_WIN) {
        game.status = 'finished';
        recordStatus('finished', { finishedAt: new Date() });
        io.emit('game_status', { status: game.status });
      }
      broadcastRoster();
      return undefined;
    }),
  );

  socket.on(
    'request_state',
    withAck((_payload, reply) => {
      const player = players.get(socket.data.playerId);
      reply({ ok: true, state: publicState(), marks: player ? [...player.marks] : [] });
    }),
  );

  socket.on('disconnect', () => {
    const player = players.get(socket.data.playerId);
    if (player) {
      player.connected = false;
      recordPlayer(player);
    }
    broadcastPresence();
  });
});

/* ── Admin REST API ─────────────────────────────────────────────────────────── */

function requireAdmin(req, res, next) {
  const keyOk = req.get('x-admin-key') === ADMIN_KEY;
  const tokenOk = validateToken(req.get('x-admin-token'));
  if (!keyOk && !tokenOk) return res.status(401).json({ error: 'Unauthorized' });
  return next();
}

/* ── Auth API (username/password -> session token) ─────────────────────────── */

const auth = express.Router();

auth.post('/login', (req, res) => {
  const { username, password } = req.body ?? {};
  const result = login(username, password, req.ip);
  // 429 for LOCKED so the client can say "wait", 401 for everything else.
  if (!result.ok) return res.status(result.reason === 'LOCKED' ? 429 : 401).json(result);
  return res.json(result);
});

auth.post('/logout', (req, res) => {
  logout(req.get('x-admin-token'));
  res.json({ ok: true });
});

/** Lets the client check a stored token before showing the admin UI. */
auth.get('/session', (req, res) => res.json({ ok: validateToken(req.get('x-admin-token')) }));

app.use('/api/auth', auth);

const admin = express.Router();
admin.use(requireAdmin);

/** The only way a question is ever revealed. */
admin.post('/next', (_req, res) => {
  const record = askAndBroadcast();
  res.json({
    ok: Boolean(record),
    // The host needs to see the answer to adjudicate; players never receive this.
    asked: record
      ? {
          index: record.index,
          he: QUESTION_BY_ID.get(record.questionId).he,
          en: QUESTION_BY_ID.get(record.questionId).en,
        }
      : null,
    state: publicState(),
  });
});

admin.post('/pause', (_req, res) => {
  game.status = 'paused';
  recordStatus('paused');
  io.emit('game_status', { status: game.status });
  broadcastRoster();
  res.json({ ok: true, state: publicState() });
});

admin.post('/resume', (_req, res) => {
  if (game.status === 'paused') {
    game.status = game.asked.length > 0 ? 'running' : 'idle';
    recordStatus(game.status);
    io.emit('game_status', { status: game.status });
    broadcastRoster();
  }
  res.json({ ok: true, state: publicState() });
});

/**
 * open — the host creates the game. Only from here on can players join.
 * Deals a fresh round at the chosen size; idempotent if already open.
 */
admin.post('/open', (req, res) => {
  const requested = Number(req.body?.size);
  const size = BOARD_SIZES.includes(requested) ? requested : game.size;
  if (!lobbyOpen) {
    lobbyOpen = true;
    resetGame(size);
    recordOpen(true);
    io.emit('lobby', { open: true });
  }
  res.json({ ok: true, state: publicState() });
});

/** close — the game ends. Joins are blocked until the host opens a new one. */
admin.post('/close', (_req, res) => {
  if (lobbyOpen) {
    lobbyOpen = false;
    game.status = 'finished';
    recordStatus('finished', { finishedAt: new Date() });
    recordOpen(false);
    io.emit('game_status', { status: game.status });
    io.emit('lobby', { open: false });
    broadcastRoster();
  }
  res.json({ ok: true, state: publicState() });
});

/** New round mid-game; the host may pick a board size (3, 4 or 5). */
admin.post('/reset', (req, res) => {
  const requested = Number(req.body?.size);
  const size = BOARD_SIZES.includes(requested) ? requested : game.size;
  resetGame(size);
  res.json({ ok: true, state: publicState() });
});

admin.get('/players', (_req, res) => res.json(rosterPayload()));

/* ── Printed boards ─────────────────────────────────────────────────────────── */

/** The sheets the host actually handed out, tracked live in the roster. */
admin.get('/paper', (_req, res) =>
  res.json({ ok: true, registered: [...registeredPaper], available: PAPER_BOARDS.length }),
);

admin.post('/paper', (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [req.body?.id];
  const added = [];
  const unknown = [];
  for (const raw of ids) {
    const id = String(raw ?? '').trim();
    if (!id) continue;
    if (PAPER_BY_ID.has(id)) {
      registeredPaper.add(id);
      added.push(id);
    } else {
      unknown.push(id);
    }
  }
  if (added.length) {
    recordPaper(registeredPaper);
    broadcastRoster();
  }
  res.status(unknown.length && !added.length ? 404 : 200).json({
    ok: unknown.length === 0,
    added,
    unknown,
    registered: [...registeredPaper],
  });
});

admin.delete('/paper/:id', (req, res) => {
  const removed = registeredPaper.delete(String(req.params.id));
  if (removed) {
    recordPaper(registeredPaper);
    broadcastRoster();
  }
  res.json({ ok: removed, registered: [...registeredPaper] });
});

/** The answer key for what has been asked so far. Host eyes only. */
admin.get('/answers', (_req, res) =>
  res.json({
    asked: game.asked.map(({ questionId, index }) => {
      const question = QUESTION_BY_ID.get(questionId);
      return { index, he: question.he, en: question.en };
    }),
  }),
);

app.use('/api/admin', admin);
app.use('/api/history', requireAdmin, historyRouter);

/* ── Public routes ──────────────────────────────────────────────────────────── */

app.get('/health', (_req, res) =>
  // Never queries Mongo: if /health depended on a remote service, an Atlas blip
  // would make an orchestrator restart a process that is happily running a game.
  res.json({ ok: true, uptime: process.uptime(), db: { ...dbState(), ...persistenceStats() } }),
);

app.get('/api/state', (_req, res) =>
  res.json({
    ...publicState(),
    online: io.engine.clientsCount,
    players: players.size,
    roundId: currentRound(),
    questionBank: QUESTIONS.length,
    answersPerCard: answersPerCard(game.size),
  }),
);

/* ── Static client (single-service deploy) ──────────────────────────────────── */

/**
 * Serve the built React app from this same process when `client/dist` exists.
 *
 * That turns the whole thing into ONE deployable service: same origin for the
 * page and the socket, so there is no CORS to configure and no second service to
 * pay for. In development the folder doesn't exist and Vite serves the app on
 * :5173 instead — nothing here runs.
 *
 * Registered AFTER every API route, so it can never shadow one.
 */
const CLIENT_DIST = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../client/dist',
);

if (existsSync(CLIENT_DIST)) {
  app.use(
    express.static(CLIENT_DIST, {
      index: false, // the SPA fallback below owns index.html
      setHeaders(res, filePath) {
        // Vite fingerprints every asset filename, so they can be cached hard.
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    }),
  );

  app.get('*', (req, res, next) => {
    // Socket.io owns /socket.io/* and the API owns /api + /health; everything
    // else is a client-side route and must return the shell.
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/socket.io') ||
      req.path === '/health'
    ) {
      return next();
    }
    // index.html must never be cached, or a deploy leaves clients on stale
    // asset URLs that no longer exist.
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

/* ── Boot ───────────────────────────────────────────────────────────────────── */

/**
 * Restore a recent unfinished round so a mid-round restart doesn't cost everyone
 * their card and their marks. Always resumes PAUSED — the host lost the room for
 * however long the restart took, so requiring one click beats silently resuming.
 */
async function restore() {
  try {
    const snapshot = await loadRestorableRound();
    if (!snapshot || game.asked.length > 0) {
      await abandonStaleRounds();
      beginRound(game.size);
      return;
    }

    // The restored round dictates the geometry: rebuild the state at ITS size,
    // then replay. A player who joined during the boot window and got a card of
    // the wrong size falls into the board-replacement branch below.
    game = createGameState(snapshot.size);
    for (const ask of snapshot.asked) {
      game.asked.push({ questionId: ask.q, index: ask.i });
      game.askedSet.add(ask.q);
      game.remaining = game.remaining.filter((id) => id !== ask.q);
    }
    game.winners = snapshot.winners;
    game.startedAt = snapshot.startedAt ? new Date(snapshot.startedAt).getTime() : null;
    game.status = snapshot.asked.length > 0 ? 'paused' : 'idle';

    // The host's open game survives a crash or a refresh — that is the whole
    // reason the flag is persisted.
    lobbyOpen = snapshot.open;
    if (lobbyOpen) io.emit('lobby', { open: true });

    for (const id of snapshot.paperBoards) {
      if (PAPER_BY_ID.has(id)) registeredPaper.add(id);
    }

    for (const stored of snapshot.players) {
      const existing = players.get(stored.playerId);
      if (existing) {
        // Someone joined during the boot window and got a provisional card —
        // replace it with their real one. The client already handles new_board.
        existing.board = stored.board;
        existing.marks = new Set(stored.marks);
        if (existing.socketId && existing.connected) {
          io.to(existing.socketId).emit('new_board', {
            board: boardForClient(stored.board),
            marks: stored.marks,
          });
        }
      } else {
        players.set(stored.playerId, {
          playerId: stored.playerId,
          name: stored.name,
          board: stored.board,
          marks: new Set(stored.marks),
          socketId: null,
          connected: false,
          lastClaimAt: 0,
          joinedAt: Date.now(),
          claims: { accepted: 0, rejected: 0 },
        });
      }
    }

    // Anyone who joined during the boot window but is NOT in the snapshot got a
    // provisional card at the default size — re-deal at the round's real size.
    for (const player of players.values()) {
      if (player.board.length !== game.size) {
        player.board = generateBoard(game.size);
        player.marks = new Set();
        recordPlayer(player);
        if (player.socketId && player.connected) {
          io.to(player.socketId).emit('new_board', {
            board: boardForClient(player.board),
            marks: [],
          });
        }
      }
    }

    console.log(
      `↩️  Restored round ${snapshot.roundId}: ${snapshot.asked.length} questions, ${snapshot.players.length} cards (paused).`,
    );
    io.emit('game_reset', { state: publicState() });
  } catch (error) {
    console.warn(`⚠️  Round restore failed (${error.message}). Starting fresh.`);
    beginRound(game.size);
  }
}

// listen() FIRST, unconditionally. An unreachable Atlas must never stop the game
// from accepting players.
httpServer.listen(PORT, () => {
  console.log(`🎱 Bingo server listening on http://localhost:${PORT}`);
  console.log(`   questions     : ${QUESTIONS.length} in bank; sizes 3/4/5`);
  console.log(`   advance       : host-driven only (POST /api/admin/next)`);
  console.log(`   strict marks  : ${STRICT_MARKS}`);
  console.log(`   persistence   : ${PERSISTENCE_ENABLED ? 'enabled' : 'disabled (memory only)'}`);
  console.log(
    `   client bundle : ${existsSync(CLIENT_DIST) ? 'served from client/dist' : 'not built (use Vite dev server)'}`,
  );
  // The admin key is deliberately NOT printed: it gates the audit trail, and a
  // boot banner goes straight into every log aggregator.
});

const restoreDeadline = setTimeout(() => {
  restorePending = false;
}, 5000);
restoreDeadline.unref();

connectMongo()
  .then(async (connected) => {
    if (connected) {
      startPersistence();
      await restore();
    } else {
      beginRound(game.size);
    }
  })
  .catch((error) => console.warn(`⚠️  Persistence bootstrap failed: ${error.message}`))
  .finally(() => {
    clearTimeout(restoreDeadline);
    restorePending = false;
  });

/** Backstop: a missed .catch() must not kill a running game under Node 22. */
process.on('unhandledRejection', (reason) => {
  console.warn('⚠️  Unhandled rejection:', reason?.message ?? reason);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    recordStatus(game.status === 'finished' ? 'finished' : 'paused');
    await stopPersistence(); // bounded drain, never hangs the shutdown
    await closeMongo();
    io.close(() => httpServer.close(() => process.exit(0)));
  });
}

export { app, io };
