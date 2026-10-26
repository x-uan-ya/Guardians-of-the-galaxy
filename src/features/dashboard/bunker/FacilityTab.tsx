/**
 * FacilityTab.tsx
 * ---------------
 * What the tablet shows after you click a room in the bunker.
 *   - live readouts for that room (resource / system / vitals)
 *   - the REAL free actions that relate to the room (from the event catalog)
 *   - a clearly-labelled PROTOTYPE PLACEHOLDER where the game has no action yet
 *
 * Clicking an action does NOT run it immediately. It "plans" it for today
 * (UI-only memory in BunkerGame); the player then presses "End Sol" on the
 * Mission tab. That keeps it to one deliberate decision per day.
 */

import type { ReactElement } from 'react';
import { MapPin } from 'lucide-react';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { getFreeActions } from '../../simulation/simulationEngine';
import type { DerivedStatus, GameState, StatusLevel } from '../../simulation/simulationTypes';
import type { GameEvent } from '../../events/eventTypes';
import { CREW_LABELS, RESOURCE_LABELS, SYSTEM_LABELS } from '../labels';
import { EffectChips } from './EffectChips';
import { FACILITIES, LEVEL_HEX, facilityLevel, type FacilityId } from './facilities';

interface FacilityTabProps {
  state: GameState;
  derived: DerivedStatus;
  facilityId: FacilityId | null;
  emergency: GameEvent | null;
  alertFacility: FacilityId | null;
  plannedActionId: string | null;
  disabled: boolean;
  onPlanAction: (actionId: string | null) => void;
  onGoToMission: () => void;
}

interface Row {
  id: string;
  label: string;
  value: number;
  level: StatusLevel;
  note?: string;
}

const LEVEL_WORD: Record<StatusLevel, string> = { ok: 'Stable', warn: 'Low', critical: 'Critical' };

export function FacilityTab({
  state,
  derived,
  facilityId,
  emergency,
  alertFacility,
  plannedActionId,
  disabled,
  onPlanAction,
  onGoToMission,
}: FacilityTabProps): ReactElement {
  if (!facilityId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
        <MapPin className="h-8 w-8 text-accent-cyan/70" aria-hidden />
        <p className="text-sm font-semibold text-slate-200">No room selected</p>
        <p className="text-xs text-slate-400">
          Click a glowing room in the bunker (oxygen generator, greenhouse, food storage, computer, power
          core, water reclaimer or medical bay) to inspect it here.
        </p>
      </div>
    );
  }

  const def = FACILITIES[facilityId];
  const level = facilityLevel(def, derived);

  const rows: Row[] = [];
  if (def.resource) {
    const m = derived.resources[def.resource];
    rows.push({ id: `r-${def.resource}`, label: RESOURCE_LABELS[def.resource], value: m.value, level: m.level });
  }
  if (def.system) {
    const m = derived.systems[def.system];
    rows.push({ id: `s-${def.system}`, label: SYSTEM_LABELS[def.system], value: m.value, level: m.level });
  }
  if (def.vitals) {
    rows.push(
      { id: 'c-health', label: CREW_LABELS.health.replace('Crew ', ''), value: derived.crew.health.value, level: derived.crew.health.level },
      { id: 'c-morale', label: CREW_LABELS.morale, value: derived.crew.morale.value, level: derived.crew.morale.level },
      {
        id: 'c-rad',
        label: CREW_LABELS.radiationExposure,
        value: derived.crew.radiationExposure.value,
        level: derived.crew.radiationExposure.level,
        note: 'Higher is more dangerous',
      }
    );
  }

  // Only show actions that really exist in the catalog right now.
  const realActions = getFreeActions().filter((a) => def.actionIds.includes(a.id));
  const hasEmergencyHere = emergency !== null && alertFacility === facilityId;

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold text-white">{def.label}</h3>
          <span
            className="rounded border px-1.5 py-px font-mono text-[10px] font-semibold uppercase"
            style={{ color: LEVEL_HEX[level], borderColor: LEVEL_HEX[level] }}
          >
            {LEVEL_WORD[level]}
          </span>
        </div>
        <p className="text-xs text-slate-400">{def.blurb}</p>
      </div>

      {hasEmergencyHere && emergency ? (
        <div className="rounded-md border border-red-500/60 bg-red-950/50 p-2 text-xs text-red-200">
          Emergency in this room: <strong>{emergency.title.replace(/^[^\w]+/, '')}</strong>. Respond on the
          Mission tab.
        </div>
      ) : null}

      {/* Live readouts */}
      <div className="space-y-2 rounded-md border border-space-600 bg-space-800/60 p-2.5">
        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Live readouts</div>
        {rows.length === 0 ? (
          <p className="text-xs text-slate-400">
            Overall outpost status:{' '}
            <span className="font-semibold" style={{ color: LEVEL_HEX[derived.overall] }}>
              {LEVEL_WORD[derived.overall]}
            </span>
          </p>
        ) : null}
        {rows.map((row) => (
          <div key={row.id}>
            <div className="mb-0.5 flex items-center justify-between text-[11px]">
              <span className="text-slate-300">{row.label}</span>
              <span className="tnum font-semibold" style={{ color: LEVEL_HEX[row.level] }}>
                {Math.round(row.value)}% · {LEVEL_WORD[row.level]}
              </span>
            </div>
            <ProgressBar value={row.value} level={row.level} label={row.label} />
            {row.note ? <p className="mt-0.5 text-[10px] text-slate-500">{row.note}</p> : null}
          </div>
        ))}
        {def.id === 'computer' ? (
          <p className="text-[11px] text-slate-400">
            Mission status: <span className="font-semibold text-slate-200">{state.mission.status.toUpperCase()}</span>{' '}
            · Score <span className="tnum font-semibold text-slate-200">{state.mission.score}</span>
          </p>
        ) : null}
      </div>

      {/* Actions that exist in the game */}
      <div>
        <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Actions from this room
        </div>
        <div className="space-y-2">
          {realActions.map((action) => {
            const planned = plannedActionId === action.id;
            return (
              <button
                key={action.id}
                type="button"
                className="bunker-action"
                aria-pressed={planned}
                disabled={disabled}
                onClick={() => onPlanAction(planned ? null : action.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-white">{action.label}</span>
                  {planned ? (
                    <span className="shrink-0 rounded bg-accent-cyan/20 px-1.5 py-px font-mono text-[10px] text-accent-cyan">
                      PLANNED
                    </span>
                  ) : null}
                </div>
                <p className="text-[11px] leading-snug text-slate-300">{action.description}</p>
                <EffectChips action={action} />
              </button>
            );
          })}

          {def.placeholderAction ? (
            <div className="bunker-placeholder" aria-disabled="true">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-slate-400">{def.placeholderAction.label}</span>
                <span className="shrink-0 rounded border border-slate-500 px-1.5 py-px font-mono text-[9px] uppercase tracking-wide text-slate-400">
                  Prototype placeholder
                </span>
              </div>
              <p className="text-[11px] leading-snug text-slate-500">{def.placeholderAction.description}</p>
            </div>
          ) : null}

          {realActions.length === 0 && !def.placeholderAction ? (
            <p className="text-xs text-slate-400">No actions are linked to this room yet.</p>
          ) : null}
        </div>
      </div>

      {plannedActionId ? (
        <button
          type="button"
          onClick={onGoToMission}
          className="w-full rounded-md border border-accent-cyan/50 bg-accent-cyan/10 py-1.5 text-xs font-semibold text-accent-cyan hover:bg-accent-cyan/20"
        >
          Back to today&apos;s plan
        </button>
      ) : null}
    </div>
  );
}
