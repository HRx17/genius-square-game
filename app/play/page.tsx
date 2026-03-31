'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Board from '@/components/Board';
import PieceTray from '@/components/PieceTray';
import DiceRoll from '@/components/DiceRoll';
import GameTimer from '@/components/GameTimer';
import {
  PIECES, createBoard, canPlace, placeOnGrid, removeFromGrid,
  isWin, countFilled, getNextOrientation, getFlippedCells, getAllOrientations,
  getPieceById,
} from '@/lib/gameLogic';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import Link from 'next/link';

type GameMode = 'solo' | 'ai' | 'online' | 'private' | 'guest' | null;
type GameStatus = 'mode-select' | 'matchmaking' | 'waiting-private' | 'dice-rolling' | 'playing' | 'won' | 'lost' | 'opponent-win';

export default function PlayPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [mode, setMode] = useState<GameMode>(null);
  const [status, setStatus] = useState<GameStatus>('mode-select');
  const [grid, setGrid] = useState<(string | null)[][]>(Array.from({ length: 6 }, () => Array(6).fill(null)));
  const [opponentGrid, setOpponentGrid] = useState<(string | null)[][]>(Array.from({ length: 6 }, () => Array(6).fill(null)));
  const [diceRoll, setDiceRoll] = useState<string[]>([]);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [selectedOrientation, setSelectedOrientation] = useState<[number, number][]>([]);
  const [placedPieceIds, setPlacedPieceIds] = useState<string[]>([]);
  const [opponentPlacedCount, setOpponentPlacedCount] = useState(0);
  const [gameStartTime, setGameStartTime] = useState<number>(0);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState<string>('');
  const [privateRoomId, setPrivateRoomId] = useState<string>('');
  const [joinRoomInput, setJoinRoomInput] = useState('');
  const [winDuration, setWinDuration] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [myFilledCount, setMyFilledCount] = useState(0);
  const [opponentFilledCount, setOpponentFilledCount] = useState(0);
  const [copied, setCopied] = useState(false);

  const socketRef = useRef<ReturnType<typeof connectSocket> | null>(null);

  // Handle URL mode param
  useEffect(() => {
    const urlMode = searchParams.get('mode') as GameMode;
    const urlRoom = searchParams.get('room');
    if (urlMode) setMode(urlMode);
    if (urlRoom) setJoinRoomInput(urlRoom);
  }, [searchParams]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') handleRotate();
      if (e.key === 'f' || e.key === 'F') handleFlip();
      if (e.key === 'Escape') { setSelectedPieceId(null); setSelectedOrientation([]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedOrientation]);

  function initGame(dice: string[]) {
    const newGrid = createBoard(dice);
    setGrid(newGrid);
    setOpponentGrid(createBoard(dice));
    setDiceRoll(dice);
    setPlacedPieceIds([]);
    setSelectedPieceId(null);
    setSelectedOrientation([]);
    setMyFilledCount(0);
    setOpponentFilledCount(0);
    setOpponentPlacedCount(0);
    setStatus('dice-rolling');
  }

  function afterDiceReveal() {
    setGameStartTime(Date.now());
    setStatus('playing');
    if (mode === 'ai') {
      socketRef.current?.emit('start_ai_game');
    }
  }

  // Socket setup for online modes
  useEffect(() => {
    if (mode !== 'online' && mode !== 'ai' && mode !== 'solo' && mode !== 'private' && mode !== 'guest') return;

    const s = connectSocket();
    socketRef.current = s;

    // Matchmaking
    s.on('matched', ({ roomId: rid, diceRoll: dice, opponent }) => {
      setRoomId(rid);
      setOpponentName(opponent.username);
      initGame(dice);
    });

    s.on('queue_joined', () => setStatus('matchmaking'));
    s.on('private_room_created', ({ roomId: rid }) => {
      setPrivateRoomId(rid);
      setStatus('waiting-private');
    });

    // AI events
    s.on('ai_game_started', ({ diceRoll: dice }) => {
      initGame(dice);
    });

    s.on('ai_placed', ({ pieceId, orientation, anchorRow, anchorCol }) => {
      setOpponentGrid(prev => {
        if (!canPlace(prev, orientation, anchorRow, anchorCol)) return prev;
        const next = placeOnGrid(prev, orientation, anchorRow, anchorCol, pieceId);
        setOpponentFilledCount(countFilled(next));
        if (isWin(next)) {
          setStatus(prev2 => prev2 === 'won' ? 'won' : 'lost');
        }
        return next;
      });
      setOpponentPlacedCount(c => c + 1);
    });

    // Solo
    s.on('solo_game_started', ({ diceRoll: dice }) => {
      initGame(dice);
    });

    // Piece sync (online)
    s.on('opponent_placed', ({ pieceId, orientation, anchorRow, anchorCol, filledCount }) => {
      setOpponentGrid(prev => {
        if (!canPlace(prev, orientation, anchorRow, anchorCol)) return prev;
        return placeOnGrid(prev, orientation, anchorRow, anchorCol, pieceId);
      });
      setOpponentFilledCount(filledCount);
      setOpponentPlacedCount(c => c + 1);
    });

    s.on('opponent_removed', ({ pieceId }) => {
      setOpponentGrid(prev => removeFromGrid(prev, pieceId));
      setOpponentPlacedCount(c => Math.max(0, c - 1));
    });

    s.on('game_over', ({ winnerId, winnerName, duration }) => {
      const myUserId = typeof window !== 'undefined' ? (window as any).__userId : null;
      setWinDuration(duration);
      setOpponentName(winnerName);
      setStatus(s2 => s2 === 'won' ? 'won' : 'opponent-win');
    });

    s.on('opponent_disconnected', () => {
      setStatus('won');
      setWinDuration(Date.now() - gameStartTime);
      setOpponentName('Opponent (disconnected)');
    });

    s.on('error', ({ message }) => setErrorMsg(message));

    return () => {
      s.off('matched');
      s.off('queue_joined');
      s.off('ai_game_started');
      s.off('ai_placed');
      s.off('solo_game_started');
      s.off('opponent_placed');
      s.off('opponent_removed');
      s.off('game_over');
      s.off('opponent_disconnected');
      s.off('private_room_created');
      s.off('error');
    };
  }, [mode]);

  // Start game based on mode
  const startGame = useCallback((selectedMode: GameMode) => {
    setMode(selectedMode);
    setErrorMsg('');

    if (selectedMode === 'solo' || selectedMode === 'guest') {
      socketRef.current?.emit('start_solo_game');
    } else if (selectedMode === 'ai') {
      // AI game started via socket after it confirms
      socketRef.current?.emit('start_ai_game');
    } else if (selectedMode === 'online') {
      socketRef.current?.emit('join_queue');
    } else if (selectedMode === 'private') {
      socketRef.current?.emit('create_private_room');
    }
  }, []);

  const joinPrivateRoom = useCallback(() => {
    if (!joinRoomInput.trim()) return;
    socketRef.current?.emit('join_private_room', { roomId: joinRoomInput.trim() });
  }, [joinRoomInput]);

  // Piece placement
  const handleCellClick = useCallback((row: number, col: number) => {
    if (status !== 'playing' || !selectedPieceId) return;
    if (!canPlace(grid, selectedOrientation, row, col)) return;

    const newGrid = placeOnGrid(grid, selectedOrientation, row, col, selectedPieceId);
    setGrid(newGrid);
    const newFilled = countFilled(newGrid);
    setMyFilledCount(newFilled);
    setPlacedPieceIds(prev => [...prev, selectedPieceId]);

    // Sync to server (online/ai modes)
    if (mode === 'online' && roomId) {
      socketRef.current?.emit('place_piece', {
        roomId, pieceId: selectedPieceId, orientation: selectedOrientation, anchorRow: row, anchorCol: col,
      });
    }

    setSelectedPieceId(null);
    setSelectedOrientation([]);

    if (isWin(newGrid)) {
      const duration = Date.now() - gameStartTime;
      setWinDuration(duration);
      setStatus('won');
      if (mode === 'solo' || mode === 'guest') {
        socketRef.current?.emit('solo_win', { duration });
      }
    }
  }, [status, selectedPieceId, selectedOrientation, grid, mode, roomId, gameStartTime]);

  const handleRemovePiece = useCallback((pieceId: string) => {
    if (status !== 'playing') return;
    const newGrid = removeFromGrid(grid, pieceId);
    setGrid(newGrid);
    setMyFilledCount(countFilled(newGrid));
    setPlacedPieceIds(prev => prev.filter(id => id !== pieceId));

    if (mode === 'online' && roomId) {
      socketRef.current?.emit('remove_piece', { roomId, pieceId });
    }
  }, [status, grid, mode, roomId]);

  const handleSelectPiece = (pieceId: string, orientation: [number, number][]) => {
    setSelectedPieceId(pieceId);
    setSelectedOrientation(orientation);
  };

  const handleRotate = () => {
    if (!selectedOrientation.length) return;
    setSelectedOrientation(getNextOrientation(selectedOrientation));
  };

  const handleFlip = () => {
    if (!selectedOrientation.length) return;
    setSelectedOrientation(getFlippedCells(selectedOrientation));
  };

  const playAgain = () => {
    setStatus('mode-select');
    setMode(null);
    setGrid(Array.from({ length: 6 }, () => Array(6).fill(null)));
    setOpponentGrid(Array.from({ length: 6 }, () => Array(6).fill(null)));
    setDiceRoll([]);
    setRoomId(null);
    setPrivateRoomId('');
  };

  const copyRoomLink = () => {
    const url = `${window.location.origin}/play?mode=private&room=${privateRoomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalSquares = 29;

  // Render mode selection
  if (status === 'mode-select' || mode === null) {
    return (
      <div style={{ padding: '48px 24px', maxWidth: 960, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'Orbitron,sans-serif', fontSize: '2rem', marginBottom: 8, textAlign: 'center' }}>Select Game Mode</h1>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 40 }}>Choose how you want to play</p>

        {errorMsg && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px', marginBottom: 24, color: 'var(--danger)', textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        <div className="mode-grid">
          <button className="mode-card" style={{ '--card-accent': 'rgba(34,197,94,0.12)', border: 'none', cursor: 'pointer', width: '100%' } as React.CSSProperties}
            onClick={() => startGame('solo')}>
            <span className="mode-icon">🧘</span>
            <h3 className="mode-title">Solo Practice</h3>
            <p className="mode-desc">Solve the puzzle at your own pace. No account needed.</p>
          </button>

          <button className="mode-card" style={{ '--card-accent': 'rgba(6,182,212,0.12)', border: 'none', cursor: 'pointer', width: '100%' } as React.CSSProperties}
            onClick={() => startGame('ai')}>
            <span className="mode-icon">🤖</span>
            <h3 className="mode-title">vs AI</h3>
            <p className="mode-desc">Race against our puzzle-solving AI. Can you beat the algorithm?</p>
          </button>

          <button className="mode-card" style={{ '--card-accent': 'rgba(99,102,241,0.15)', border: 'none', cursor: 'pointer', width: '100%' } as React.CSSProperties}
            onClick={() => startGame('online')}>
            <span className="mode-icon">🌍</span>
            <h3 className="mode-title">1v1 Online</h3>
            <p className="mode-desc">Get matched with a live opponent worldwide.</p>
            <div style={{ marginTop: 8 }}><span className="badge badge-primary">MULTIPLAYER</span></div>
          </button>

          <div className="mode-card" style={{ '--card-accent': 'rgba(236,72,153,0.12)' } as React.CSSProperties}>
            <span className="mode-icon">🔗</span>
            <h3 className="mode-title" style={{ marginBottom: 12 }}>Private Room</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => startGame('private')}>
                Create Room
              </button>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="form-input" style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                  placeholder="Paste room ID…"
                  value={joinRoomInput}
                  onChange={e => setJoinRoomInput(e.target.value)} />
                <button className="btn btn-primary btn-sm" onClick={joinPrivateRoom}>Join</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Matchmaking waiting
  if (status === 'matchmaking') {
    return (
      <div style={{ minHeight: 'calc(100vh - 75px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
        <div className="matchmaking-pulse">
          <span style={{ fontSize: '2rem' }}>🎮</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'Orbitron,sans-serif', fontSize: '1.5rem', marginBottom: 8 }}>Finding Opponent…</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Matching you with another player</p>
        </div>
        <button className="btn btn-secondary" onClick={() => { socketRef.current?.emit('leave_queue'); setStatus('mode-select'); setMode(null); }}>
          Cancel
        </button>
      </div>
    );
  }

  // Private room waiting
  if (status === 'waiting-private') {
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/play?mode=private&room=${privateRoomId}` : '';
    return (
      <div style={{ minHeight: 'calc(100vh - 75px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
        <div className="matchmaking-pulse">
          <span style={{ fontSize: '2rem' }}>🔗</span>
        </div>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <h2 style={{ fontFamily: 'Orbitron,sans-serif', fontSize: '1.5rem', marginBottom: 8 }}>Private Room Created</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>Share the link below with your friend. The game starts when they join!</p>
          <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--text-secondary)', wordBreak: 'break-all', marginBottom: 12 }}>
            <span style={{ flex: 1 }}>{shareUrl}</span>
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={copyRoomLink}>
            {copied ? '✓ Copied!' : '📋 Copy Link'}
          </button>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setStatus('mode-select')}>Cancel</button>
      </div>
    );
  }

  // Dice rolling
  if (status === 'dice-rolling') {
    return (
      <div style={{ minHeight: 'calc(100vh - 75px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 32 }}>
        <h2 style={{ fontFamily: 'Orbitron,sans-serif', fontSize: '1.75rem' }}>Rolling Dice…</h2>
        <DiceRoll diceRoll={diceRoll} onComplete={afterDiceReveal} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>These squares will be blocked on both boards</p>
      </div>
    );
  }

  // Win / End overlays
  const showOverlay = status === 'won' || status === 'lost' || status === 'opponent-win';

  const isMultiplayer = mode === 'online' || mode === 'ai' || mode === 'private';

  return (
    <div style={{ position: 'relative' }}>
      {/* Win overlay */}
      {showOverlay && (
        <div className="win-overlay">
          <div className="win-card">
            <span className="win-emoji">{status === 'won' ? '🏆' : '😅'}</span>
            <h2 style={{ fontFamily: 'Orbitron,sans-serif', fontSize: '1.75rem', marginBottom: 8 }}>
              {status === 'won' ? 'You Win!' : status === 'lost' ? 'AI Won!' : `${opponentName} Wins!`}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: '0.95rem' }}>
              {status === 'won' ? `Solved in ${(winDuration / 1000).toFixed(1)}s` : `Better luck next time!`}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={playAgain}>Play Again</button>
              <Link href="/leaderboard" className="btn btn-secondary">Leaderboard</Link>
            </div>
          </div>
        </div>
      )}

      {/* Main game layout */}
      <div className="game-screen">
        {/* Left sidebar — piece tray */}
        <div className="game-sidebar">
          <div className="card" style={{ padding: 16 }}>
            <PieceTray
              placedPieceIds={placedPieceIds}
              selectedPieceId={selectedPieceId}
              selectedOrientation={selectedOrientation}
              onSelectPiece={handleSelectPiece}
              onRotate={handleRotate}
              onFlip={handleFlip}
              onDeselect={() => { setSelectedPieceId(null); setSelectedOrientation([]); }}
            />
          </div>
        </div>

        {/* Center — main board */}
        <div className="game-center">
          {/* Dice display */}
          <div className="card" style={{ padding: '12px 20px', width: '100%' }}>
            <DiceRoll diceRoll={diceRoll} />
          </div>

          {/* Timer + progress */}
          <div className="card" style={{ padding: '12px 20px', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'Orbitron,sans-serif', letterSpacing: '0.1em', marginBottom: 2 }}>YOUR TIME</div>
              <GameTimer running={status === 'playing'} startTime={gameStartTime} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'Orbitron,sans-serif', letterSpacing: '0.1em', marginBottom: 4 }}>
                YOUR PROGRESS
              </div>
              <div style={{ width: 140 }}>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(myFilledCount / totalSquares) * 100}%` }} />
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'right', marginTop: 2 }}>
                  {myFilledCount}/{totalSquares}
                </div>
              </div>
            </div>
          </div>

          {/* My board label */}
          <div style={{ width: '100%' }}>
            <div style={{ fontSize: '0.7rem', fontFamily: 'Orbitron,sans-serif', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 8, textAlign: 'center' }}>
              YOUR BOARD
            </div>
            <Board
              grid={grid}
              selectedPieceId={selectedPieceId}
              selectedOrientation={selectedOrientation}
              onCellClick={handleCellClick}
              onRemovePiece={handleRemovePiece}
            />
          </div>

          {selectedPieceId && (
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.8rem' }} onClick={handleRotate}>↻ Rotate (R)</button>
              <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.8rem' }} onClick={handleFlip}>⇄ Flip (F)</button>
              <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => { setSelectedPieceId(null); setSelectedOrientation([]); }}>✕</button>
            </div>
          )}
        </div>

        {/* Right sidebar — opponent / AI */}
        <div className="game-sidebar">
          {isMultiplayer ? (
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'Orbitron,sans-serif', letterSpacing: '0.1em', marginBottom: 12 }}>
                {mode === 'ai' ? '🤖 AI OPPONENT' : `🆚 ${opponentName.toUpperCase()}`}
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Progress: {opponentFilledCount}/{totalSquares}
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(opponentFilledCount / totalSquares) * 100}%`, background: 'linear-gradient(90deg, #ef4444, #f97316)' }} />
                </div>
              </div>

              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'Orbitron,sans-serif', letterSpacing: '0.1em', marginBottom: 8, textAlign: 'center' }}>
                OPPONENT BOARD
              </div>
              <Board
                grid={opponentGrid}
                selectedPieceId={null}
                selectedOrientation={[]}
                onCellClick={() => {}}
                readOnly
                size={38}
              />
            </div>
          ) : (
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🏆</div>
              <h3 style={{ fontFamily: 'Orbitron,sans-serif', fontSize: '0.85rem', marginBottom: 8 }}>Solo Mode</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 12 }}>
                Fill all 29 squares to win!
              </p>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 4 }}>HINT</div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Start with the largest pieces. Work around blockers systematically.
              </p>
            </div>
          )}

          {/* Quick stats */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'Orbitron,sans-serif', letterSpacing: '0.1em', marginBottom: 12 }}>
              GAME INFO
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Mode</span>
                <span style={{ color: 'var(--text-accent)', textTransform: 'capitalize' }}>{mode}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Pieces left</span>
                <span>{PIECES.length - placedPieceIds.length}/9</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Squares filled</span>
                <span>{myFilledCount}/29</span>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 12, fontSize: '0.75rem' }} onClick={playAgain}>
              ↩ New Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
