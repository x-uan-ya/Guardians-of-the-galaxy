/**
 * OccupationAvatar.tsx
 * --------------------
 * Renders an occupation's portrait. It attempts to load the image file from
 * /public (occ.image). If that file is missing or fails to load, it falls back
 * to a generated portrait: a tinted radial-gradient disc with the occupation's
 * glyph. This means the UI looks intentional even before real art is added —
 * drop files at public/occupations/<id>.webp to use your own portraits.
 *
 * Pure presentational, no game logic.
 */

import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import type { OccupationDef } from './occupations';

interface OccupationAvatarProps {
  occupation: OccupationDef;
  /** Pixel size (square). Defaults to 64. */
  size?: number;
  className?: string;
}

export function OccupationAvatar({
  occupation,
  size = 64,
  className = '',
}: OccupationAvatarProps): ReactElement {
  const [failed, setFailed] = useState(false);

  // Reset the error state if the occupation (and thus image) changes.
  useEffect(() => {
    setFailed(false);
  }, [occupation.image]);

  const dimension = { width: size, height: size };

  if (failed) {
    // Generated fallback portrait: tinted disc + glyph.
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full ${className}`}
        style={{
          ...dimension,
          background: `radial-gradient(circle at 35% 30%, ${occupation.accent}55, #0a0a0f 85%)`,
          boxShadow: `inset 0 0 0 1px ${occupation.accent}66`,
          fontSize: size * 0.45,
        }}
        role="img"
        aria-label={`${occupation.label} portrait`}
      >
        <span aria-hidden>{occupation.glyph}</span>
      </div>
    );
  }

  return (
    <img
      src={occupation.image}
      alt={`${occupation.label} portrait`}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-full object-cover ${className}`}
      style={{ ...dimension, boxShadow: `inset 0 0 0 1px ${occupation.accent}66` }}
    />
  );
}
