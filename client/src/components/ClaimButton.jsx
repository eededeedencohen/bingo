import { motion } from 'motion/react';
import { Loader2, Trophy } from 'lucide-react';

import { useI18n } from '../lib/i18n';

/**
 * The BINGO button. It stays clickable at all times (claiming a card you haven't
 * completed is a legitimate move — the server just says no), but it only *pulses*
 * once a real line exists, which is the whole call to action.
 */
export default function ClaimButton({ onClaim, hasBingo, disabled, claiming, markedCount }) {
  const { t } = useI18n();

  return (
    <motion.button
      type="button"
      onClick={onClaim}
      disabled={disabled || claiming}
      whileHover={{ scale: disabled ? 1 : 1.03 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      animate={
        hasBingo && !disabled
          ? { boxShadow: ['0 0 0 0 rgba(251,191,36,0)', '0 0 40px 8px rgba(251,191,36,0.55)', '0 0 0 0 rgba(251,191,36,0)'] }
          : { boxShadow: '0 0 0 0 rgba(0,0,0,0)' }
      }
      transition={{ duration: 1.6, repeat: hasBingo ? Infinity : 0, ease: 'easeInOut' }}
      className={`relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl px-6 py-5 text-xl font-extrabold tracking-widest uppercase transition-opacity disabled:cursor-not-allowed disabled:opacity-40 ${
        hasBingo
          ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 text-white'
          : 'bg-white/8 text-slate-200 ring-1 ring-white/10 hover:bg-white/12'
      }`}
    >
      {/* Light sweep across the face while a win is available. */}
      {hasBingo && (
        <span className="animate-shimmer pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.45)_50%,transparent_75%)] bg-[length:200%_100%]" />
      )}

      {claiming ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : (
        <Trophy className="h-6 w-6" strokeWidth={2.5} />
      )}
      <span className="relative">{t('claim.button')}</span>
      <span className="relative ms-1 text-xs font-semibold tracking-normal opacity-70 normal-case">
        {t('claim.marked', { n: markedCount })}
      </span>
    </motion.button>
  );
}
