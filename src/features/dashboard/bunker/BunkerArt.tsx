/**
 * BunkerArt.tsx
 * -------------
 * The illustrated bunker cross-section, drawn entirely with SVG rectangles
 * (a pixel-art look). No image files, so nothing can break or 404.
 *
 * The artwork is "diegetic": it reflects real game numbers.
 *   - water tank fills to the real water %
 *   - food shelves empty as food drops
 *   - power cells light up with the power %
 *   - plants wilt when food production is low
 *   - the oxygen tank gauge shows the oxygen %
 * Everything is passed in as props. This component never reads or changes the
 * game on its own. The scene is 1000 x 560 "scene units".
 */

import type { ReactElement } from 'react';
import type { Resources, StatusLevel } from '../../simulation/simulationTypes';
import { LEVEL_HEX } from './facilities';

export type Weather = 'clear' | 'dust' | 'solar';

interface BunkerArtProps {
  day: number;
  totalDays: number;
  resources: Resources;
  /** Level of the greenhouse (food production) system. */
  greenhouseLevel: StatusLevel;
  /** Level of the life-support system (oxygen room LED). */
  lifeLevel: StatusLevel;
  /** Level of the power resource/system (power room accents). */
  powerLevel: StatusLevel;
  /** Level of the character's vitals (heart monitor colour). */
  vitalsLevel: StatusLevel;
  weather: Weather;
  alarm: boolean;
}

const MONO = "'JetBrains Mono', ui-monospace, Menlo, monospace";

const PLANT_COLORS: Record<StatusLevel, { stem: string; leaf: string }> = {
  ok: { stem: '#3f8f4f', leaf: '#5fd06f' },
  warn: { stem: '#7a8a3a', leaf: '#b0bf4a' },
  critical: { stem: '#6b5a35', leaf: '#8a6a3a' },
};

export function BunkerArt({
  day,
  totalDays,
  resources,
  greenhouseLevel,
  lifeLevel,
  powerLevel,
  vitalsLevel,
  weather,
  alarm,
}: BunkerArtProps): ReactElement {
  return (
    <svg
      className="bunker-art"
      viewBox="0 0 1000 560"
      preserveAspectRatio="xMidYMid slice"
      shapeRendering="crispEdges"
      role="img"
      aria-label="Illustrated Mars bunker with oxygen generator, greenhouse, food storage, central computer, power core, water reclaimer and medical bay."
    >
      <defs>
        <linearGradient id="bk-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4c38a" />
          <stop offset="0.55" stopColor="#e8955a" />
          <stop offset="1" stopColor="#c8602f" />
        </linearGradient>
        <linearGradient id="bk-lamp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfe9ff" stopOpacity="0.32" />
          <stop offset="1" stopColor="#cfe9ff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="bk-grow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d28bff" stopOpacity="0.4" />
          <stop offset="1" stopColor="#d28bff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="bk-win">
          <rect x="442" y="96" width="166" height="126" />
        </clipPath>
        <pattern id="bk-hazard" width="16" height="6" patternUnits="userSpaceOnUse">
          <rect width="8" height="6" fill="#d9a93f" />
          <rect x="8" width="8" height="6" fill="#1b2130" />
        </pattern>
      </defs>

      {/* ---------------- Room shell ---------------- */}
      <rect width="1000" height="560" fill="#141a26" />
      {/* wall panel seams + rivets */}
      {Array.from({ length: 9 }, (_, i) => (
        <g key={`seam-${i}`}>
          <rect x={i * 125} y={48} width={2} height={332} fill="#0f141e" />
          <rect x={i * 125 + 8} y={60} width={3} height={3} fill="#2c3750" />
          <rect x={i * 125 + 8} y={360} width={3} height={3} fill="#2c3750" />
        </g>
      ))}
      <rect x={0} y={200} width={1000} height={2} fill="#0f141e" />
      <rect x={0} y={202} width={1000} height={1} fill="#222c40" />

      {/* stencil on the wall */}
      <text
        x={310}
        y={118}
        textAnchor="middle"
        fontFamily={MONO}
        fontSize={15}
        letterSpacing={5}
        fill="#2c3a55"
      >
        OUTPOST ZERO
      </text>
      <text x={790} y={118} textAnchor="middle" fontFamily={MONO} fontSize={15} letterSpacing={5} fill="#2c3a55">
        SECTOR 04
      </text>

      {/* ceiling */}
      <rect width="1000" height="48" fill="#0c1019" />
      <rect y={12} width="1000" height={8} fill="#2b3446" />
      <rect y={14} width="1000" height={2} fill="#43506b" />
      <rect y={28} width="1000" height={5} fill="#5a3a26" />
      <rect y={44} width="1000" height={4} fill="#1d2433" />

      {/* ceiling lamps + light cones */}
      {[140, 520, 880].map((cx) => (
        <g key={`lamp-${cx}`}>
          <polygon
            className="bunker-lamp-glow"
            points={`${cx - 30},48 ${cx + 30},48 ${cx + 110},300 ${cx - 110},300`}
            fill="url(#bk-lamp)"
          />
          <rect x={cx - 34} y={46} width={68} height={7} fill="#dbeeff" />
          <rect x={cx - 34} y={52} width={68} height={2} fill="#7da4cc" />
        </g>
      ))}

      {/* emergency beacons (dark when calm, flashing red during an alarm) */}
      {[300, 700].map((cx) => (
        <g key={`beacon-${cx}`}>
          <rect x={cx - 8} y={48} width={16} height={14} fill={alarm ? '#ff3b2a' : '#4a2a2a'} className={alarm ? 'bunker-beacon' : undefined} />
          <rect x={cx - 10} y={46} width={20} height={4} fill="#2b3446" />
          {alarm ? (
            <polygon
              className="bunker-beacon"
              points={`${cx - 8},62 ${cx + 8},62 ${cx + 70},230 ${cx - 70},230`}
              fill="#ff3b2a"
              opacity={0.12}
            />
          ) : null}
        </g>
      ))}

      {/* ---------------- Floor ---------------- */}
      <rect y={380} width="1000" height={180} fill="#1b2130" />
      <rect y={380} width="1000" height={6} fill="#3a4256" />
      <rect y={386} width="1000" height={6} fill="url(#bk-hazard)" opacity={0.85} />
      {Array.from({ length: 11 }, (_, i) => (
        <rect key={`tile-${i}`} x={i * 100} y={392} width={2} height={168} fill="#151a26" />
      ))}
      <rect y={452} width="1000" height={2} fill="#151a26" />
      <rect y={520} width="1000" height={2} fill="#151a26" />
      {/* floor cables */}
      <rect x={110} y={470} width={190} height={5} fill="#2a2f3c" />
      <rect x={640} y={505} width={230} height={5} fill="#5a3a26" />


      {/* ---------------- Floor props ---------------- */}
      <g>
        {/* hatch marking */}
        <rect x={430} y={462} width={190} height={64} fill="#151a26" />
        <rect x={430} y={462} width={190} height={3} fill="#d9a93f" opacity={0.7} />
        <rect x={430} y={523} width={190} height={3} fill="#d9a93f" opacity={0.7} />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((g) => (
          <rect key={`grate-${g}`} x={440 + g * 22} y={470} width={4} height={48} fill="#0f141e" />
        ))}
        {/* stacked crates, bottom left */}
        <rect x={28} y={496} width={52} height={42} fill="#7d5530" />
        <rect x={28} y={496} width={52} height={5} fill="#a8743f" />
        <rect x={50} y={496} width={5} height={42} fill="#5e3f22" />
        <rect x={40} y={456} width={40} height={40} fill="#8a5d33" />
        <rect x={40} y={456} width={40} height={5} fill="#b88650" />
        <rect x={57} y={456} width={5} height={40} fill="#6e4824" />
        {/* barrel, bottom right */}
        <rect x={928} y={470} width={34} height={68} fill="#56688a" />
        <rect x={928} y={470} width={34} height={5} fill="#7a90b8" />
        <rect x={928} y={492} width={34} height={6} fill="#d9533f" />
        <rect x={928} y={514} width={34} height={4} fill="#3a4a66" />
        <rect x={956} y={470} width={6} height={68} fill="#3a4a66" />
        {/* wall-mounted caution light, left of window */}
        <rect x={392} y={150} width={16} height={26} fill="#2b3446" />
        <rect x={396} y={156} width={8} height={14} fill={alarm ? '#ff3b2a' : '#5a3a26'} className={alarm ? 'bunker-beacon' : undefined} />
      </g>

      {/* ---------------- Window onto Mars ---------------- */}
      <g clipPath="url(#bk-win)">
        <rect x={442} y={96} width={166} height={126} fill="url(#bk-sky)" />
        {/* sun + moon (Phobos) */}
        <rect x={566} y={116} width={12} height={12} fill="#fff3d6" />
        <rect x={562} y={120} width={20} height={4} fill="#fff3d6" opacity={0.45} />
        <rect x={478} y={110} width={9} height={6} fill="#9a8f86" />
        <rect x={480} y={108} width={5} height={2} fill="#b8aea4" />
        {/* distant ridges */}
        <polygon
          points="442,184 468,162 492,174 520,152 548,172 576,158 608,178 608,196 442,196"
          fill="#b5532a"
        />
        {/* ground */}
        <rect x={442} y={184} width={166} height={40} fill="#a8431e" />
        <rect x={442} y={190} width={78} height={34} fill="#8f3818" />
        <rect x={520} y={196} width={88} height={28} fill="#7d3014" />
        {/* rocks */}
        <rect x={462} y={204} width={10} height={7} fill="#5c230d" />
        <rect x={464} y={202} width={6} height={2} fill="#6e2d14" />
        <rect x={578} y={210} width={12} height={8} fill="#5c230d" />
        {/* tiny rover */}
        <rect x={528} y={196} width={20} height={6} fill="#d8dde6" />
        <rect x={530} y={192} width={10} height={4} fill="#a9b3c6" />
        <rect x={530} y={202} width={5} height={4} fill="#222a38" />
        <rect x={542} y={202} width={5} height={4} fill="#222a38" />
        <rect x={546} y={186} width={2} height={7} fill="#cbd5e1" />

        {weather === 'dust' ? (
          <g>
            <rect x={442} y={96} width={166} height={126} fill="#d9a066" opacity={0.58} />
            {[112, 138, 164, 190].map((y, i) => (
              <rect
                key={`dust-${y}`}
                className="bunker-dust-streak"
                x={442}
                y={y}
                width={44}
                height={3}
                fill="#f6d3a0"
                opacity={0.7}
                style={{ animationDelay: `${-i * 0.4}s` }}
              />
            ))}
          </g>
        ) : null}
        {weather === 'solar' ? (
          <rect className="bunker-solar-flash" x={442} y={96} width={166} height={126} fill="#fff2c0" />
        ) : null}
      </g>
      {/* window frame */}
      <rect x={430} y={84} width={190} height={12} fill="#2b3446" />
      <rect x={430} y={222} width={190} height={12} fill="#2b3446" />
      <rect x={430} y={84} width={12} height={150} fill="#2b3446" />
      <rect x={608} y={84} width={12} height={150} fill="#2b3446" />
      <rect x={430} y={84} width={190} height={2} fill="#56688a" />
      <rect x={523} y={96} width={4} height={126} fill="#2b3446" />
      <rect x={442} y={157} width={166} height={4} fill="#2b3446" />
      <polygon points="450,98 470,98 452,170 450,170" fill="#ffffff" opacity={0.07} />

      {/* ---------------- Facility: Oxygen generator ---------------- */}
      <g transform="translate(30 150)">
        <rect x={52} y={-102} width={10} height={112} fill="#4a5d80" />
        <rect x={54} y={-102} width={3} height={112} fill="#6f86b0" />
        <rect x={0} y={196} width={125} height={34} fill="#2a3142" />
        <rect x={0} y={196} width={125} height={4} fill="#3d4760" />
        <rect x={18} y={14} width={90} height={186} fill="#34425c" />
        <rect x={24} y={14} width={10} height={186} fill="#4d618a" />
        <rect x={96} y={14} width={12} height={186} fill="#232d42" />
        <rect x={12} y={6} width={102} height={14} fill="#56688a" />
        <rect x={12} y={190} width={102} height={12} fill="#56688a" />
        {/* gauge tube: fills to the real oxygen % */}
        <rect x={40} y={44} width={46} height={110} fill="#07202b" />
        <rect
          x={42}
          y={46 + 106 * (1 - clampPct(resources.oxygen))}
          width={42}
          height={106 * clampPct(resources.oxygen)}
          fill="#5fd0c8"
          opacity={0.55}
        />
        {[50, 62, 74].map((bx, i) => (
          <rect
            key={`bub-${bx}`}
            className="bunker-bubble"
            x={bx}
            y={146}
            width={4}
            height={4}
            fill="#bff7f2"
            style={{ animationDelay: `${-i * 1.1}s` }}
          />
        ))}
        <rect x={40} y={44} width={46} height={2} fill="#5fd0c8" />
        <text x={63} y={36} textAnchor="middle" fontFamily={MONO} fontSize={14} fill="#5fd0c8">
          O2
        </text>
        <rect x={88} y={168} width={10} height={10} fill={LEVEL_HEX[lifeLevel]} />
        <rect x={108} y={60} width={17} height={8} fill="#4a5d80" />
        <rect x={108} y={120} width={17} height={8} fill="#4a5d80" />
        {[168, 174, 180].map((vy) => (
          <rect key={`vent-${vy}`} x={26} y={vy} width={46} height={2} fill="#232d42" />
        ))}
      </g>

      {/* ---------------- Facility: Greenhouse ---------------- */}
      <g transform="translate(165 180)">
        <rect x={0} y={0} width={150} height={200} fill="#18252a" />
        <rect x={6} y={6} width={138} height={160} fill="#143038" />
        <polygon points="12,16 138,16 146,164 4,164" fill="url(#bk-grow)" />
        <rect x={12} y={10} width={126} height={6} fill="#d28bff" />
        {[64, 112, 160].map((shelfY, s) => (
          <g key={`shelf-${shelfY}`}>
            <rect x={8} y={shelfY} width={134} height={5} fill="#5a4636" />
            {[0, 1, 2, 3].map((i) => {
              const px = 18 + i * 32;
              const c = PLANT_COLORS[greenhouseLevel];
              return (
                <g key={`plant-${s}-${i}`}>
                  <rect x={px + 6} y={shelfY - 14} width={3} height={14} fill={c.stem} />
                  <rect x={px} y={shelfY - 14} width={7} height={5} fill={c.leaf} />
                  <rect x={px + 9} y={shelfY - 18} width={7} height={5} fill={c.leaf} />
                  <rect x={px + 3} y={shelfY - 22} width={8} height={5} fill={c.leaf} />
                  {greenhouseLevel === 'ok' && (s + i) % 2 === 0 ? (
                    <rect x={px + 12} y={shelfY - 9} width={4} height={4} fill="#d9533f" />
                  ) : null}
                </g>
              );
            })}
          </g>
        ))}
        <rect x={0} y={170} width={150} height={30} fill="#2a3142" />
        <rect x={0} y={170} width={150} height={3} fill="#3d4760" />
        <rect x={4} y={166} width={142} height={4} fill="#3a8fd9" opacity={0.6} />
      </g>

      {/* ---------------- Facility: Food storage ---------------- */}
      <g transform="translate(325 205)">
        <rect x={0} y={0} width={5} height={175} fill="#3a4256" />
        <rect x={90} y={0} width={5} height={175} fill="#3a4256" />
        <rect x={5} y={0} width={85} height={175} fill="#161c28" />
        {[52, 104, 156].map((sy) => (
          <rect key={`sh-${sy}`} x={0} y={sy} width={95} height={5} fill="#4a5368" />
        ))}
        {Array.from({ length: 9 }, (_, i) => {
          const stocked = Math.ceil(clampPct(resources.food) * 9);
          if (i >= stocked) return null;
          const shelfY = [52, 104, 156][2 - Math.floor(i / 3)] ?? 156;
          const sx = 10 + (i % 3) * 27;
          if (i % 3 === 2) {
            return (
              <g key={`slot-${i}`}>
                <rect x={sx + 2} y={shelfY - 16} width={9} height={16} fill="#c9ced6" />
                <rect x={sx + 2} y={shelfY - 10} width={9} height={4} fill="#d9533f" />
                <rect x={sx + 13} y={shelfY - 16} width={9} height={16} fill="#c9ced6" />
                <rect x={sx + 13} y={shelfY - 10} width={9} height={4} fill="#4caf72" />
              </g>
            );
          }
          return (
            <g key={`slot-${i}`}>
              <rect x={sx} y={shelfY - 24} width={23} height={24} fill={i % 2 ? '#9a6b3b' : '#8a5d33'} />
              <rect x={sx} y={shelfY - 24} width={23} height={4} fill="#b88650" />
              <rect x={sx + 10} y={shelfY - 24} width={3} height={24} fill="#6e4824" />
            </g>
          );
        })}
      </g>

      {/* ---------------- Facility: Central computer ---------------- */}
      <g transform="translate(430 245)">
        <rect x={0} y={70} width={190} height={14} fill="#3a4256" />
        <rect x={0} y={70} width={190} height={3} fill="#56688a" />
        <rect x={10} y={84} width={12} height={51} fill="#2a3142" />
        <rect x={168} y={84} width={12} height={51} fill="#2a3142" />
        <rect x={118} y={92} width={46} height={30} fill="#252c3c" />
        <rect x={118} y={92} width={46} height={2} fill="#3d4760" />
        <rect x={136} y={104} width={10} height={3} fill="#8a94ab" />
        {/* main monitor */}
        <rect x={45} y={2} width={100} height={62} fill="#0d1119" />
        <rect x={45} y={2} width={100} height={2} fill="#56688a" />
        <rect x={51} y={8} width={88} height={50} fill="#06222a" />
        <text x={95} y={26} textAnchor="middle" fontFamily={MONO} fontSize={13} fill="#5fd0c8">
          {`SOL ${String(day).padStart(2, '0')}/${totalDays}`}
        </text>
        <rect className="bunker-screen-line" x={58} y={33} width={64} height={3} fill="#5fd0c8" />
        <rect className="bunker-screen-line" x={58} y={40} width={44} height={3} fill="#5fd0c8" style={{ animationDelay: '-0.8s' }} />
        <rect className="bunker-screen-line" x={58} y={47} width={72} height={3} fill="#5fd0c8" style={{ animationDelay: '-1.6s' }} />
        <rect x={88} y={64} width={14} height={6} fill="#2a3142" />
        {/* side monitor */}
        <rect x={2} y={22} width={36} height={46} fill="#0d1119" />
        <rect x={5} y={25} width={30} height={40} fill="#14202e" />
        <polyline points="8,56 14,48 20,52 26,36 33,42" stroke={LEVEL_HEX[powerLevel]} strokeWidth={2} fill="none" />
        {/* keyboard + mug */}
        <rect x={62} y={63} width={66} height={7} fill="#1a1f2b" />
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <rect key={`key-${k}`} x={65 + k * 10} y={65} width={7} height={2} fill="#2f384b" />
        ))}
        <rect x={152} y={58} width={9} height={12} fill="#d8dde6" />
        <rect x={160} y={61} width={4} height={5} fill="#d8dde6" />
      </g>

      {/* ---------------- Facility: Power core ---------------- */}
      <g transform="translate(635 185)">
        <rect x={8} y={0} width={90} height={28} fill="#1b3a66" />
        {[0, 1, 2, 3, 4].map((c) => (
          <rect key={`sol-${c}`} x={8 + c * 18} y={0} width={2} height={28} fill="#0f2442" />
        ))}
        <rect x={8} y={13} width={90} height={2} fill="#0f2442" />
        <rect x={8} y={0} width={90} height={2} fill="#4a7bc0" />
        <rect x={0} y={34} width={105} height={161} fill="#2a3142" />
        <rect x={0} y={34} width={105} height={4} fill="#3d4760" />
        {[0, 1, 2, 3, 4].map((i) => {
          const cy = 46 + i * 28;
          const lit = resources.power > (4 - i) * 20;
          return (
            <g key={`cell-${i}`}>
              <rect x={12} y={cy} width={81} height={20} fill="#10141d" />
              <rect x={14} y={cy + 2} width={77} height={16} fill={lit ? LEVEL_HEX[powerLevel] : '#1c2230'} opacity={lit ? 0.9 : 1} />
            </g>
          );
        })}
        <rect x={-10} y={170} width={20} height={6} fill="#d9a93f" />
        <rect x={95} y={180} width={20} height={5} fill="#4a5d80" />
        {[184, 188].map((vy) => (
          <rect key={`pv-${vy}`} x={14} y={vy} width={77} height={2} fill="#1b2130" />
        ))}
      </g>

      {/* ---------------- Facility: Water reclaimer ---------------- */}
      <g transform="translate(750 165)">
        <rect x={45} y={-117} width={10} height={130} fill="#3d5a7a" />
        <rect x={47} y={-117} width={3} height={130} fill="#6f8fb5" />
        <rect x={36} y={8} width={28} height={6} fill="#56688a" />
        <rect x={8} y={26} width={89} height={176} fill="#223a52" />
        <rect x={14} y={32} width={77} height={164} fill="#0b1d2e" />
        <rect
          x={16}
          y={34 + 160 * (1 - clampPct(resources.water))}
          width={73}
          height={160 * clampPct(resources.water)}
          fill="#3a8fd9"
          opacity={0.85}
        />
        <rect x={16} y={34 + 160 * (1 - clampPct(resources.water))} width={73} height={3} fill="#9ad2ff" />
        {[0, 1, 2, 3].map((t) => (
          <rect key={`tick-${t}`} x={14} y={34 + 40 * t} width={10} height={2} fill="#8fb4d8" />
        ))}
        <rect x={0} y={198} width={105} height={17} fill="#2a3142" />
        <rect x={0} y={198} width={105} height={3} fill="#3d4760" />
      </g>

      {/* ---------------- Facility: Medical bay ---------------- */}
      <g transform="translate(865 225)">
        <rect x={0} y={0} width={56} height={150} fill="#cfd6e2" />
        <rect x={48} y={0} width={8} height={150} fill="#aab3c4" />
        <rect x={26} y={0} width={2} height={150} fill="#9aa4b8" />
        <rect x={24} y={20} width={8} height={28} fill="#d9533f" />
        <rect x={14} y={30} width={28} height={8} fill="#d9533f" />
        <rect x={20} y={90} width={3} height={14} fill="#7f8aa3" />
        <rect x={31} y={90} width={3} height={14} fill="#7f8aa3" />
        <rect x={62} y={112} width={53} height={14} fill="#7f8aa3" />
        <rect x={100} y={102} width={15} height={10} fill="#e6ebf5" />
        <rect x={66} y={126} width={4} height={24} fill="#56688a" />
        <rect x={107} y={126} width={4} height={24} fill="#56688a" />
        <rect x={70} y={44} width={4} height={68} fill="#56688a" />
        <rect x={58} y={14} width={44} height={32} fill="#07140f" />
        <rect x={58} y={14} width={44} height={2} fill="#56688a" />
        <polyline
          className="bunker-ekg"
          points="62,32 70,32 74,22 78,40 82,32 98,32"
          stroke={LEVEL_HEX[vitalsLevel]}
          strokeWidth={2}
          fill="none"
        />
      </g>

      {/* weather tint on the whole room during a solar storm */}
      {weather === 'solar' ? (
        <g opacity={0.14}>
          <rect className="bunker-solar-flash" width="1000" height="560" fill="#ffb347" />
        </g>
      ) : null}
    </svg>
  );
}

/** Clamp a 0..100 value to a 0..1 fraction. */
function clampPct(value: number): number {
  return Math.max(0, Math.min(100, value)) / 100;
}
