import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { socket } from '../lib/socket';
import { cellKey, cellKeySet, findMarkedLines, isFreeCell } from '../lib/bingo';

const PLAYER_ID_KEY = 'bingo:playerId';
const PLAYER_NAME_KEY = 'bingo:playerName';

/**
 * The server speaks in codes, never in prose — it stays language-agnostic and
 * the UI decides how to say it. Anything outside this set collapses to 'generic'.
 */
const KNOWN_CLAIM_ERRORS = new Set([
  'NO_BINGO',
  'WRONG_MARKS',
  'NOT_JOINED',
  'NOT_STARTED',
  'TOO_FAST',
]);

/**
 * All socket wiring lives here so components stay presentational.
 *
 * Marks are authoritative on the server. Tapping a cell updates local state
 * optimistically for instant feedback, then reconciles with whatever the server
 * acks — so a dropped packet can never leave the card out of sync.
 */
export function useBingoGame({ adminCredential } = {}) {
  const [connected, setConnected] = useState(socket.connected);
  const [me, setMe] = useState(null); // { playerId, name, board }
  const [marks, setMarks] = useState(() => new Set());
  const [asked, setAsked] = useState([]); // [{ index, he, en }] in reveal order
  const [status, setStatus] = useState('idle');
  const [total, setTotal] = useState(0);
  const [online, setOnline] = useState(0);
  const [winner, setWinner] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [roster, setRoster] = useState(null);

  const nameRef = useRef(localStorage.getItem(PLAYER_NAME_KEY) ?? '');
  const adminCredentialRef = useRef(adminCredential);
  adminCredentialRef.current = adminCredential;

  const applyState = useCallback((state) => {
    if (!state) return;
    setStatus(state.status);
    setAsked(state.asked ?? []);
    setTotal(state.total ?? 0);
    setWinner(state.winners?.at(-1) ?? null);
  }, []);

  /** Ask for a seat. Re-sends our playerId so a refresh keeps the same card. */
  const emitJoin = useCallback(() => {
    if (!nameRef.current) return;
    socket.emit(
      'join',
      { name: nameRef.current, playerId: localStorage.getItem(PLAYER_ID_KEY) },
      (res) => {
        if (!res?.ok) return;
        localStorage.setItem(PLAYER_ID_KEY, res.player.playerId);
        localStorage.setItem(PLAYER_NAME_KEY, res.player.name);
        setMe(res.player);
        setMarks(new Set(res.player.marks ?? []));
        applyState(res.state);
      },
    );
  }, [applyState]);

  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
      emitJoin(); // also covers automatic reconnects
      // Re-authenticate the admin channel: room membership dies with the socket.
      if (adminCredentialRef.current) {
        socket.emit('admin_auth', adminCredentialRef.current, (res) => {
          if (res?.ok) setRoster(res.roster);
        });
      }
    };
    const onDisconnect = () => setConnected(false);

    const onQuestion = (payload) => {
      // `index` is monotonic, so a duplicate around a reconnect is a no-op.
      setAsked((prev) => ((prev.at(-1)?.index ?? 0) >= payload.index ? prev : [...prev, payload]));
      setStatus('running');
    };

    const onNewBoard = ({ board, marks: nextMarks }) => {
      setMe((prev) => (prev ? { ...prev, board } : prev));
      setMarks(new Set(nextMarks ?? []));
    };

    const onGameStatus = ({ status: next }) => setStatus(next);
    const onPresence = ({ online: count }) => setOnline(count);
    const onWinner = (payload) => setWinner(payload);
    const onGameOver = ({ state }) => applyState({ ...state, status: 'finished' });
    const onRoster = (payload) => setRoster(payload);

    const onReset = ({ state }) => {
      setWinner(null);
      setMarks(new Set());
      applyState(state);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('next_question', onQuestion);
    socket.on('new_board', onNewBoard);
    socket.on('game_status', onGameStatus);
    socket.on('presence', onPresence);
    socket.on('bingo_winner', onWinner);
    socket.on('game_over', onGameOver);
    socket.on('game_reset', onReset);
    socket.on('roster', onRoster);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('next_question', onQuestion);
      socket.off('new_board', onNewBoard);
      socket.off('game_status', onGameStatus);
      socket.off('presence', onPresence);
      socket.off('bingo_winner', onWinner);
      socket.off('game_over', onGameOver);
      socket.off('game_reset', onReset);
      socket.off('roster', onRoster);
    };
  }, [applyState, emitJoin]);

  // Logging in AFTER the socket is already up (the /admin flow) must also join
  // the admin room — the connect handler above only covers fresh connections.
  useEffect(() => {
    if (!adminCredential || !socket.connected) return;
    socket.emit('admin_auth', adminCredential, (res) => {
      if (res?.ok) setRoster(res.roster);
    });
  }, [adminCredential]);

  // Toasts clear themselves.
  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(null), 3200);
    return () => clearTimeout(timer);
  }, [feedback]);

  const join = useCallback(
    (name) => {
      nameRef.current = name?.trim() || 'Player';
      localStorage.setItem(PLAYER_NAME_KEY, nameRef.current);
      if (socket.connected) emitJoin();
      else socket.connect();
    },
    [emitJoin],
  );

  /** Toggle a cell. Optimistic, then reconciled against the server's answer. */
  const toggleMark = useCallback((row, col) => {
    if (isFreeCell(row, col)) return;
    const key = cellKey(row, col);

    setMarks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

    socket.emit('mark', { row, col }, (res) => {
      if (res?.ok) setMarks(new Set(res.marks));
    });
  }, []);

  const claim = useCallback(() => {
    if (!socket.connected) return;
    setClaiming(true);
    socket.emit('bingo_claim', null, (res) => {
      setClaiming(false);
      if (res?.ok) return;
      setFeedback({
        id: Date.now(),
        code: KNOWN_CLAIM_ERRORS.has(res?.reason) ? res.reason : 'generic',
        count: res?.wrongCount,
      });
    });
  }, []);

  /* ── Derived view state ──────────────────────────────────────────────────── */

  const current = asked.at(-1) ?? null;
  const markedLines = useMemo(() => findMarkedLines(marks), [marks]);
  const iWon = Boolean(winner && me && winner.playerId === me.playerId);

  // Highlight the server-confirmed winning lines if we won; otherwise preview
  // the line the player has completed (which may still contain wrong marks).
  const winningCells = useMemo(
    () => cellKeySet(iWon ? winner.lines : markedLines),
    [iWon, winner, markedLines],
  );

  return {
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
    hasLine: markedLines.length > 0,
    winningCells,
    claiming,
    feedback,
    roster,
    join,
    claim,
    toggleMark,
    dismissWinner: useCallback(() => setWinner(null), []),
  };
}
