'use client';
import { useMemo } from 'react';
import { PIECES, getBoundingBox, getPieceById } from '@/lib/gameLogic';

interface PieceTrayProps {
  placedPieceIds: string[];
  selectedPieceId: string | null;
  selectedOrientation: [number, number][];
  onSelectPiece: (pieceId: string, orientation: [number, number][]) => void;
  onRotate: () => void;
  onFlip: () => void;
  onDeselect: () => void;
}

function MiniPiecePreview({ cells, color, size = 22 }: { cells: [number, number][], color: string, size?: number }) {
  const { rows, cols } = getBoundingBox(cells);
  const cellSet = new Set(cells.map(([r,c]) => `${r},${c}`));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${size}px)`, gridTemplateRows: `repeat(${rows}, ${size}px)`, gap: 2 }}>
      {Array.from({ length: rows }).flatMap((_, r) =>
        Array.from({ length: cols }).map((_, c) => (
          <div
            key={`${r},${c}`}
            style={{
              width: size, height: size,
              background: cellSet.has(`${r},${c}`) ? color : 'transparent',
              borderRadius: 3,
              boxShadow: cellSet.has(`${r},${c}`) ? `0 2px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)` : 'none',
            }}
          />
        ))
      )}
    </div>
  );
}

export default function PieceTray({
  placedPieceIds,
  selectedPieceId,
  selectedOrientation,
  onSelectPiece,
  onRotate,
  onFlip,
  onDeselect,
}: PieceTrayProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: '0.7rem', fontFamily: 'Orbitron,sans-serif', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 4 }}>
        PIECES ({PIECES.length - placedPieceIds.length} left)
      </div>

      {PIECES.map(piece => {
        const isPlaced = placedPieceIds.includes(piece.id);
        const isSelected = selectedPieceId === piece.id;
        return (
          <div
            key={piece.id}
            className={`piece-preview${isSelected ? ' selected' : ''}${isPlaced ? ' placed' : ''}`}
            style={{ color: piece.color }}
            onClick={() => {
              if (isPlaced) return;
              if (isSelected) { onDeselect(); return; }
              onSelectPiece(piece.id, piece.cells);
            }}
            title={isPlaced ? `${piece.name} (placed)` : piece.name}
          >
            <div style={{
              background: isSelected ? `${piece.color}18` : 'var(--bg-elevated)',
              border: `1px solid ${isSelected ? piece.color + '60' : 'var(--border)'}`,
              borderRadius: 8,
              padding: '8px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              transition: 'all 0.2s ease',
            }}>
              <MiniPiecePreview
                cells={isSelected ? selectedOrientation : piece.cells}
                color={isPlaced ? '#444' : piece.color}
                size={20}
              />
              <div style={{ fontSize: '0.7rem', color: isPlaced ? 'var(--text-muted)' : 'var(--text-secondary)', lineHeight: 1.3 }}>
                <div style={{ fontWeight: 600, fontSize: '0.65rem' }}>{piece.name}</div>
                {isPlaced && <div style={{ color: 'var(--success)', fontSize: '0.6rem' }}>✓ placed</div>}
                {isSelected && <div style={{ color: piece.color, fontSize: '0.6rem' }}>selected</div>}
              </div>
            </div>
          </div>
        );
      })}

      {selectedPieceId && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <button className="btn btn-secondary btn-sm" style={{ flex: 1, fontSize: '0.7rem' }} onClick={onRotate} title="Rotate (R)">
            ↻ Rotate
          </button>
          <button className="btn btn-secondary btn-sm" style={{ flex: 1, fontSize: '0.7rem' }} onClick={onFlip} title="Flip (F)">
            ⇄ Flip
          </button>
        </div>
      )}

      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.6 }}>
        <div>• Click to select</div>
        <div>• Click board to place</div>
        <div>• R = Rotate, F = Flip</div>
        <div>• Click placed piece to remove</div>
      </div>
    </div>
  );
}
