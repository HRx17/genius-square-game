'use client';
import { useCallback, useMemo, useState } from 'react';
import { canPlace, getPieceById, PIECES } from '@/lib/gameLogic';

interface BoardProps {
  grid: (string | null)[][];
  selectedPieceId: string | null;
  selectedOrientation: [number, number][];
  onCellClick: (row: number, col: number) => void;
  onRemovePiece?: (pieceId: string) => void;
  readOnly?: boolean;
  size?: number; // cell size in px
}

const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];
const ROW_LABELS = ['1', '2', '3', '4', '5', '6'];

function getPieceColor(pieceId: string): string {
  const piece = PIECES.find(p => p.id === pieceId);
  return piece?.color || '#888';
}

export default function Board({
  grid,
  selectedPieceId,
  selectedOrientation,
  onCellClick,
  onRemovePiece,
  readOnly = false,
  size = 62,
}: BoardProps) {
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);

  // Compute which cells would be covered if placing the selected piece at hover pos
  const previewCells = useMemo(() => {
    if (!selectedPieceId || !hoverCell) return new Set<string>();
    const cells = new Set<string>();
    for (const [dr, dc] of selectedOrientation) {
      cells.add(`${hoverCell.row + dr},${hoverCell.col + dc}`);
    }
    return cells;
  }, [selectedPieceId, hoverCell, selectedOrientation]);

  const isValidPreview = useMemo(() => {
    if (!selectedPieceId || !hoverCell) return false;
    return canPlace(grid, selectedOrientation, hoverCell.row, hoverCell.col);
  }, [selectedPieceId, hoverCell, selectedOrientation, grid]);

  const getCellStyle = useCallback((row: number, col: number): React.CSSProperties => {
    const cell = grid[row][col];
    const key = `${row},${col}`;
    const inPreview = previewCells.has(key);

    if (cell === 'blocker') {
      return {
        background: '#d1d5e0',
        cursor: 'default',
      };
    }
    if (inPreview) {
      return {
        background: isValidPreview
          ? `${getPieceColor(selectedPieceId!)}30`
          : 'rgba(220,38,38,0.15)',
        borderColor: isValidPreview
          ? getPieceColor(selectedPieceId!)
          : 'var(--danger)',
        cursor: isValidPreview ? 'pointer' : 'not-allowed',
        boxShadow: isValidPreview ? `inset 0 0 8px ${getPieceColor(selectedPieceId!)}25` : 'none',
      };
    }
    if (cell && cell !== 'blocker') {
      const color = getPieceColor(cell);
      return {
        background: color,
        boxShadow: `0 2px 8px ${color}40, inset 0 1px 0 rgba(255,255,255,0.35)`,
        cursor: readOnly ? 'default' : 'pointer',
      };
    }
    return {};
  }, [grid, previewCells, isValidPreview, selectedPieceId, readOnly]);

  const gap = 3;
  const boardSize = size * 6 + gap * 7;

  return (
    <div>
      {/* Column labels */}
      <div style={{ display: 'flex', paddingLeft: 24, marginBottom: 4, gap }}>
        {COL_LABELS.map(l => (
          <div key={l} className="board-label" style={{ width: size }}>
            {l}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        {/* Row labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap, paddingTop: gap }}>
          {ROW_LABELS.map(l => (
            <div key={l} className="board-label" style={{ height: size, width: 20 }}>
              {l}
            </div>
          ))}
        </div>

        {/* Board */}
        <div
          className="game-board"
          style={{
            gridTemplateColumns: `repeat(6, ${size}px)`,
            gridTemplateRows: `repeat(6, ${size}px)`,
            gap,
            padding: gap,
          }}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const style = getCellStyle(r, c);
              return (
                <div
                  key={`${r},${c}`}
                  className={`board-cell${cell === 'blocker' ? ' blocker' : ''}${cell && cell !== 'blocker' ? ' occupied' : ''}`}
                  style={style}
                  onMouseEnter={() => !readOnly && setHoverCell({ row: r, col: c })}
                  onMouseLeave={() => setHoverCell(null)}
                  onClick={() => {
                    if (readOnly) return;
                    if (cell && cell !== 'blocker' && !selectedPieceId && onRemovePiece) {
                      onRemovePiece(cell);
                    } else {
                      onCellClick(r, c);
                    }
                  }}
                  title={cell === 'blocker' ? 'Blocked' : cell ? `${getPieceById(cell)?.name || cell} (click to remove)` : `${COL_LABELS[c]}${ROW_LABELS[r]}`}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
