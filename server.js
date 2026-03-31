require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const authRoutes = require('./routes/auth');
const { router: userRoutes } = require('./routes/users');
const {
  createRoom,
  createPrivateRoom,
  joinPrivateRoom,
  getRoom,
  handlePiecePlacement,
  handlePieceRemoval,
  addToQueue,
  removeFromQueue,
  matchPlayers,
  cleanupRoom,
  getRoomBySocketId,
  getUserIdBySocketId,
} = require('./game/roomManager');
const { getDb } = require('./db/database');
const { solve } = require('./game/solver');
const { PIECE_DEFINITIONS, createBoard, PIECES_WITH_ORIENTATIONS } = require('./game/gameEngine');

const JWT_SECRET = process.env.JWT_SECRET || 'genius_square_secret_2024';
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: FRONTEND_URL, credentials: true },
});

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// REST Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// === SOCKET.IO ===
function extractUser(socket) {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.cookie?.split('token=')[1]?.split(';')[0];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function updateStats(winnerId, loserId, durationMs) {
  const db = getDb();
  if (winnerId) {
    db.prepare('UPDATE user_stats SET games_played = games_played + 1, wins = wins + 1, total_solve_ms = total_solve_ms + ? WHERE user_id = ?').run(durationMs, winnerId);
    const s = db.prepare('SELECT best_solve_ms FROM user_stats WHERE user_id = ?').get(winnerId);
    if (!s.best_solve_ms || durationMs < s.best_solve_ms) {
      db.prepare('UPDATE user_stats SET best_solve_ms = ? WHERE user_id = ?').run(durationMs, winnerId);
    }
  }
  if (loserId) {
    db.prepare('UPDATE user_stats SET games_played = games_played + 1, losses = losses + 1 WHERE user_id = ?').run(loserId);
  }
}

io.on('connection', (socket) => {
  const user = extractUser(socket);
  console.log(`Socket connected: ${socket.id} user: ${user?.username || 'guest'}`);

  // === MATCHMAKING ===
  socket.on('join_queue', () => {
    if (!user) return socket.emit('error', { message: 'Must be logged in to play online' });
    addToQueue(socket.id, user.userId, user.username);
    socket.emit('queue_joined');

    const match = matchPlayers();
    if (match) {
      const p1Socket = io.sockets.sockets.get(match.p1.socketId);
      const p2Socket = io.sockets.sockets.get(match.p2.socketId);
      if (!p1Socket || !p2Socket) {
        // One disconnected; re-add the valid one
        if (p1Socket) addToQueue(match.p1.socketId, match.p1.userId, match.p1.username);
        if (p2Socket) addToQueue(match.p2.socketId, match.p2.userId, match.p2.username);
        return;
      }
      const room = createRoom(p1Socket, match.p1, p2Socket, match.p2);
      p1Socket.join(room.id);
      p2Socket.join(room.id);

      const payload = { roomId: room.id, diceRoll: room.diceRoll };
      p1Socket.emit('matched', { ...payload, opponent: { username: match.p2.username, userId: match.p2.userId } });
      p2Socket.emit('matched', { ...payload, opponent: { username: match.p1.username, userId: match.p1.userId } });
    }
  });

  socket.on('leave_queue', () => {
    removeFromQueue(socket.id);
    socket.emit('queue_left');
  });

  // === PRIVATE ROOMS ===
  socket.on('create_private_room', () => {
    if (!user) return socket.emit('error', { message: 'Must be logged in' });
    const room = createPrivateRoom(socket, { userId: user.userId, username: user.username });
    socket.join(room.id);
    socket.emit('private_room_created', { roomId: room.id });
  });

  socket.on('join_private_room', ({ roomId }) => {
    if (!user) return socket.emit('error', { message: 'Must be logged in' });
    const room = getRoom(roomId);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.status !== 'waiting') return socket.emit('error', { message: 'Room already started' });

    const hostUserId = room.playerOrder[0];
    const hostSocketId = room.players[hostUserId].socketId;
    const hostSocket = io.sockets.sockets.get(hostSocketId);

    const updatedRoom = joinPrivateRoom(roomId, socket, { userId: user.userId, username: user.username });
    if (!updatedRoom) return socket.emit('error', { message: 'Could not join room' });

    socket.join(roomId);

    const payload = { roomId, diceRoll: updatedRoom.diceRoll };
    if (hostSocket) hostSocket.emit('matched', { ...payload, opponent: { username: user.username, userId: user.userId } });
    socket.emit('matched', { ...payload, opponent: { username: room.players[hostUserId].username, userId: hostUserId } });
  });

  // === GAME ACTIONS ===
  socket.on('place_piece', ({ roomId, pieceId, orientation, anchorRow, anchorCol }) => {
    if (!user) return;
    const result = handlePiecePlacement(roomId, user.userId, pieceId, orientation, anchorRow, anchorCol);
    if (!result.success) return socket.emit('place_error', { error: result.error });

    // Confirm to the placing player
    socket.emit('piece_placed', { pieceId, orientation, anchorRow, anchorCol, filledCount: result.filledCount });

    // Notify opponent
    socket.to(roomId).emit('opponent_placed', { pieceId, orientation, anchorRow, anchorCol, filledCount: result.filledCount });

    if (result.won) {
      const room = getRoom(roomId);
      const duration = Date.now() - room.startTime;
      const opponentId = room.playerOrder.find(id => id !== user.userId);

      // Save result
      const db = getDb();
      db.prepare('INSERT INTO game_results (id, room_id, winner_id, loser_id, mode, duration_ms, dice_roll) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        uuidv4(), roomId, user.userId, opponentId, 'online', duration, JSON.stringify(room.diceRoll)
      );
      updateStats(user.userId, opponentId, duration);

      const winPayload = { winnerId: user.userId, winnerName: user.username, duration };
      io.to(roomId).emit('game_over', winPayload);
      setTimeout(() => cleanupRoom(roomId), 30000);
    }
  });

  socket.on('remove_piece', ({ roomId, pieceId }) => {
    if (!user) return;
    const result = handlePieceRemoval(roomId, user.userId, pieceId);
    if (!result.success) return;
    socket.emit('piece_removed', { pieceId, filledCount: result.filledCount });
    socket.to(roomId).emit('opponent_removed', { pieceId, filledCount: result.filledCount });
  });

  // === AI GAME ===
  socket.on('start_ai_game', () => {
    if (!user) return;
    const { rollDice } = require('./game/gameEngine');
    const diceRoll = rollDice();
    const board = createBoard(diceRoll);
    const solution = solve(board);

    if (!solution) return socket.emit('error', { message: 'No solution found (bug!)' });

    socket.emit('ai_game_started', { diceRoll });

    // Simulate AI placing pieces with realistic delays
    let delay = 3000;
    solution.forEach((placement, idx) => {
      const jitter = Math.random() * 2000;
      setTimeout(() => {
        socket.emit('ai_placed', { ...placement, moveIndex: idx });
      }, delay + jitter);
      delay += 1500 + Math.random() * 3000;
    });
  });

  // === SOLO GAME ===
  socket.on('start_solo_game', () => {
    const { rollDice } = require('./game/gameEngine');
    const diceRoll = rollDice();
    socket.emit('solo_game_started', { diceRoll });
  });

  socket.on('solo_win', ({ duration }) => {
    if (!user) return;
    const db = getDb();
    db.prepare('UPDATE user_stats SET games_played = games_played + 1, wins = wins + 1, total_solve_ms = total_solve_ms + ? WHERE user_id = ?').run(duration, user.userId);
    const s = db.prepare('SELECT best_solve_ms FROM user_stats WHERE user_id = ?').get(user.userId);
    if (!s.best_solve_ms || duration < s.best_solve_ms) {
      db.prepare('UPDATE user_stats SET best_solve_ms = ? WHERE user_id = ?').run(duration, user.userId);
    }
    socket.emit('solo_win_saved');
  });

  // === DISCONNECT ===
  socket.on('disconnect', () => {
    removeFromQueue(socket.id);
    const room = getRoomBySocketId(socket.id);
    if (room && room.status === 'playing') {
      const disconnectedUserId = getUserIdBySocketId(room, socket.id);
      room.status = 'finished';
      socket.to(room.id).emit('opponent_disconnected', { userId: disconnectedUserId });
    }
  });
});

server.listen(PORT, () => {
  console.log(`🎮 Genius Square server running on http://localhost:${PORT}`);
});
