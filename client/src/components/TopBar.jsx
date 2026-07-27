import { motion } from 'motion/react';
import { Users, Wifi, WifiOff } from 'lucide-react';

import { useI18n } from '../lib/i18n';
import LanguageToggle from './LanguageToggle';

export default function TopBar({ connected, online, status, playerName, hostMode = false }) {
  const { t } = useI18n();

  return (
    <header className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 sm:mb-6">
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        {/* The SHEKEL figures — the brand carries the header. */}
        <img src="/shekel-mark.png" alt='שק"ל' className="h-8 w-auto drop-shadow-sm sm:h-11" />
        <div className="min-w-0">
          <h1 className="truncate text-lg leading-tight font-extrabold tracking-tight sm:text-2xl">
            {t('app.title')} <span className="text-sk-purple-2">{t('app.titleAccent')}</span>
          </h1>
          {hostMode ? (
            <p className="truncate text-[11px] font-semibold text-sk-purple-2 sm:text-xs">
              {t('topbar.host')}
            </p>
          ) : (
            playerName && (
              <p className="truncate text-[11px] text-sk-gray sm:text-xs">
                {/* bdi isolates a Latin name inside a Hebrew sentence */}
                <bdi>{t('topbar.playingAs', { name: playerName })}</bdi>
              </p>
            )
          )}
        </div>
      </div>

      {/* ms-auto, not ml-auto: this has to hug the trailing edge in RTL too. */}
      <div className="ms-auto flex flex-wrap items-center gap-1.5 sm:gap-2">
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

        {/* On a phone the connection pill earns its space only when something is
            wrong; on wider screens it is always visible. */}
        {connected ? (
          <div className="hidden sm:block">
            <Pill tone="ok">
              <Wifi className="h-3.5 w-3.5" />
              {t('status.connected')}
            </Pill>
          </div>
        ) : (
          <Pill tone="bad">
            <WifiOff className="h-3.5 w-3.5" />
            {t('status.offline')}
          </Pill>
        )}
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
      className={`flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold shadow-sm ring-1 sm:px-3 sm:py-1.5 ${tones[tone]}`}
    >
      {children}
    </motion.span>
  );
}
