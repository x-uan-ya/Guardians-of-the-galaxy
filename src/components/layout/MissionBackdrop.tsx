/**
 * MissionBackdrop.tsx
 * -------------------
 * A fixed, full-viewport decorative background rendered behind all UI.
 * Three stacked layers:
 *   1. The NASA Mars artwork (public/mars-bg.jpg) with a slow Ken Burns drift.
 *   2. A twinkling star-field overlay.
 *   3. A dark scrim gradient so foreground text stays readable.
 *
 * Purely decorative: aria-hidden, pointer-events-none, no game logic. If the
 * image file is absent, the gradient fallback in index.css still looks right.
 */

import type { ReactElement } from 'react';

export function MissionBackdrop(): ReactElement {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* 1. Photographic Mars layer with slow drift. */}
      <div className="mars-backdrop absolute inset-0 animate-backdrop-drift" />

      {/* 2. Twinkling stars. */}
      <div className="starfield absolute inset-0 animate-twinkle opacity-60 mix-blend-screen" />

      {/* 3. Readability scrim. */}
      <div className="mars-scrim absolute inset-0" />
    </div>
  );
}
