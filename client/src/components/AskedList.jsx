import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { History } from 'lucide-react';

import { useI18n } from '../lib/i18n';

const COLLAPSED = 4;

/**
 * Everything asked so far, newest first.
 *
 * This matters more than the old number history did: a player who joined late,
 * or who was still thinking, can go back and mark an earlier answer — and the
 * server accepts that, because a mark is valid whenever its question has been
 * asked at any point.
 */
export default function AskedList({ asked }) {
  const { t, lang } = useI18n();
  const [expanded, setExpanded] = useState(false);

  const ordered = [...asked].reverse();
  const visible = expanded ? ordered : ordered.slice(0, COLLAPSED);

  return (
    <div className="glass p-3.5 sm:p-5">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-widest text-sk-gray uppercase">
        <History className="h-3.5 w-3.5" />
        <span>{t('asked.title')}</span>
        <span className="ms-auto tabular-nums text-slate-400">{asked.length}</span>
      </div>

      {asked.length === 0 ? (
        <p className="py-2 text-sm text-sk-gray">{t('asked.empty')}</p>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {visible.map((item) => (
              <motion.li
                key={item.index}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="flex gap-2.5 rounded-xl bg-sk-teal-soft/60 p-2.5 text-sm text-slate-700"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white text-[10px] font-bold tabular-nums text-sk-purple ring-1 ring-sk-purple/10">
                  {item.index}
                </span>
                <span className="leading-snug">{item[lang] ?? item.en}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {ordered.length > COLLAPSED && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 w-full rounded-xl py-2 text-xs font-semibold text-sk-gray transition-colors hover:bg-sk-purple/5 hover:text-sk-ink"
        >
          {expanded ? t('asked.collapse') : t('asked.expand')}
        </button>
      )}
    </div>
  );
}
