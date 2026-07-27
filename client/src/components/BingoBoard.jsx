import { motion } from 'motion/react';

import BingoCell from './BingoCell';
import { COLUMNS } from '../lib/theme';
import { cellKey } from '../lib/bingo';

/**
 * The 5x5 card. `board` is row-major with `null` in the centre for the FREE
 * space; every other cell is `{ id, he, en }` — the answer in both languages, so
 * switching language never needs a new deal.
 */
export default function BingoBoard({ board, marks, winningCells, onToggle }) {
  if (!board) return <BoardSkeleton />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass p-3 sm:p-5"
      // The card itself never mirrors. B-I-N-G-O is the game's notation, not
      // prose — like a phone number, it reads left-to-right in every language.
      dir="ltr"
    >
      <div className="mb-2 grid grid-cols-5 gap-1.5 sm:gap-2">
        {COLUMNS.map((column) => (
          <div
            key={column.letter}
            className={`text-center text-xl font-extrabold tracking-widest sm:text-2xl ${column.text}`}
          >
            {column.letter}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {board.map((row, r) =>
          row.map((cell, c) => (
            <BingoCell
              key={cell?.id ?? `free-${r}-${c}`}
              cell={cell}
              row={r}
              col={c}
              marked={cell === null || marks.has(cellKey(r, c))}
              isWinning={winningCells.has(cellKey(r, c))}
              onToggle={onToggle}
            />
          )),
        )}
      </div>
    </motion.div>
  );
}

function BoardSkeleton() {
  return (
    <div className="glass p-3 sm:p-5">
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {Array.from({ length: 30 }, (_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-2xl bg-sk-purple/5" />
        ))}
      </div>
    </div>
  );
}
