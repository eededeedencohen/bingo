import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Printer, Trophy, Users, WifiOff } from 'lucide-react';

import { useI18n } from '../lib/i18n';

/**
 * Who is connected and how close each of them is, live.
 *
 * The payload arrives only on the admin socket room, and it deliberately does
 * NOT include anyone's card — a roster row never needs one, and shipping 60
 * cards to this channel would be a cheat vector.
 *
 * Rows are pre-sorted server-side by "cells still needed", so whoever is closest
 * to bingo is always at the top, which is what a host is actually watching for.
 */
export default function PlayerRoster({ roster }) {
  const { t } = useI18n();
  const players = roster?.players ?? [];

  return (
    <div className="glass p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-widest text-sk-gray uppercase">
        <Users className="h-3.5 w-3.5" />
        <span>{t('roster.title')}</span>
        <span className="ms-auto normal-case tabular-nums text-slate-400">
          {t('roster.online', { count: roster?.online ?? 0 })}
        </span>
      </div>

      {players.length === 0 ? (
        <p className="py-2 text-sm text-sk-gray">{t('roster.empty')}</p>
      ) : (
        <ul className="max-h-80 space-y-1.5 overflow-y-auto pe-1">
          <AnimatePresence initial={false}>
            {players.map((player) => (
              <motion.li
                key={player.playerId}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                className={`flex items-center gap-2 rounded-xl p-2.5 text-sm ${
                  player.won
                    ? 'bg-sk-purple-soft ring-1 ring-sk-purple/30'
                    : player.needs === 1
                      ? 'bg-sk-teal-soft ring-1 ring-sk-teal-2/40'
                      : 'bg-slate-50'
                }`}
              >
                {player.paper && <Printer className="h-3.5 w-3.5 shrink-0 text-sk-purple-2" />}
                <span
                  className={`truncate font-semibold ${
                    player.connected ? 'text-sk-ink' : 'text-slate-400'
                  }`}
                >
                  {/* bdi keeps a Latin name from dragging Hebrew punctuation around */}
                  <bdi>{player.paper ? t('roster.paper', { id: player.name }) : player.name}</bdi>
                </span>

                {!player.connected && <WifiOff className="h-3.5 w-3.5 shrink-0 text-slate-400" />}

                <span className="ms-auto flex shrink-0 items-center gap-2">
                  {player.wrong > 0 && (
                    <span
                      title={t('roster.wrong', { n: player.wrong })}
                      className="flex items-center gap-1 text-xs font-semibold text-rose-600"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {player.wrong}
                    </span>
                  )}

                  {player.won ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-sk-purple">
                      <Trophy className="h-3.5 w-3.5" />
                      {t('roster.won')}
                    </span>
                  ) : player.needs === 1 ? (
                    <span className="text-xs font-bold text-sk-teal-3">
                      {t('roster.closeToWin')}
                    </span>
                  ) : (
                    <span className="text-xs tabular-nums text-sk-gray" dir="ltr">
                      {player.marked}/{player.cells ?? 25}
                    </span>
                  )}
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
