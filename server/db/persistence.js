import mongoose from 'mongoose';

import { PERSIST_FLUSH_MS, PERSIST_MAX_QUEUE, ROUND_RESUME_MAX_AGE_MS } from '../config.js';
import { linesByIds } from '../game.js';
import { isConnected } from './mongo.js';
import { ClaimAudit, Player, Round } from './models.js';

/**
 * Write-behind persistence façade.
 *
 * THE RULE THIS FILE ENFORCES: every export is synchronous and returns void. It
 * is therefore structurally impossible for server.js to `await` a database call
 * on the draw path — the guarantee is in the type of the function, not in the
 * discipline of whoever edits it next.
 *
 * Writes land in bounded in-process outboxes that a single timer drains. Peak DB
 * operation rate is pinned at ~4 ops per flush window regardless of how many
 * players are connected or how hard anyone spams the BINGO button.
 */

const { Types } = mongoose;

let currentRoundId = null;

const pendingRoundOps = []; // [{ filter, update }]
const pendingAsks = []; // [{ roundId, q, i, at }]
const pendingPlayers = new Map(); // "roundId:playerId" -> merged doc
const pendingClaims = []; // full ClaimAudit docs, _id pre-generated

/**
 * Cap on documents drained per collection per tick.
 *
 * The queue cap alone isn't enough: after an outage the first successful flush
 * could hand insertMany thousands of docs, and BSON serialisation is synchronous
 * work on the same event loop the game runs on. This converts an unbounded
 * spike into a bounded one — the backlog drains over a few extra ticks instead.
 */
const MAX_PER_FLUSH = 200;

const stats = { flushed: 0, dropped: 0, failures: 0, lastError: null };

let flushTimer = null;
let backoffUntil = 0;
let backoffMs = 0;

/* ── Queue helpers ──────────────────────────────────────────────────────────── */

/** Bounded push: overflow drops the OLDEST entry and counts it, never grows. */
function enqueue(queue, item) {
  if (queue.length >= PERSIST_MAX_QUEUE) {
    queue.shift();
    stats.dropped += 1;
  }
  queue.push(item);
}

const active = () => currentRoundId !== null;

/* ── Public API — all sync, all void ────────────────────────────────────────── */

/**
 * Begin a round. The ObjectId is generated in-process so callers get a usable
 * roundId immediately; the insert itself is just another queued write.
 */
export function beginRound(size = 5, startedAt = new Date()) {
  currentRoundId = new Types.ObjectId();
  enqueue(pendingRoundOps, {
    filter: { _id: currentRoundId },
    update: { $setOnInsert: { status: 'idle', size, asked: [], askedCount: 0, startedAt } },
    upsert: true,
  });
  return String(currentRoundId);
}

/** The host's registered printed-board IDs — replaced wholesale, tiny payload. */
export function recordPaper(ids) {
  if (!active()) return;
  enqueue(pendingRoundOps, {
    filter: { _id: currentRoundId },
    update: { $set: { paperBoards: [...ids] } },
  });
}

export const currentRound = () => (currentRoundId ? String(currentRoundId) : null);

export function recordAsk(record, at = new Date()) {
  if (!active()) return;
  enqueue(pendingAsks, {
    roundId: currentRoundId,
    q: record.questionId,
    i: record.index,
    at,
  });
}

export function recordStatus(status, extra = {}) {
  if (!active()) return;
  enqueue(pendingRoundOps, {
    filter: { _id: currentRoundId },
    update: { $set: { status, ...extra } },
  });
}

export function recordPlayer(player) {
  if (!active()) return;
  const key = `${currentRoundId}:${player.playerId}`;
  // Merge rather than append: 60 simultaneous reconnects collapse into one write.
  pendingPlayers.set(key, {
    ...(pendingPlayers.get(key) ?? {}),
    roundId: currentRoundId,
    playerId: player.playerId,
    name: player.name,
    board: player.board,
    marks: [...(player.marks ?? [])],
    connected: player.connected,
    lastSeenAt: new Date(),
  });
}

/** Every claim, accepted or rejected — this is the anti-cheat trail. */
export function recordClaim({
  playerId,
  name,
  accepted,
  reason,
  askedCount,
  wrongCount,
  lineIds,
  ip,
}) {
  if (!active()) return;
  enqueue(pendingClaims, {
    // Pre-generated so a replayed batch produces harmless E11000 duplicates
    // under { ordered: false } instead of doubling an audit row.
    _id: new Types.ObjectId(),
    roundId: currentRoundId,
    playerId,
    name,
    accepted,
    reason,
    askedCount,
    wrongCount,
    lineIds,
    ip,
    at: new Date(),
  });
}

export function recordWinner(winner, index) {
  if (!active()) return;
  enqueue(pendingRoundOps, {
    filter: { _id: currentRoundId },
    // Positional $set, so replaying a requeued batch overwrites identical data.
    // Built field by field, never spread: `winner` is the in-memory object and
    // spreading it would carry the player's whole card into a stored document.
    update: {
      $set: {
        [`winners.${index}`]: {
          playerId: winner.playerId,
          name: winner.name,
          lineIds: winner.lines.map((line) => line.id),
          askedCount: winner.askedCount,
          at: new Date(winner.at),
        },
      },
    },
  });
}

/* ── Flush loop ─────────────────────────────────────────────────────────────── */

async function flushRoundOps() {
  if (pendingRoundOps.length === 0) return;
  const batch = pendingRoundOps.splice(0, MAX_PER_FLUSH);
  try {
    await Round.bulkWrite(
      batch.map((op) => ({
        updateOne: { filter: op.filter, update: op.update, upsert: Boolean(op.upsert) },
      })),
      { ordered: false },
    );
  } catch (error) {
    batch.forEach((op) => enqueue(pendingRoundOps, op));
    throw error;
  }
}

async function flushAsks() {
  if (pendingAsks.length === 0) return;
  const batch = pendingAsks.splice(0, MAX_PER_FLUSH);
  try {
    await Round.bulkWrite(
      batch.map((ask) => ({
        updateOne: {
          filter: { _id: ask.roundId },
          // Positional write + $max: idempotent on replay, and monotonic even if
          // an older batch lands after a newer one.
          update: {
            $set: { [`asked.${ask.i - 1}`]: { q: ask.q, i: ask.i, at: ask.at } },
            $max: { askedCount: ask.i },
          },
        },
      })),
      { ordered: false },
    );
  } catch (error) {
    batch.forEach((ask) => enqueue(pendingAsks, ask));
    throw error;
  }
}

async function flushPlayers() {
  if (pendingPlayers.size === 0) return;
  const batch = [...pendingPlayers.values()].slice(0, MAX_PER_FLUSH);
  batch.forEach((doc) => pendingPlayers.delete(`${doc.roundId}:${doc.playerId}`));
  try {
    await Player.bulkWrite(
      batch.map((doc) => ({
        updateOne: {
          filter: { roundId: doc.roundId, playerId: doc.playerId },
          update: { $set: doc, $setOnInsert: { joinedAt: new Date() } },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  } catch (error) {
    batch.forEach((doc) => pendingPlayers.set(`${doc.roundId}:${doc.playerId}`, doc));
    throw error;
  }
}

async function flushClaims() {
  if (pendingClaims.length === 0) return;
  const batch = pendingClaims.splice(0, MAX_PER_FLUSH);
  try {
    await ClaimAudit.insertMany(batch, { ordered: false });
  } catch (error) {
    // Duplicate keys mean this batch was already written — not a failure.
    if (error?.code === 11000) return;
    batch.forEach((doc) => enqueue(pendingClaims, doc));
    throw error;
  }
}

async function flush() {
  if (!isConnected() || Date.now() < backoffUntil) return;

  // Independent so one failing collection never blocks the others.
  const results = await Promise.allSettled([
    flushRoundOps(),
    flushAsks(),
    flushPlayers(),
    flushClaims(),
  ]);

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length === 0) {
    stats.flushed += 1;
    backoffMs = 0;
    backoffUntil = 0;
    return;
  }

  stats.failures += 1;
  stats.lastError = failed[0].reason?.message ?? String(failed[0].reason);
  // Exponential backoff with a 30s ceiling — it always recovers on its own.
  backoffMs = Math.min(backoffMs ? backoffMs * 2 : PERSIST_FLUSH_MS, 30_000);
  backoffUntil = Date.now() + backoffMs;
}

export function startPersistence() {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    // The timer callback must never reject: an unhandled rejection is fatal
    // under Node's default --unhandled-rejections=throw.
    flush().catch((error) => {
      stats.failures += 1;
      stats.lastError = error.message;
    });
  }, PERSIST_FLUSH_MS);
  flushTimer.unref(); // never hold the process open just to flush
}

/** Drain what's left on shutdown. Bounded — never hang a SIGTERM. */
export async function stopPersistence() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  backoffUntil = 0;
  await Promise.race([flush().catch(() => {}), new Promise((r) => setTimeout(r, 3000))]);
}

export const persistenceStats = () => ({
  ...stats,
  roundId: currentRound(),
  queued:
    pendingRoundOps.length + pendingAsks.length + pendingPlayers.size + pendingClaims.length,
  backoffMs: Math.max(0, backoffUntil - Date.now()),
});

/* ── Restore ────────────────────────────────────────────────────────────────── */

/**
 * Find a recent unfinished round and its players so a mid-round restart doesn't
 * cost everyone their card. Bounded by age: yesterday's abandoned round must
 * never resurrect.
 */
export async function loadRestorableRound() {
  if (!isConnected()) return null;

  const cutoff = new Date(Date.now() - ROUND_RESUME_MAX_AGE_MS);
  const round = await Round.findOne({
    status: { $in: ['idle', 'running', 'paused'] },
    updatedAt: { $gte: cutoff },
  })
    .sort({ updatedAt: -1 })
    .lean()
    .maxTimeMS(5000);

  if (!round) return null;

  const players = await Player.find({ roundId: round._id }).lean().maxTimeMS(5000);

  currentRoundId = round._id;

  return {
    roundId: String(round._id),
    size: round.size ?? 5,
    paperBoards: round.paperBoards ?? [],
    // A dropped batch leaves null holes in the positional array; filter them out
    // rather than letting a hole shift every later question's position.
    asked: (round.asked ?? []).filter(Boolean).sort((a, b) => a.i - b.i),
    startedAt: round.startedAt,
    // Rehydrate full line geometry — the client renders winner.lines[].cells.
    winners: (round.winners ?? []).map((w) => ({
      playerId: w.playerId,
      name: w.name,
      lines: linesByIds(w.lineIds, round.size ?? 5),
      askedCount: w.askedCount,
      at: w.at instanceof Date ? w.at.getTime() : w.at,
    })),
    players: players.map((p) => ({
      playerId: p.playerId,
      name: p.name,
      board: p.board,
      marks: p.marks ?? [],
    })),
  };
}

/** Mark an unfinished round we chose not to resume, so it can't be picked up later. */
export async function abandonStaleRounds() {
  if (!isConnected()) return;
  const cutoff = new Date(Date.now() - ROUND_RESUME_MAX_AGE_MS);
  await Round.updateMany(
    { status: { $in: ['idle', 'running', 'paused'] }, updatedAt: { $lt: cutoff } },
    { $set: { status: 'abandoned' } },
  ).maxTimeMS(5000);
}
