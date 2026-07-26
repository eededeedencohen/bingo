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
          className="fixed inset-x-0 bottom-6 z-40 mx-auto flex w-fit items-center gap-2.5 rounded-2xl border border-rose-400/30 bg-rose-500/15 px-5 py-3 text-sm font-semibold text-rose-100 shadow-2xl backdrop-blur-xl"
        >
          <AlertCircle className="h-4.5 w-4.5 shrink-0" />
          {t(`error.${feedback.code}`, { count: feedback.count })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
