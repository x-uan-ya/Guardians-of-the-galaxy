/**
 * ResourceHud.tsx
 * ---------------
 * Compact survival readout shown above the bunker:
 *   Row 1: Oxygen, Power, Food, Water (big, easy to read at a glance)
 *   Row 2: Health, Morale, Radiation (vitals) + the four system efficiencies
 *
 * Colours come from the engine's derived status (ok / warn / critical), via
 * calculateDerivedStatus. This component does no game maths.
 * It reuses the project's existing <ProgressBar> and label tables.
 */

import type { ReactElement } from 'react';
import { Cpu, Droplets, HeartPulse, Leaf, Radiation, Shield, Smile, UtensilsCrossed, Wind, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import type {
  CrewState,
  DerivedStatus,
  ResourceKey,
  StatusLevel,
  SystemState,
} from '../../simulation/simulationTypes';
import { CREW_LABELS, RESOURCE_LABELS, SYSTEM_LABELS } from '../labels';
import { LEVEL_HEX } from './facilities';
import type { StateDelta } from './useStateDelta';

interface ResourceHudProps {
  derived: DerivedStatus;
  delta: StateDelta | null;
}

/** The order the player should scan: survival-critical first. */
const HUD_RESOURCES: readonly { key: ResourceKey; icon: LucideIcon }[] = [
  { key: 'oxygen', icon: Wind },
  { key: 'power', icon: Zap },
  { key: 'food', icon: UtensilsCrossed },
  { key: 'water', icon: Droplets },
];

const HUD_SYSTEMS: readonly { key: keyof SystemState; icon: LucideIcon; short: string }[] = [
  { key: 'lifeSupportEfficiency', icon: Wind, short: 'Life' },
  { key: 'powerGeneration', icon: Zap, short: 'Gen' },
  { key: 'foodProduction', icon: Leaf, short: 'Farm' },
  { key: 'shieldingIntegrity', icon: Shield, short: 'Shield' },
];

const LEVEL_TEXT: Record<StatusLevel, string> = {
  ok: 'text-slate-100',
  warn: 'text-status-warn',
  critical: 'text-status-critical',
};

/** "+3" / "-2.5" with a colour. For radiation, an increase is BAD. */
function DeltaBadge({
  value,
  badWhenUp = false,
  stamp,
}: {
  value: number | undefined;
  badWhenUp?: boolean;
  stamp: number | undefined;
}): ReactElement | null {
  if (value === undefined || value === 0) return null;
  const good = badWhenUp ? value < 0 : value > 0;
  return (
    <span
      key={stamp}
      className={`bunker-delta ${good ? 'text-status-ok' : 'text-status-critical'}`}
      aria-label={`changed by ${value}`}
    >
      {value > 0 ? '+' : ''}
      {value}
    </span>
  );
}

export function ResourceHud({ derived, delta }: ResourceHudProps): ReactElement {
  const vitals: readonly {
    key: keyof CrewState;
    icon: LucideIcon;
    badWhenUp: boolean;
  }[] = [
    { key: 'health', icon: HeartPulse, badWhenUp: false },
    { key: 'morale', icon: Smile, badWhenUp: false },
    { key: 'radiationExposure', icon: Radiation, badWhenUp: true },
  ];

  return (
    <section
      aria-label="Survival resources"
      className="rounded-xl border border-space-600/60 bg-space-850/80 p-3 backdrop-blur-md"
    >
      {/* Row 1: the four resources. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {HUD_RESOURCES.map(({ key, icon: Icon }) => {
          const m = derived.resources[key];
          return (
            <div
              key={key}
              className="rounded-lg border bg-space-800/70 px-2.5 py-2"
              style={{
                borderColor: m.level === 'ok' ? 'rgba(58,58,77,0.8)' : LEVEL_HEX[m.level],
              }}
            >
              <div className="mb-1 flex items-center justify-between gap-1">
                <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-300">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {RESOURCE_LABELS[key]}
                </span>
                <span className={`tnum text-base font-semibold ${LEVEL_TEXT[m.level]}`}>
                  {Math.round(m.value)}
                  <span className="text-[10px] text-slate-400">%</span>
                </span>
              </div>
              <ProgressBar value={m.value} level={m.level} label={RESOURCE_LABELS[key]} />
              <div className="mt-1 flex h-4 items-center justify-between text-[10px] text-slate-500">
                <span>
                  {m.level === 'critical' ? (
                    <span className="font-semibold uppercase text-status-critical">Critical</span>
                  ) : m.level === 'warn' ? (
                    <span className="uppercase text-status-warn">Low</span>
                  ) : (
                    'Stable'
                  )}
                </span>
                <DeltaBadge value={delta?.resources[key]} stamp={delta?.stamp} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 2: vitals + system efficiencies, kept small so they do not overwhelm. */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-space-600/50 pt-2 text-[11px]">
        {vitals.map(({ key, icon: Icon, badWhenUp }) => {
          const m = derived.crew[key];
          return (
            <span key={key} className="flex items-center gap-1.5" title={CREW_LABELS[key]}>
              <Icon className="h-3.5 w-3.5 text-slate-400" aria-hidden />
              <span className="text-slate-400">{CREW_LABELS[key].replace('Crew ', '')}</span>
              <span className={`tnum font-semibold ${LEVEL_TEXT[m.level]}`}>{Math.round(m.value)}%</span>
              <DeltaBadge value={delta?.crew[key]} badWhenUp={badWhenUp} stamp={delta?.stamp} />
            </span>
          );
        })}

        <span className="hidden h-4 w-px bg-space-600 sm:block" aria-hidden />

        <span className="flex items-center gap-1 text-slate-500">
          <Cpu className="h-3.5 w-3.5" aria-hidden />
          Systems
        </span>
        {HUD_SYSTEMS.map(({ key, icon: Icon, short }) => {
          const m = derived.systems[key];
          return (
            <span key={key} className="flex items-center gap-1" title={SYSTEM_LABELS[key]}>
              <Icon className="h-3 w-3 text-slate-500" aria-hidden />
              <span className="text-slate-400">{short}</span>
              <span className="tnum font-semibold" style={{ color: LEVEL_HEX[m.level] }}>
                {Math.round(m.value)}%
              </span>
              <DeltaBadge value={delta?.systems[key]} stamp={delta?.stamp} />
            </span>
          );
        })}
      </div>
    </section>
  );
}
