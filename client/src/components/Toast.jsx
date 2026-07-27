import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';

import { useI18n } from '../lib/i18n';

/** Bottom-centre feedback for rejected claims. Dismissal is handled by the hook. */
export default function Toast({ feedback }) {
  const { t } = useI18n();

  return (
    <AnimatePresence>
      {feedback && (
        <motion.div
          key={feedback.id}
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-fit max-w-[calc(100vw-1.5rem)] items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50/95 px-4 py-3 text-sm font-semibold text-rose-700 shadow-2xl shadow-rose-200/50 backdrop-blur-xl sm:bottom-6 sm:px-5"
        >
          <AlertCircle className="h-4.5 w-4.5 shrink-0" />
          {t(`error.${feedback.code}`, { count: feedback.count })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
