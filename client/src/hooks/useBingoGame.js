import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { socket } from '../lib/socket';
import { cellKey, cellKeySet, findMarkedLines, isFreeCell } from '../lib/bingo';

const PLAYER_ID_KEY = 'bingo:playerId';
const PLAYER_NAME_KEY = 'bingo:playerName';
const GAME_ID_KEY = 'bingo:gameId';

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
 *
 * `spectator` (the host): never joins, never gets a card — the game lifecycle
 * is theirs to run, not to play. State arrives via request_state + broadcasts.
 */
export function useBingoGame({ adminCredential, spectator = false } = {}) {
  const [connected, setConnected] = useState(socket.connected);
  const [me, setMe] = useState(null); // { playerId, name, board }
  const [marks, setMarks] = useState(() => new Set());
  const [asked, setAsked] = useState([]); // [{ index, he, en }] in reveal order
  const [status, setStatus] = useState('idle');
  const [lobbyOpen, setLobbyOpen] = useState(null); // null = not yet known
  const [total, setTotal] = useState(0);
  const [online, setOnline] = useState(0);
  const [winner, setWinner] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [roster, setRoster] = useState(null);

  const nameRef = useRef(localStorage.getItem(PLAYER_NAME_KEY) ?? '');
  const adminCredentialRef = useRef(adminCredential);
  adminCredentialRef.current = adminCredential;
  const spectatorRef = useRef(spectator);
  spectatorRef.current = spectator;

  /**
   * A stored identity belongs to ONE game. When the server's gameId differs
   * from the one we joined under, that game is over: forget the name and the
   * card, and let the player introduce themselves afresh. (Refreshes and
   * reconnects inside the same game keep everything — the id matches.)
   */
  const syncIdentity = useCallback((serverGameId) => {
    if (!serverGameId) return;
    if (localStorage.getItem(GAME_ID_KEY) === serverGameId) return;
    localStorage.removeItem(PLAYER_ID_KEY);
    localStorage.removeItem(PLAYER_NAME_KEY);
    nameRef.current = '';
    setMe(null);
    setMarks(new Set());
  }, []);

  const applyState = useCallback(
    (state) => {
      if (!state) return;
      syncIdentity(state.gameId);
      setStatus(state.status);
      setLobbyOpen(state.lobbyOpen ?? null);
      setAsked(state.asked ?? []);
      setTotal(state.total ?? 0);
      setWinner(state.winners?.at(-1) ?? null);
    },
    [syncIdentity],
  );

  /** Ask for a seat. Re-sends our playerId so a refresh keeps the same card. */
  const emitJoin = useCallback(() => {
    if (!nameRef.current || spectatorRef.current) return;
    socket.emit(
      'join',
      { name: nameRef.current, playerId: localStorage.getItem(PLAYER_ID_KEY) },
      (res) => {
        if (!res?.ok) {
          // The host hasn't opened the game (or just closed it): wait on the
          // lobby event rather than surfacing an error.
          if (res?.reason === 'GAME_CLOSED') setLobbyOpen(false);
          return;
        }
        localStorage.setItem(PLAYER_ID_KEY, res.player.playerId);
        localStorage.setItem(PLAYER_NAME_KEY, res.player.name);
        // Bind this identity to the game it was created in.
        if (res.state?.gameId) localStorage.setItem(GAME_ID_KEY, res.state.gameId);
        setMe(res.player);
        setMarks(new Set(res.player.marks ?? []));
        applyState(res.state);
      },
    );
  }, [applyState]);

  // The socket connects on mount for everyone — before joining, a visitor needs
  // to hear the lobby open, and a refreshed player needs their seat back
  // without pressing anything.
  useEffect(() => {
    if (!socket.connected) socket.connect();
  }, []);

  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
      // Seed state FIRST, then join: applyState runs the gameId identity check,
      // so a stale name can never sneak into a new game.
      socket.emit('request_state', null, (res) => {
        if (res?.ok) applyState(res.state);
        emitJoin(); // no-op for spectators and for visitors with no stored name
      });
      // Re-authenticate the admin channel: room membership dies with the socket.
      if (adminCredentialRef.current) {
        socket.emit('admin_auth', adminCredentialRef.current, (res) => {
          if (res?.ok) setRoster(res.roster);
        });
      }
    };
    const onDisconnect = () => setConnected(false);

    const onLobby = ({ open, gameId }) => {
      setLobbyOpen(open);
      if (open) {
        syncIdentity(gameId); // a new game wipes yesterday's name
        emitJoin(); // auto-(re)join only if an identity survived the check
      } else {
        // Game closed: full reset. Nothing about this player carries over.
        localStorage.removeItem(PLAYER_ID_KEY);
        localStorage.removeItem(PLAYER_NAME_KEY);
        localStorage.removeItem(GAME_ID_KEY);
        nameRef.current = '';
        setMe(null);
        setMarks(new Set());
      }
    };

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
    socket.on('lobby', onLobby);
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
      socket.off('lobby', onLobby);
      socket.off('next_question', onQuestion);
      socket.off('new_board', onNewBoard);
      socket.off('game_status', onGameStatus);
      socket.off('presence', onPresence);
      socket.off('bingo_winner', onWinner);
      socket.off('game_over', onGameOver);
      socket.off('game_reset', onReset);
      socket.off('roster', onRoster);
    };
  }, [applyState, emitJoin, syncIdentity]);

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

  const boardSize = me?.board?.length ?? 5;

  /** Toggle a cell. Optimistic, then reconciled against the server's answer. */
  const toggleMark = useCallback(
    (row, col) => {
      if (isFreeCell(row, col, boardSize)) return;
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
    },
    [boardSize],
  );

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
  const markedLines = useMemo(() => findMarkedLines(marks, boardSize), [marks, boardSize]);
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
    lobbyOpen,
    boardSize,
    // What "fully marked" means depends on the free centre existing.
    markedCount: marks.size + (boardSize % 2 === 1 ? 1 : 0),
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
