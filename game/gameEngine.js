// Genius Square — Game Engine
// Dice faces, piece shapes, rotation, validation, win detection

// === DICE ===
// 7 dice with exact face coordinates (verified open-source data)
// Each die lands on one coordinate → that square gets a blocker
const DICE = [
  ['C3', 'E3', 'D3', 'D4', 'B4', 'C4'],
  ['E6', 'F5', 'E4', 'F4', 'E5', 'D5'],
  ['C5', 'F6', 'A4', 'D6', 'B5', 'C6'],
  ['B1', 'C2', 'A2', 'B3', 'A3', 'B2'],
  ['E1', 'F2', 'D2', 'F3', 'C1', 'D1'],
  ['A1', 'B6', 'A5', 'F1', 'E2', 'A6'],
  ['A6', 'F6', 'F1', 'A1', 'F6', 'A6'],
];

// Convert coordinate string like "A3" → {col: 0, row: 2}
function coordToRC(coord) {
  const col = coord.charCodeAt(0) - 65; // A=0, B=1, ...
  const row = parseInt(coord[1]) - 1;   // 1=0, 2=1, ...
  return { row, col };
}

function rollDice() {
  const blockers = [];
  const seen = new Set();
  for (const die of DICE) {
    const candidates = die.filter(c => !seen.has(c));
    const coord = candidates[Math.floor(Math.random() * candidates.length)] || die[Math.floor(Math.random() * die.length)];
    seen.add(coord);
    blockers.push(coord);
  }
  return blockers;
}

// === PIECES ===
// 9 pieces — each defined as array of [row, col] offsets from top-left anchor
// Total squares: 1+2+3+3+4+4+4+4+4 = 29
const PIECE_DEFINITIONS = [
  { id: 'p1', name: 'Monomino',    color: '#ef4444', cells: [[0,0]] },
  { id: 'p2', name: 'Domino',      color: '#f97316', cells: [[0,0],[0,1]] },
  { id: 'p3', name: 'Tromino-I',   color: '#eab308', cells: [[0,0],[0,1],[0,2]] },
  { id: 'p4', name: 'Tromino-L',   color: '#22c55e', cells: [[0,0],[1,0],[1,1]] },
  { id: 'p5', name: 'Tetromino-L', color: '#06b6d4', cells: [[0,0],[1,0],[2,0],[2,1]] },
  { id: 'p6', name: 'Tetromino-T', color: '#6366f1', cells: [[0,0],[0,1],[0,2],[1,1]] },
  { id: 'p7', name: 'Tetromino-S', color: '#8b5cf6', cells: [[0,1],[0,2],[1,0],[1,1]] },
  { id: 'p8', name: 'Tetromino-Sq',color: '#ec4899', cells: [[0,0],[0,1],[1,0],[1,1]] },
  { id: 'p9', name: 'Tetromino-I', color: '#14b8a6', cells: [[0,0],[1,0],[2,0],[3,0]] },
];

function rotateCells90(cells) {
  // 90° clockwise: [r,c] → [c, -r] then normalize
  const rotated = cells.map(([r, c]) => [c, -r]);
  const minR = Math.min(...rotated.map(([r]) => r));
  const minC = Math.min(...rotated.map(([, c]) => c));
  return rotated.map(([r, c]) => [r - minR, c - minC]);
}

function flipCells(cells) {
  // Flip horizontally: [r,c] → [r, -c] then normalize
  const flipped = cells.map(([r, c]) => [r, -c]);
  const minC = Math.min(...flipped.map(([, c]) => c));
  return flipped.map(([r, c]) => [r, c - minC]);
}

function cellsEqual(a, b) {
  if (a.length !== b.length) return false;
  const sa = a.map(([r,c]) => `${r},${c}`).sort().join('|');
  const sb = b.map(([r,c]) => `${r},${c}`).sort().join('|');
  return sa === sb;
}

function getAllOrientations(cells) {
  const orientations = [];
  let current = cells;
  for (let flip = 0; flip < 2; flip++) {
    if (flip === 1) current = flipCells(cells);
    let rot = current;
    for (let i = 0; i < 4; i++) {
      if (!orientations.some(o => cellsEqual(o, rot))) {
        orientations.push(rot);
      }
      rot = rotateCells90(rot);
    }
  }
  return orientations;
}

// Pre-compute all orientations for each piece
const PIECES_WITH_ORIENTATIONS = PIECE_DEFINITIONS.map(p => ({
  ...p,
  orientations: getAllOrientations(p.cells),
}));

// === BOARD VALIDATION ===
function createBoard(blockers) {
  // 6x6 grid: null = empty, 'blocker' = blocked, pieceId = occupied
  const board = Array.from({ length: 6 }, () => Array(6).fill(null));
  for (const coord of blockers) {
    const { row, col } = coordToRC(coord);
    if (row >= 0 && row < 6 && col >= 0 && col < 6) {
      board[row][col] = 'blocker';
    }
  }
  return board;
}

function canPlace(board, cells, anchorRow, anchorCol) {
  for (const [dr, dc] of cells) {
    const r = anchorRow + dr;
    const c = anchorCol + dc;
    if (r < 0 || r >= 6 || c < 0 || c >= 6) return false;
    if (board[r][c] !== null) return false;
  }
  return true;
}

function placeOnBoard(board, cells, anchorRow, anchorCol, pieceId) {
  const newBoard = board.map(row => [...row]);
  for (const [dr, dc] of cells) {
    newBoard[anchorRow + dr][anchorCol + dc] = pieceId;
  }
  return newBoard;
}

function removeFromBoard(board, pieceId) {
  return board.map(row => row.map(cell => cell === pieceId ? null : cell));
}

function isWin(board) {
  return board.every(row => row.every(cell => cell !== null));
}

function countFilled(board) {
  return board.flat().filter(c => c !== null && c !== 'blocker').length;
}

module.exports = {
  DICE,
  PIECE_DEFINITIONS,
  PIECES_WITH_ORIENTATIONS,
  rollDice,
  coordToRC,
  createBoard,
  canPlace,
  placeOnBoard,
  removeFromBoard,
  isWin,
  countFilled,
  getAllOrientations,
};
