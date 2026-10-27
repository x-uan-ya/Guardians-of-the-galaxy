/**
 * FacilityStrip.tsx
 * -----------------
 * A row of small buttons under the scene: one per room, with its status dot and
 * main number. It does the same job as clicking the picture, but is easier to
 * hit on a phone and easier to read for keyboard / screen-reader players.
 * Read-only: it only reports which room was clicked.
 */

import type { ReactElement } from 'react';
import type { DerivedStatus } from '../../simulation/simulationTypes';
import {
  FACILITIES,
  FACILITY_ORDER,
  LEVEL_HEX,
  facilityLevel,
  type FacilityDef,
  type FacilityId,
} from './facilities';

interface FacilityStripProps {
  derived: DerivedStatus;
  selected: FacilityId | null;
  alertFacility: FacilityId | null;
  onSelect: (id: FacilityId) => void;
}

/** The single most useful number for a room (or null if it has none). */
function mainValue(def: FacilityDef, derived: DerivedStatus): number | null {
  if (def.resource) return derived.resources[def.resource].value;
  if (def.system) return derived.systems[def.system].value;
  if (def.vitals) return derived.crew.health.value;
  return null;
}

export function FacilityStrip({ derived, selected, alertFacility, onSelect }: FacilityStripProps): ReactElement {
  return (
    <nav aria-label="Bunker rooms" className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
      {FACILITY_ORDER.map((id) => {
        const def = FACILITIES[id];
        const level = facilityLevel(def, derived);
        const value = mainValue(def, derived);
        const active = selected === id;
        const alert = alertFacility === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(id)}
            title={def.label}
            className={`flex flex-col items-center gap-0.5 rounded-md border px-1 py-1.5 text-center transition-colors ${
              alert
                ? 'animate-pulse-soft border-red-500 bg-red-950/50'
                : active
                  ? 'border-accent-cyan bg-accent-cyan/10'
                  : 'border-space-600 bg-space-800/60 hover:border-accent-cyan/60'
            }`}
          >
            <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-slate-300">
              <span className="h-2 w-2 rounded-full" style={{ background: LEVEL_HEX[level] }} aria-hidden />
              {def.short}
            </span>
            <span className="tnum font-mono text-[11px] font-semibold" style={{ color: LEVEL_HEX[level] }}>
              {value === null ? (level === 'ok' ? 'OK' : level.toUpperCase()) : `${Math.round(value)}%`}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
