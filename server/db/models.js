import mongoose from 'mongoose';

import { ANSWERS_PER_CARD, BOARD_SIZE, QUESTION_BY_ID } from '../game.js';

const { Schema, model } = mongoose;

/* ── Round ──────────────────────────────────────────────────────────────────── */

const askSchema = new Schema(
  {
    q: { type: String, required: true }, // question id
    i: { type: Number, required: true }, // 1-based reveal order
    at: { type: Date, required: true },
  },
  { _id: false },
);

const winnerSchema = new Schema(
  {
    playerId: { type: String, required: true },
    name: { type: String, required: true },
    // Only the line IDs are stored — the geometry is a constant in game.js and
    // is rehydrated on read via linesByIds(). Storing 5 coordinate pairs per line
    // would be denormalising a compile-time constant.
    lineIds: { type: [String], required: true },
    askedCount: { type: Number, required: true },
    at: { type: Date, required: true },
  },
  { _id: false },
);

const roundSchema = new Schema(
  {
    status: {
      type: String,
      required: true,
      enum: ['idle', 'running', 'paused', 'finished', 'abandoned'],
      default: 'idle',
    },
    // Hard-bounded by the size of the question bank, so the usual unbounded-array
    // warning doesn't apply — a few KB at most.
    asked: { type: [askSchema], default: [] },
    askedCount: { type: Number, default: 0 },
    winners: { type: [winnerSchema], default: [] },
    startedAt: Date,
    finishedAt: Date,
  },
  { timestamps: true },
);

roundSchema.index({ createdAt: -1 });
roundSchema.index({ status: 1, updatedAt: -1 });

export const Round = model('Round', roundSchema);

/* ── Player ─────────────────────────────────────────────────────────────────── */

/**
 * Boards are stored as Mixed on purpose: the grid contains `null` at the FREE
 * cell, and casting a null-containing nested array is fragile across mongoose
 * versions. Mixed round-trips the exact JSON, and an explicit validator enforces
 * the same rule generateBoard() guarantees — so a malformed card can never be
 * restored and handed to a player.
 */
function isLegalBoard(board) {
  if (!Array.isArray(board) || board.length !== BOARD_SIZE) return false;
  const seen = new Set();
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    const row = board[r];
    if (!Array.isArray(row) || row.length !== BOARD_SIZE) return false;
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      const value = row[c];
      if (r === 2 && c === 2) {
        if (value !== null) return false;
      } else {
        if (typeof value !== 'string' || !QUESTION_BY_ID.has(value)) return false;
        if (seen.has(value)) return false; // no answer may appear twice on one card
        seen.add(value);
      }
    }
  }
  return seen.size === ANSWERS_PER_CARD;
}

const playerSchema = new Schema(
  {
    roundId: { type: Schema.Types.ObjectId, ref: 'Round', required: true },
    playerId: { type: String, required: true },
    // No maxlength: the server's sanitizeName is the sole gate. A schema cap in
    // UTF-16 units would silently reject names the server already accepted by
    // code point, and a fire-and-forget write failing forever is undiagnosable.
    name: { type: String, required: true },
    board: {
      type: Schema.Types.Mixed,
      required: true,
      validate: { validator: isLegalBoard, message: 'Illegal bingo board shape' },
    },
    // Marks are persisted so a mid-round restart doesn't lose what a player
    // already ticked — losing those is as bad as losing the card.
    marks: { type: [String], default: [] },
    connected: { type: Boolean, default: true },
    joinedAt: { type: Date, default: Date.now },
    lastSeenAt: Date,
  },
  { timestamps: true },
);

// One card per player per round — this is what makes the join upsert idempotent.
playerSchema.index({ roundId: 1, playerId: 1 }, { unique: true });
// Cards only need to outlive their round; without this, `players` is the
// genuinely unbounded collection (60 cards x every round, forever).
playerSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export const Player = model('Player', playerSchema);

/* ── ClaimAudit ─────────────────────────────────────────────────────────────── */

/**
 * Every bingo_claim, accepted or not. This is the anti-cheat trail and the main
 * reason a database earns its place in this app: rejected claims are exactly the
 * signal you want when someone reports that a win looked wrong.
 */
const claimAuditSchema = new Schema({
  roundId: { type: Schema.Types.ObjectId, ref: 'Round', required: true },
  playerId: { type: String, required: true },
  name: String,
  accepted: { type: Boolean, required: true },
  // Single source of truth for this vocabulary is CLAIM_REASONS in game rules:
  // the four rejection codes the server emits, plus OK. The client's 'generic'
  // is a UI-only sentinel and must never reach the database.
  reason: {
    type: String,
    enum: ['OK', 'NO_BINGO', 'WRONG_MARKS', 'NOT_JOINED', 'NOT_STARTED', 'TOO_FAST'],
    required: true,
  },
  askedCount: Number,
  wrongCount: Number,
  lineIds: [String],
  ip: String,
  at: { type: Date, default: Date.now },
});

claimAuditSchema.index({ roundId: 1, at: -1 });
claimAuditSchema.index({ playerId: 1, at: -1 });

export const ClaimAudit = model('ClaimAudit', claimAuditSchema);
