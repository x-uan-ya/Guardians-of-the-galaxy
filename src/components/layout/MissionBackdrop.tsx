/**
 * MissionBackdrop.tsx
 * -------------------
 * A beautiful, comfortable space background that's stunning yet easy on the eyes
 */

import type { ReactElement } from 'react';

export function MissionBackdrop(): ReactElement {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* 1. Warm Mars-toned deep space gradient base (matches the login page) */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-950 via-mars-deep to-slate-950" />
      
      {/* 2. Gentle Martian dust clouds in warm tones */}
      <div className="absolute top-0 left-0 w-[900px] h-[900px] bg-gradient-radial from-orange-600/35 via-orange-800/15 to-transparent opacity-70 blur-3xl animate-pulse-slow" 
           style={{ animationDuration: '10s' }} />
      <div className="absolute top-1/3 right-0 w-[800px] h-[800px] bg-gradient-radial from-mars-red/35 via-amber-800/12 to-transparent opacity-65 blur-3xl animate-pulse-slow"
           style={{ animationDuration: '12s', animationDelay: '3s' }} />
      <div className="absolute bottom-0 left-1/4 w-[700px] h-[700px] bg-gradient-radial from-amber-600/25 via-orange-900/10 to-transparent opacity-60 blur-3xl animate-pulse-slow"
           style={{ animationDuration: '14s', animationDelay: '6s' }} />

      {/* 3. Delicate twinkling stars - multiple layers for depth */}
      <div className="starfield-far absolute inset-0 opacity-50 animate-twinkle" 
           style={{ animationDuration: '5s' }} />
      <div className="starfield absolute inset-0 opacity-70 animate-twinkle" 
           style={{ animationDuration: '4s', animationDelay: '1.5s' }} />
      <div className="starfield-near absolute inset-0 opacity-85 animate-twinkle mix-blend-screen" 
           style={{ animationDuration: '3s', animationDelay: '0.5s' }} />

      {/* 4. Mars surface - more visible and prominent */}
      <div className="mars-backdrop absolute inset-0 animate-backdrop-drift opacity-60 mix-blend-luminosity" />

      {/* 5. Soft cosmic dust */}
      <div className="dust-storm absolute inset-0 animate-dust-move opacity-20 mix-blend-screen" />

      {/* 6. Subtle warm ambient glow effects */}
      <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-orange-400/15 rounded-full blur-3xl animate-pulse-slow"
           style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-1/3 right-1/4 w-[350px] h-[350px] bg-amber-500/12 rounded-full blur-3xl animate-pulse-slow"
           style={{ animationDuration: '9s', animationDelay: '4s' }} />

      {/* 7. Gentle readability overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/15 to-black/30" />
    </div>
  );
}
