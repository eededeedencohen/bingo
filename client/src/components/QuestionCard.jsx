import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Eye, HelpCircle, MousePointerClick } from 'lucide-react';

import { useI18n } from '../lib/i18n';

/**
 * The current question — the hero of the screen. Keyed on the question index so
 * each new one mounts a fresh element and AnimatePresence runs a real
 * enter/exit pair.
 *
 * When `answer` is provided (the host's page only — the payload it rides in
 * never reaches players), tapping the question toggles the answer, and the
 * toggle re-hides itself on every new question.
 */
export default function QuestionCard({ current, asked, total, answer = null }) {
  const { t, lang } = useI18n();
  const [showAnswer, setShowAnswer] = useState(false);

  // A new question always starts hidden — the reveal is a per-question choice.
  useEffect(() => {
    setShowAnswer(false);
  }, [current?.index]);

  const canReveal = Boolean(answer && current);
  const answerText = answer ? (answer[lang] ?? answer.en) : null;

  const questionBody = (
    <AnimatePresence mode="wait">
      {current ? (
        <motion.div
          key={current.index}
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        >
          <p className="text-center text-xl leading-snug font-bold text-sk-ink sm:text-3xl">
            {current[lang] ?? current.en}
          </p>
          <AnimatePresence>
            {canReveal && showAnswer && (
              <motion.p
                key="answer"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mx-auto mt-3 w-fit rounded-full bg-sk-teal-soft px-4 py-1.5 text-base font-bold text-sk-teal-3 ring-1 ring-sk-teal-2/40 sm:text-lg"
              >
                {t('question.answerLabel')}: {answerText}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
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
  );

  return (
    <div className="glass relative overflow-hidden p-4 sm:p-8">
      <div className="mb-3 flex items-center justify-between text-xs font-semibold tracking-widest text-sk-gray uppercase sm:mb-5">
        <span className="flex items-center gap-2">
          <HelpCircle className="h-3.5 w-3.5" />
          {current ? t('question.label', { n: current.index }) : t('app.titleAccent')}
        </span>
        {/* No forced dir: the string carries Hebrew words ("מתוך"), and pinning
            it LTR scrambled the word order. The page direction lays it out right
            in both languages. */}
        <span className="tabular-nums">{t('question.counter', { asked, total })}</span>
      </div>

      {canReveal ? (
        <button
          type="button"
          onClick={() => setShowAnswer((v) => !v)}
          className="flex min-h-20 w-full items-center justify-center rounded-2xl transition-colors hover:bg-sk-purple/5 focus-visible:ring-2 focus-visible:ring-sk-purple/50 focus-visible:outline-none sm:min-h-40"
        >
          <div>{questionBody}</div>
        </button>
      ) : (
        <div className="flex min-h-20 items-center justify-center sm:min-h-40">{questionBody}</div>
      )}

      {canReveal && (
        <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-sk-gray">
          <Eye className="h-3.5 w-3.5 shrink-0" />
          {showAnswer ? t('question.tapToHide') : t('question.tapForAnswer')}
        </p>
      )}

      {current && !canReveal && (
        <p className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-sk-gray sm:mt-5 sm:text-sm">
          <MousePointerClick className="h-4 w-4 shrink-0" />
          {t('question.hint')}
        </p>
      )}

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-sk-purple/10 sm:mt-5">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-sk-teal via-sk-purple-2 to-sk-purple"
          animate={{ width: total ? `${(asked / total) * 100}%` : '0%' }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}
