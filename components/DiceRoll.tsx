'use client';
import { useEffect, useState } from 'react';

interface DiceRollProps {
  diceRoll: string[];
  onComplete?: () => void;
}

export default function DiceRoll({ diceRoll, onComplete }: DiceRollProps) {
  const [revealed, setRevealed] = useState<boolean[]>([]);

  useEffect(() => {
    if (!diceRoll.length) return;
    setRevealed([]);
    diceRoll.forEach((_, i) => {
      setTimeout(() => {
        setRevealed(prev => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
        if (i === diceRoll.length - 1 && onComplete) {
          setTimeout(onComplete, 300);
        }
      }, i * 150 + 200);
    });
  }, [diceRoll]);

  return (
    <div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 8, fontFamily: 'Orbitron,sans-serif', letterSpacing: '0.1em' }}>
        BLOCKED SQUARES
      </p>
      <div className="dice-roll-container">
        {diceRoll.map((coord, i) => (
          revealed[i] ? (
            <div key={i} className="die" style={{ animationDelay: `${i * 0.1}s` }}>
              {coord}
            </div>
          ) : (
            <div key={i} className="die" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
              ?
            </div>
          )
        ))}
      </div>
    </div>
  );
}
