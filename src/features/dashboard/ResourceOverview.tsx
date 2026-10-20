/**
 * ResourceOverview.tsx
 * --------------------
 * The four primary resources as StatusCards. Reads derived status (never
 * computes it). The daily delta caption helps the player anticipate trends.
 */

import type { ReactElement } from 'react';
import { Droplets, UtensilsCrossed, Wind, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { StatusCard } from '../../components/ui/StatusCard';
import { calculateDerivedStatus } from '../simulation/simulationEngine';
import { RESOURCE_KEYS, type GameState, type ResourceKey } from '../simulation/simulationTypes';
import { PERCENT_UNIT, RESOURCE_LABELS } from './labels';
import { Gauge } from 'lucide-react';

interface ResourceOverviewProps {
  state: GameState;
  /** Optional per-resource daily delta to show as a caption. */
  dailyDelta?: Partial<Record<ResourceKey, number>>;
}

const RESOURCE_ICONS: Record<ResourceKey, LucideIcon> = {
  power: Zap,
  water: Droplets,
  food: UtensilsCrossed,
  oxygen: Wind,
};

export function ResourceOverview({ state, dailyDelta }: ResourceOverviewProps): ReactElement {
  const derived = calculateDerivedStatus(state);

  return (
    <section className="panel p-4">
      <SectionHeader title="Resource Overview" icon={Gauge} subtitle="Life-support reserves (0–100%)" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {RESOURCE_KEYS.map((key) => {
          const metric = derived.resources[key];
          const delta = dailyDelta?.[key];
          const caption =
            delta === undefined
              ? undefined
              : `Daily ${delta >= 0 ? '+' : ''}${delta.toFixed(1)} / sol`;
          return (
            <StatusCard
              key={key}
              label={RESOURCE_LABELS[key]}
              value={metric.value}
              unit={PERCENT_UNIT}
              level={metric.level}
              icon={RESOURCE_ICONS[key]}
              {...(caption !== undefined ? { caption } : {})}
            />
          );
        })}
      </div>
    </section>
  );
}
