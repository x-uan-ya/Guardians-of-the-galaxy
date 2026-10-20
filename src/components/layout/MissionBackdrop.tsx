/**
 * MissionBackdrop.tsx
 * -------------------
 * A fixed, full-viewport decorative background rendered behind all UI. Stacked
 * layers, back to front:
 *   1. The NASA Mars artwork (public/mars-bg.webp) with a slow Ken Burns drift.
 *   2. A tactical HUD grid, edge-masked.
 *   3. Drifting wind-blown dust particles.
 *   4. A twinkling star-field.
 *   5. Ambient CRT scanlines.
 *   6. A dark scrim so foreground text stays readable.
 *
 * Purely decorative: aria-hidden, pointer-events-none, no game logic. If the
 * image file is absent, the gradient fallback in index.css still looks right.
 * All motion is disabled under prefers-reduced-motion (see index.css).
 */

import type { ReactElement } from 'react';

export function MissionBackdrop(): ReactElement {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* 1. Photographic Mars layer with slow drift. */}
      <div className="mars-backdrop absolute inset-0 animate-backdrop-drift" />

      {/* 2. Tactical HUD grid. */}
      <div className="hud-grid absolute inset-0" />

      {/* 3. Wind-blown dust. */}
      <div className="dust-storm absolute inset-0 animate-dust-move opacity-60" />

      {/* 4. Twinkling stars. */}
      <div className="starfield absolute inset-0 animate-twinkle opacity-50 mix-blend-screen" />

      {/* 5. Ambient scanlines. */}
      <div className="scanlines absolute inset-0 opacity-20" />

      {/* 6. Readability scrim. */}
      <div className="mars-scrim absolute inset-0" />
    </div>
  );
}
