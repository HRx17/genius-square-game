// Room Manager — Genius Square
// Manages matchmaking queue, game rooms, and Socket.IO event routing

const { v4: uuidv4 } = require('uuid');
const { rollDice, createBoard, canPlace, placeOnBoard, removeFromBoard, isWin, countFilled, PIECES_WITH_ORIENTATIONS } = require('./gameEngine');
const { solve } = require('./solver');

const matchmakingQueue = []; // [{socketId, userId, username}]
const rooms = new Map();     // roomId → roomState

function createRoom(player1Socket, player1Info, player2Socket, player2Info, isPrivate = false) {
  const roomId = uuidv4();
  const diceRoll = rollDice();
  const board = createBoard(diceRoll);

  const room = {
    id: roomId,
    isPrivate,
    status: 'playing', // 'waiting' | 'playing' | 'finished'
    diceRoll,
    startTime: Date.now(),
    players: {
      [player1Info.userId]: {
        socketId: player1Socket.id,
        userId: player1Info.userId,
        username: player1Info.username,
        board: JSON.parse(JSON.stringify(board)),
        placements: [], // [{pieceId, orientation, anchorRow, anchorCol}]
        filledCount: 0,
        finished: false,
        finishTime: null,
      },
      [player2Info.userId]: {
        socketId: player2Socket.id,
        userId: player2Info.userId,
        username: player2Info.username,
        board: JSON.parse(JSON.stringify(board)),
        placements: [],
        filledCount: 0,
        finished: false,
        finishTime: null,
      },
    },
    playerOrder: [player1Info.userId, player2Info.userId],
  };

  rooms.set(roomId, room);
  return room;
}

function createPrivateRoom(hostSocket, hostInfo) {
  const roomId = uuidv4();
  const room = {
    id: roomId,
    isPrivate: true,
    status: 'waiting',
    diceRoll: null,
    startTime: null,
    players: {
      [hostInfo.userId]: {
        socketId: hostSocket.id,
        userId: hostInfo.userId,
        username: hostInfo.username,
        board: null,
        placements: [],
        filledCount: 0,
        finished: false,
        finishTime: null,
      },
    },
    playerOrder: [hostInfo.userId],
  };
  rooms.set(roomId, room);
  return room;
}

function joinPrivateRoom(roomId, guestSocket, guestInfo) {
  const room = rooms.get(roomId);
  if (!room || room.status !== 'waiting' || room.playerOrder.length >= 2) return null;

  const diceRoll = rollDice();
  const board = createBoard(diceRoll);
  room.diceRoll = diceRoll;
  room.startTime = Date.now();
  room.status = 'playing';

  // Initialize boards for all players
  for (const uid of room.playerOrder) {
    room.players[uid].board = JSON.parse(JSON.stringify(board));
  }

  // Add guest
  room.players[guestInfo.userId] = {
    socketId: guestSocket.id,
    userId: guestInfo.userId,
    username: guestInfo.username,
    board: JSON.parse(JSON.stringify(board)),
    placements: [],
    filledCount: 0,
    finished: false,
    finishTime: null,
  };
  room.playerOrder.push(guestInfo.userId);
  return room;
}

function getRoom(roomId) {
  return rooms.get(roomId);
}

function handlePiecePlacement(roomId, userId, pieceId, orientation, anchorRow, anchorCol) {
  const room = rooms.get(roomId);
  if (!room || room.status !== 'playing') return { success: false, error: 'Room not active' };

  const player = room.players[userId];
  if (!player) return { success: false, error: 'Player not in room' };

  // Check piece not already placed
  if (player.placements.some(p => p.pieceId === pieceId)) {
    return { success: false, error: 'Piece already placed' };
  }

  // Validate placement
  if (!canPlace(player.board, orientation, anchorRow, anchorCol)) {
    return { success: false, error: 'Invalid placement' };
  }

  // Apply placement
  player.board = placeOnBoard(player.board, orientation, anchorRow, anchorCol, pieceId);
  player.placements.push({ pieceId, orientation, anchorRow, anchorCol });
  player.filledCount = countFilled(player.board);

  const won = isWin(player.board);
  if (won) {
    player.finished = true;
    player.finishTime = Date.now();
    room.status = 'finished';
  }

  return { success: true, won, filledCount: player.filledCount };
}

function handlePieceRemoval(roomId, userId, pieceId) {
  const room = rooms.get(roomId);
  if (!room || room.status !== 'playing') return { success: false };

  const player = room.players[userId];
  if (!player) return { success: false };

  const placement = player.placements.find(p => p.pieceId === pieceId);
  if (!placement) return { success: false, error: 'Piece not placed' };

  player.board = removeFromBoard(player.board, pieceId);
  player.placements = player.placements.filter(p => p.pieceId !== pieceId);
  player.filledCount = countFilled(player.board);

  return { success: true, filledCount: player.filledCount };
}

function addToQueue(socketId, userId, username) {
  // Remove if already in queue
  const idx = matchmakingQueue.findIndex(p => p.userId === userId);
  if (idx !== -1) matchmakingQueue.splice(idx, 1);
  matchmakingQueue.push({ socketId, userId, username });
}

function removeFromQueue(socketId) {
  const idx = matchmakingQueue.findIndex(p => p.socketId === socketId);
  if (idx !== -1) matchmakingQueue.splice(idx, 1);
}

function matchPlayers() {
  if (matchmakingQueue.length < 2) return null;
  const p1 = matchmakingQueue.shift();
  const p2 = matchmakingQueue.shift();
  return { p1, p2 };
}

function cleanupRoom(roomId) {
  rooms.delete(roomId);
}

function getRoomBySocketId(socketId) {
  for (const [, room] of rooms) {
    for (const uid of room.playerOrder) {
      if (room.players[uid].socketId === socketId) return room;
    }
  }
  return null;
}

function getUserIdBySocketId(room, socketId) {
  for (const uid of room.playerOrder) {
    if (room.players[uid].socketId === socketId) return uid;
  }
  return null;
}

module.exports = {
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
};
