/**
 * OccupationArt.tsx
 * -----------------
 * Hand-drawn SVG portraits for every occupation: a little astronaut holding a
 * role-specific tool. Everything is drawn in code (no image files), so it is
 * crisp at any size and can be animated with CSS.
 *
 * Animation hooks (the keyframes live in styles/index.css):
 *  - .occ-figure  the whole astronaut bobs gently
 *  - .occ-eye     blinks
 *  - .occ-led     suit lights pulse
 *  - .occ-star    background stars twinkle
 *  - .occ-prop    the role's tool; it only moves while the avatar is "live"
 *                 or its picker card is hovered / selected (see index.css)
 *
 * Artwork is designed on a 100x100 canvas and cropped to a circle by the
 * wrapper (OccupationAvatar), so keep shapes within ~50 units of the centre.
 */

import type { CSSProperties, ReactElement, ReactNode } from 'react';
import type { Occupation } from '../simulation/simulationTypes';

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

const STARS: { cx: number; cy: number; delay: string }[] = [
  { cx: 17, cy: 30, delay: '0s' },
  { cx: 29, cy: 12, delay: '0.8s' },
  { cx: 70, cy: 9, delay: '1.4s' },
  { cx: 85, cy: 24, delay: '0.4s' },
  { cx: 11, cy: 54, delay: '1.9s' },
];

function Backdrop(): ReactElement {
  return (
    <g>
      {STARS.map((s) => (
        <circle
          key={`${s.cx}-${s.cy}`}
          className="occ-star"
          cx={s.cx}
          cy={s.cy}
          r="1.1"
          fill="#ffffff"
          style={{ animationDelay: s.delay } as CSSProperties}
        />
      ))}
      <path d="M0 80 Q22 72 46 79 T100 76 V100 H0Z" fill="#8a3a22" opacity="0.5" />
      <path d="M0 88 Q30 82 60 88 T100 86 V100 H0Z" fill="#5c2415" opacity="0.6" />
    </g>
  );
}

interface FrameProps {
  skin: string;
  suit: string;
  trim: string;
  /** The role's tool, drawn on top of the astronaut. */
  children: ReactNode;
}

/** The astronaut itself, shared by every role. */
function Frame({ skin, suit, trim, children }: FrameProps): ReactElement {
  return (
    <svg
      viewBox="0 0 100 100"
      className="block h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      <Backdrop />
      <g className="occ-figure">
        {/* Suit and shoulders */}
        <path d="M14 104 C14 80 30 70 50 70 C70 70 86 80 86 104 Z" fill={suit} />
        <path d="M34 72 C40 78 60 78 66 72 L66 76 C60 82 40 82 34 76 Z" fill={trim} opacity="0.9" />
        {/* Chest pack */}
        <rect x="42" y="86" width="16" height="10" rx="3" fill="#0e1520" opacity="0.55" />
        <circle className="occ-led" cx="50" cy="91" r="2.2" fill={trim} />

        {/* Helmet */}
        <circle cx="50" cy="40" r="27" fill="#e8edf3" />
        <circle cx="50" cy="40" r="27" fill="none" stroke={trim} strokeWidth="2.2" />
        {/* Visor and face */}
        <ellipse cx="50" cy="41" rx="20" ry="18" fill="#16202e" />
        <circle cx="50" cy="43" r="13" fill={skin} />
        <circle className="occ-eye" cx="45.5" cy="42" r="1.8" fill="#1b1b22" />
        <circle className="occ-eye" cx="54.5" cy="42" r="1.8" fill="#1b1b22" />
        <path
          d="M46 48 Q50 51.5 54 48"
          stroke="#1b1b22"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
        />
        {/* Visor glint */}
        <path
          d="M36 32 Q41 26 49 25"
          stroke="#ffffff"
          strokeOpacity="0.55"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
        {/* Antenna */}
        <line x1="72" y1="22" x2="77" y2="13" stroke="#c9d3de" strokeWidth="1.8" />
        <circle className="occ-led" cx="77" cy="12" r="2.2" fill={trim} />

        {/* Role tool */}
        {children}
      </g>
    </svg>
  );
}

/** A small twinkling spark, used by several roles. */
function Spark({ cx, cy, color, delay }: { cx: number; cy: number; color: string; delay: string }): ReactElement {
  return (
    <circle
      className="occ-prop occ-spark"
      cx={cx}
      cy={cy}
      r="1.5"
      fill={color}
      style={{ animationDelay: delay } as CSSProperties}
    />
  );
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

/** Engineer: swings a wrench, sparks fly. */
function EngineerArt(): ReactElement {
  return (
    <Frame skin="#d9a066" suit="#d2692f" trim="#ffb27a">
      <g className="occ-prop occ-swing">
        <rect x="82.5" y="58" width="5" height="26" rx="2.5" fill="#c3ccd6" />
        <circle
          cx="85"
          cy="54"
          r="6.5"
          fill="none"
          stroke="#c3ccd6"
          strokeWidth="4"
          strokeDasharray="30 11"
          transform="rotate(-50 85 54)"
        />
        <circle cx="85" cy="82" r="3.4" fill="#f2f4f7" />
      </g>
      <Spark cx={72} cy={52} color="#ffd36b" delay="0s" />
      <Spark cx={80} cy={44} color="#ffffff" delay="0.3s" />
    </Frame>
  );
}

/** Scientist: an atom orbits beside the helmet. */
function ScientistArt(): ReactElement {
  return (
    <Frame skin="#f1c9a0" suit="#2f6db5" trim="#8fc3ff">
      <g className="occ-prop occ-orbit">
        <ellipse cx="76" cy="64" rx="13" ry="5" fill="none" stroke="#7fb8ff" strokeWidth="1.6" />
        <ellipse
          cx="76"
          cy="64"
          rx="13"
          ry="5"
          fill="none"
          stroke="#7fb8ff"
          strokeWidth="1.6"
          transform="rotate(60 76 64)"
        />
        <ellipse
          cx="76"
          cy="64"
          rx="13"
          ry="5"
          fill="none"
          stroke="#7fb8ff"
          strokeWidth="1.6"
          transform="rotate(120 76 64)"
        />
        <circle cx="76" cy="64" r="2.8" fill="#ffd36b" />
        <circle cx="89" cy="64" r="1.8" fill="#ffffff" />
      </g>
    </Frame>
  );
}

/** Medical Officer: a pulsing medical badge and a heartbeat line. */
function MedicalOfficerArt(): ReactElement {
  return (
    <Frame skin="#8d5a3b" suit="#2a9d95" trim="#8ff0e6">
      <g className="occ-prop occ-pulse">
        <rect x="28" y="80" width="12" height="12" rx="3" fill="#ffffff" />
        <path
          d="M34 82.5 V89.5 M30.5 86 H37.5"
          stroke="#e0434e"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </g>
      <path
        className="occ-prop occ-ecg"
        d="M60 78 h5 l3 -8 l5 15 l3 -7 h8"
        pathLength={50}
        strokeDasharray="50"
        fill="none"
        stroke="#8ff0e6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Frame>
  );
}

/** Botanist: a potted sprout that sways. */
function BotanistArt(): ReactElement {
  return (
    <Frame skin="#c68642" suit="#3a8f5c" trim="#9be8b4">
      <path d="M68 76 h16 l-2.5 12 h-11 z" fill="#b5651d" />
      <rect x="67" y="75" width="18" height="3" rx="1.5" fill="#cf7a2c" />
      <circle cx="67" cy="85" r="3" fill="#f2f4f7" />
      <g className="occ-prop occ-sway">
        <path d="M76 76 V64" stroke="#3f9d5a" strokeWidth="2" strokeLinecap="round" />
        <path d="M76 68 C70 66 68 61 70 58 C75 58 77 62 76 68 Z" fill="#6fdc8c" />
        <path d="M76 65 C82 64 85 59 83 56 C78 56 75 60 76 65 Z" fill="#4caf72" />
      </g>
    </Frame>
  );
}

/** Geologist: taps a rock with a hammer and uncovers glinting ice. */
function GeologistArt(): ReactElement {
  return (
    <Frame skin="#e8b98a" suit="#a8683c" trim="#e8b57a">
      <path d="M62 83 l5 -6 l9 1 l5 6 z" fill="#8a5a3a" />
      <path
        className="occ-prop occ-spark"
        d="M70 81 l2 -3 l2 3 l-2 3 z"
        fill="#9fe7ff"
        style={{ animationDelay: '0.2s' } as CSSProperties}
      />
      <g className="occ-prop occ-swing">
        <rect x="82.5" y="58" width="5" height="26" rx="2.5" fill="#8a5a3a" />
        <rect x="77" y="54" width="16" height="7" rx="1.5" fill="#9aa5b1" />
        <path d="M77 54 l-6 3.5 l6 3.5 z" fill="#9aa5b1" />
        <circle cx="85" cy="82" r="3.4" fill="#f2f4f7" />
      </g>
      <Spark cx={66} cy={74} color="#ffd36b" delay="0.5s" />
    </Frame>
  );
}

/** Chemist: an oxygen tank with rising bubbles. */
function ChemistArt(): ReactElement {
  return (
    <Frame skin="#f0d0b0" suit="#d1478b" trim="#ffa8d1">
      <rect x="75" y="56" width="4" height="5" fill="#8895a5" />
      <rect x="70" y="60" width="14" height="21" rx="5" fill="#cfd8e3" />
      <rect x="70" y="67" width="14" height="7" fill="#4fb3ff" />
      <text
        x="77"
        y="72.4"
        fontSize="5.5"
        fontWeight="700"
        textAnchor="middle"
        fill="#ffffff"
        fontFamily="sans-serif"
      >
        O2
      </text>
      <circle
        className="occ-prop occ-rise"
        cx="77"
        cy="54"
        r="1.8"
        fill="none"
        stroke="#bfe9ff"
        strokeWidth="1"
        style={{ animationDelay: '0s' } as CSSProperties}
      />
      <circle
        className="occ-prop occ-rise"
        cx="73"
        cy="55"
        r="1.3"
        fill="none"
        stroke="#bfe9ff"
        strokeWidth="1"
        style={{ animationDelay: '0.45s' } as CSSProperties}
      />
      <circle
        className="occ-prop occ-rise"
        cx="81"
        cy="55"
        r="1.5"
        fill="none"
        stroke="#bfe9ff"
        strokeWidth="1"
        style={{ animationDelay: '0.9s' } as CSSProperties}
      />
    </Frame>
  );
}

/** Commander: waves a flag and wears a glowing gold star. */
function CommanderArt(): ReactElement {
  return (
    <Frame skin="#a9744f" suit="#8a2f3f" trim="#f2c14e">
      <rect x="80" y="48" width="2" height="36" rx="1" fill="#cfd8e3" />
      <g className="occ-prop occ-wave">
        <path d="M82 49 h12 v9 h-12 z" fill="#e0434e" />
        <circle cx="86.5" cy="53.5" r="1.7" fill="#ffffff" />
      </g>
      <g className="occ-prop occ-pulse">
        <polygon
          points="34,81 35.5,84.5 39.3,84.7 36.3,87 37.4,90.7 34,88.6 30.6,90.7 31.7,87 28.7,84.7 32.5,84.5"
          fill="#f2c14e"
        />
      </g>
    </Frame>
  );
}

/** Pilot: holds up a solar panel that catches the sun. */
function PilotArt(): ReactElement {
  return (
    <Frame skin="#f4c7a1" suit="#4a5568" trim="#ffd54a">
      <g transform="rotate(-18 76 68)">
        <rect
          x="64"
          y="60"
          width="24"
          height="16"
          rx="1.5"
          fill="#1f3d7a"
          stroke="#9db8e8"
          strokeWidth="1"
        />
        <path d="M72 60 V76 M80 60 V76 M64 68 H88" stroke="#9db8e8" strokeWidth="0.6" />
        <path className="occ-prop occ-shine" d="M64 60 h10 l-10 16 z" fill="#ffffff" />
      </g>
      <g className="occ-prop occ-orbit">
        <circle cx="87" cy="44" r="3" fill="#ffd54a" />
        <path
          d="M87 38 v-2 M87 50 v2 M81 44 h-2 M93 44 h2"
          stroke="#ffd54a"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </g>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export function OccupationArt({ occupation }: { occupation: Occupation }): ReactElement {
  switch (occupation) {
    case 'engineer':
      return <EngineerArt />;
    case 'scientist':
      return <ScientistArt />;
    case 'medicalOfficer':
      return <MedicalOfficerArt />;
    case 'botanist':
      return <BotanistArt />;
    case 'geologist':
      return <GeologistArt />;
    case 'chemist':
      return <ChemistArt />;
    case 'commander':
      return <CommanderArt />;
    case 'pilot':
      return <PilotArt />;
  }
}
