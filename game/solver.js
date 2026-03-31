// Backtracking solver for Genius Square
// Used by AI opponent and to verify board solvability

const { PIECES_WITH_ORIENTATIONS, canPlace, placeOnBoard, isWin } = require('./gameEngine');

/**
 * Solve the board using backtracking DFS.
 * Returns the first solution found as array of placements,
 * or null if no solution (should never happen with valid dice).
 */
function solve(board, remainingPieceIds = null) {
  const pieceIds = remainingPieceIds || PIECES_WITH_ORIENTATIONS.map(p => p.id);
  if (pieceIds.length === 0) {
    return isWin(board) ? [] : null;
  }

  // Find the first empty cell (row-major order) to anchor search
  let targetRow = -1, targetCol = -1;
  outer: for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      if (board[r][c] === null) { targetRow = r; targetCol = c; break outer; }
    }
  }
  if (targetRow === -1) return isWin(board) ? [] : null;

  // Try each remaining piece in each orientation at positions that cover targetCell
  for (let pieceIdx = 0; pieceIdx < pieceIds.length; pieceIdx++) {
    const pieceId = pieceIds[pieceIdx];
    const piece = PIECES_WITH_ORIENTATIONS.find(p => p.id === pieceId);
    
    for (const orientation of piece.orientations) {
      // Try anchoring so each cell of this orientation lands on targetRow,targetCol
      for (const [dr, dc] of orientation) {
        const anchorRow = targetRow - dr;
        const anchorCol = targetCol - dc;
        if (canPlace(board, orientation, anchorRow, anchorCol)) {
          const newBoard = placeOnBoard(board, orientation, anchorRow, anchorCol, pieceId);
          const remaining = pieceIds.filter(id => id !== pieceId);
          const result = solve(newBoard, remaining);
          if (result !== null) {
            return [{ pieceId, orientation, anchorRow, anchorCol }, ...result];
          }
        }
      }
    }
  }

  return null; // No solution found in this branch
}

module.exports = { solve };
