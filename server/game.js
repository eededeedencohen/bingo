/**
 * game.js — pure Bingo rules. No Express, no Socket.io, no I/O.
 *
 * THE GAME
 * Cards hold ANSWERS, not numbers. The host reveals a question; each player
 * looks for that question's answer on their own card and marks it themselves.
 * Nothing is marked automatically and nothing advances on a timer.
 *
 * BOARD SIZES
 * A round is played on 3×3, 4×4 or 5×5 cards — the host picks when starting a
 * round. Odd sizes have a FREE centre cell; 4×4 has no centre, so no free cell.
 * Every rule below derives the size from the board it is handed, so no caller
 * can pair a board with the wrong geometry.
 *
 * A cell stores a QUESTION ID, not the answer text — the client renders the
 * answer in whichever language the player chose, so one board serves both
 * Hebrew and English players.
 */
import { randomInt } from 'node:crypto';

import { QUESTIONS } from './questions.js';

export { QUESTIONS };

export const BOARD_SIZES = [3, 4, 5];
export const DEFAULT_SIZE = 5;
export const LETTERS = ['B', 'I', 'N', 'G', 'O'];

export const QUESTION_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));
export const QUESTION_IDS = QUESTIONS.map((q) => q.id);

/** Odd boards give the centre away; even boards have no centre to give. */
export const hasFreeCell = (size) => size % 2 === 1;

export const isFreeCell = (row, col, size) =>
  hasFreeCell(size) && row === (size - 1) / 2 && col === (size - 1) / 2;

/** How many answers a card of this size actually holds. */
export const answersPerCard = (size) => size * size - (hasFreeCell(size) ? 1 : 0);

if (QUESTIONS.length < answersPerCard(5)) {
  throw new Error(
    `Question bank too small: ${QUESTIONS.length} questions, need at least ${answersPerCard(5)}.`,
  );
}

/** Fisher-Yates over a copy, using a CSPRNG so cards and draws are genuinely fair. */
function shuffled(source) {
  const pool = [...source];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

/**
 * Deal a card: distinct question IDs, row-major, `null` at the free centre on
 * odd sizes. With a bank of 46, every player gets a visibly different subset.
 */
export function generateBoard(size = DEFAULT_SIZE) {
  if (!BOARD_SIZES.includes(size)) throw new Error(`Illegal board size ${size}`);
  const picks = shuffled(QUESTION_IDS).slice(0, answersPerCard(size));
  const board = [];
  let cursor = 0;
  for (let r = 0; r < size; r += 1) {
    const row = [];
    for (let c = 0; c < size; c += 1) {
      if (isFreeCell(r, c, size)) row.push(null);
      else {
        row.push(picks[cursor]);
        cursor += 1;
      }
    }
    board.push(row);
  }
  return board;
}

/* ── Lines ──────────────────────────────────────────────────────────────────── */

const linesCache = new Map();

/** N rows + N columns + 2 diagonals, precomputed once per size. */
export function linesFor(size) {
  if (linesCache.has(size)) return linesCache.get(size);
  const lines = [];
  for (let r = 0; r < size; r += 1) {
    lines.push({ id: `row-${r}`, cells: Array.from({ length: size }, (_, c) => [r, c]) });
  }
  for (let c = 0; c < size; c += 1) {
    lines.push({ id: `col-${c}`, cells: Array.from({ length: size }, (_, r) => [r, c]) });
  }
  lines.push({ id: 'diag-tl-br', cells: Array.from({ length: size }, (_, i) => [i, i]) });
  lines.push({
    id: 'diag-tr-bl',
    cells: Array.from({ length: size }, (_, i) => [i, size - 1 - i]),
  });
  linesCache.set(size, lines);
  return lines;
}

/**
 * Rehydrate stored line IDs into full {id, cells} objects for a given size.
 * Persistence keeps only IDs; the client renders `line.cells`, so a restored
 * winner must come back with the same shape a live one has.
 */
export function linesByIds(ids, size = DEFAULT_SIZE) {
  const byId = new Map(linesFor(size).map((line) => [line.id, line]));
  return (ids ?? []).map((id) => byId.get(id)).filter(Boolean);
}

export const cellKey = (row, col) => `${row}-${col}`;

/* ── Marking ────────────────────────────────────────────────────────────────── */

/**
 * A mark is CORRECT when the question sitting in that cell has actually been
 * asked. Marking an answer to a question nobody asked is the mistake the rules
 * say must invalidate a bingo.
 */
export function isCorrectMark(board, askedSet, row, col) {
  if (isFreeCell(row, col, board.length)) return true;
  const questionId = board[row]?.[col];
  return questionId != null && askedSet.has(questionId);
}

/** Every mark the player made that isn't justified by an asked question. */
export function findWrongMarks(board, marks, askedSet) {
  const wrong = [];
  for (const key of marks) {
    const [row, col] = key.split('-').map(Number);
    if (!isCorrectMark(board, askedSet, row, col)) wrong.push([row, col]);
  }
  return wrong;
}

/** A cell counts toward a line if the player marked it, or it's the free centre. */
const isMarked = (marks, row, col, size) =>
  isFreeCell(row, col, size) || marks.has(cellKey(row, col));

/** Lines the player has fully marked. Says nothing about whether marks are correct. */
export function findMarkedLines(marks, size = DEFAULT_SIZE) {
  return linesFor(size).filter((line) => line.cells.every(([r, c]) => isMarked(marks, r, c, size)));
}

/**
 * The single authority on a bingo claim. Size comes from the board itself.
 *
 * `strict` (default) rejects when ANY mark on the card is wrong, not just the
 * ones on the completed line — "you can't call bingo if you made a mistake".
 */
export function verifyClaim(board, marks, askedSet, { strict = true } = {}) {
  if (askedSet.size === 0) return { ok: false, reason: 'NOT_STARTED' };

  const size = board.length;
  const lines = findMarkedLines(marks, size);
  if (lines.length === 0) return { ok: false, reason: 'NO_BINGO' };

  const scope = strict
    ? marks
    : new Set(lines.flatMap((line) => line.cells.map(([r, c]) => cellKey(r, c))));
  const wrong = findWrongMarks(board, scope, askedSet);

  if (wrong.length > 0) return { ok: false, reason: 'WRONG_MARKS', wrongCount: wrong.length };

  return { ok: true, lines };
}

/* ── Paper boards ───────────────────────────────────────────────────────────── */

/**
 * Progress of a PRINTED board, tracked by the host. A paper player marks a cell
 * whenever its question is asked, so their marks are — by definition — exactly
 * the asked set intersected with their card. No claim flow: the host sees the
 * board reach bingo here and checks the physical sheet.
 */
export function paperProgress(cells, askedSet) {
  const size = cells.length;
  let marked = 0;
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (cells[r][c] === null || askedSet.has(cells[r][c])) marked += 1;
    }
  }

  let needs = size;
  for (const line of linesFor(size)) {
    let missing = 0;
    for (const [r, c] of line.cells) {
      if (cells[r][c] !== null && !askedSet.has(cells[r][c])) missing += 1;
    }
    if (missing < needs) needs = missing;
  }

  return { marked, needs, won: needs === 0 };
}

/* ── Game state ─────────────────────────────────────────────────────────────── */

export function createGameState(size = DEFAULT_SIZE) {
  if (!BOARD_SIZES.includes(size)) throw new Error(`Illegal board size ${size}`);
  return {
    size,
    status: 'idle', // idle | running | paused | finished
    asked: [], // [{ questionId, index }] in the order the host revealed them
    askedSet: new Set(), // O(1) membership — what mark validation reads
    remaining: shuffled(QUESTION_IDS),
    winners: [],
    startedAt: null,
  };
}

/**
 * Reveal the next question. Host-driven only — there is no timer anywhere in
 * this file or in server.js.
 */
export function askNextQuestion(state) {
  if (state.remaining.length === 0) return null;

  const questionId = state.remaining.shift();
  const record = { questionId, index: state.asked.length + 1 };
  state.asked.push(record);
  state.askedSet.add(questionId);
  return record;
}

/** The correct answer for an asked question, in both languages. Host-facing only. */
export function answerFor(questionId) {
  const question = QUESTION_BY_ID.get(questionId);
  return question ? { he: question.he.a, en: question.en.a } : null;
}
