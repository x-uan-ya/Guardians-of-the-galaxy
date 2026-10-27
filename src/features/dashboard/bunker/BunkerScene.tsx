/**
 * BunkerScene.tsx
 * ---------------
 * The central, playable picture of the game. Layers (bottom to top):
 *   1. <BunkerArt>      the illustrated bunker (SVG)
 *   2. hotspot buttons  one real <button> per facility (keyboard + screen-reader friendly)
 *   3. astronaut        your character, slides to whichever room you select
 *   4. alarm + warning  red vignette and a warning strip during an emergency
 *   5. day banner       "SOL 8" flash when a new day begins
 *
 * It only DISPLAYS state and reports clicks upward. It never changes the game.
 */

import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { DerivedStatus, GameState } from '../../simulation/simulationTypes';
import type { GameEvent } from '../../events/eventTypes';
import { getOccupation } from '../../mission/occupations';
import { OccupationArt } from '../../mission/OccupationArt';
import { BunkerArt, type Weather } from './BunkerArt';
import {
  FACILITIES,
  FACILITY_ORDER,
  LEVEL_HEX,
  TOTAL_DAYS,
  facilityLevel,
  type FacilityId,
} from './facilities';

interface BunkerSceneProps {
  state: GameState;
  derived: DerivedStatus;
  selected: FacilityId | null;
  /** The first unresolved emergency, if any. */
  emergency: GameEvent | null;
  /** The room that emergency belongs to (for the red highlight). */
  alertFacility: FacilityId | null;
  /** Day number to flash as a banner (null = no banner). */
  dayBanner: number | null;
  onSelect: (id: FacilityId) => void;
  /** Called when the player taps "Respond" on the warning strip. */
  onRespond: () => void;
}

function weatherFor(state: GameState): Weather {
  const ids = state.activeEvents.map((e) => e.id);
  if (ids.includes('solar-storm')) return 'solar';
  if (ids.includes('dust-storm')) return 'dust';
  return 'clear';
}

export function BunkerScene({
  state,
  derived,
  selected,
  emergency,
  alertFacility,
  dayBanner,
  onSelect,
  onRespond,
}: BunkerSceneProps): ReactElement {
  const occupation = getOccupation(state.character.occupation);
  const standAt = FACILITIES[selected ?? 'computer'].standX;
  const alarm = emergency !== null;

  // The astronaut "walks" (leg animation) only while sliding between rooms.
  const [walking, setWalking] = useState(false);
  useEffect(() => {
    setWalking(true);
    const t = window.setTimeout(() => setWalking(false), 900);
    return () => window.clearTimeout(t);
  }, [standAt]);

  const pose = alarm ? 'walk' : walking ? 'walk' : 'idle';

  return (
    <div className="bunker-scene" data-terminal={state.mission.status}>
      <BunkerArt
        day={state.day}
        totalDays={TOTAL_DAYS}
        resources={state.resources}
        greenhouseLevel={derived.systems.foodProduction.level}
        lifeLevel={derived.systems.lifeSupportEfficiency.level}
        powerLevel={derived.resources.power.level}
        vitalsLevel={facilityLevel(FACILITIES.medical, derived)}
        weather={weatherFor(state)}
        alarm={alarm}
      />

      {/* Hotspots: real buttons laid over the artwork. */}
      {FACILITY_ORDER.map((id) => {
        const def = FACILITIES[id];
        const level = facilityLevel(def, derived);
        const isAlert = alertFacility === id;
        return (
          <button
            key={id}
            type="button"
            className="bunker-hotspot"
            style={{
              left: `${def.box.x / 10}%`,
              top: `${(def.box.y / 560) * 100}%`,
              width: `${def.box.w / 10}%`,
              height: `${(def.box.h / 560) * 100}%`,
            }}
            aria-pressed={selected === id}
            data-alert={isAlert ? 'true' : 'false'}
            aria-label={`${def.label}: status ${level}${isAlert ? '. Emergency here.' : ''}. Open details.`}
            onClick={() => onSelect(id)}
          >
            <span className="bunker-pill">
              <span
                className="bunker-dot"
                data-level={level}
                style={{ background: LEVEL_HEX[level] }}
                aria-hidden
              />
              <span className="bunker-pill-text">{def.short}</span>
            </span>
          </button>
        );
      })}

      {/* Astronaut (reuses the team's existing animated occupation art). */}
      <div
        className="bunker-astronaut rbx"
        data-pose={pose}
        data-still={state.mission.status === 'failed' ? 'true' : 'false'}
        data-alarm={alarm ? 'true' : 'false'}
        style={{ left: `${standAt / 10}%` }}
        role="img"
        aria-label={`${occupation.label} astronaut`}
      >
        <OccupationArt occupation={occupation.id} accent={occupation.accent} />
      </div>

      {/* Emergency: red vignette + warning strip. */}
      {emergency ? (
        <>
          <div className="bunker-alarm" aria-hidden />
          <div className="bunker-warning" role="alert">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" aria-hidden />
            <span className="min-w-0 truncate font-semibold">
              WARNING: {emergency.title.replace(/^[^\w]+/, '')}
            </span>
            <button
              type="button"
              onClick={onRespond}
              className="shrink-0 rounded border border-red-400/70 bg-red-500/20 px-2 py-0.5 text-[11px] font-semibold uppercase text-red-100 hover:bg-red-500/40"
            >
              Respond
            </button>
          </div>
        </>
      ) : null}

      {/* New-day banner. Keyed by day so it replays on every advance. */}
      {dayBanner !== null ? (
        <div key={dayBanner} className="bunker-daybanner" aria-hidden>
          <div>
            <div className="font-mono text-[10px] tracking-[0.4em] text-mars-dust sm:text-xs">
              NEW DAY BEGINS
            </div>
            <div className="font-mono text-4xl font-bold tracking-widest text-white sm:text-6xl">
              SOL {String(dayBanner).padStart(2, '0')}
            </div>
            <div className="mt-1 font-mono text-[11px] text-accent-cyan sm:text-sm">
              {Math.max(0, TOTAL_DAYS - dayBanner)} days until rescue
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
