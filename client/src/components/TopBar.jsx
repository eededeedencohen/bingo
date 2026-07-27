import { motion } from 'motion/react';
import { Users, Wifi, WifiOff } from 'lucide-react';

import { useI18n } from '../lib/i18n';
import LanguageToggle from './LanguageToggle';

export default function TopBar({ connected, online, status, playerName }) {
  const { t } = useI18n();

  return (
    <header className="mb-6 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-3">
        {/* The SHEKEL figures — the brand carries the header. */}
        <img src="/shekel-mark.png" alt='שק"ל' className="h-11 w-auto drop-shadow-sm" />
        <div>
          <h1 className="text-xl leading-tight font-extrabold tracking-tight sm:text-2xl">
            {t('app.title')} <span className="text-sk-purple-2">{t('app.titleAccent')}</span>
          </h1>
          {playerName && (
            <p className="text-xs text-sk-gray">
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
          <Users className="h-3.5 w-3.5 text-sk-gray" />
          <span className="tabular-nums">{online}</span>
        </Pill>

        <Pill>
          <span
            className={`h-2 w-2 rounded-full ${status === 'running' ? 'bg-sk-teal-2' : 'bg-slate-400'}`}
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
    neutral: 'text-slate-600 ring-sk-purple/15',
    ok: 'text-sk-teal-3 ring-sk-teal-2/40',
    bad: 'text-rose-600 ring-rose-300',
  };
  return (
    <motion.span
      layout
      className={`flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold shadow-sm ring-1 ${tones[tone]}`}
    >
      {children}
    </motion.span>
  );
}
