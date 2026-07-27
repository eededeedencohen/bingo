import { AnimatePresence, motion } from 'motion/react';
import { HelpCircle, MousePointerClick } from 'lucide-react';

import { useI18n } from '../lib/i18n';

/**
 * The current question — the hero of the screen now that there is no number to
 * reveal. Keyed on the question index so each new one mounts a fresh element and
 * AnimatePresence can run a real enter/exit pair.
 */
export default function QuestionCard({ current, asked, total }) {
  const { t, lang } = useI18n();

  return (
    <div className="glass relative overflow-hidden p-6 sm:p-8">
      <div className="mb-5 flex items-center justify-between text-xs font-semibold tracking-widest text-sk-gray uppercase">
        <span className="flex items-center gap-2">
          <HelpCircle className="h-3.5 w-3.5" />
          {current ? t('question.label', { n: current.index }) : t('app.titleAccent')}
        </span>
        <span className="tabular-nums" dir="ltr">
          {t('question.counter', { asked, total })}
        </span>
      </div>

      <div className="flex min-h-32 items-center justify-center sm:min-h-40">
        <AnimatePresence mode="wait">
          {current ? (
            <motion.p
              key={current.index}
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="text-center text-2xl leading-snug font-bold text-sk-ink sm:text-3xl"
            >
              {current[lang] ?? current.en}
            </motion.p>
          ) : (
            <motion.p
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-base font-medium text-sk-gray"
            >
              {t('question.waiting')}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {current && (
        <p className="mt-5 flex items-center justify-center gap-2 text-center text-sm text-sk-gray">
          <MousePointerClick className="h-4 w-4 shrink-0" />
          {t('question.hint')}
        </p>
      )}

      <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-sk-purple/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-sk-teal via-sk-purple-2 to-sk-purple"
          animate={{ width: total ? `${(asked / total) * 100}%` : '0%' }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}
