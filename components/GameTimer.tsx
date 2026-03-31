'use client';
import { useEffect, useState } from 'react';

interface GameTimerProps {
  running: boolean;
  startTime?: number;
  className?: string;
}

export default function GameTimer({ running, startTime, className }: GameTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return;
    const origin = startTime || Date.now();
    const interval = setInterval(() => {
      setElapsed(Date.now() - origin);
    }, 100);
    return () => clearInterval(interval);
  }, [running, startTime]);

  const totalSeconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const ms = Math.floor((elapsed % 1000) / 10);
  const isUrgent = totalSeconds >= 120;

  return (
    <div className={`timer${isUrgent ? ' urgent' : ''} ${className || ''}`}>
      {`${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}.${String(ms).padStart(2,'0')}`}
    </div>
  );
}

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}.${String(Math.floor((ms%1000)/100))}s`;
}
