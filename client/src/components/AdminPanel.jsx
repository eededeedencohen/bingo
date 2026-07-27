import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  DoorClosed,
  DoorOpen,
  Download,
  Eye,
  EyeOff,
  Pause,
  Play,
  Plus,
  Printer,
  SkipForward,
  X,
} from 'lucide-react';

import { SERVER_URL } from '../lib/socket';
import { useI18n } from '../lib/i18n';

/**
 * Host controls. Reached via the /admin login (or the legacy ?admin= key), and
 * every action hits the key/token-protected REST API.
 *
 * There is no timer anywhere: a question is revealed if and only if the host
 * presses the button.
 */
export default function AdminPanel({ credential, status, lobbyOpen, remaining }) {
  const { t, lang } = useI18n();
  const [busy, setBusy] = useState(null);
  const [denied, setDenied] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [showKey, setShowKey] = useState(false);
  const [paper, setPaper] = useState([]);
  const [paperInput, setPaperInput] = useState('');
  const [paperError, setPaperError] = useState(null); // { code, vars }
  const [downloading, setDownloading] = useState(null);

  const call = useCallback(
    async (path, method = 'POST', body) => {
      setBusy(path);
      try {
        const headers = credential?.token
          ? { 'x-admin-token': credential.token }
          : { 'x-admin-key': credential?.key ?? '' };
        if (body) headers['Content-Type'] = 'application/json';
        const response = await fetch(`${SERVER_URL}/api/admin/${path}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });
        setDenied(response.status === 401);
        return response.ok || response.status === 404 ? response.json() : null;
      } finally {
        setBusy(null);
      }
    },
    [credential],
  );

  // The registered printed boards live server-side; reload whenever the game
  // opens or closes — closing wipes them there, and the chips must follow.
  useEffect(() => {
    call('paper', 'GET').then((data) => {
      if (data?.registered) setPaper(data.registered);
    });
  }, [call, lobbyOpen]);

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

  const newRound = async (size) => {
    // A tap here wipes every card — make the host mean it.
    if (!window.confirm(t('admin.resetConfirm', { size }))) return;
    await call('reset', 'POST', { size });
  };

  const openGame = (size) => call('open', 'POST', { size });

  const closeGame = async () => {
    if (!window.confirm(t('admin.closeConfirm'))) return;
    await call('close');
  };

  const addPaper = async (event) => {
    event.preventDefault();
    const id = paperInput.trim();
    if (!id) return;
    const data = await call('paper', 'POST', { id });
    if (data?.mismatched?.length) {
      const bad = data.mismatched[0];
      setPaperError({
        code: 'admin.paperSizeMismatch',
        vars: { id: bad.id, size: bad.size, game: data.gameSize },
      });
    } else if (data?.unknown?.length) {
      setPaperError({ code: 'admin.paperInvalid' });
    } else {
      setPaperError(null);
      setPaperInput('');
    }
    if (data?.registered) setPaper(data.registered);
  };

  const removePaper = async (id) => {
    const data = await call(`paper/${id}`, 'DELETE');
    if (data?.registered) setPaper(data.registered);
  };

  /** Fetch with the auth header, then hand the browser a blob to save. */
  const downloadPdf = async (size) => {
    setDownloading(size);
    try {
      const headers = credential?.token
        ? { 'x-admin-token': credential.token }
        : { 'x-admin-key': credential?.key ?? '' };
      const response = await fetch(`${SERVER_URL}/api/admin/print/${size}`, { headers });
      if (!response.ok) return;
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `shekel-bingo-${size}x${size}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  };

  const exhausted = remaining === 0;

  /* Closed lobby: the ONLY action is opening a game (at a chosen size). */
  if (lobbyOpen === false) {
    return (
      <div className="glass p-4">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-widest text-sk-gray uppercase">
          <DoorClosed className="h-3.5 w-3.5" />
          {t('admin.controls')}
        </p>

        <p className="mb-3 rounded-xl bg-sk-teal-soft/60 p-3 text-sm text-sk-ink ring-1 ring-sk-teal-2/30">
          {t('admin.closedNotice')}
        </p>

        <p className="mb-2 text-[10px] font-semibold tracking-widest text-sk-gray uppercase">
          {t('admin.openTitle')}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[3, 4, 5].map((size) => (
            <motion.button
              key={size}
              type="button"
              onClick={() => openGame(size)}
              disabled={busy !== null}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex flex-col items-center gap-1 rounded-2xl bg-gradient-to-br from-sk-teal-2 to-sk-purple py-3.5 font-bold text-white shadow-lg shadow-sk-purple/30 disabled:opacity-50"
            >
              <DoorOpen className="h-5 w-5" />
              <span dir="ltr">{size}×{size}</span>
            </motion.button>
          ))}
        </div>

        {denied && (
          <p className="mt-3 text-xs font-semibold text-rose-600">{t('admin.unauthorized')}</p>
        )}
      </div>
    );
  }

  return (
    <div className="glass p-4">
      <p className="mb-3 text-xs font-semibold tracking-widest text-sk-gray uppercase">
        {t('admin.controls')}
      </p>

      <motion.button
        type="button"
        onClick={next}
        disabled={busy !== null || exhausted}
        whileHover={{ scale: exhausted ? 1 : 1.02 }}
        whileTap={{ scale: exhausted ? 1 : 0.98 }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sk-teal-2 via-sk-purple-2 to-sk-purple py-3.5 font-bold text-white shadow-lg shadow-sk-purple/30 disabled:opacity-40"
      >
        <SkipForward className="h-5 w-5" />
        {exhausted ? t('admin.exhausted') : t('admin.next')}
      </motion.button>

      <div className="mt-2 grid grid-cols-2 gap-2">
        {status === 'paused' ? (
          <Secondary onClick={() => call('resume')} disabled={busy !== null} Icon={Play}>
            {t('admin.resume')}
          </Secondary>
        ) : (
          <Secondary onClick={() => call('pause')} disabled={busy !== null} Icon={Pause}>
            {t('admin.pause')}
          </Secondary>
        )}
        <Secondary onClick={toggleKey} disabled={busy !== null} Icon={showKey ? EyeOff : Eye}>
          {t('admin.answerKey')}
        </Secondary>
      </div>

      {/* New round — the host picks the board size. */}
      <p className="mt-4 mb-2 text-[10px] font-semibold tracking-widest text-sk-gray uppercase">
        {t('admin.newRound')}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {[3, 4, 5].map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => newRound(size)}
            disabled={busy !== null}
            className="rounded-xl bg-white py-2.5 text-sm font-bold text-sk-purple shadow-sm ring-1 ring-sk-purple/15 transition-colors hover:bg-sk-purple-soft disabled:opacity-50"
            dir="ltr"
          >
            {size}×{size}
          </button>
        ))}
      </div>

      {/* Printed boards the host handed out. */}
      <p className="mt-4 mb-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-widest text-sk-gray uppercase">
        <Printer className="h-3.5 w-3.5" />
        {t('admin.paperTitle')}
      </p>
      <form onSubmit={addPaper} className="flex gap-2">
        <input
          value={paperInput}
          onChange={(event) => {
            setPaperInput(event.target.value);
            setPaperError(false);
          }}
          inputMode="numeric"
          placeholder={t('admin.paperPlaceholder')}
          dir="ltr"
          className="min-w-0 flex-1 rounded-xl border border-sk-purple/15 bg-white px-3 py-2 text-sm text-sk-ink placeholder:text-slate-400 focus:border-transparent focus:ring-2 focus:ring-sk-purple/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy !== null || !paperInput.trim()}
          className="flex items-center gap-1 rounded-xl bg-sk-purple px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-sk-purple-2 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {t('admin.paperAdd')}
        </button>
      </form>
      {paperError && (
        <p className="mt-2 text-xs font-semibold text-rose-600">
          {t(paperError.code, paperError.vars)}
        </p>
      )}
      {paper.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {paper.map((id) => (
            <span
              key={id}
              className="flex items-center gap-1 rounded-full bg-sk-teal-soft px-2.5 py-1 text-xs font-bold text-sk-teal-3 ring-1 ring-sk-teal-2/30"
              dir="ltr"
            >
              {id}
              <button
                type="button"
                onClick={() => removePaper(id)}
                aria-label={`remove ${id}`}
                className="rounded-full p-0.5 hover:bg-white/60"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <p className="mt-2 text-[11px] leading-snug text-sk-gray">{t('admin.paperHint')}</p>

      {/* The print-ready PDF sheets, downloadable right here. */}
      <p className="mt-3 mb-1.5 text-[10px] font-semibold tracking-widest text-sk-gray uppercase">
        {t('admin.paperDownload')}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {[3, 4, 5].map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => downloadPdf(size)}
            disabled={downloading !== null}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-white py-2 text-xs font-bold text-sk-teal-3 shadow-sm ring-1 ring-sk-teal-2/30 transition-colors hover:bg-sk-teal-soft disabled:opacity-50"
            dir="ltr"
          >
            <Download className="h-3.5 w-3.5" />
            {downloading === size ? '…' : `${size}×${size}`}
          </button>
        ))}
      </div>

      {/* Ending the event is deliberate and rare — quiet styling, loud confirm. */}
      <button
        type="button"
        onClick={closeGame}
        disabled={busy !== null}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
      >
        <DoorClosed className="h-4 w-4" />
        {t('admin.close')}
      </button>

      {denied && (
        <p className="mt-3 text-xs font-semibold text-rose-600">{t('admin.unauthorized')}</p>
      )}

      <AnimatePresence>
        {showKey && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="mt-4 mb-2 text-[10px] font-semibold tracking-widest text-sk-purple/80 uppercase">
              {t('admin.answerKeyHint')}
            </p>
            {answers.length === 0 ? (
              <p className="text-sm text-sk-gray">{t('admin.noAnswers')}</p>
            ) : (
              <ul className="max-h-56 space-y-1.5 overflow-y-auto pe-1">
                {[...answers].reverse().map((item) => (
                  <li key={item.index} className="rounded-lg bg-sk-purple-soft/70 p-2 text-xs">
                    <span className="text-sk-gray">{item[lang]?.q ?? item.en.q}</span>
                    <span className="mt-0.5 block font-bold text-sk-teal-3">
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
      className="flex items-center justify-center gap-1.5 rounded-xl bg-white px-2 py-2.5 text-[11px] font-semibold text-slate-700 shadow-sm ring-1 ring-sk-purple/15 transition-colors hover:bg-sk-purple-soft disabled:opacity-50"
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}
