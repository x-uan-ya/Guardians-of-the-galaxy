/**
 * BunkerGame.tsx
 * --------------
 * The playable heart of the dashboard. It composes:
 *   <ResourceHud/>  <BunkerScene/>  <MissionTablet/>
 *
 * HOW IT CONNECTS TO THE SIMULATION (read this first!)
 * ----------------------------------------------------
 * It receives two things from Dashboard (which gets them from App/useGameState):
 *   - `state`         the authoritative GameState (read-only here)
 *   - handlers        onDecide(...) and onAdvanceDay()  (the existing game actions)
 *
 * It keeps ONLY cosmetic UI memory in React state:
 *   - which tablet tab is open
 *   - which bunker room is selected
 *   - which free action the player has "planned" for today
 *   - whether to flash the "SOL N" banner
 * None of that is game state. Resources, health and survival always come from
 * the engine. When the player presses "End Sol", we call the SAME functions the
 * rest of the app already uses:
 *      onDecide({ actionId, playerChoice })   -> engine.applyPlayerDecision
 *      onAdvanceDay()                         -> engine.advanceSimulationDay
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import type { ActivityEntry } from '../../../hooks/useGameState';
import type { DecisionInput, PlayerChoice } from '../../decisions/decisionTypes';
import { calculateDerivedStatus } from '../../simulation/simulationEngine';
import type { GameState } from '../../simulation/simulationTypes';
import { BunkerScene } from './BunkerScene';
import { MissionTablet, type TabKey } from './MissionTablet';
import { FacilityStrip } from './FacilityStrip';
import { ResourceHud } from './ResourceHud';
import { facilityForEvent, type FacilityId } from './facilities';
import { useStateDelta } from './useStateDelta';
import './bunker.css';

interface BunkerGameProps {
  state: GameState;
  activity: ActivityEntry[];
  onDecide: (input: DecisionInput) => void;
  onAdvanceDay: () => void;
}

export function BunkerGame({ state, activity, onDecide, onAdvanceDay }: BunkerGameProps): ReactElement {
  // Derived status is computed ONCE here and passed down (the engine decides
  // what counts as ok / warn / critical, we only display it).
  const derived = useMemo(() => calculateDerivedStatus(state), [state]);
  const delta = useStateDelta(state);

  const [tab, setTab] = useState<TabKey>('mission');
  const [selected, setSelected] = useState<FacilityId | null>(null);
  const [planned, setPlanned] = useState<string | null>(null);
  const [dayBanner, setDayBanner] = useState<number | null>(null);
  const tabletRef = useRef<HTMLDivElement>(null);

  const emergency = state.activeEvents[0] ?? null;
  const emergencyId = emergency?.id ?? null;
  const alertFacility = emergencyId ? facilityForEvent(emergencyId) : null;

  // A new emergency: jump to the Mission tab and send the astronaut to the
  // room that is in trouble.
  useEffect(() => {
    if (emergencyId) {
      setTab('mission');
      setSelected(facilityForEvent(emergencyId));
    }
  }, [emergencyId]);

  // The plan is for ONE day only: clear it whenever the day (or mission) changes.
  useEffect(() => {
    setPlanned(null);
  }, [state.day, state.gameId]);

  // Flash "SOL N" when the day advances inside the same mission.
  const lastSeen = useRef<{ day: number; gameId: string } | null>(null);
  useEffect(() => {
    const prev = lastSeen.current;
    lastSeen.current = { day: state.day, gameId: state.gameId };
    if (!prev || prev.gameId !== state.gameId || state.day <= prev.day) return;
    if (state.mission.status === 'failed' || state.mission.status === 'completed') return;
    setDayBanner(state.day);
    const t = window.setTimeout(() => setDayBanner(null), 1700);
    return () => window.clearTimeout(t);
  }, [state.day, state.gameId, state.mission.status]);

  const handleSelectFacility = (id: FacilityId): void => {
    setSelected(id);
    setTab('room');
  };

  const handleRespond = (): void => {
    setTab('mission');
    tabletRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // End of the sol: do the planned action (if any), THEN advance the day.
  // Both calls go through useGameState, which routes them through the engine.
  const handleEndDay = (choice: PlayerChoice): void => {
    if (planned) onDecide({ actionId: planned, playerChoice: choice });
    onAdvanceDay();
  };

  const handleResolveEvent = (eventId: string, actionId: string, choice: PlayerChoice): void => {
    onDecide({ eventId, actionId, playerChoice: choice });
  };

  return (
    <section aria-label="Mars bunker" className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_350px]">
      {/* Left: the picture, the survival numbers, and a quick room list. */}
      <div className="min-w-0 space-y-3">
        <BunkerScene
          state={state}
          derived={derived}
          selected={selected}
          emergency={emergency}
          alertFacility={alertFacility}
          dayBanner={dayBanner}
          onSelect={handleSelectFacility}
          onRespond={handleRespond}
        />
        <ResourceHud derived={derived} delta={delta} />
        <FacilityStrip
          derived={derived}
          selected={selected}
          alertFacility={alertFacility}
          onSelect={handleSelectFacility}
        />
        <p className="px-1 text-center font-mono text-[11px] tracking-wide text-slate-500">
          Click a room to inspect it. Plan one action, then end the sol.
        </p>
      </div>

      {/* Right: the mission tablet. */}
      <div ref={tabletRef} className="lg:sticky lg:top-20">
        <MissionTablet
          state={state}
          derived={derived}
          activity={activity}
          delta={delta}
          tab={tab}
          onTabChange={setTab}
          facilityId={selected}
          alertFacility={alertFacility}
          emergency={emergency}
          plannedActionId={planned}
          onPlanAction={setPlanned}
          onEndDay={handleEndDay}
          onResolveEvent={handleResolveEvent}
        />
      </div>
    </section>
  );
}
