import { motion } from 'motion/react';
import { Sparkles, Users, Wifi, WifiOff } from 'lucide-react';

import { useI18n } from '../lib/i18n';
import LanguageToggle from './LanguageToggle';

export default function TopBar({ connected, online, status, playerName }) {
  const { t } = useI18n();

  return (
    <header className="mb-6 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/30">
          <Sparkles className="h-6 w-6 text-white" strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-xl leading-tight font-extrabold tracking-tight sm:text-2xl">
            {t('app.title')} <span className="text-slate-400">{t('app.titleAccent')}</span>
          </h1>
          {playerName && (
            <p className="text-xs text-slate-400">
              {/* bdi isolates a Latin name inside a Hebrew sentence */}
              <bdi>{t('topbar.playingAs', { name: playerName })}</bdi>
            </p>
          )}
        </div>
      </div>

      {/* ms-auto, not ml-auto: this has to hug the trailing edge in RTL too. */}
      <div className="ms-auto flex flex-wrap items-center gap-2">
        <LanguageToggle />

        <Pill>
          <Users className="h-3.5 w-3.5 text-slate-400" />
          <span className="tabular-nums">{online}</span>
        </Pill>

        <Pill>
          <span
            className={`h-2 w-2 rounded-full ${status === 'running' ? 'bg-emerald-400' : 'bg-slate-500'}`}
          />
          {t(`status.${status}`)}
        </Pill>

        <Pill tone={connected ? 'ok' : 'bad'}>
          {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {connected ? t('status.connected') : t('status.offline')}
        </Pill>
      </div>
    </header>
  );
}

function Pill({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'text-slate-300 ring-white/10',
    ok: 'text-emerald-300 ring-emerald-400/30',
    bad: 'text-rose-300 ring-rose-400/30',
  };
  return (
    <motion.span
      layout
      className={`flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold ring-1 ${tones[tone]}`}
    >
      {children}
    </motion.span>
  );
}
