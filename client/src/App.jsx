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
 * Composition root. All socket state comes from `useBingoGame`; the /admin
 * variant additionally runs the auth flow before the game mounts.
 */
export default function App() {
  const { t } = useI18n();
  const authState = useAdminAuth();
  const isAdminPage = IS_ADMIN_PAGE || Boolean(authState.credential?.key);

  // Only an authorized admin passes a credential into the game hook.
  const adminCredential = isAdminPage && authState.authorized ? authState.credential : null;

  const {
    connected,
    me,
    marks,
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
  } = useBingoGame({ adminCredential });

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

  if (!me) {
    return (
      <JoinScreen
        connecting={joining && !connected}
        onJoin={(name) => {
          setJoining(true);
          join(name);
        }}
      />
    );
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <TopBar connected={connected} online={online} status={status} playerName={me.name} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* The card anchors the desktop layout; on mobile the question comes first. */}
        <div className="order-2 space-y-4 lg:order-1">
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
            markedCount={marks.size + 1}
          />
        </div>

        <aside className="order-1 space-y-4 lg:order-2">
          <QuestionCard current={current} asked={asked.length} total={total} />

          {adminCredential && (
            <>
              <AdminPanel
                credential={adminCredential}
                status={status}
                remaining={total - asked.length}
              />
              <PlayerRoster roster={roster} />
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
            </>
          )}

          <AskedList asked={asked} />
        </aside>
      </div>

      <AnimatePresence>
        {winner && <WinOverlay winner={winner} isMe={iWon} onClose={dismissWinner} />}
      </AnimatePresence>

      <Toast feedback={feedback} />
    </div>
  );
}
