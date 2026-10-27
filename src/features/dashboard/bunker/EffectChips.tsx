/**
 * EffectChips.tsx
 * ---------------
 * Shows a preview of what an action will do, using ONLY the data already
 * declared on the action in events/eventCatalog.ts (immediate resource / crew /
 * system changes and the number of delayed effects). Nothing is invented here:
 * if the action has no effects, no chips are shown.
 *
 * Colour rule: green = good for the player, red = bad.
 * For radiation exposure an INCREASE is bad, so its colours are flipped.
 */

import type { ReactElement } from 'react';
import type { EventAction } from '../../events/eventTypes';
import { CREW_LABELS, RESOURCE_LABELS, SYSTEM_LABELS } from '../labels';

interface Chip {
  id: string;
  text: string;
  good: boolean;
}

function chipsFor(action: EventAction): { chips: Chip[]; delayed: number } {
  const chips: Chip[] = [];
  const { immediateResources, immediateCrew, immediateSystems, delayed } = action.effect;

  for (const [key, value] of Object.entries(immediateResources ?? {})) {
    if (typeof value !== 'number' || value === 0) continue;
    const label = RESOURCE_LABELS[key as keyof typeof RESOURCE_LABELS] ?? key;
    chips.push({ id: `r-${key}`, text: `${label} ${fmt(value)}`, good: value > 0 });
  }
  for (const [key, value] of Object.entries(immediateCrew ?? {})) {
    if (typeof value !== 'number' || value === 0) continue;
    const label = CREW_LABELS[key as keyof typeof CREW_LABELS] ?? key;
    const badWhenUp = key === 'radiationExposure';
    chips.push({ id: `c-${key}`, text: `${label} ${fmt(value)}`, good: badWhenUp ? value < 0 : value > 0 });
  }
  for (const [key, value] of Object.entries(immediateSystems ?? {})) {
    if (typeof value !== 'number' || value === 0) continue;
    const label = SYSTEM_LABELS[key as keyof typeof SYSTEM_LABELS] ?? key;
    chips.push({ id: `s-${key}`, text: `${label} ${fmt(value)}`, good: value > 0 });
  }
  return { chips, delayed: delayed?.length ?? 0 };
}

function fmt(n: number): string {
  return `${n > 0 ? '+' : ''}${n}`;
}

export function EffectChips({ action }: { action: EventAction }): ReactElement | null {
  const { chips, delayed } = chipsFor(action);
  if (chips.length === 0 && delayed === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {chips.map((c) => (
        <span
          key={c.id}
          className={`rounded border px-1.5 py-px font-mono text-[10px] ${
            c.good
              ? 'border-status-ok/40 bg-status-ok/10 text-status-ok'
              : 'border-status-critical/40 bg-status-critical/10 text-status-critical'
          }`}
        >
          {c.text}
        </span>
      ))}
      {delayed > 0 ? (
        <span className="rounded border border-status-warn/40 bg-status-warn/10 px-1.5 py-px font-mono text-[10px] text-status-warn">
          ⏱ {delayed} delayed effect{delayed === 1 ? '' : 's'}
        </span>
      ) : null}
    </div>
  );
}
