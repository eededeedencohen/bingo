import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion, useReducedMotion } from 'motion/react';
import { PartyPopper, X } from 'lucide-react';

import { useI18n } from '../lib/i18n';

const COLORS = ['#38bdf8', '#a78bfa', '#f472b6', '#fbbf24', '#34d399'];

/**
 * Celebration layer. One big burst on mount, then ~2s of side cannons.
 * canvas-confetti draws to its own canvas, so nothing here forces React re-renders.
 */
export default function WinOverlay({ winner, isMe, onClose }) {
  const reduced = useReducedMotion();
  const { t } = useI18n();

  useEffect(() => {
    if (reduced) return undefined;

    confetti({ particleCount: 180, spread: 100, origin: { y: 0.55 }, colors: COLORS, scalar: 1.1 });

    let frameId;
    const end = performance.now() + 2200;
    const tick = (now) => {
      confetti({ particleCount: 4, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors: COLORS });
      confetti({ particleCount: 4, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors: COLORS });
      if (now < end) frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [reduced]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.7, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 20 }}
        className="glass relative w-full max-w-md overflow-hidden p-8 text-center"
      >
        {/* Slow rotating glow behind the card. */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-24 bg-[conic-gradient(from_0deg,#38bdf8,#a78bfa,#f472b6,#fbbf24,#38bdf8)] opacity-20 blur-3xl"
          animate={reduced ? undefined : { rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 end-4 z-10 rounded-full p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative">
          <motion.div
            animate={reduced ? undefined : { rotate: [0, -12, 12, 0], y: [0, -8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-pink-500 shadow-2xl shadow-amber-500/40"
          >
            <PartyPopper className="h-10 w-10 text-white" strokeWidth={2} />
          </motion.div>

          <h2 className="bg-gradient-to-r from-amber-300 via-pink-300 to-sky-300 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent">
            {t('win.title')}
          </h2>

          <p className="mt-3 text-lg text-slate-200">
            {isMe ? (
              t('win.you')
            ) : (
              // bdi so a Latin name can't drag Hebrew punctuation to the wrong end
              <bdi>{t('win.other', { name: winner.name })}</bdi>
            )}
          </p>

          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-slate-400">
            <Stat label={t('win.questions')} value={winner.askedCount} />
            <Stat label={t('win.lines')} value={winner.lines.length} />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-7 w-full rounded-2xl bg-white/10 py-3 font-semibold text-white transition-colors hover:bg-white/20"
          >
            {t('win.close')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-2xl font-bold tabular-nums text-white">{value}</div>
      <div className="text-xs tracking-widest uppercase">{label}</div>
    </div>
  );
}
