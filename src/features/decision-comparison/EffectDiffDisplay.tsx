/**
 * EffectDiffDisplay.tsx
 * ---------------------
 * Reusable sub-component that renders resource, crew, and system deltas as
 * colour-coded chips. Used in both the "Your Decision" and "Alternative"
 * columns of a comparison card.
 *
 * Chips follow the same visual pattern as TimelineEntryCard's ResourceChips:
 * green border for gains, red border for costs. A provenance badge is shown
 * so the player always knows whether the values are recorded or declared.
 *
 * READ-ONLY: purely presentational.
 */

import type { ReactElement } from 'react';
import { RESOURCE_LABELS, CREW_LABELS, SYSTEM_LABELS } from '../dashboard/labels';
import type { ResourceKey, CrewState, SystemState } from '../simulation/simulationTypes';
import type { EffectProvenance } from './comparisonTypes';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EffectDiffDisplayProps {
  provenance: EffectProvenance;
  resources: Partial<Record<ResourceKey, number>>;
  crew: Partial<Record<keyof CrewState, number>>;
  systems: Partial<Record<keyof SystemState, number>>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** One chip showing a signed delta. */
function DeltaChip({
  label,
  delta,
}: {
  label: string;
  delta: number;
}): ReactElement {
  const positive = delta > 0;
  return (
    <span
      className={`dc-chip inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] ${
        positive
          ? 'border-status-ok/30 text-status-ok'
          : 'border-status-critical/30 text-status-critical'
      }`}
    >
      {label} {positive ? '+' : ''}{delta.toFixed(1)}
    </span>
  );
}

/** Collect non-zero entries from a partial record using a label map. */
function collectDeltas<K extends string>(
  changes: Partial<Record<K, number>>,
  labels: Record<K, string>,
): Array<{ label: string; delta: number }> {
  const out: Array<{ label: string; delta: number }> = [];
  for (const key of Object.keys(labels) as K[]) {
    const v = changes[key];
    if (v !== undefined && v !== 0) {
      out.push({ label: labels[key], delta: v });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EffectDiffDisplay({
  provenance,
  resources,
  crew,
  systems,
}: EffectDiffDisplayProps): ReactElement {
  const resourceDeltas = collectDeltas(resources, RESOURCE_LABELS);
  const crewDeltas = collectDeltas(crew, CREW_LABELS);
  const systemDeltas = collectDeltas(systems, SYSTEM_LABELS);

  const hasAny = resourceDeltas.length > 0 || crewDeltas.length > 0 || systemDeltas.length > 0;

  return (
    <div className="dc-effects space-y-2">
      {/* Provenance badge */}
      <span
        className={`dc-provenance inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest ${
          provenance === 'recorded'
            ? 'bg-status-ok/15 text-status-ok'
            : 'bg-accent-blue/15 text-accent-blue'
        }`}
      >
        {provenance === 'recorded' ? 'Recorded result' : 'Declared effect (not played)'}
      </span>

      {/* Resource deltas */}
      {resourceDeltas.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Resources
          </p>
          <div className="flex flex-wrap gap-1.5">
            {resourceDeltas.map((d) => (
              <DeltaChip key={d.label} label={d.label} delta={d.delta} />
            ))}
          </div>
        </div>
      )}

      {/* Crew deltas */}
      {crewDeltas.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Crew
          </p>
          <div className="flex flex-wrap gap-1.5">
            {crewDeltas.map((d) => (
              <DeltaChip key={d.label} label={d.label} delta={d.delta} />
            ))}
          </div>
        </div>
      )}

      {/* System deltas */}
      {systemDeltas.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Systems
          </p>
          <div className="flex flex-wrap gap-1.5">
            {systemDeltas.map((d) => (
              <DeltaChip key={d.label} label={d.label} delta={d.delta} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasAny && (
        <p className="text-xs text-slate-500">No immediate effect changes.</p>
      )}
    </div>
  );
}
