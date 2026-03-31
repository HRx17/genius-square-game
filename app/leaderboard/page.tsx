'use client';
import { useEffect, useState } from 'react';
import { getLeaderboard } from '@/lib/api';
import Link from 'next/link';

interface Leader {
  id: string;
  username: string;
  avatar_color: string;
  games_played: number;
  wins: number;
  losses: number;
  best_solve_ms: number | null;
  win_rate: number;
}

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard().then(data => {
      setLeaders(data.leaderboard || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function formatTime(ms: number | null) {
    if (!ms) return '—';
    const s = ms / 1000;
    return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s/60)}m ${Math.floor(s%60)}s`;
  }

  return (
    <div style={{ padding: '48px 24px', maxWidth: 900, margin: '0 auto' }}>
      <div className="section-header">
        <span className="section-tag">Global Rankings</span>
        <h1 className="section-title">Leaderboard</h1>
        <p className="section-subtitle">Top players ranked by win rate (minimum 3 games)</p>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 80px 80px 80px 100px', gap: 16, padding: '12px 20px', borderBottom: '1px solid var(--border)', fontSize: '0.7rem', fontFamily: 'Orbitron,sans-serif', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          <div>#</div>
          <div>PLAYER</div>
          <div style={{ textAlign: 'center' }}>WINS</div>
          <div style={{ textAlign: 'center' }}>GAMES</div>
          <div style={{ textAlign: 'center' }}>WIN %</div>
          <div style={{ textAlign: 'center' }}>BEST TIME</div>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : leaders.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏆</div>
            <p>No ranked players yet. Play some games to join the leaderboard!</p>
            <Link href="/play" className="btn btn-primary" style={{ display: 'inline-flex', marginTop: 16 }}>Play Now</Link>
          </div>
        ) : (
          leaders.map((leader, idx) => (
            <div key={leader.id} style={{
              display: 'grid',
              gridTemplateColumns: '48px 1fr 80px 80px 80px 100px',
              gap: 16,
              padding: '14px 20px',
              borderBottom: idx < leaders.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
              transition: 'background 0.15s',
              alignItems: 'center',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <div style={{
                fontFamily: 'Orbitron,sans-serif',
                fontWeight: 700,
                fontSize: '0.9rem',
                textAlign: 'center',
                color: idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'var(--text-muted)',
              }}>
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="avatar avatar-sm" style={{ background: leader.avatar_color, color: 'white', fontSize: '0.75rem' }}>
                  {leader.username[0].toUpperCase()}
                </div>
                <Link href={`/profile/${leader.username}`} style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                  {leader.username}
                </Link>
              </div>

              <div style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem' }}>{leader.wins}</div>
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{leader.games_played}</div>
              <div style={{ textAlign: 'center', fontSize: '0.9rem' }}>
                <span style={{
                  background: `rgba(99,102,241,${leader.win_rate * 0.4})`,
                  padding: '2px 8px',
                  borderRadius: 4,
                  color: 'var(--text-accent)',
                  fontWeight: 600,
                }}>
                  {(leader.win_rate * 100).toFixed(0)}%
                </span>
              </div>
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem', fontFamily: 'Orbitron,sans-serif', fontSize: '0.8rem' }}>
                {formatTime(leader.best_solve_ms)}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <Link href="/play" className="btn btn-primary">Play & Climb the Ranks</Link>
      </div>
    </div>
  );
}
