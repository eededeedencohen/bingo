import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Eye, EyeOff, Pause, Play, RotateCcw, SkipForward } from 'lucide-react';

import { SERVER_URL } from '../lib/socket';
import { useI18n } from '../lib/i18n';

/**
 * Host controls. Rendered only when the page is opened as `?admin=<ADMIN_KEY>`,
 * and every action hits the key-protected REST API.
 *
 * There is no timer anywhere: a question is revealed if and only if the host
 * presses the button.
 *
 * Dev-grade on purpose — for anything public this belongs behind a real login
 * rather than a URL parameter.
 */
export default function AdminPanel({ credential, status, remaining }) {
  const { t, lang } = useI18n();
  const [busy, setBusy] = useState(null);
  const [denied, setDenied] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [showKey, setShowKey] = useState(false);

  const call = useCallback(
    async (path, method = 'POST') => {
      setBusy(path);
      try {
        const headers = credential?.token
          ? { 'x-admin-token': credential.token }
          : { 'x-admin-key': credential?.key ?? '' };
        const response = await fetch(`${SERVER_URL}/api/admin/${path}`, { method, headers });
        setDenied(response.status === 401);
        return response.ok ? response.json() : null;
      } finally {
        setBusy(null);
      }
    },
    [credential],
  );

  const loadAnswers = useCallback(async () => {
    const data = await call('answers', 'GET');
    if (data) setAnswers(data.asked ?? []);
  }, [call]);

  const next = async () => {
    await call('next');
    if (showKey) await loadAnswers();
  };

  const toggleKey = async () => {
    if (!showKey) await loadAnswers();
    setShowKey((v) => !v);
  };

  const exhausted = remaining === 0;

  return (
    <div className="glass p-4">
      <p className="mb-3 text-xs font-semibold tracking-widest text-slate-400 uppercase">
        {t('admin.controls')}
      </p>

      <motion.button
        type="button"
        onClick={next}
        disabled={busy !== null || exhausted}
        whileHover={{ scale: exhausted ? 1 : 1.02 }}
        whileTap={{ scale: exhausted ? 1 : 0.98 }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500 py-3.5 font-bold text-white shadow-lg shadow-violet-500/30 disabled:opacity-40"
      >
        <SkipForward className="h-5 w-5" />
        {exhausted ? t('admin.exhausted') : t('admin.next')}
      </motion.button>

      <div className="mt-2 grid grid-cols-3 gap-2">
        {status === 'paused' ? (
          <Secondary onClick={() => call('resume')} disabled={busy !== null} Icon={Play}>
            {t('admin.resume')}
          </Secondary>
        ) : (
          <Secondary onClick={() => call('pause')} disabled={busy !== null} Icon={Pause}>
            {t('admin.pause')}
          </Secondary>
        )}
        <Secondary onClick={() => call('reset')} disabled={busy !== null} Icon={RotateCcw}>
          {t('admin.reset')}
        </Secondary>
        <Secondary onClick={toggleKey} disabled={busy !== null} Icon={showKey ? EyeOff : Eye}>
          {t('admin.answerKey')}
        </Secondary>
      </div>

      {denied && (
        <p className="mt-3 text-xs font-semibold text-rose-300">{t('admin.unauthorized')}</p>
      )}

      <AnimatePresence>
        {showKey && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="mt-4 mb-2 text-[10px] font-semibold tracking-widest text-amber-300/80 uppercase">
              {t('admin.answerKeyHint')}
            </p>
            {answers.length === 0 ? (
              <p className="text-sm text-slate-500">{t('admin.noAnswers')}</p>
            ) : (
              <ul className="max-h-56 space-y-1.5 overflow-y-auto pe-1">
                {[...answers].reverse().map((item) => (
                  <li key={item.index} className="rounded-lg bg-white/5 p-2 text-xs">
                    <span className="text-slate-400">{item[lang]?.q ?? item.en.q}</span>
                    <span className="mt-0.5 block font-bold text-emerald-300">
                      {item[lang]?.a ?? item.en.a}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Secondary({ onClick, disabled, Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center justify-center gap-1 rounded-xl bg-white/5 px-2 py-2.5 text-[11px] font-semibold text-slate-200 ring-1 ring-white/10 transition-colors hover:bg-white/10 disabled:opacity-50"
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}
