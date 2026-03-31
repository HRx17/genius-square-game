'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getMe, logout } from '@/lib/api';

interface User { id: string; username: string; avatar_color: string; }

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe().then(data => {
      if (data?.user) setUser(data.user);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await logout();
    localStorage.removeItem('token');
    setUser(null);
    window.location.href = '/';
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-logo">
          GENIUS<span>■</span>SQUARE
        </Link>

        <ul className="navbar-links">
          <li><Link href="/play">Play</Link></li>
          <li><Link href="/leaderboard">Leaderboard</Link></li>
          {user && <li><Link href={`/profile/${user.username}`}>Profile</Link></li>}
        </ul>

        <div className="navbar-actions">
          {loading ? (
            <div className="spinner" style={{ width: 20, height: 20 }} />
          ) : user ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="avatar avatar-sm" style={{ background: user.avatar_color, color: 'white' }}>
                  {user.username[0].toUpperCase()}
                </div>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{user.username}</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">Log in</Link>
              <Link href="/signup" className="btn btn-primary btn-sm">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
