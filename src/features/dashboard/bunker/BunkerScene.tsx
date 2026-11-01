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

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
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
  facilityCondition,
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
  const sceneRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();
  const [hovered, setHovered] = useState<FacilityId | null>(null);
  const [focused, setFocused] = useState<FacilityId | null>(null);
  const [touched, setTouched] = useState<FacilityId | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const active = dismissed ? null : hovered ?? touched ?? focused;
  // Retain the content while CSS fades the tooltip out.
  const [displayed, setDisplayed] = useState<FacilityId | null>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  useLayoutEffect(() => {
    if (active) setDisplayed(active);
  }, [active]);

  useLayoutEffect(() => {
    if (!displayed) return;
    const scene = sceneRef.current;
    const tooltip = tooltipRef.current;
    if (!scene || !tooltip) return;
    const update = (): void => {
      const box = FACILITIES[displayed].box;
      const width = scene.clientWidth;
      const height = scene.clientHeight;
      const tipWidth = tooltip.offsetWidth;
      const tipHeight = tooltip.offsetHeight;
      const margin = 8;
      const x = ((box.x + box.w / 2) / 1000) * width - tipWidth / 2;
      const above = (box.y / 560) * height - tipHeight - 20;
      const warning = scene.querySelector<HTMLElement>('.bunker-warning');
      const warningBottom = warning ? warning.offsetTop + warning.offsetHeight + margin : margin;
      const y = above >= warningBottom ? above : ((box.y + box.h) / 560) * height + margin;
      setPosition({
        left: Math.max(margin, Math.min(x, width - tipWidth - margin)),
        top: Math.max(margin, Math.min(y, height - tipHeight - margin)),
      });
    };
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(scene);
    observer?.observe(tooltip);
    window.addEventListener('resize', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [displayed, state, emergency]);

  useEffect(() => {
    const dismiss = (event: PointerEvent): void => {
      if (!(event.target instanceof Element) || !sceneRef.current?.contains(event.target) ||
          !event.target.closest('.bunker-hotspot')) {
        setTouched(null);
        setDismissed(true);
      }
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);
  const tooltipDef = displayed ? FACILITIES[displayed] : null;
  const condition = tooltipDef ? facilityCondition(tooltipDef, state) : null;
  const tooltipLevel = tooltipDef ? facilityLevel(tooltipDef, derived) : 'ok';

  // The astronaut "walks" (leg animation) only while sliding between rooms.
  const [walking, setWalking] = useState(false);
  useEffect(() => {
    setWalking(true);
    const t = window.setTimeout(() => setWalking(false), 900);
    return () => window.clearTimeout(t);
  }, [standAt]);

  const pose = alarm ? 'walk' : walking ? 'walk' : 'idle';

  return (
    <div ref={sceneRef} className="bunker-scene" data-terminal={state.mission.status}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setDismissed(true);
          setTouched(null);
        }
      }}>
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
            aria-describedby={active === id ? tooltipId : undefined}
            data-tooltip-active={active === id ? 'true' : 'false'}
            data-alert={isAlert ? 'true' : 'false'}
            aria-label={`${def.label}: status ${level}${isAlert ? '. Emergency here.' : ''}. Open details.`}
            onClick={() => onSelect(id)}
            onPointerEnter={(event) => {
              if (event.pointerType === 'touch') return;
              setHovered(id);
              setTouched(null);
              setDismissed(false);
            }}
            onPointerLeave={() => setHovered((current) => current === id ? null : current)}
            onPointerDown={(event) => {
              if (event.pointerType === 'touch') {
                setHovered(null);
                setTouched(id);
                setDismissed(false);
              }
            }}
            onPointerCancel={() => setTouched(null)}
            onFocus={() => {
              setHovered(null);
              setTouched(null);
              setFocused(id);
              setDismissed(false);
            }}
            onBlur={() => {
              setFocused((current) => current === id ? null : current);
              setTouched(null);
            }}
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

      <div ref={tooltipRef} id={tooltipId} role="tooltip"
        className="bunker-tooltip" data-visible={active !== null ? 'true' : 'false'}
        aria-hidden={active === null} style={position}>
        {tooltipDef && condition ? <>
          <div className="bunker-tooltip-heading">
            <span className="bunker-dot" aria-hidden style={{
              background: condition.value === null ? '#94a3b8' : LEVEL_HEX[tooltipLevel],
            }} />
            <strong>{tooltipDef.label} — {condition.value === null ? 'Condition unavailable' : `${Math.round(condition.value)}%`}</strong>
          </div>
        </> : null}
      </div>

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
