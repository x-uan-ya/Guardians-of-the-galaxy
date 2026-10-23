/**
 * MissionBackdrop.tsx
 * -------------------
 * A beautiful, comfortable space background that's stunning yet easy on the eyes
 */

import type { ReactElement } from 'react';

export function MissionBackdrop(): ReactElement {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* 1. Soft, deep space gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950" />
      
      {/* 2. Gentle nebula clouds with softer colors */}
      <div className="absolute top-0 left-0 w-[900px] h-[900px] bg-gradient-radial from-purple-600/35 via-purple-800/15 to-transparent opacity-70 blur-3xl animate-pulse-slow" 
           style={{ animationDuration: '10s' }} />
      <div className="absolute top-1/3 right-0 w-[800px] h-[800px] bg-gradient-radial from-blue-500/30 via-indigo-700/12 to-transparent opacity-65 blur-3xl animate-pulse-slow"
           style={{ animationDuration: '12s', animationDelay: '3s' }} />
      <div className="absolute bottom-0 left-1/4 w-[700px] h-[700px] bg-gradient-radial from-cyan-600/25 via-cyan-800/10 to-transparent opacity-60 blur-3xl animate-pulse-slow"
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

      {/* 6. Subtle ambient glow effects (softer than before) */}
      <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-orange-400/15 rounded-full blur-3xl animate-pulse-slow"
           style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-1/3 right-1/4 w-[350px] h-[350px] bg-cyan-400/12 rounded-full blur-3xl animate-pulse-slow"
           style={{ animationDuration: '9s', animationDelay: '4s' }} />

      {/* 7. Gentle readability overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/15 to-black/30" />
    </div>
  );
}
