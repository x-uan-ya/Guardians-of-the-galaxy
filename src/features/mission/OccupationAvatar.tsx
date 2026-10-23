/**
 * OccupationAvatar.tsx
 * --------------------
 * Renders an occupation as a small blocky, Roblox-style character that really
 * moves (see OccupationArt.tsx for the drawings).
 *
 * Poses:
 *  - 'idle' (default): breathes, blinks and sways a little.
 *  - 'walk': walks on the spot, swinging arms and legs, tool in hand.
 *  - 'wave': hops and waves.
 * Pointing at the character (or at its picker card, `.occ-card`) makes it walk,
 * and selecting its card makes it wave, whatever its own pose is.
 * `still` freezes everything (e.g. on the game-over screen).
 *
 * Reduced motion: the always-on movement (breathing, blinking, the dashboard
 * walk) is switched off, but movement the user asks for by hovering or selecting
 * still plays, because it is a direct response to their action.
 *
 * Pure presentational, no game logic.
 */

import type { ReactElement } from 'react';
import type { OccupationDef } from './occupations';
import { OccupationArt } from './OccupationArt';

export type AvatarPose = 'idle' | 'walk' | 'wave';

/** The drawing is 88 units wide and 100 tall. */
const ASPECT = 0.88;

interface OccupationAvatarProps {
  occupation: OccupationDef;
  /** Height in pixels (width follows the artwork's proportions). Defaults to 96. */
  size?: number;
  className?: string;
  pose?: AvatarPose;
  /** Freeze all motion. */
  still?: boolean;
}

export function OccupationAvatar({
  occupation,
  size = 96,
  className = '',
  pose = 'idle',
  still = false,
}: OccupationAvatarProps): ReactElement {
  return (
    <div
      className={`rbx relative shrink-0 ${className}`}
      data-pose={pose}
      data-still={still ? 'true' : 'false'}
      style={{
        width: Math.round(size * ASPECT),
        height: size,
        background: `radial-gradient(ellipse 62% 46% at 45% 90%, ${occupation.accent}55, transparent 72%)`,
      }}
      role="img"
      aria-label={`${occupation.label} character`}
    >
      <OccupationArt occupation={occupation.id} accent={occupation.accent} />
    </div>
  );
}
