// Genius Square — Client-side Game Logic
// Piece shapes, orientations, board validation

export interface PieceDefinition {
  id: string;
  name: string;
  color: string;
  cells: [number, number][];
  orientations: [number, number][][];
}

export interface Board {
  grid: (string | null)[][]; // null=empty, 'blocker'=blocked, pieceId=placed
}

export interface Placement {
  pieceId: string;
  orientation: [number, number][];
  anchorRow: number;
  anchorCol: number;
}

// 9 unique polyomino pieces matching backend
const RAW_PIECES: { id: string; name: string; color: string; cells: [number, number][] }[] = [
  { id: 'p1', name: 'Monomino',     color: '#ef4444', cells: [[0,0]] },
  { id: 'p2', name: 'Domino',       color: '#f97316', cells: [[0,0],[0,1]] },
  { id: 'p3', name: 'Tromino-I',    color: '#eab308', cells: [[0,0],[0,1],[0,2]] },
  { id: 'p4', name: 'Tromino-L',    color: '#22c55e', cells: [[0,0],[1,0],[1,1]] },
  { id: 'p5', name: 'Tetromino-L',  color: '#06b6d4', cells: [[0,0],[1,0],[2,0],[2,1]] },
  { id: 'p6', name: 'Tetromino-T',  color: '#6366f1', cells: [[0,0],[0,1],[0,2],[1,1]] },
  { id: 'p7', name: 'Tetromino-S',  color: '#8b5cf6', cells: [[0,1],[0,2],[1,0],[1,1]] },
  { id: 'p8', name: 'Tetromino-Sq', color: '#ec4899', cells: [[0,0],[0,1],[1,0],[1,1]] },
  { id: 'p9', name: 'Tetromino-I',  color: '#14b8a6', cells: [[0,0],[1,0],[2,0],[3,0]] },
];

function rotateCells90(cells: [number, number][]): [number, number][] {
  const rotated: [number, number][] = cells.map(([r, c]) => [c, -r]);
  const minR = Math.min(...rotated.map(([r]) => r));
  const minC = Math.min(...rotated.map(([, c]) => c));
  return rotated.map(([r, c]) => [r - minR, c - minC]);
}

function flipCells(cells: [number, number][]): [number, number][] {
  const flipped: [number, number][] = cells.map(([r, c]) => [r, -c]);
  const minC = Math.min(...flipped.map(([, c]) => c));
  return flipped.map(([r, c]) => [r, c - minC]);
}

function cellsEqual(a: [number, number][], b: [number, number][]): boolean {
  if (a.length !== b.length) return false;
  const sa = a.map(([r, c]) => `${r},${c}`).sort().join('|');
  const sb = b.map(([r, c]) => `${r},${c}`).sort().join('|');
  return sa === sb;
}

export function getAllOrientations(cells: [number, number][]): [number, number][][] {
  const orientations: [number, number][][] = [];
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

export const PIECES: PieceDefinition[] = RAW_PIECES.map(p => ({
  ...p,
  orientations: getAllOrientations(p.cells),
}));

export function getPieceById(id: string): PieceDefinition | undefined {
  return PIECES.find(p => p.id === id);
}

export function coordToRC(coord: string): { row: number; col: number } {
  const col = coord.charCodeAt(0) - 65;
  const row = parseInt(coord[1]) - 1;
  return { row, col };
}

export function createBoard(blockers: string[]): (string | null)[][] {
  const grid: (string | null)[][] = Array.from({ length: 6 }, () => Array(6).fill(null));
  for (const coord of blockers) {
    const { row, col } = coordToRC(coord);
    if (row >= 0 && row < 6 && col >= 0 && col < 6) {
      grid[row][col] = 'blocker';
    }
  }
  return grid;
}

export function canPlace(grid: (string | null)[][], cells: [number, number][], anchorRow: number, anchorCol: number): boolean {
  for (const [dr, dc] of cells) {
    const r = anchorRow + dr;
    const c = anchorCol + dc;
    if (r < 0 || r >= 6 || c < 0 || c >= 6) return false;
    if (grid[r][c] !== null) return false;
  }
  return true;
}

export function placeOnGrid(grid: (string | null)[][], cells: [number, number][], anchorRow: number, anchorCol: number, pieceId: string): (string | null)[][] {
  const newGrid = grid.map(row => [...row]);
  for (const [dr, dc] of cells) {
    newGrid[anchorRow + dr][anchorCol + dc] = pieceId;
  }
  return newGrid;
}

export function removeFromGrid(grid: (string | null)[][], pieceId: string): (string | null)[][] {
  return grid.map(row => row.map(cell => cell === pieceId ? null : cell));
}

export function isWin(grid: (string | null)[][]): boolean {
  return grid.every(row => row.every(cell => cell !== null));
}

export function countFilled(grid: (string | null)[][]): number {
  return grid.flat().filter(c => c !== null && c !== 'blocker').length;
}

export function getNextOrientation(cells: [number, number][]): [number, number][] {
  return rotateCells90(cells);
}

export function getFlippedCells(cells: [number, number][]): [number, number][] {
  return flipCells(cells);
}

// Get bounding box of cells
export function getBoundingBox(cells: [number, number][]): { rows: number; cols: number } {
  const rows = Math.max(...cells.map(([r]) => r)) + 1;
  const cols = Math.max(...cells.map(([, c]) => c)) + 1;
  return { rows, cols };
}
