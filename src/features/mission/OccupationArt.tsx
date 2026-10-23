/**
 * OccupationArt.tsx
 * -----------------
 * Roblox-style blocky characters for every occupation, drawn as SVG. Each one is
 * a full body (head, torso, two arms, two legs) in role-specific clothes and
 * holding a role-specific tool, so the limbs can really move: walking, waving,
 * hopping, blinking.
 *
 * Animation hooks (keyframes live in styles/index.css):
 *  - .rbx-figure             whole body (breathing / walking bounce / hop)
 *  - .rbx-head               head nod
 *  - .rbx-arm-l/-r, .rbx-leg-l/-r   limbs, rotated around their joints
 *  - .rbx-eye                blinks
 *  - .rbx-tool               the held tool's own motion (swing, spin, pulse...)
 *  - .rbx-twinkle            lamps, medals and sparkles
 *
 * The canvas is 88 x 100 units. Joint positions are repeated in index.css
 * (arm shoulders at (21,40) and (59,40), hips at (33.5,64) and (46.5,64), neck
 * at (40,35)), so keep the body geometry below in sync with those values.
 * Tools are drawn in the right arm's own (unrotated) coordinates and stay
 * within roughly x <= 73, y <= 70 so they never leave the canvas when swinging.
 */

import type { CSSProperties, ReactElement, ReactNode } from 'react';
import type { Occupation } from '../simulation/simulationTypes';

// ---------------------------------------------------------------------------
// Shared body
// ---------------------------------------------------------------------------

interface CharacterProps {
  accent: string;
  skin: string;
  /** Torso colour (the shirt). */
  shirt: string;
  /** Arm colour (sleeves) and how far down the arm it reaches (arm is 27 tall). */
  sleeve: string;
  sleeveLen?: number;
  /** Colour of the hands; defaults to skin (set for gloves). */
  hand?: string;
  pants: string;
  shoes: string;
  /** Clothing drawn on top of the torso. */
  torso?: ReactNode;
  /** Glasses and other face details. */
  face?: ReactNode;
  /** Hats and hair. */
  headgear?: ReactNode;
  /** Held tool, drawn in the right arm's coordinates. */
  tool?: ReactNode;
  /** Things standing on the ground beside the character. */
  scene?: ReactNode;
}

function Character({
  accent,
  skin,
  shirt,
  sleeve,
  sleeveLen = 20,
  hand,
  pants,
  shoes,
  torso,
  face,
  headgear,
  tool,
  scene,
}: CharacterProps): ReactElement {
  const handColor = hand ?? skin;
  return (
    <svg
      viewBox="0 0 88 100"
      className="block h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      {/* Ground */}
      <ellipse cx="40" cy="92" rx="27" ry="5" fill={accent} opacity="0.22" />
      <ellipse className="rbx-shadow" cx="40" cy="92.5" rx="19" ry="3.4" fill="#000000" opacity="0.4" />
      {scene}

      <g className="rbx-figure">
        {/* Legs */}
        <g className="rbx-limb rbx-leg-l">
          <rect x="28" y="64" width="11" height="28" rx="2" fill={pants} />
          <rect x="28" y="86" width="11" height="6" rx="2" fill={shoes} />
        </g>
        <g className="rbx-limb rbx-leg-r">
          <rect x="41" y="64" width="11" height="28" rx="2" fill={pants} />
          <rect x="41" y="86" width="11" height="6" rx="2" fill={shoes} />
        </g>

        {/* Torso and clothing */}
        <rect x="26" y="38" width="28" height="28" rx="3" fill={shirt} />
        {torso}

        {/* Left arm (on the viewer's left) */}
        <g className="rbx-limb rbx-arm-l">
          <rect x="16.5" y="38" width="9" height="27" rx="2.5" fill={handColor} />
          <rect x="16.5" y="38" width="9" height={sleeveLen} rx="2.5" fill={sleeve} />
        </g>

        {/* Right arm, holding the tool */}
        <g className="rbx-limb rbx-arm-r">
          <rect x="54.5" y="38" width="9" height="27" rx="2.5" fill={handColor} />
          <rect x="54.5" y="38" width="9" height={sleeveLen} rx="2.5" fill={sleeve} />
          {tool}
        </g>

        {/* Neck and head */}
        <rect x="36" y="34" width="8" height="5" fill={skin} />
        <g className="rbx-limb rbx-head">
          <rect x="29" y="12" width="22" height="23" rx="6" fill={skin} />
          <ellipse cx="33.2" cy="29" rx="2.4" ry="1.4" fill="#ff7a7a" opacity="0.28" />
          <ellipse cx="46.8" cy="29" rx="2.4" ry="1.4" fill="#ff7a7a" opacity="0.28" />
          <circle className="rbx-eye" cx="35.2" cy="23.5" r="1.8" fill="#1b1b22" />
          <circle className="rbx-eye" cx="44.8" cy="23.5" r="1.8" fill="#1b1b22" />
          <path
            d="M36.5 29.5 Q40 32.6 43.5 29.5"
            stroke="#1b1b22"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
          />
          {face}
          {headgear}
        </g>
      </g>
    </svg>
  );
}

/** Hard hat with a headlamp (engineer, geologist). */
function HardHat({ color, ridge }: { color: string; ridge: string }): ReactElement {
  return (
    <g>
      <path d="M28 15 Q28 3.5 40 3.5 Q52 3.5 52 15 Z" fill={color} />
      <rect x="38" y="3.5" width="4" height="11.5" fill={ridge} />
      <rect x="25.5" y="14" width="29" height="3.5" rx="1.7" fill={color} />
      <circle className="rbx-twinkle" cx="40" cy="9.5" r="2.3" fill="#fff6c4" />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

/** Engineer: hard hat, tool belt, swings a wrench. */
function EngineerArt({ accent }: { accent: string }): ReactElement {
  return (
    <Character
      accent={accent}
      skin="#d9a066"
      shirt="#d2692f"
      sleeve="#d2692f"
      pants="#3b4a5e"
      shoes="#1e232b"
      torso={
        <g>
          <rect x="26" y="52" width="28" height="3" fill="#ffe08a" />
          <rect x="26" y="60" width="28" height="4" fill="#5c3a1e" />
          <rect x="38" y="60.5" width="4" height="3" fill="#d9b86a" />
        </g>
      }
      headgear={<HardHat color="#f2b01e" ridge="#d99a10" />}
      tool={
        <g className="rbx-tool rbx-chop">
          <rect x="62" y="50" width="4" height="20" rx="2" fill="#c3ccd6" />
          <circle
            cx="64"
            cy="47"
            r="5.2"
            fill="none"
            stroke="#c3ccd6"
            strokeWidth="3.4"
            strokeDasharray="25 8"
            transform="rotate(-50 64 47)"
          />
        </g>
      }
    />
  );
}

/** Scientist: lab coat, glasses, an atom orbiting in hand. */
function ScientistArt({ accent }: { accent: string }): ReactElement {
  return (
    <Character
      accent={accent}
      skin="#f1c9a0"
      shirt="#2f6db5"
      sleeve="#f4f7fb"
      sleeveLen={22}
      pants="#2c3550"
      shoes="#151822"
      torso={
        <g>
          <rect x="26" y="38" width="12" height="28" rx="3" fill="#f4f7fb" />
          <rect x="42" y="38" width="12" height="28" rx="3" fill="#f4f7fb" />
          <rect x="29.5" y="54" width="5" height="1.6" fill="#2f6db5" />
          <rect x="31" y="50" width="1.6" height="5" fill="#e0434e" />
        </g>
      }
      face={
        <g fill="rgba(255,255,255,0.18)" stroke="#222c3a" strokeWidth="1.1">
          <rect x="31.8" y="20.8" width="7.6" height="5.6" rx="1.6" />
          <rect x="40.6" y="20.8" width="7.6" height="5.6" rx="1.6" />
          <path d="M39.4 23.4 H40.6" fill="none" />
        </g>
      }
      headgear={
        <path d="M28 18 Q27 8 40 7.5 Q53 8 52 18 Q48 13.5 40 14 Q32 13.5 28 18 Z" fill="#4a3322" />
      }
      tool={
        <g className="rbx-tool rbx-spin">
          <ellipse cx="67" cy="56" rx="8" ry="3" fill="none" stroke="#7fb8ff" strokeWidth="1.3" />
          <ellipse
            cx="67"
            cy="56"
            rx="8"
            ry="3"
            fill="none"
            stroke="#7fb8ff"
            strokeWidth="1.3"
            transform="rotate(60 67 56)"
          />
          <ellipse
            cx="67"
            cy="56"
            rx="8"
            ry="3"
            fill="none"
            stroke="#7fb8ff"
            strokeWidth="1.3"
            transform="rotate(120 67 56)"
          />
          <circle cx="67" cy="56" r="2.2" fill="#ffd36b" />
          <circle cx="75" cy="56" r="1.4" fill="#ffffff" />
        </g>
      }
    />
  );
}

/** Medical Officer: scrubs and cap, stethoscope, a pulsing first-aid kit. */
function MedicalOfficerArt({ accent }: { accent: string }): ReactElement {
  return (
    <Character
      accent={accent}
      skin="#8d5a3b"
      shirt="#2a9d95"
      sleeve="#2a9d95"
      sleeveLen={11}
      pants="#237f79"
      shoes="#e8edf2"
      torso={
        <g>
          <path d="M34 38 L40 47 L46 38 Z" fill="#8d5a3b" />
          <path
            d="M33 39 Q31 54 40 55 Q49 54 47 39"
            stroke="#2b2f36"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="40" cy="55.5" r="2.2" fill="#aab4be" />
          <rect x="29.5" y="52" width="8" height="8" rx="2" fill="#ffffff" />
          <path
            d="M33.5 53.6 V58.4 M31.1 56 H35.9"
            stroke="#e0434e"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </g>
      }
      headgear={
        <g>
          <path d="M28.5 16 Q28.5 5.5 40 5.5 Q51.5 5.5 51.5 16 Z" fill="#3fc0b6" />
          <rect x="28.5" y="14.5" width="23" height="3" fill="#2a9d95" />
          <path
            d="M40 8 V12.6 M37.7 10.3 H42.3"
            stroke="#ffffff"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </g>
      }
      tool={
        <g className="rbx-tool rbx-pulse">
          <rect x="64.5" y="56.5" width="5" height="2.5" rx="1" fill="none" stroke="#9aa5b1" strokeWidth="1" />
          <rect x="61" y="58.5" width="12" height="9.5" rx="2" fill="#ffffff" />
          <path
            d="M67 60.7 V65.9 M64.4 63.3 H69.6"
            stroke="#e0434e"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      }
    />
  );
}

/** Botanist: straw hat, overalls, and a sprouting plant pot. */
function BotanistArt({ accent }: { accent: string }): ReactElement {
  return (
    <Character
      accent={accent}
      skin="#c68642"
      shirt="#efe6c8"
      sleeve="#efe6c8"
      pants="#3a8f5c"
      shoes="#6b4a2f"
      torso={
        <g>
          <rect x="31" y="46" width="18" height="20" fill="#3a8f5c" />
          <rect x="31" y="38" width="4" height="9" fill="#3a8f5c" />
          <rect x="45" y="38" width="4" height="9" fill="#3a8f5c" />
          <circle cx="33" cy="47.5" r="1.3" fill="#ffd36b" />
          <circle cx="47" cy="47.5" r="1.3" fill="#ffd36b" />
          <rect x="35.5" y="54" width="9" height="6" rx="1" fill="#2f7a4c" />
        </g>
      }
      headgear={
        <g>
          <path d="M30 15.5 Q30 5 40 5 Q50 5 50 15.5 Z" fill="#f0d27e" />
          <rect x="30" y="12" width="20" height="3.2" fill="#b5651d" />
          <ellipse cx="40" cy="15.8" rx="19" ry="3.8" fill="#e0bd5c" />
        </g>
      }
      tool={
        <g>
          <path d="M62 60 h12 l-2 9 h-8 z" fill="#b5651d" />
          <rect x="61.5" y="58.5" width="13" height="2.6" rx="1" fill="#cf7a2c" />
          <g className="rbx-tool rbx-grow">
            <path d="M68 58.5 V50" stroke="#3f9d5a" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M68 54 C63 53 61 49 63 46 C67 46 69 50 68 54 Z" fill="#6fdc8c" />
            <path d="M68 52 C73 51 75 47 73.5 44.5 C69.5 44.5 67 48 68 52 Z" fill="#4caf72" />
          </g>
        </g>
      }
    />
  );
}

/** Geologist: hard hat, vest, a rock hammer, and a rock with glinting ice. */
function GeologistArt({ accent }: { accent: string }): ReactElement {
  return (
    <Character
      accent={accent}
      skin="#e8b98a"
      shirt="#8b5a34"
      sleeve="#8b5a34"
      pants="#5b4630"
      shoes="#2a2118"
      torso={
        <g>
          <rect x="26" y="38" width="10" height="28" rx="3" fill="#d9b77a" />
          <rect x="44" y="38" width="10" height="28" rx="3" fill="#d9b77a" />
          <rect x="27.5" y="54" width="7" height="6" rx="1" fill="#b8975a" />
          <rect x="45.5" y="54" width="7" height="6" rx="1" fill="#b8975a" />
        </g>
      }
      headgear={<HardHat color="#c9a15b" ridge="#a98440" />}
      tool={
        <g className="rbx-tool rbx-chop">
          <rect x="62" y="50" width="4" height="20" rx="2" fill="#8a5a3a" />
          <rect x="59" y="46" width="12" height="6" rx="1.2" fill="#9aa5b1" />
          <path d="M71 46 l3 3 l-3 3 z" fill="#9aa5b1" />
        </g>
      }
      scene={
        <g>
          <path d="M5 91 l4 -6 l8 1 l4 5 z" fill="#8a5a3a" />
          <path
            className="rbx-twinkle"
            d="M11 88 l1.8 -2.6 l1.8 2.6 l-1.8 2.6 z"
            fill="#9fe7ff"
          />
        </g>
      }
    />
  );
}

/** Chemist: pink lab coat, goggles, green gloves, a bubbling flask. */
function ChemistArt({ accent }: { accent: string }): ReactElement {
  return (
    <Character
      accent={accent}
      skin="#f0d0b0"
      shirt="#f6f0f5"
      sleeve="#d1478b"
      sleeveLen={23}
      hand="#58d68d"
      pants="#2c2a3a"
      shoes="#14131c"
      torso={
        <g>
          <rect x="26" y="38" width="12" height="28" rx="3" fill="#d1478b" />
          <rect x="42" y="38" width="12" height="28" rx="3" fill="#d1478b" />
          <rect x="29" y="56" width="6" height="5" rx="1" fill="#b13574" />
        </g>
      }
      headgear={
        <g>
          <path d="M28 18 Q27 8.5 40 8 Q53 8.5 52 18 Q47 14 40 14.5 Q33 14 28 18 Z" fill="#22202b" />
          <circle cx="40" cy="6.5" r="4.2" fill="#22202b" />
          <rect x="28" y="14" width="24" height="2.6" fill="#333a44" />
          <rect x="31.5" y="12" width="7.5" height="5.5" rx="2" fill="#bfe9ff" fillOpacity="0.85" stroke="#333a44" strokeWidth="0.8" />
          <rect x="41" y="12" width="7.5" height="5.5" rx="2" fill="#bfe9ff" fillOpacity="0.85" stroke="#333a44" strokeWidth="0.8" />
        </g>
      }
      tool={
        <g>
          <rect x="65" y="54" width="4" height="7" fill="#cfe6f2" />
          <path d="M65 61 L60 69 Q59 71 61.5 71 H72.5 Q75 71 74 69 L69 61 Z" fill="#d6f0ff" />
          <path d="M60.8 67.5 H73.2 L74 69 Q75 71 72.5 71 H61.5 Q59 71 60 69 Z" fill="#7af0a8" />
          <g className="rbx-tool rbx-rise">
            <circle cx="67" cy="51" r="1.4" fill="none" stroke="#7af0a8" strokeWidth="0.9" />
          </g>
          <g
            className="rbx-tool rbx-rise"
            style={{ animationDelay: '0.5s' } as CSSProperties}
          >
            <circle cx="70.5" cy="49" r="1.1" fill="none" stroke="#7af0a8" strokeWidth="0.9" />
          </g>
          <g
            className="rbx-tool rbx-rise"
            style={{ animationDelay: '0.95s' } as CSSProperties}
          >
            <circle cx="64" cy="48" r="1.2" fill="none" stroke="#7af0a8" strokeWidth="0.9" />
          </g>
        </g>
      }
    />
  );
}

/** Commander: peaked cap, medal jacket, and a waving flag. */
function CommanderArt({ accent }: { accent: string }): ReactElement {
  return (
    <Character
      accent={accent}
      skin="#a9744f"
      shirt="#8a2f3f"
      sleeve="#8a2f3f"
      sleeveLen={22}
      pants="#2b2f45"
      shoes="#0f1118"
      torso={
        <g>
          <path d="M34 38 L40 44 L46 38 Z" fill="#b8475a" />
          <circle cx="40" cy="48" r="1.3" fill="#f2c14e" />
          <circle cx="40" cy="54" r="1.3" fill="#f2c14e" />
          <circle cx="40" cy="60" r="1.3" fill="#f2c14e" />
          <rect x="26" y="38" width="8" height="3.2" fill="#f2c14e" />
          <rect x="46" y="38" width="8" height="3.2" fill="#f2c14e" />
          <polygon
            className="rbx-twinkle"
            points="31.5,47 32.5,49.6 35.3,49.7 33.1,51.4 33.9,54 31.5,52.4 29.1,54 29.9,51.4 27.7,49.7 30.5,49.6"
            fill="#f2c14e"
          />
        </g>
      }
      headgear={
        <g>
          <path d="M29.5 15 Q29.5 5.5 40 5.5 Q50.5 5.5 50.5 15 Z" fill="#8a2f3f" />
          <rect x="29.5" y="12" width="21" height="2.6" fill="#f2c14e" />
          <circle cx="40" cy="9" r="2" fill="#f2c14e" />
          <rect x="31.5" y="14.5" width="17" height="3" rx="1.5" fill="#4a1620" />
        </g>
      }
      tool={
        <g>
          <rect x="63.5" y="44" width="1.8" height="26" rx="0.9" fill="#cfd8e3" />
          <g className="rbx-tool rbx-flag">
            <path d="M65.3 45 h9 v7 h-9 z" fill="#e0434e" />
            <circle cx="68.4" cy="48.5" r="1.4" fill="#ffffff" />
          </g>
        </g>
      }
    />
  );
}

/** Pilot: aviator cap and goggles, flight suit, scarf, a solar panel. */
function PilotArt({ accent }: { accent: string }): ReactElement {
  return (
    <Character
      accent={accent}
      skin="#f4c7a1"
      shirt="#4a5568"
      sleeve="#4a5568"
      sleeveLen={22}
      pants="#3a4252"
      shoes="#3b2a1f"
      torso={
        <g>
          <rect x="26" y="52" width="28" height="3" fill="#ffd54a" />
          <path d="M40 38 V66" stroke="#2f3744" strokeWidth="1" />
          <circle cx="32.5" cy="46" r="3.2" fill="#e0734e" />
          <circle cx="32.5" cy="46" r="1.2" fill="#ffffff" />
          <path d="M33 37 Q40 42 47 37 L47 41 Q40 46 33 41 Z" fill="#f4f7fb" />
          <g className="rbx-tool rbx-flag">
            <path d="M46 40 l9 2.4 l-8.4 2.8 z" fill="#f4f7fb" />
          </g>
        </g>
      }
      headgear={
        <g>
          <path d="M28 19 Q27 8 40 7.5 Q53 8 52 19 L50.5 16 Q40 12 29.5 16 Z" fill="#7a5230" />
          <rect x="27" y="17" width="3.5" height="9" rx="1.5" fill="#7a5230" />
          <rect x="49.5" y="17" width="3.5" height="9" rx="1.5" fill="#7a5230" />
          <rect x="28.5" y="12.8" width="23" height="2.4" fill="#3a2a1c" />
          <circle cx="35" cy="14" r="3.3" fill="#ffd54a" stroke="#3a2a1c" strokeWidth="1" />
          <circle cx="45" cy="14" r="3.3" fill="#ffd54a" stroke="#3a2a1c" strokeWidth="1" />
        </g>
      }
      tool={
        <g transform="rotate(-12 67 61)">
          <rect x="60" y="54" width="14" height="10" rx="1" fill="#1f3d7a" stroke="#9db8e8" strokeWidth="0.8" />
          <path d="M64.7 54 V64 M69.4 54 V64 M60 59 H74" stroke="#9db8e8" strokeWidth="0.5" />
          <path className="rbx-tool rbx-shine" d="M60 54 h6 l-6 10 z" fill="#ffffff" />
        </g>
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export function OccupationArt({
  occupation,
  accent,
}: {
  occupation: Occupation;
  accent: string;
}): ReactElement {
  switch (occupation) {
    case 'engineer':
      return <EngineerArt accent={accent} />;
    case 'scientist':
      return <ScientistArt accent={accent} />;
    case 'medicalOfficer':
      return <MedicalOfficerArt accent={accent} />;
    case 'botanist':
      return <BotanistArt accent={accent} />;
    case 'geologist':
      return <GeologistArt accent={accent} />;
    case 'chemist':
      return <ChemistArt accent={accent} />;
    case 'commander':
      return <CommanderArt accent={accent} />;
    case 'pilot':
      return <PilotArt accent={accent} />;
  }
}
