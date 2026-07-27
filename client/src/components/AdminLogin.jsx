import { useState } from 'react';
import { motion } from 'motion/react';
import { KeyRound, LogIn, User } from 'lucide-react';

import { useI18n } from '../lib/i18n';
import LanguageToggle from './LanguageToggle';

/** Username/password gate for the /admin page. */
export default function AdminLogin({ onLogin, busy, error }) {
  const { t } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const submit = (event) => {
    event.preventDefault();
    onLogin(username.trim(), password);
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

        <img
          src="/shekel-mark.png"
          alt='שק"ל'
          className="mx-auto mb-6 h-auto w-52 drop-shadow-sm"
        />

        <h1 className="text-center text-2xl font-extrabold tracking-tight">{t('login.title')}</h1>
        <p className="mt-2 text-center text-sm text-sk-gray">{t('login.subtitle')}</p>

        <label
          htmlFor="admin-user"
          className="mt-8 mb-2 block text-xs font-semibold tracking-widest text-sk-gray uppercase"
        >
          {t('login.username')}
        </label>
        <div className="relative">
          <User className="pointer-events-none absolute top-1/2 start-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="admin-user"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            dir="ltr"
            className="w-full rounded-2xl border border-sk-purple/15 bg-white py-3 ps-10 pe-4 text-sk-ink placeholder:text-slate-400 focus:border-transparent focus:ring-2 focus:ring-sk-purple/60 focus:outline-none"
          />
        </div>

        <label
          htmlFor="admin-pass"
          className="mt-4 mb-2 block text-xs font-semibold tracking-widest text-sk-gray uppercase"
        >
          {t('login.password')}
        </label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute top-1/2 start-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="admin-pass"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            dir="ltr"
            className="w-full rounded-2xl border border-sk-purple/15 bg-white py-3 ps-10 pe-4 text-sk-ink placeholder:text-slate-400 focus:border-transparent focus:ring-2 focus:ring-sk-purple/60 focus:outline-none"
          />
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-rose-50 p-3 text-center text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
            {t(`login.${error}`)}
          </p>
        )}

        <motion.button
          type="submit"
          disabled={busy || !username || !password}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sk-teal-2 via-sk-purple-2 to-sk-purple py-3.5 font-bold text-white shadow-lg shadow-sk-purple/30 disabled:opacity-50"
        >
          <LogIn className="h-5 w-5" />
          {busy ? t('login.checking') : t('login.submit')}
        </motion.button>
      </motion.form>
    </div>
  );
}
