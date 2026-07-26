import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Trophy, Users, WifiOff } from 'lucide-react';

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
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-widest text-slate-400 uppercase">
        <Users className="h-3.5 w-3.5" />
        <span>{t('roster.title')}</span>
        <span className="ms-auto normal-case tabular-nums text-slate-500">
          {t('roster.online', { count: roster?.online ?? 0 })}
        </span>
      </div>

      {players.length === 0 ? (
        <p className="py-2 text-sm text-slate-500">{t('roster.empty')}</p>
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
                    ? 'bg-amber-400/15 ring-1 ring-amber-400/40'
                    : player.needs === 1
                      ? 'bg-emerald-400/10 ring-1 ring-emerald-400/30'
                      : 'bg-white/5'
                }`}
              >
                <span
                  className={`truncate font-semibold ${
                    player.connected ? 'text-slate-100' : 'text-slate-500'
                  }`}
                >
                  {/* bdi keeps a Latin name from dragging Hebrew punctuation around */}
                  <bdi>{player.name}</bdi>
                </span>

                {!player.connected && <WifiOff className="h-3.5 w-3.5 shrink-0 text-slate-500" />}

                <span className="ms-auto flex shrink-0 items-center gap-2">
                  {player.wrong > 0 && (
                    <span
                      title={t('roster.wrong', { n: player.wrong })}
                      className="flex items-center gap-1 text-xs font-semibold text-rose-300"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {player.wrong}
                    </span>
                  )}

                  {player.won ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-300">
                      <Trophy className="h-3.5 w-3.5" />
                      {t('roster.won')}
                    </span>
                  ) : player.needs === 1 ? (
                    <span className="text-xs font-bold text-emerald-300">
                      {t('roster.closeToWin')}
                    </span>
                  ) : (
                    <span className="text-xs tabular-nums text-slate-400">
                      {player.marked}/25
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
