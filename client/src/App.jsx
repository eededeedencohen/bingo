import { useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';

import { useBingoGame } from './hooks/useBingoGame';
import TopBar from './components/TopBar';
import BingoBoard from './components/BingoBoard';
import QuestionCard from './components/QuestionCard';
import AskedList from './components/AskedList';
import ClaimButton from './components/ClaimButton';
import WinOverlay from './components/WinOverlay';
import JoinScreen from './components/JoinScreen';
import AdminPanel from './components/AdminPanel';
import PlayerRoster from './components/PlayerRoster';
import Toast from './components/Toast';

/**
 * Composition root. All socket state comes from `useBingoGame`, so everything
 * below is presentational and easy to rearrange.
 */
export default function App() {
  // Host controls appear only for ?admin=<ADMIN_KEY>.
  const adminKey = useMemo(() => new URLSearchParams(window.location.search).get('admin'), []);

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
  } = useBingoGame({ adminKey });

  const [joining, setJoining] = useState(false);

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

          {adminKey && (
            <AdminPanel
              adminKey={adminKey}
              status={status}
              remaining={total - asked.length}
            />
          )}
          {adminKey && <PlayerRoster roster={roster} />}

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
