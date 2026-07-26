/**
 * Client-side line detection over the player's OWN marks.
 *
 * This is a UI convenience only — it lights up the BINGO button when a line is
 * complete. It cannot tell whether the marks are CORRECT, because the client is
 * never told which question each cell answers (see the server header comment).
 * The server owns the verdict.
 */
const SIZE = 5;
export const FREE = { row: 2, col: 2 };

export const isFreeCell = (row, col) => row === FREE.row && col === FREE.col;
export const cellKey = (row, col) => `${row}-${col}`;

export const LINES = (() => {
  const lines = [];
  for (let r = 0; r < SIZE; r += 1) {
    lines.push({ id: `row-${r}`, cells: Array.from({ length: SIZE }, (_, c) => [r, c]) });
  }
  for (let c = 0; c < SIZE; c += 1) {
    lines.push({ id: `col-${c}`, cells: Array.from({ length: SIZE }, (_, r) => [r, c]) });
  }
  lines.push({ id: 'diag-tl-br', cells: Array.from({ length: SIZE }, (_, i) => [i, i]) });
  lines.push({ id: 'diag-tr-bl', cells: Array.from({ length: SIZE }, (_, i) => [i, SIZE - 1 - i]) });
  return lines;
})();

const isMarked = (marks, r, c) => isFreeCell(r, c) || marks.has(cellKey(r, c));

/** Lines the player has fully marked — says nothing about correctness. */
export function findMarkedLines(marks) {
  return LINES.filter((line) => line.cells.every(([r, c]) => isMarked(marks, r, c)));
}

/** Flatten lines into a Set of "r-c" keys for O(1) lookups while rendering. */
export function cellKeySet(lines) {
  const keys = new Set();
  for (const line of lines ?? []) {
    for (const [r, c] of line.cells) keys.add(cellKey(r, c));
  }
  return keys;
}
