/**
 * Client-side line detection over the player's OWN marks.
 *
 * This is a UI convenience only — it lights up the BINGO button when a line is
 * complete. It cannot tell whether the marks are CORRECT, because the client is
 * never told which question each cell answers (see the server header comment).
 * The server owns the verdict.
 *
 * Boards come in 3×3, 4×4 or 5×5; everything here derives the geometry from the
 * size it is handed. Odd sizes have a FREE centre; 4×4 has none.
 */
export const isFreeCell = (row, col, size) =>
  size % 2 === 1 && row === (size - 1) / 2 && col === (size - 1) / 2;

export const cellKey = (row, col) => `${row}-${col}`;

const linesCache = new Map();

/** N rows + N columns + 2 diagonals, cached per size. */
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
  lines.push({ id: 'diag-tr-bl', cells: Array.from({ length: size }, (_, i) => [i, size - 1 - i]) });
  linesCache.set(size, lines);
  return lines;
}

const isMarked = (marks, r, c, size) => isFreeCell(r, c, size) || marks.has(cellKey(r, c));

/** Lines the player has fully marked — says nothing about correctness. */
export function findMarkedLines(marks, size) {
  return linesFor(size).filter((line) => line.cells.every(([r, c]) => isMarked(marks, r, c, size)));
}

/** Flatten lines into a Set of "r-c" keys for O(1) lookups while rendering. */
export function cellKeySet(lines) {
  const keys = new Set();
  for (const line of lines ?? []) {
    for (const [r, c] of line.cells) keys.add(cellKey(r, c));
  }
  return keys;
}
