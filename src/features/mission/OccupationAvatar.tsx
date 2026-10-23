/**
 * OccupationAvatar.tsx
 * --------------------
 * Renders an occupation's animated portrait: a small astronaut holding a
 * role-specific tool, drawn in code (see OccupationArt.tsx).
 *
 * Motion:
 *  - Always: the astronaut bobs, blinks and the suit lights pulse.
 *  - The role's tool (wrench, atom, sprout...) animates when `live` is set, or
 *    when the avatar sits inside a picker card (`.occ-card`) that is hovered
 *    or selected.
 *  - `still` freezes everything (e.g. on the game-over screen).
 *  - Motion is also switched off for users who prefer reduced motion.
 *
 * Pure presentational, no game logic.
 */

import type { ReactElement } from 'react';
import type { OccupationDef } from './occupations';
import { OccupationArt } from './OccupationArt';

interface OccupationAvatarProps {
  occupation: OccupationDef;
  /** Pixel size (square). Defaults to 64. */
  size?: number;
  className?: string;
  /** Keep the role's tool animating continuously (dashboard use). */
  live?: boolean;
  /** Freeze all motion. */
  still?: boolean;
}

export function OccupationAvatar({
  occupation,
  size = 64,
  className = '',
  live = false,
  still = false,
}: OccupationAvatarProps): ReactElement {
  return (
    <div
      className={`occ-avatar relative shrink-0 overflow-hidden rounded-full ${className}`}
      data-live={live ? 'true' : 'false'}
      data-still={still ? 'true' : 'false'}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 30%, ${occupation.accent}55, #0a0a0f 85%)`,
      }}
      role="img"
      aria-label={`${occupation.label} portrait`}
    >
      <OccupationArt occupation={occupation.id} />
      {/* Ring drawn above the art so the edge stays crisp. */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{ boxShadow: `inset 0 0 0 1px ${occupation.accent}88` }}
      />
    </div>
  );
}
