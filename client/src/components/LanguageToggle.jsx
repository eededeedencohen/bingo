import { useId } from 'react';
import { motion } from 'motion/react';

import { LANGUAGES, useI18n } from '../lib/i18n';

/** Segmented EN/עברית switch. The active pill slides with a shared layoutId. */
export default function LanguageToggle({ className = '' }) {
  const { lang, setLang, t } = useI18n();
  // Instance-scoped: this component is mounted in both JoinScreen and TopBar, and
  // a shared layoutId would fly the pill across the viewport the moment anyone
  // wraps that transition in AnimatePresence.
  const pillId = useId();

  return (
    <div
      aria-label={t('lang.switch')}
      className={`flex items-center gap-1 rounded-full bg-white/5 p-1 ring-1 ring-white/10 ${className}`}
    >
      {LANGUAGES.map((option) => {
        const active = option.code === lang;
        return (
          <button
            key={option.code}
            type="button"
            onClick={() => setLang(option.code)}
            aria-pressed={active}
            className={`relative rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {active && (
              <motion.span
                layoutId={`lang-pill-${pillId}`}
                className="absolute inset-0 rounded-full bg-gradient-to-r from-sky-500 to-violet-500"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
