'use client';
import { useEffect, useRef } from 'react';

// Generate random starfield
function Stars() {
  const count = 60;
  return (
    <div className="stars" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="star"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            '--duration': `${2 + Math.random() * 4}s`,
            '--delay': `${Math.random() * 4}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export default Stars;
