/**
 * game.js — pure Bingo rules. No Express, no Socket.io, no I/O.
 *
 * THE GAME
 * Cards hold ANSWERS, not numbers. The host reveals a question; each player
 * looks for that question's answer on their own card and marks it themselves.
 * Nothing is marked automatically and nothing advances on a timer.
 *
 * A cell stores a QUESTION ID, not the answer text — the client renders the
 * answer in whichever language the player chose, so one board serves both
 * Hebrew and English players.
 */
import { randomInt } from 'node:crypto';

import { QUESTIONS } from './questions.js';

export { QUESTIONS };

export const LETTERS = ['B', 'I', 'N', 'G', 'O'];
export const BOARD_SIZE = 5;
export const CELLS = BOARD_SIZE * BOARD_SIZE;
export const ANSWERS_PER_CARD = CELLS - 1; // 24 — the centre is FREE
export const FREE_CELL = { row: 2, col: 2 };

export const QUESTION_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));
export const QUESTION_IDS = QUESTIONS.map((q) => q.id);

if (QUESTIONS.length < ANSWERS_PER_CARD) {
  throw new Error(
    `Question bank too small: ${QUESTIONS.length} questions, need at least ${ANSWERS_PER_CARD}.`,
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
 * Deal a card: 24 distinct question IDs, row-major, `null` in the centre.
 *
 * With a bank of N questions every player gets a different subset, so two
 * players rarely share a card even though every card answers the same questions.
 */
export function generateBoard() {
  const picks = shuffled(QUESTION_IDS).slice(0, ANSWERS_PER_CARD);
  const board = [];
  let cursor = 0;
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    const row = [];
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      if (r === FREE_CELL.row && c === FREE_CELL.col) row.push(null);
      else {
        row.push(picks[cursor]);
        cursor += 1;
      }
    }
    board.push(row);
  }
  return board;
}

/** 5 rows + 5 columns + 2 diagonals, precomputed once. */
export const LINES = (() => {
  const lines = [];
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    lines.push({ id: `row-${r}`, cells: Array.from({ length: BOARD_SIZE }, (_, c) => [r, c]) });
  }
  for (let c = 0; c < BOARD_SIZE; c += 1) {
    lines.push({ id: `col-${c}`, cells: Array.from({ length: BOARD_SIZE }, (_, r) => [r, c]) });
  }
  lines.push({ id: 'diag-tl-br', cells: Array.from({ length: BOARD_SIZE }, (_, i) => [i, i]) });
  lines.push({
    id: 'diag-tr-bl',
    cells: Array.from({ length: BOARD_SIZE }, (_, i) => [i, BOARD_SIZE - 1 - i]),
  });
  return lines;
})();

const LINES_BY_ID = new Map(LINES.map((line) => [line.id, line]));

/**
 * Rehydrate stored line IDs into full {id, cells} objects. Persistence keeps
 * only IDs; the client renders `line.cells`, so a restored winner must come back
 * with the same shape a live one has.
 */
export function linesByIds(ids) {
  return (ids ?? []).map((id) => LINES_BY_ID.get(id)).filter(Boolean);
}

export const cellKey = (row, col) => `${row}-${col}`;
export const isFreeCell = (row, col) => row === FREE_CELL.row && col === FREE_CELL.col;

/* ── Marking ────────────────────────────────────────────────────────────────── */

/**
 * A mark is CORRECT when the question sitting in that cell has actually been
 * asked. Marking an answer to a question nobody asked is the mistake the rules
 * say must invalidate a bingo.
 */
export function isCorrectMark(board, askedSet, row, col) {
  if (isFreeCell(row, col)) return true;
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

/** A cell counts toward a line if the player marked it, or it's the FREE centre. */
const isMarked = (marks, row, col) => isFreeCell(row, col) || marks.has(cellKey(row, col));

/** Lines the player has fully marked. Says nothing about whether marks are correct. */
export function findMarkedLines(marks) {
  return LINES.filter((line) => line.cells.every(([r, c]) => isMarked(marks, r, c)));
}

/**
 * The single authority on a bingo claim.
 *
 * `strict` (default) rejects when ANY mark on the card is wrong, not just the
 * ones on the completed line — "you can't call bingo if you made a mistake".
 * Set strict=false to judge only the completed line.
 */
export function verifyClaim(board, marks, askedSet, { strict = true } = {}) {
  if (askedSet.size === 0) return { ok: false, reason: 'NOT_STARTED' };

  const lines = findMarkedLines(marks);
  if (lines.length === 0) return { ok: false, reason: 'NO_BINGO' };

  const scope = strict
    ? marks
    : new Set(lines.flatMap((line) => line.cells.map(([r, c]) => cellKey(r, c))));
  const wrong = findWrongMarks(board, scope, askedSet);

  if (wrong.length > 0) return { ok: false, reason: 'WRONG_MARKS', wrongCount: wrong.length };

  return { ok: true, lines };
}

/* ── Game state ─────────────────────────────────────────────────────────────── */

export function createGameState() {
  return {
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
