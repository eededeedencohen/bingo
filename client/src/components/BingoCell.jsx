import { memo } from 'react';
// `motion` is Framer Motion's current package name — same library, same API.
import { AnimatePresence, motion } from 'motion/react';
import { Check, Star } from 'lucide-react';

import { COLUMNS } from '../lib/theme';
import { useI18n } from '../lib/i18n';

/**
 * One answer on the card. Tapping toggles the mark — nothing is ever marked
 * automatically, and the cell gives no hint about whether the mark is right.
 * That verdict belongs to the server, at claim time.
 */
function BingoCell({ cell, row, col, marked, isWinning, onToggle }) {
  const { t, lang } = useI18n();
  const style = COLUMNS[col];
  const isFree = cell === null;
  const label = isFree ? t('cell.free') : (cell[lang] ?? cell.en);

  return (
    <motion.button
      type="button"
      disabled={isFree}
      onClick={() => onToggle(row, col)}
      aria-pressed={marked}
      aria-label={label}
      whileTap={isFree ? undefined : { scale: 0.93 }}
      className="relative aspect-square rounded-2xl focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none disabled:cursor-default"
    >
      <div className="absolute inset-0 rounded-2xl border border-white/10 bg-white/[0.03]" />

      <AnimatePresence>
        {marked && (
          <motion.div
            key="fill"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.3, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${style.fill} shadow-lg ${style.glow}`}
          />
        )}
      </AnimatePresence>

      {isWinning && (
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-2xl ring-2 ring-white/80"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {marked && !isFree && (
        <motion.span
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.05 }}
          className="absolute top-1 end-1 z-20 rounded-full bg-white/25 p-0.5"
        >
          <Check className="h-3 w-3 text-white" strokeWidth={3.5} />
        </motion.span>
      )}

      <div className="relative flex h-full items-center justify-center p-1.5">
        {isFree ? (
          <div className="flex flex-col items-center gap-0.5">
            <Star
              className={`h-5 w-5 ${marked ? 'text-white' : style.text}`}
              fill="currentColor"
              strokeWidth={0}
            />
            <span
              className={`text-[9px] font-bold ${marked ? 'text-white/90' : 'text-slate-400'}`}
            >
              {label}
            </span>
          </div>
        ) : (
          // Answers vary from 3 to 14 characters, so the type scales down a step
          // on the longer ones rather than overflowing a small square.
          <span
            className={`text-center leading-tight font-bold hyphens-auto ${
              label.length > 9 ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'
            } ${marked ? 'text-white' : 'text-slate-200'}`}
          >
            {label}
          </span>
        )}
      </div>
    </motion.button>
  );
}

export default memo(BingoCell);
