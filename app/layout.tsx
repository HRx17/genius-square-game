import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Genius Square — Online Puzzle Race Game',
  description: 'Race to fill your 6x6 grid before your opponent! Play the classic Genius Square puzzle game online with live multiplayer, leaderboards, and more.',
  keywords: 'genius square, puzzle game, board game, multiplayer, online game',
  openGraph: {
    title: 'Genius Square — Online Puzzle Race Game',
    description: 'Race to fill your 6x6 grid before your opponent!',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>■</text></svg>" />
      </head>
      <body>
        <Navbar />
        <main className="page-enter">
          {children}
        </main>
      </body>
    </html>
  );
}
