import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { LogOut } from 'lucide-react';

import { useBingoGame } from './hooks/useBingoGame';
import { useAdminAuth } from './hooks/useAdminAuth';
import { useI18n } from './lib/i18n';
import TopBar from './components/TopBar';
import BingoBoard from './components/BingoBoard';
import QuestionCard from './components/QuestionCard';
import AskedList from './components/AskedList';
import ClaimButton from './components/ClaimButton';
import WinOverlay from './components/WinOverlay';
import JoinScreen from './components/JoinScreen';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';
import PlayerRoster from './components/PlayerRoster';
import Toast from './components/Toast';

// The host page lives at /admin (username/password). ?admin=<key> keeps working
// anywhere as the legacy machine credential.
const IS_ADMIN_PAGE = window.location.pathname.replace(/\/+$/, '') === '/admin';

/**
 * Composition root. All socket state comes from `useBingoGame`.
 *
 * Two very different experiences share it:
 *  - players join, get a card, mark and claim;
 *  - the HOST never joins and has no card — they run the game's lifecycle
 *    (open → questions → close) and watch the roster.
 */
export default function App() {
  const { t } = useI18n();
  const authState = useAdminAuth();
  const isAdmin = (IS_ADMIN_PAGE || Boolean(authState.credential?.key)) && authState.authorized;

  const adminCredential = isAdmin ? authState.credential : null;

  const {
    connected,
    me,
    lobbyOpen,
    marks,
    markedCount,
    asked,
    current,
    status,
    total,
    online,
    winner,
    iWon,
    hasLine,
    winningCells,
    claiming,
    feedback,
    roster,
    join,
    claim,
    toggleMark,
    dismissWinner,
  } = useBingoGame({ adminCredential, spectator: Boolean(adminCredential) });

  const [joining, setJoining] = useState(false);

  // /admin gate: wait for the token check, then demand a login.
  if (IS_ADMIN_PAGE && !authState.credential?.key) {
    if (authState.authorized === null) return null; // token check in flight (<100ms)
    if (!authState.authorized) {
      return (
        <AdminLogin onLogin={authState.loginWith} busy={authState.busy} error={authState.error} />
      );
    }
  }

  /* ── Host view: no card, no claim — lifecycle, roster, and the question. ──── */
  if (isAdmin) {
    return (
      <div className="mx-auto min-h-dvh w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-8">
        <TopBar connected={connected} online={online} status={status} hostMode />

        <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
          <section className="space-y-4">
            <QuestionCard
              current={current}
              asked={asked.length}
              total={total}
              answer={roster?.currentAnswer ?? null}
            />
            <AdminPanel
              credential={adminCredential}
              status={status}
              lobbyOpen={lobbyOpen}
              remaining={total - asked.length}
            />
            {adminCredential.token && (
              <button
                type="button"
                onClick={authState.signOut}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-sk-gray transition-colors hover:bg-sk-purple/5 hover:text-sk-ink"
              >
                <LogOut className="h-3.5 w-3.5" />
                {t('login.signOut')}
              </button>
            )}
          </section>

          <section className="space-y-4 self-start">
            <PlayerRoster roster={roster} />
            <AskedList asked={asked} />
          </section>
        </div>

        <AnimatePresence>
          {winner && <WinOverlay winner={winner} isMe={false} onClose={dismissWinner} />}
        </AnimatePresence>
      </div>
    );
  }

  /* ── Player view ──────────────────────────────────────────────────────────── */

  if (!me) {
    return (
      <JoinScreen
        lobbyOpen={lobbyOpen}
        connecting={joining && !connected}
        onJoin={(name) => {
          setJoining(true);
          join(name);
        }}
      />
    );
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-8">
      <TopBar connected={connected} online={online} status={status} playerName={me.name} />

      {/*
       * Mobile-first ordering (everyone plays from a phone): the DOM order IS
       * the mobile order — question first, then the card and the BINGO button,
       * then everything below the fold. On lg the same sections land in a
       * two-column grid: board in the wide column, sidebar in the narrow one
       * (mirrored automatically under RTL).
       */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-5">
        <section className="space-y-4 lg:col-start-2 lg:row-start-1">
          <QuestionCard current={current} asked={asked.length} total={total} />
        </section>

        <section className="space-y-4 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <BingoBoard
            board={me.board}
            marks={marks}
            winningCells={winningCells}
            onToggle={toggleMark}
          />

          <ClaimButton
            onClaim={claim}
            hasBingo={hasLine}
            claiming={claiming}
            disabled={!connected || iWon}
            markedCount={markedCount}
          />
        </section>

        <section className="space-y-4 self-start lg:col-start-2 lg:row-start-2">
          <AskedList asked={asked} />
        </section>
      </div>

      <AnimatePresence>
        {winner && <WinOverlay winner={winner} isMe={iWon} onClose={dismissWinner} />}
      </AnimatePresence>

      <Toast feedback={feedback} />
    </div>
  );
}
