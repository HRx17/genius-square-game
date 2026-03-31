'use client';
import Link from 'next/link';
import Stars from '@/components/Stars';

export default function HomePage() {
  return (
    <>
      <Stars />

      {/* HERO */}
      <section className="hero">
        <div>
          <div style={{
            display: 'inline-block',
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 'var(--radius-full)',
            padding: '6px 16px',
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.15em',
            color: 'var(--text-accent)',
            marginBottom: 24,
            textTransform: 'uppercase',
          }}>
            ⚡ Live Multiplayer · 62,000+ Puzzles
          </div>

          <h1 className="hero-title">
            Race The<br />Genius Square
          </h1>
          <p className="hero-subtitle">
            Roll the dice, block the squares, then race your opponent to fill the grid with all 9 puzzle pieces.
            No two games are ever the same.
          </p>

          <div className="hero-cta">
            <Link href="/play" className="btn btn-primary btn-lg">
              🎮 Play Now
            </Link>
            <Link href="/signup" className="btn btn-secondary btn-lg">
              Create Account
            </Link>
          </div>

          {/* Mini board showcase */}
          <MiniShowcase />
        </div>
      </section>

      {/* HOW TO PLAY */}
      <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div className="section-header">
          <span className="section-tag">How to Play</span>
          <h2 className="section-title">Three Steps to Victory</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {[
            { num: '01', icon: '🎲', title: 'Roll the Dice', desc: '7 custom dice determine which squares get blocked on both players\' boards — same puzzle for everyone.' },
            { num: '02', icon: '🧩', title: 'Place Your Pieces', desc: 'Race to fill all remaining 29 squares with your 9 puzzle pieces. Rotate and flip pieces to make them fit.' },
            { num: '03', icon: '🏆', title: 'Win the Race', desc: 'First player to fill their entire board wins! Can you solve it faster than your opponent?' },
          ].map(step => (
            <div key={step.num} className="card" style={{ padding: 32 }}>
              <div style={{ fontSize: '0.7rem', fontFamily: 'Orbitron,sans-serif', color: 'var(--text-accent)', marginBottom: 8, letterSpacing: '0.2em' }}>{step.num}</div>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{step.icon}</div>
              <h3 style={{ fontFamily: 'Orbitron,sans-serif', fontSize: '1rem', marginBottom: 8 }}>{step.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* GAME MODES */}
      <section style={{ padding: '40px 24px 80px', maxWidth: 1100, margin: '0 auto' }}>
        <div className="section-header">
          <span className="section-tag">Game Modes</span>
          <h2 className="section-title">Play Your Way</h2>
          <p className="section-subtitle">Choose solo practice, challenge the AI, or go head-to-head with players worldwide</p>
        </div>

        <div className="mode-grid">
          <Link href="/play?mode=solo" className="mode-card" style={{ '--card-accent': 'rgba(34,197,94,0.12)', textDecoration: 'none' } as React.CSSProperties}>
            <span className="mode-icon">🧘</span>
            <h3 className="mode-title">Solo Practice</h3>
            <p className="mode-desc">Solve the puzzle at your own pace. Perfect for learning the game and sharpening your skills.</p>
          </Link>

          <Link href="/play?mode=ai" className="mode-card" style={{ '--card-accent': 'rgba(6,182,212,0.12)', textDecoration: 'none' } as React.CSSProperties}>
            <span className="mode-icon">🤖</span>
            <h3 className="mode-title">vs AI</h3>
            <p className="mode-desc">Challenge our AI opponent that solves the board in real time. Can you beat the algorithm?</p>
          </Link>

          <Link href="/play?mode=online" className="mode-card" style={{ '--card-accent': 'rgba(99,102,241,0.15)', textDecoration: 'none' } as React.CSSProperties}>
            <span className="mode-icon">🌍</span>
            <h3 className="mode-title">1v1 Online</h3>
            <p className="mode-desc">Get matched with a live opponent from anywhere in the world. Race to be the Genius!</p>
            <div style={{ marginTop: 12 }}>
              <span className="badge badge-primary">MULTIPLAYER</span>
            </div>
          </Link>

          <Link href="/play?mode=private" className="mode-card" style={{ '--card-accent': 'rgba(236,72,153,0.12)', textDecoration: 'none' } as React.CSSProperties}>
            <span className="mode-icon">🔗</span>
            <h3 className="mode-title">Private Room</h3>
            <p className="mode-desc">Create a room and share the link to challenge a specific friend directly.</p>
          </Link>
        </div>
      </section>

      {/* STATS */}
      <section style={{ padding: '60px 24px', background: 'var(--bg-secondary)', textAlign: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 32, maxWidth: 700, margin: '0 auto' }}>
          {[
            { value: '62,208', label: 'Unique Puzzles' },
            { value: '100%', label: 'Guaranteed Solvable' },
            { value: '9', label: 'Puzzle Pieces' },
            { value: '∞', label: 'Competitions' },
          ].map(stat => (
            <div key={stat.label}>
              <div style={{ fontFamily: 'Orbitron,sans-serif', fontSize: '2rem', fontWeight: 900, color: 'var(--text-accent)', marginBottom: 4 }}>{stat.value}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Orbitron,sans-serif', fontSize: 'clamp(1.5rem,4vw,2.5rem)', marginBottom: 16 }}>Ready to prove your genius?</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: '1.1rem' }}>Create your free account and start competing today.</p>
        <Link href="/signup" className="btn btn-primary btn-lg">Get Started — It's Free</Link>
      </section>
    </>
  );
}

function MiniShowcase() {
  const sampleBoard = [
    ['blocker', null, null, 'p6', 'p6', 'p6'],
    [null, null, null, null, 'p6', null],
    ['p3', 'p3', 'p3', null, null, null],
    [null, null, 'blocker', null, 'p8', 'p8'],
    ['p9', null, null, null, 'p8', 'p8'],
    ['p9', 'blocker', null, null, null, null],
  ];

  return (
    <div style={{ display: 'inline-grid', gridTemplateColumns: 'repeat(6,36px)', gridTemplateRows: 'repeat(6,36px)', gap: 3, padding: 3, borderRadius: 10, background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-bright)', marginTop: 16 }}>
      {sampleBoard.map((row, r) => row.map((cell, c) => {
        const pieceColors: Record<string, string> = { p3:'#eab308', p6:'#6366f1', p8:'#ec4899', p9:'#14b8a6' };
        return (
          <div key={`${r},${c}`} style={{
            borderRadius: 4,
            background: cell === 'blocker' ? 'var(--bg-primary)' : cell ? pieceColors[cell] || '#555' : 'var(--bg-secondary)',
            position: 'relative',
            boxShadow: cell && cell !== 'blocker' ? `0 2px 6px ${pieceColors[cell] || '#555'}60` : 'none',
          }}>
            {cell === 'blocker' && (
              <div style={{ position:'absolute', inset:'18%', background:'var(--text-muted)', borderRadius:'50%' }} />
            )}
          </div>
        );
      }))}
    </div>
  );
}
