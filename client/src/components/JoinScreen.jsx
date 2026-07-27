import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

import { useI18n } from '../lib/i18n';
import LanguageToggle from './LanguageToggle';

/** Name gate. Nothing connects to the socket until the player commits. */
export default function JoinScreen({ onJoin, connecting }) {
  const { t, isRtl } = useI18n();
  const [name, setName] = useState(localStorage.getItem('bingo:playerName') ?? '');

  const submit = (event) => {
    event.preventDefault();
    onJoin(name);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        className="glass w-full max-w-sm p-8"
      >
        <div className="mb-6 flex justify-center">
          <LanguageToggle />
        </div>

        {/* The SHEKEL figures front the app (mark only, no wordmark). */}
        <motion.img
          src="/shekel-mark.png"
          alt='שק"ל'
          className="mx-auto mb-6 h-auto w-60 drop-shadow-sm"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        <h1 className="text-center text-3xl font-extrabold tracking-tight">
          {t('app.title')} <span className="text-sk-purple-2">{t('app.titleAccent')}</span>
        </h1>
        <p className="mt-2 text-center text-sm text-sk-gray">{t('join.subtitle')}</p>

        <label
          htmlFor="name"
          className="mt-8 mb-2 block text-xs font-semibold tracking-widest text-sk-gray uppercase"
        >
          {t('join.nameLabel')}
        </label>
        <input
          id="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={24}
          autoComplete="nickname"
          placeholder={t('join.namePlaceholder')}
          className="w-full rounded-2xl border border-sk-purple/15 bg-white px-4 py-3 text-sk-ink placeholder:text-slate-400 focus:border-transparent focus:ring-2 focus:ring-sk-purple/60 focus:outline-none"
        />

        <motion.button
          type="submit"
          disabled={connecting}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sk-teal-2 via-sk-purple-2 to-sk-purple py-3.5 font-bold text-white shadow-lg shadow-sk-purple/30 disabled:opacity-60"
        >
          {connecting ? t('join.connecting') : t('join.submit')}
          {/* The arrow points at the reading direction, so it mirrors in Hebrew. */}
          <ArrowRight className={`h-5 w-5 ${isRtl ? 'rotate-180' : ''}`} />
        </motion.button>
      </motion.form>
    </div>
  );
}
