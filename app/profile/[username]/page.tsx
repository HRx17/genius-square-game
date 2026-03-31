'use client';
import { useEffect, useState } from 'react';
import { getProfile } from '@/lib/api';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatDuration } from '@/components/GameTimer';

interface Profile {
  user: { id: string; username: string; avatar_color: string; created_at: number };
  stats: { games_played: number; wins: number; losses: number; best_solve_ms: number | null; total_solve_ms: number };
  recentGames: Array<{ id: string; winner_id: string; winner_name: string; loser_name: string; duration_ms: number; played_at: number; mode: string }>;
}

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getProfile(username).then(data => {
      if (data.error) { setNotFound(true); setLoading(false); return; }
      setProfile(data);
      setLoading(false);
    });
  }, [username]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 75px)' }}>
      <div className="spinner" />
    </div>
  );

  if (notFound) return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <div style={{ fontSize: '4rem', marginBottom: 16 }}>🔍</div>
      <h1 style={{ fontFamily: 'Orbitron,sans-serif', marginBottom: 8 }}>Player Not Found</h1>
      <Link href="/" className="btn btn-secondary" style={{ marginTop: 16, display: 'inline-flex' }}>Go Home</Link>
    </div>
  );

  if (!profile) return null;
  const { user, stats, recentGames } = profile;
  const winRate = stats.games_played > 0 ? ((stats.wins / stats.games_played) * 100).toFixed(1) : '0.0';
  const avgTime = stats.wins > 0 ? Math.round(stats.total_solve_ms / stats.wins) : 0;
  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

  return (
    <div style={{ padding: '48px 24px', maxWidth: 900, margin: '0 auto' }}>
      {/* Profile header */}
      <div className="card" style={{ padding: '32px', marginBottom: 24, display: 'flex', gap: 24, alignItems: 'center' }}>
        <div className="avatar avatar-lg" style={{ background: user.avatar_color, color: 'white' }}>
          {user.username[0].toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'Orbitron,sans-serif', fontSize: '1.75rem', marginBottom: 4 }}>{user.username}</h1>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Member since {memberSince}</div>
        </div>
        <Link href="/play" className="btn btn-primary">Challenge!</Link>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Games Played', value: stats.games_played || 0, icon: '🎮' },
          { label: 'Wins', value: stats.wins || 0, icon: '🏆', color: 'var(--success)' },
          { label: 'Losses', value: stats.losses || 0, icon: '😅', color: 'var(--danger)' },
          { label: 'Win Rate', value: `${winRate}%`, icon: '📊', color: 'var(--text-accent)' },
          { label: 'Best Time', value: stats.best_solve_ms ? formatDuration(stats.best_solve_ms) : '—', icon: '⚡' },
          { label: 'Avg Win Time', value: avgTime ? formatDuration(avgTime) : '—', icon: '⏱️' },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{stat.icon}</div>
            <div style={{ fontFamily: 'Orbitron,sans-serif', fontSize: '1.25rem', fontWeight: 700, color: stat.color || 'var(--text-primary)', marginBottom: 4 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent games */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontFamily: 'Orbitron,sans-serif', fontSize: '0.8rem', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
          RECENT GAMES
        </div>

        {recentGames.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
            No games played yet
          </div>
        ) : (
          recentGames.map(game => {
            const won = game.winner_id === user.id;
            return (
              <div key={game.id} style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr 1fr 100px',
                gap: 16,
                padding: '12px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                alignItems: 'center',
                fontSize: '0.875rem',
              }}>
                <span className={`badge ${won ? 'badge-success' : 'badge-danger'}`} style={{ justifyContent: 'center' }}>
                  {won ? '✓ Win' : '✗ Loss'}
                </span>
                <div style={{ color: 'var(--text-secondary)' }}>
                  vs <span style={{ color: 'var(--text-primary)' }}>{won ? (game.loser_name || 'AI') : (game.winner_name || 'AI')}</span>
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>
                  {game.duration_ms ? formatDuration(game.duration_ms) : '—'}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  {new Date(game.played_at).toLocaleDateString()}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
